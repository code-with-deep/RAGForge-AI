from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.database import ContactMessage
from app.models.schemas import ContactRequest, ContactResponse


logger = logging.getLogger(__name__)


class ContactService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()

    def submit(self, payload: ContactRequest) -> ContactResponse:
        message_id = str(uuid4())
        record = ContactMessage(
            id=message_id,
            name=payload.name.strip(),
            email=str(payload.email).lower(),
            subject=(payload.subject or "").strip() or "RAGForge contact",
            message=payload.message.strip(),
        )
        self.db.add(record)
        self.db.commit()

        delivered = self._maybe_send_email(record)
        detail = (
            "Message received and email notification sent."
            if delivered
            else "Message received and stored. We will follow up shortly."
        )
        return ContactResponse(id=message_id, delivered=delivered, detail=detail)

    def _maybe_send_email(self, record: ContactMessage) -> bool:
        settings = self.settings
        if not settings.smtp_host or not settings.contact_notify_email:
            return False

        from_addr = settings.smtp_from_email or settings.smtp_username or settings.contact_notify_email
        msg = EmailMessage()
        msg["Subject"] = f"[RAGForge] {record.subject}"
        msg["From"] = from_addr
        msg["To"] = settings.contact_notify_email
        msg["Reply-To"] = record.email
        msg.set_content(
            f"Name: {record.name}\nEmail: {record.email}\nSubject: {record.subject}\n\n{record.message}\n"
        )

        try:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as smtp:
                if settings.smtp_use_tls:
                    smtp.starttls()
                if settings.smtp_username and settings.smtp_password:
                    smtp.login(settings.smtp_username, settings.smtp_password)
                smtp.send_message(msg)
            return True
        except Exception:
            logger.exception("Failed to send contact notification email for %s", record.id)
            return False
