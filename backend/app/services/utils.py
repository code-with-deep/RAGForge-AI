from __future__ import annotations

import json
import math
import re
from datetime import datetime, timezone
from typing import Any, Iterable


WORD_RE = re.compile(r"[A-Za-z0-9_#.-]+")


def utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, default=str)


def from_json(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def tokenize(text: str) -> list[str]:
    return [match.group(0).lower() for match in WORD_RE.finditer(text)]


def estimate_tokens(text: str) -> int:
    try:
        import tiktoken

        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        return max(1, math.ceil(len(tokenize(text)) * 1.25))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def normalize_scores(scores: Iterable[float]) -> list[float]:
    values = list(scores)
    if not values:
        return []
    low = min(values)
    high = max(values)
    if high == low:
        return [1.0 if high > 0 else 0.0 for _ in values]
    return [(score - low) / (high - low) for score in values]


def reciprocal_rank(rank: int | None, k: int = 60, weight: float = 1.0) -> float:
    if rank is None or rank <= 0:
        return 0.0
    return weight * (1.0 / (k + rank))


def unique_preserve_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in seen:
            ordered.append(cleaned)
            seen.add(cleaned)
    return ordered


def metadata_for_chroma(metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
    clean: dict[str, str | int | float | bool] = {}
    for key, value in metadata.items():
        if value is None:
            continue
        if isinstance(value, (str, int, float, bool)):
            clean[key] = value
        elif isinstance(value, list):
            clean[key] = ",".join(str(item) for item in value)
        else:
            clean[key] = json.dumps(value, ensure_ascii=False, default=str)
    return clean


def parse_tags(tags: str | list[str] | None) -> list[str]:
    if tags is None:
        return []
    if isinstance(tags, list):
        raw = tags
    else:
        raw = re.split(r"[,;\n]", tags)
    return unique_preserve_order(tag.lower() for tag in raw if tag.strip())


def snippet(text: str, max_chars: int = 260) -> str:
    collapsed = re.sub(r"\s+", " ", text).strip()
    if len(collapsed) <= max_chars:
        return collapsed
    return collapsed[: max_chars - 3].rstrip() + "..."

