from __future__ import annotations

import re
from collections import defaultdict
from typing import Iterable
from uuid import uuid4

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.services.utils import cosine_similarity, estimate_tokens


HEADING_RE = re.compile(
    r"^\s*(?:#{1,2}\s+|[0-9]+(?:\.[0-9]+)*\s+)?([A-Z][A-Za-z0-9 /&,:()#-]{3,90})\s*$"
)


def _token_splitter(chunk_size: int, chunk_overlap: int) -> RecursiveCharacterTextSplitter:
    try:
        return RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
    except Exception:
        return RecursiveCharacterTextSplitter(
            chunk_size=chunk_size * 4,
            chunk_overlap=chunk_overlap * 4,
            separators=["\n\n", "\n", ". ", " ", ""],
        )


def detect_section(text: str, fallback: str | None = None) -> str | None:
    for line in text.splitlines()[:12]:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("#"):
            return stripped.lstrip("#").strip()
        match = HEADING_RE.match(stripped)
        if match and len(stripped.split()) <= 12:
            return match.group(1).strip()
    return fallback


def enrich_loaded_documents(
    docs: Iterable[Document],
    *,
    filename: str,
    file_type: str,
    upload_date: str,
    file_size: int,
    tags: list[str],
) -> list[Document]:
    enriched: list[Document] = []
    current_section: str | None = None
    docs_list = list(docs)
    total_pages = max(1, len(docs_list))
    for index, doc in enumerate(docs_list):
        page_number = doc.metadata.get("page_number")
        if page_number is None:
            page = doc.metadata.get("page")
            page_number = int(page) + 1 if isinstance(page, int) else index + 1
        detected = detect_section(doc.page_content, current_section)
        if detected:
            current_section = detected
        metadata = {
            **doc.metadata,
            "source": filename,
            "file_name": filename,
            "file_type": file_type,
            "upload_date": upload_date,
            "file_size": file_size,
            "total_pages": total_pages,
            "page_number": page_number,
            "section": current_section or "Unsectioned",
            "tags": tags,
        }
        enriched.append(Document(page_content=doc.page_content, metadata=metadata))
    return enriched


def recursive_chunks(docs: list[Document]) -> list[Document]:
    splitter = _token_splitter(chunk_size=500, chunk_overlap=50)
    chunks = splitter.split_documents(docs)
    output: list[Document] = []
    for index, chunk in enumerate(chunks):
        metadata = dict(chunk.metadata)
        metadata["strategy"] = "recursive"
        metadata["chunk_index"] = index
        metadata["section"] = detect_section(chunk.page_content, metadata.get("section")) or "Unsectioned"
        output.append(Document(page_content=chunk.page_content, metadata=metadata))
    return output


def parent_child_chunks(docs: list[Document]) -> tuple[list[Document], list[Document]]:
    parent_splitter = _token_splitter(chunk_size=1000, chunk_overlap=100)
    child_splitter = _token_splitter(chunk_size=200, chunk_overlap=30)
    parents = parent_splitter.split_documents(docs)
    parent_documents: list[Document] = []
    child_documents: list[Document] = []
    for parent_index, parent in enumerate(parents):
        parent_id = f"parent-{uuid4()}"
        parent_metadata = dict(parent.metadata)
        parent_metadata.update(
            {
                "strategy": "parent_child_parent",
                "chunk_index": parent_index,
                "parent_id": parent_id,
                "section": detect_section(parent.page_content, parent_metadata.get("section"))
                or "Unsectioned",
            }
        )
        parent_doc = Document(page_content=parent.page_content, metadata=parent_metadata)
        parent_documents.append(parent_doc)
        children = child_splitter.split_documents([parent_doc])
        for child_index, child in enumerate(children):
            child_metadata = dict(child.metadata)
            child_metadata.update(
                {
                    "strategy": "parent_child",
                    "chunk_index": child_index,
                    "parent_id": parent_id,
                    "parent_text_preview": parent.page_content[:500],
                    "section": detect_section(child.page_content, parent_metadata.get("section"))
                    or "Unsectioned",
                }
            )
            child_documents.append(Document(page_content=child.page_content, metadata=child_metadata))
    return parent_documents, child_documents


def section_based_chunks(docs: list[Document]) -> list[Document]:
    chunks: list[Document] = []
    for doc in docs:
        current_heading = doc.metadata.get("section") or "Unsectioned"
        buffer: list[str] = []

        def flush() -> None:
            nonlocal buffer
            text = "\n".join(buffer).strip()
            if text:
                metadata = dict(doc.metadata)
                metadata["strategy"] = "section"
                metadata["section"] = current_heading or "Unsectioned"
                metadata["chunk_index"] = len(chunks)
                chunks.append(Document(page_content=text, metadata=metadata))
            buffer = []

        for line in doc.page_content.splitlines():
            stripped = line.strip()
            is_heading = stripped.startswith("#") or (
                bool(HEADING_RE.match(stripped)) and len(stripped.split()) <= 12
            )
            if is_heading and buffer:
                flush()
            if is_heading:
                current_heading = stripped.lstrip("#").strip()
            buffer.append(line)
        flush()
    return chunks


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    return [part.strip() for part in parts if part.strip()]


def semantic_chunks(docs: list[Document], embeddings: object, threshold: float = 0.58) -> list[Document]:
    chunks: list[Document] = []
    for doc in docs:
        sentences = _split_sentences(doc.page_content)
        if not sentences:
            continue
        try:
            vectors = embeddings.embed_documents(sentences)
        except Exception:
            vectors = []

        if not vectors or len(vectors) != len(sentences):
            grouped = _fallback_semantic_groups(sentences)
        else:
            grouped: list[list[str]] = []
            current: list[str] = [sentences[0]]
            for idx in range(1, len(sentences)):
                similarity = cosine_similarity(vectors[idx - 1], vectors[idx])
                current_tokens = estimate_tokens(" ".join(current))
                if similarity < threshold or current_tokens >= 430:
                    grouped.append(current)
                    current = [sentences[idx]]
                else:
                    current.append(sentences[idx])
            if current:
                grouped.append(current)

        for group in grouped:
            text = " ".join(group).strip()
            if not text:
                continue
            metadata = dict(doc.metadata)
            metadata["strategy"] = "semantic"
            metadata["section"] = detect_section(text, metadata.get("section")) or "Unsectioned"
            metadata["chunk_index"] = len(chunks)
            chunks.append(Document(page_content=text, metadata=metadata))
    return chunks


def _fallback_semantic_groups(sentences: list[str]) -> list[list[str]]:
    groups: list[list[str]] = []
    current: list[str] = []
    for sentence in sentences:
        current.append(sentence)
        if estimate_tokens(" ".join(current)) >= 350:
            groups.append(current)
            current = []
    if current:
        groups.append(current)
    return groups


def build_all_chunk_strategies(docs: list[Document], embeddings: object) -> dict[str, list[Document]]:
    parent_docs, child_docs = parent_child_chunks(docs)
    strategies = {
        "recursive": recursive_chunks(docs),
        "semantic": semantic_chunks(docs, embeddings),
        "parent_child_parent": parent_docs,
        "parent_child": child_docs,
        "section": section_based_chunks(docs),
    }
    for name, chunks in strategies.items():
        seen_by_page: dict[int | None, int] = defaultdict(int)
        for chunk in chunks:
            page = chunk.metadata.get("page_number")
            seen_by_page[page] += 1
            chunk.metadata["strategy"] = name
            chunk.metadata["page_chunk_index"] = seen_by_page[page]
            chunk.metadata["token_count"] = estimate_tokens(chunk.page_content)
    return strategies

