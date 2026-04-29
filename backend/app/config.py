import logging
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

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

    @model_validator(mode="after")
    def _validate_jwt_secret(self) -> "Settings":
        if self.jwt_secret_key == _INSECURE_JWT_KEY:
            if self.environment in ("production", "staging"):
                raise ValueError(
                    "JWT_SECRET_KEY must be set to a secure random value in production/staging. "
                    "Set the JWT_SECRET_KEY environment variable (e.g. `openssl rand -hex 32`)."
                )
            logger.warning(
                "⚠️  JWT_SECRET_KEY is using the insecure default placeholder. "
                "Set JWT_SECRET_KEY in your .env file before deploying."
            )
        return self

    auto_ingest_sample_docs: bool = False
    eval_pass_threshold: float = 0.72

    @property
    def parsed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return settings

