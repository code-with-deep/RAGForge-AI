from __future__ import annotations

import json
import re

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from app.services.llm import get_chat_model
from app.services.utils import unique_preserve_order


def _clean_lines(text: str) -> list[str]:
    lines = []
    for line in text.splitlines():
        cleaned = re.sub(r"^\s*(?:[-*]|\d+[.)])\s*", "", line).strip().strip('"')
        if cleaned:
            lines.append(cleaned)
    return unique_preserve_order(lines)


class QueryTransformService:
    def __init__(self) -> None:
        self.llm = get_chat_model()
        self.parser = StrOutputParser()

    async def multi_query(self, query: str, count: int = 4) -> list[str]:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Generate alternative search queries for retrieval. Return only one query per line.",
                ),
                (
                    "human",
                    "Original question: {query}\nGenerate {count} diverse phrasings that preserve the meaning.",
                ),
            ]
        )
        chain = prompt | self.llm | self.parser
        try:
            output = await chain.ainvoke({"query": query, "count": count})
            variants = _clean_lines(output)
        except Exception:
            variants = []
        fallbacks = [
            query,
            f"Key facts needed to answer: {query}",
            f"Detailed explanation of {query}",
            f"Relevant source passages for {query}",
        ]
        return unique_preserve_order([query, *variants, *fallbacks])[: count + 1]

    async def decompose(self, query: str, count: int = 5) -> list[str]:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Break complex questions into atomic retrieval sub-questions. Return JSON array of strings.",
                ),
                ("human", "Question: {query}\nMaximum sub-questions: {count}"),
            ]
        )
        chain = prompt | self.llm | self.parser
        try:
            output = await chain.ainvoke({"query": query, "count": count})
            parsed = json.loads(_extract_json_array(output))
            variants = [str(item).strip() for item in parsed if str(item).strip()]
        except Exception:
            variants = _fallback_decomposition(query)
        return unique_preserve_order([*variants, query])[:count]

    async def step_back(self, query: str) -> str:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Create a broader step-back retrieval question that captures the general concept behind the user's question.",
                ),
                ("human", "Specific question: {query}\nStep-back question:"),
            ]
        )
        chain = prompt | self.llm | self.parser
        try:
            output = await chain.ainvoke({"query": query})
            line = _clean_lines(output)
            if line:
                return line[0]
        except Exception:
            pass
        return f"What background information helps answer: {query}"

    async def hyde_document(self, query: str) -> str:
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "Write a concise hypothetical document passage that would answer the question. Use concrete terms likely to appear in source documents.",
                ),
                ("human", "Question: {query}\nHypothetical passage:"),
            ]
        )
        chain = prompt | self.llm | self.parser
        try:
            output = await chain.ainvoke({"query": query})
            if output.strip():
                return output.strip()
        except Exception:
            pass
        return f"This passage answers the question: {query}"

    def build_langchain_multi_query_retriever(self, retriever: object) -> object | None:
        try:
            from langchain.retrievers.multi_query import MultiQueryRetriever

            return MultiQueryRetriever.from_llm(retriever=retriever, llm=self.llm)
        except Exception:
            try:
                from langchain_classic.retrievers.multi_query import MultiQueryRetriever

                return MultiQueryRetriever.from_llm(retriever=retriever, llm=self.llm)
            except Exception:
                return None


def _extract_json_array(text: str) -> str:
    match = re.search(r"\[[\s\S]*\]", text)
    if match:
        return match.group(0)
    raise ValueError("No JSON array found")


def _fallback_decomposition(query: str) -> list[str]:
    if " and " in query.lower():
        parts = re.split(r"\s+and\s+", query, flags=re.I)
        return [part.strip(" ?") + "?" for part in parts if part.strip()]
    if "compare" in query.lower() or " vs " in query.lower():
        return [
            f"What are the first subject details in: {query}",
            f"What are the second subject details in: {query}",
            f"What differences matter for: {query}",
        ]
    return [query]

