from __future__ import annotations

import logging
import re
from typing import Any

from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable, RunnableLambda

from app.config import Settings, get_settings
from app.services.utils import snippet

logger = logging.getLogger(__name__)

OFFLINE_STATUS = "offline-fallback"


class LLMChainError(RuntimeError):
    """Every configured provider failed; ``errors`` holds (provider, exception) pairs."""

    def __init__(self, errors: list[tuple[str, Exception]]) -> None:
        self.errors = errors
        super().__init__(" | ".join(f"{name}: {exc}" for name, exc in errors))


def _with_fallbacks(models: list[tuple[str, Runnable]]) -> Runnable:
    """Try each model in order; unlike ``with_fallbacks`` this reports *every* failure,
    not just the first (which would hide e.g. a fallback's rate limit behind the
    primary's bad-key error)."""

    def _record(errors: list[tuple[str, Exception]], name: str, exc: Exception) -> None:
        logger.warning("LLM provider %s failed: %s", name, str(exc)[:300])
        errors.append((name, exc))

    def invoke(value: Any) -> Any:
        errors: list[tuple[str, Exception]] = []
        for name, model in models:
            try:
                return model.invoke(value)
            except Exception as exc:  # noqa: BLE001
                _record(errors, name, exc)
        raise LLMChainError(errors)

    async def ainvoke(value: Any) -> Any:
        errors: list[tuple[str, Exception]] = []
        for name, model in models:
            try:
                return await model.ainvoke(value)
            except Exception as exc:  # noqa: BLE001
                _record(errors, name, exc)
        raise LLMChainError(errors)

    return RunnableLambda(invoke, afunc=ainvoke)


def _prompt_to_text(prompt_value: Any) -> str:
    if hasattr(prompt_value, "to_string"):
        return prompt_value.to_string()
    if isinstance(prompt_value, list):
        return "\n".join(getattr(message, "content", str(message)) for message in prompt_value)
    return str(prompt_value)


def _offline_response(prompt_value: Any) -> AIMessage:
    prompt = _prompt_to_text(prompt_value)
    question_match = re.search(r"Question:\s*(.+)", prompt, flags=re.I | re.S)
    question = question_match.group(1).strip().splitlines()[0] if question_match else "the question"
    context_match = re.search(r"Context:\s*(.+?)\n\s*Question:", prompt, flags=re.I | re.S)
    context = context_match.group(1).strip() if context_match else prompt
    sentences = re.split(r"(?<=[.!?])\s+", context)
    answer_sentences = [sentence.strip() for sentence in sentences if len(sentence.strip()) > 40][:4]
    if not answer_sentences:
        answer_sentences = [snippet(context, 500)]
    content = (
        f"Based on the retrieved context, {question} can be answered as follows: "
        + " ".join(answer_sentences)
    )
    return AIMessage(content=content)


def _provider_label(settings: Settings, provider: str) -> str | None:
    """``provider:model`` when that provider has a key configured, else None."""
    if provider == "gemini" and settings.google_api_key:
        return f"gemini:{settings.gemini_model}"
    if provider == "groq" and settings.groq_api_key:
        return f"groq:{settings.groq_model}"
    if provider == "openai" and settings.openai_api_key:
        return f"openai:{settings.openai_model}"
    return None


def _configured_providers(settings: Settings) -> list[str]:
    """Primary first, then the fallback; providers without keys are dropped."""
    order = [settings.llm_provider, settings.llm_fallback_provider]
    chain: list[str] = []
    for provider in order:
        if provider in ("offline", "none") or provider in chain:
            continue
        if _provider_label(settings, provider):
            chain.append(provider)
    return chain


def _build_model(settings: Settings, provider: str) -> Runnable:
    timeout = settings.llm_timeout_seconds
    if provider == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI

        # Few retries so a failing primary hands over to the fallback quickly.
        return ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=0,
            google_api_key=settings.google_api_key,
            max_retries=1,
            timeout=timeout,
        )
    if provider == "groq":
        from langchain_groq import ChatGroq

        return ChatGroq(
            model=settings.groq_model,
            temperature=0,
            max_retries=1,
            timeout=timeout,
            api_key=settings.groq_api_key,
        )
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        model=settings.openai_model,
        temperature=0,
        max_retries=1,
        timeout=timeout,
        api_key=settings.openai_api_key,
    )


def get_chat_model() -> Runnable:
    settings = get_settings()
    chain = _configured_providers(settings)
    if chain:
        models = [(name, _build_model(settings, name)) for name in chain]
        return _with_fallbacks(models) if len(models) > 1 else models[0][1]
    if settings.offline_fallback or settings.llm_provider == "offline":
        return RunnableLambda(_offline_response)
    raise RuntimeError(
        "No LLM API key configured. Set GOOGLE_API_KEY (primary) and/or GROQ_API_KEY (fallback), "
        "or enable OFFLINE_FALLBACK=true."
    )


def llm_status() -> str:
    settings = get_settings()
    labels = [_provider_label(settings, name) for name in _configured_providers(settings)]
    if not labels:
        return OFFLINE_STATUS
    if len(labels) == 1:
        return labels[0]
    return f"{labels[0]} (fallback {labels[1]})"
