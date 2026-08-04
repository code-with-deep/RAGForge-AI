"""Document ownership helpers for multi-tenant + shared sample corpora."""

from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Query

from app.models.database import DocumentRecord


def apply_document_visibility(query: Query, user_id: str | None) -> Query:
    """Restrict documents to the caller's own rows plus shared (user_id IS NULL) samples.

    Anonymous callers (user_id is None) see the full corpus — used when
    AUTH_REQUIRED=false for local demos / API exploration.
    """
    if user_id is None:
        return query
    return query.filter(
        or_(DocumentRecord.user_id == user_id, DocumentRecord.user_id.is_(None))
    )


def apply_document_mutation_scope(query: Query, user_id: str | None) -> Query:
    """Scope destructive ops: owners may mutate their docs; anonymous may mutate anything.

    Shared sample documents (user_id IS NULL) cannot be deleted by authenticated users.
    """
    if user_id is None:
        return query
    return query.filter(DocumentRecord.user_id == user_id)
