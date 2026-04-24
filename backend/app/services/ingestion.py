from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from langchain_core.documents import Document
from sqlalchemy.orm import Session

from app.config import PROJECT_ROOT, get_settings
from app.models.database import ChunkRecord, DocumentRecord
from app.models.schemas import ChunkOut, DocumentOut, UploadResponse
from app.services.chunking_strategies import build_all_chunk_strategies, enrich_loaded_documents
from app.services.utils import from_json, metadata_for_chroma, parse_tags, to_json, utc_iso
from app.services.vector_store import get_embeddings, get_vector_store


SUPPORTED_EXTENSIONS = {".pdf", ".txt", ".docx", ".md", ".markdown"}
SEARCHABLE_STRATEGIES = {"recursive", "semantic", "section", "parent_child"}


def _safe_filename(name: str) -> str:
    return "".join(char if char.isalnum() or char in "._- " else "_" for char in name).strip()


def _file_type(path: Path) -> str:
    suffix = path.suffix.lower().lstrip(".")
    return "markdown" if suffix in {"md", "markdown"} else suffix


def _load_documents(path: Path) -> list[Document]:
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

    if suffix == ".pdf":
        from langchain_community.document_loaders import PyPDFLoader

        return PyPDFLoader(str(path)).load()

    if suffix == ".txt":
        from langchain_community.document_loaders import TextLoader

        return TextLoader(str(path), autodetect_encoding=True).load()

    if suffix in {".md", ".markdown"}:
        try:
            from langchain_community.document_loaders import UnstructuredMarkdownLoader

            return UnstructuredMarkdownLoader(str(path)).load()
        except Exception:
            from langchain_community.document_loaders import TextLoader

            return TextLoader(str(path), autodetect_encoding=True).load()

    try:
        from langchain_community.document_loaders import UnstructuredWordDocumentLoader

        return UnstructuredWordDocumentLoader(str(path)).load()
    except Exception:
        from langchain_community.document_loaders import Docx2txtLoader

        return Docx2txtLoader(str(path)).load()


def _document_out(record: DocumentRecord) -> DocumentOut:
    return DocumentOut(
        id=record.id,
        filename=record.filename,
        file_type=record.file_type,
        upload_date=record.upload_date,
        file_size=record.file_size,
        total_pages=record.total_pages,
        tags=from_json(record.tags_json, []),
        chunk_counts=from_json(record.chunk_counts_json, {}),
    )


def _chunk_out(record: ChunkRecord) -> ChunkOut:
    return ChunkOut(
        id=record.id,
        document_id=record.document_id,
        strategy=record.strategy,
        source=record.source,
        page_number=record.page_number,
        section=record.section,
        tags=from_json(record.tags_json, []),
        text=record.text,
        token_count=record.token_count,
        metadata=from_json(record.metadata_json, {}),
    )


class DocumentIngestionService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    async def ingest_upload(
        self,
        file: UploadFile,
        tags: str | list[str] | None = None,
        user_id: str | None = None,
    ) -> UploadResponse:
        filename = _safe_filename(file.filename or "document")
        suffix = Path(filename).suffix.lower()
        if suffix not in SUPPORTED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

        document_id = str(uuid4())
        stored_path = self.settings.upload_dir / f"{document_id}_{filename}"
        contents = await file.read()
        stored_path.write_bytes(contents)
        return self.ingest_path(stored_path, original_filename=filename, tags=tags, user_id=user_id)

    def ingest_sample_documents(self, user_id: str | None = None) -> list[UploadResponse]:
        sample_dir = PROJECT_ROOT / "sample_documents"
        responses: list[UploadResponse] = []
        for path in sorted(sample_dir.glob("*")):
            if path.suffix.lower() in SUPPORTED_EXTENSIONS:
                existing = (
                    self.db.query(DocumentRecord)
                    .filter(DocumentRecord.filename == path.name)
                    .first()
                )
                if not existing:
                    responses.append(
                        self.ingest_path(path, original_filename=path.name, tags=["sample"], user_id=user_id)
                    )
        return responses

    def ingest_path(
        self,
        path: Path,
        *,
        original_filename: str | None = None,
        tags: str | list[str] | None = None,
        user_id: str | None = None,
    ) -> UploadResponse:
        if not path.exists():
            raise HTTPException(status_code=404, detail="Document path not found")

        filename = original_filename or path.name
        tag_list = parse_tags(tags)
        document_id = str(uuid4())
        upload_date = utc_iso()
        file_size = path.stat().st_size
        file_type = _file_type(path)

        loaded = _load_documents(path)
        if not loaded:
            raise HTTPException(status_code=400, detail="No text could be extracted from document")
        enriched = enrich_loaded_documents(
            loaded,
            filename=filename,
            file_type=file_type,
            upload_date=upload_date,
            file_size=file_size,
            tags=tag_list,
        )
        total_pages = max(int(doc.metadata.get("total_pages", len(enriched))) for doc in enriched)
        chunk_groups = build_all_chunk_strategies(enriched, get_embeddings())

        record = DocumentRecord(
            id=document_id,
            user_id=user_id,
            filename=filename,
            file_type=file_type,
            source_path=str(path),
            file_size=file_size,
            total_pages=total_pages,
            tags_json=to_json(tag_list),
            chunk_counts_json=to_json({key: len(value) for key, value in chunk_groups.items()}),
        )
        self.db.add(record)
        self.db.flush()

        parent_id_map: dict[str, str] = {}
        vector_docs: list[Document] = []
        vector_ids: list[str] = []
        chunk_records: list[ChunkRecord] = []

        def add_chunk(chunk: Document, strategy: str) -> None:
            chunk_id = f"chunk-{uuid4()}"
            vector_id = chunk_id
            metadata = dict(chunk.metadata)
            logical_parent_id = metadata.get("parent_id")
            if strategy == "parent_child_parent":
                parent_id_map[str(logical_parent_id)] = chunk_id
                metadata["logical_parent_id"] = logical_parent_id
                metadata["parent_id"] = ""
            elif strategy == "parent_child" and logical_parent_id:
                metadata["logical_parent_id"] = logical_parent_id
                metadata["parent_id"] = parent_id_map.get(str(logical_parent_id), str(logical_parent_id))

            metadata.update(
                {
                    "chunk_id": chunk_id,
                    "document_id": document_id,
                    "vector_id": vector_id,
                    "strategy": strategy,
                    "source": filename,
                    "tags_csv": ",".join(tag_list),
                }
            )
            token_count = int(metadata.get("token_count") or 0)
            page_number = metadata.get("page_number")
            if isinstance(page_number, str) and page_number.isdigit():
                page_number = int(page_number)
            parent_id = metadata.get("parent_id") or None
            chunk_record = ChunkRecord(
                id=chunk_id,
                document_id=document_id,
                vector_id=vector_id,
                parent_id=str(parent_id) if parent_id else None,
                strategy=strategy,
                source=filename,
                page_number=page_number if isinstance(page_number, int) else None,
                section=str(metadata.get("section") or "Unsectioned"),
                tags_json=to_json(tag_list),
                text=chunk.page_content,
                token_count=token_count,
                metadata_json=to_json(metadata),
            )
            chunk_records.append(chunk_record)
            vector_docs.append(
                Document(page_content=chunk.page_content, metadata=metadata_for_chroma(metadata))
            )
            vector_ids.append(vector_id)

        for chunk in chunk_groups["parent_child_parent"]:
            add_chunk(chunk, "parent_child_parent")
        for strategy in ("recursive", "semantic", "section", "parent_child"):
            for chunk in chunk_groups[strategy]:
                add_chunk(chunk, strategy)

        self.db.add_all(chunk_records)
        get_vector_store().add_documents(vector_docs, ids=vector_ids)
        self.db.commit()
        self.db.refresh(record)
        return UploadResponse(
            document=_document_out(record),
            chunks_created=len(chunk_records),
            chunk_counts={key: len(value) for key, value in chunk_groups.items()},
        )

    def list_documents(self, user_id: str | None = None) -> list[DocumentOut]:
        query = self.db.query(DocumentRecord).order_by(DocumentRecord.upload_date.desc())
        if user_id:
            query = query.filter(DocumentRecord.user_id == user_id)
        return [_document_out(record) for record in query.all()]

    def delete_document(self, document_id: str, user_id: str | None = None) -> None:
        query = self.db.query(DocumentRecord).filter(DocumentRecord.id == document_id)
        if user_id:
            query = query.filter(DocumentRecord.user_id == user_id)
        record = query.first()
        if record is None:
            raise HTTPException(status_code=404, detail="Document not found")

        vector_ids = [chunk.vector_id for chunk in record.chunks]
        if vector_ids:
            get_vector_store().delete(ids=vector_ids)
        source = Path(record.source_path)
        upload_dir = self.settings.upload_dir.resolve()
        try:
            if source.exists() and upload_dir in source.resolve().parents:
                source.unlink(missing_ok=True)
        except OSError:
            pass
        self.db.delete(record)
        self.db.commit()

    def get_chunks(
        self,
        document_id: str | None = None,
        strategy: str | None = None,
        user_id: str | None = None,
        limit: int = 200,
    ) -> list[ChunkOut]:
        query = self.db.query(ChunkRecord).join(DocumentRecord)
        if document_id:
            query = query.filter(ChunkRecord.document_id == document_id)
        if strategy:
            query = query.filter(ChunkRecord.strategy == strategy)
        if user_id:
            query = query.filter(DocumentRecord.user_id == user_id)
        query = query.order_by(ChunkRecord.source.asc(), ChunkRecord.strategy.asc()).limit(limit)
        return [_chunk_out(record) for record in query.all()]

    def copy_sample_to_uploads(self, sample_path: Path) -> Path:
        target = self.settings.upload_dir / f"{uuid4()}_{sample_path.name}"
        shutil.copy2(sample_path, target)
        return target

