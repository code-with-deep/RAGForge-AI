"""Document ownership helpers for multi-tenant + shared sample corpora."""

from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Query

from app.models.database import DocumentRecord


def apply_document_visibility(query: Query, user_id: str | None) -> Query:
    """Restrict documents to the caller's own rows plus shared (user_id IS NULL) samples.

    Anonymous callers (user_id is None, only possible when AUTH_REQUIRED=false) see
    just the shared corpus — never another account's private uploads.
    """
    if user_id is None:
        return query.filter(DocumentRecord.user_id.is_(None))
    return query.filter(
        or_(DocumentRecord.user_id == user_id, DocumentRecord.user_id.is_(None))
    )


def apply_document_mutation_scope(query: Query, user_id: str | None) -> Query:
    """Scope destructive ops to the caller's own documents.

    Anonymous callers may only mutate shared (user_id IS NULL) documents; authenticated
    users cannot delete shared samples.
    """
    if user_id is None:
        return query.filter(DocumentRecord.user_id.is_(None))
    return query.filter(DocumentRecord.user_id == user_id)
