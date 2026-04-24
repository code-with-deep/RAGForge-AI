from __future__ import annotations

import re
from typing import Any

from langchain_core.messages import AIMessage
from langchain_core.runnables import Runnable, RunnableLambda

from app.config import get_settings
from app.services.utils import snippet


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


def get_chat_model() -> Runnable:
    settings = get_settings()
    provider = settings.llm_provider
    if provider == "groq" and settings.groq_api_key:
        from langchain_groq import ChatGroq

        return ChatGroq(model=settings.groq_model, temperature=0, max_retries=2, api_key=settings.groq_api_key)
    if provider == "openai" and settings.openai_api_key:
        from langchain_openai import ChatOpenAI

        return ChatOpenAI(model=settings.openai_model, temperature=0, api_key=settings.openai_api_key)
    if provider == "gemini" and settings.google_api_key:
        from langchain_google_genai import ChatGoogleGenerativeAI

        return ChatGoogleGenerativeAI(model=settings.gemini_model, temperature=0, google_api_key=settings.google_api_key)
    if settings.offline_fallback or provider == "offline":
        return RunnableLambda(_offline_response)
    raise RuntimeError(
        "No LLM API key configured. Set GROQ_API_KEY or enable OFFLINE_FALLBACK=true."
    )


def llm_status() -> str:
    settings = get_settings()
    if settings.llm_provider == "groq" and settings.groq_api_key:
        return f"groq:{settings.groq_model}"
    if settings.llm_provider == "openai" and settings.openai_api_key:
        return f"openai:{settings.openai_model}"
    if settings.llm_provider == "gemini" and settings.google_api_key:
        return f"gemini:{settings.gemini_model}"
    return "offline-fallback"

