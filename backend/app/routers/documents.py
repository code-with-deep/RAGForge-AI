from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.auth.security import get_user_or_raise_if_required
from app.models.database import User, get_db
from app.models.schemas import ChunkOut, DocumentOut, UploadResponse
from app.services.ingestion import DocumentIngestionService


router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    tags: str = Form(default=""),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> UploadResponse:
    return await DocumentIngestionService(db).ingest_upload(
        file,
        tags=tags,
        user_id=user.id if user else None,
    )


@router.get("", response_model=list[DocumentOut])
async def list_documents(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[DocumentOut]:
    return DocumentIngestionService(db).list_documents(user_id=user.id if user else None)


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> dict[str, str]:
    DocumentIngestionService(db).delete_document(document_id, user_id=user.id if user else None)
    return {"status": "deleted", "document_id": document_id}


@router.get("/{document_id}/chunks", response_model=list[ChunkOut])
async def document_chunks(
    document_id: str,
    strategy: str | None = None,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[ChunkOut]:
    return DocumentIngestionService(db).get_chunks(
        document_id=document_id,
        strategy=strategy,
        user_id=user.id if user else None,
    )


@router.post("/ingest-samples", response_model=list[UploadResponse])
async def ingest_samples(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_user_or_raise_if_required),
) -> list[UploadResponse]:
    return DocumentIngestionService(db).ingest_sample_documents(user_id=user.id if user else None)

