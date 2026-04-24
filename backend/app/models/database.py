from __future__ import annotations

from datetime import datetime, timezone
from typing import Generator

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from app.config import get_settings


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    documents: Mapped[list["DocumentRecord"]] = relationship(back_populates="owner")


class DocumentRecord(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    filename: Mapped[str] = mapped_column(String(512), index=True)
    file_type: Mapped[str] = mapped_column(String(32), index=True)
    source_path: Mapped[str] = mapped_column(Text)
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    total_pages: Mapped[int] = mapped_column(Integer, default=1)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    chunk_counts_json: Mapped[str] = mapped_column(Text, default="{}")

    owner: Mapped[User | None] = relationship(back_populates="documents")
    chunks: Mapped[list["ChunkRecord"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class ChunkRecord(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    document_id: Mapped[str] = mapped_column(String(36), ForeignKey("documents.id"), index=True)
    vector_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    parent_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    strategy: Mapped[str] = mapped_column(String(64), index=True)
    source: Mapped[str] = mapped_column(String(512), index=True)
    page_number: Mapped[int | None] = mapped_column(Integer, index=True, nullable=True)
    section: Mapped[str | None] = mapped_column(String(512), index=True, nullable=True)
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    text: Mapped[str] = mapped_column(Text)
    token_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document: Mapped[DocumentRecord] = relationship(back_populates="chunks")


class QueryRecord(Base):
    __tablename__ = "queries"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    original_query: Mapped[str] = mapped_column(Text)
    strategy: Mapped[str] = mapped_column(String(64), index=True)
    answer: Mapped[str] = mapped_column(Text)
    prompt: Mapped[str] = mapped_column(Text)
    transformed_queries_json: Mapped[str] = mapped_column(Text, default="[]")
    retrieved_chunks_json: Mapped[str] = mapped_column(Text, default="[]")
    selected_chunks_json: Mapped[str] = mapped_column(Text, default="[]")
    pipeline_json: Mapped[str] = mapped_column(Text, default="[]")
    token_usage_json: Mapped[str] = mapped_column(Text, default="{}")
    latency_json: Mapped[str] = mapped_column(Text, default="{}")
    latency_ms: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)


class EvaluationResult(Base):
    __tablename__ = "evaluation_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    query_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("queries.id"), nullable=True)
    strategy: Mapped[str] = mapped_column(String(64), index=True)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    reference_answer: Mapped[str] = mapped_column(Text)
    expected_context_json: Mapped[str] = mapped_column(Text, default="[]")
    scores_json: Mapped[str] = mapped_column(Text, default="{}")
    passed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)


settings = get_settings()
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

