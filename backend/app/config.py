import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Quiet noisy HF cache warning on Windows (symlinks unavailable without Developer Mode).
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

_INSECURE_JWT_KEY = "change-me-in-production"


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
STORAGE_DIR = BACKEND_DIR / "storage"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        env_file_required=False,
        extra="ignore",
    )

    app_name: str = "RAGForge AI"
    environment: str = "development"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    database_url: str = Field(
        default_factory=lambda: f"sqlite:///{(STORAGE_DIR / 'ragforge.db').as_posix()}"
    )
    upload_dir: Path = STORAGE_DIR / "uploads"
    chroma_dir: Path = STORAGE_DIR / "chroma"
    chroma_collection: str = "ragforge_chunks"

    llm_provider: Literal["groq", "openai", "gemini", "offline"] = "groq"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    google_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"
    offline_fallback: bool = True

    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    enable_cross_encoder: bool = True

    default_top_k_initial: int = 20
    default_top_k_final: int = 5
    rrf_k: int = 60
    default_semantic_weight: float = 0.7
    default_keyword_weight: float = 0.3
    max_context_tokens: int = 4200

    jwt_secret_key: str = _INSECURE_JWT_KEY
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24
    auth_required: bool = False

    auto_ingest_sample_docs: bool = False
    eval_pass_threshold: float = 0.72

    # Contact form delivery (optional SMTP). When unset, messages are stored in DB only.
    contact_notify_email: str | None = None
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_from_email: str | None = None

    @model_validator(mode="after")
    def _validate_security(self) -> "Settings":
        is_prod = self.environment in ("production", "staging")

        if self.jwt_secret_key == _INSECURE_JWT_KEY:
            if is_prod:
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a secure random value in production/staging. "
                    "Set the JWT_SECRET_KEY environment variable (e.g. `openssl rand -hex 32`)."
                )
            logger.warning(
                "JWT_SECRET_KEY is using the insecure default placeholder. "
                "Set JWT_SECRET_KEY in your .env file before deploying."
            )

        if is_prod and not self.auth_required:
            logger.warning(
                "AUTH_REQUIRED=false in %s. Set AUTH_REQUIRED=true for production deployments.",
                self.environment,
            )

        if is_prod and self.offline_fallback and self.llm_provider != "offline":
            logger.warning(
                "OFFLINE_FALLBACK=true in %s. Disable it when a real LLM provider key is configured.",
                self.environment,
            )

        if is_prod and ("*" in self.parsed_cors_origins or not self.parsed_cors_origins):
            raise ValueError(
                "CORS_ORIGINS must be an explicit comma-separated allow-list in production/staging."
            )

        return self

    @property
    def parsed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def should_auto_seed_samples(self) -> bool:
        """Seed shared samples when explicitly enabled, or when the DB is empty in development."""
        return self.auto_ingest_sample_docs or self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return settings
