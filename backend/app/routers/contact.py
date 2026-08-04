from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.schemas import ContactRequest, ContactResponse
from app.services.contact import ContactService


router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("", response_model=ContactResponse)
async def submit_contact(
    payload: ContactRequest,
    db: Session = Depends(get_db),
) -> ContactResponse:
    return ContactService(db).submit(payload)
