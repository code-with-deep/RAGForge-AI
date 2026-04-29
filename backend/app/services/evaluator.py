from __future__ import annotations

import json
from pathlib import Path
from statistics import mean
from uuid import uuid4

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from sqlalchemy.orm import Session

from app.config import PROJECT_ROOT, get_settings
from app.models.database import EvaluationResult
from app.models.schemas import (
    BatchEvaluationRequest,
    BatchEvaluationResponse,
    EvaluationItem,
    EvaluationResponse,
    EvaluationResultOut,
    EvaluationScores,
    QueryRequest,
    RetrievalStrategy,
)
from app.services.llm import get_chat_model, llm_status
from app.services.rag_chain import RAGChainService
from app.services.utils import from_json, to_json, tokenize


class EvaluationService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = get_settings()
        self.rag = RAGChainService(db)

    async def evaluate_item(
        self,
        item: EvaluationItem,
        *,
        user_id: str | None = None,
    ) -> EvaluationResponse:
        response = await self.rag.run_query(
            QueryRequest(
                query=item.question,
                strategy=item.strategy,
                filters=item.filters,
            ),
            user_id=user_id,
        )
        context = "\n\n".join(chunk.text for chunk in response.selected_chunks)
        scores = await self._score(
            question=item.question,
            answer=response.answer,
            reference_answer=item.reference_answer,
            expected_context=item.expected_context,
            retrieved_texts=[chunk.text for chunk in response.selected_chunks],
            context=context,
        )
        failure_analysis = self._failure_analysis(scores)
        passed = scores.aggregate >= self.settings.eval_pass_threshold
        result_id = str(uuid4())
        record = EvaluationResult(
            id=result_id,
            user_id=user_id,
            query_id=response.query_id,
            strategy=item.strategy.value,
            question=item.question,
            answer=response.answer,
            reference_answer=item.reference_answer,
            expected_context_json=to_json(item.expected_context),
            scores_json=scores.model_dump_json(),
            passed=passed,
        )
        self.db.add(record)
        self.db.commit()
        return EvaluationResponse(
            id=result_id,
            query_id=response.query_id,
            strategy=item.strategy,
            question=item.question,
            answer=response.answer,
            reference_answer=item.reference_answer,
            scores=scores,
            passed=passed,
            failure_analysis=failure_analysis,
        )

    async def evaluate_batch(
        self,
        request: BatchEvaluationRequest,
        *,
        user_id: str | None = None,
    ) -> BatchEvaluationResponse:
        dataset = self.load_dataset()
        if request.limit:
            dataset = dataset[: request.limit]
        results: list[EvaluationResponse] = []
        for strategy in request.strategies:
            for item in dataset:
                item.strategy = strategy
                results.append(await self.evaluate_item(item, user_id=user_id))

        metric_averages: dict[str, dict[str, float]] = {}
        for strategy in request.strategies:
            strategy_results = [result for result in results if result.strategy == strategy]
            if not strategy_results:
                continue
            metric_averages[strategy.value] = {
                "faithfulness": round(mean(r.scores.faithfulness for r in strategy_results), 4),
                "answer_relevancy": round(mean(r.scores.answer_relevancy for r in strategy_results), 4),
                "context_precision": round(mean(r.scores.context_precision for r in strategy_results), 4),
                "context_recall": round(mean(r.scores.context_recall for r in strategy_results), 4),
                "aggregate": round(mean(r.scores.aggregate for r in strategy_results), 4),
            }
        leaderboard = [
            {"strategy": strategy, **metrics}
            for strategy, metrics in sorted(
                metric_averages.items(), key=lambda item: item[1]["aggregate"], reverse=True
            )
        ]
        return BatchEvaluationResponse(
            results=results,
            leaderboard=leaderboard,
            metric_averages=metric_averages,
        )

    def list_results(self, user_id: str | None = None) -> list[EvaluationResultOut]:
        query = self.db.query(EvaluationResult).order_by(EvaluationResult.created_at.desc())
        if user_id:
            query = query.filter(EvaluationResult.user_id == user_id)
        rows = query.limit(500).all()
        return [
            EvaluationResultOut(
                id=row.id,
                strategy=row.strategy,
                question=row.question,
                answer=row.answer,
                reference_answer=row.reference_answer,
                scores=from_json(row.scores_json, {}),
                passed=row.passed,
                created_at=row.created_at,
            )
            for row in rows
        ]

    def load_dataset(self) -> list[EvaluationItem]:
        candidates = [
            PROJECT_ROOT / "eval_dataset" / "eval_dataset.json",
            Path(__file__).resolve().parents[1] / "data" / "eval_dataset.json",
        ]
        for path in candidates:
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                return [EvaluationItem(**item) for item in data]
        return []

    async def _score(
        self,
        *,
        question: str,
        answer: str,
        reference_answer: str,
        expected_context: list[str],
        retrieved_texts: list[str],
        context: str,
    ) -> EvaluationScores:
        judge = await self._llm_judge(question, answer, reference_answer, context)
        faithfulness = judge.get("faithfulness") or self._faithfulness(answer, context)
        relevancy = judge.get("answer_relevancy") or self._answer_relevancy(question, answer, reference_answer)
        precision = self._context_precision(retrieved_texts, expected_context, reference_answer)
        recall = self._context_recall(context, expected_context, reference_answer)
        aggregate = mean([faithfulness, relevancy, precision, recall])
        return EvaluationScores(
            faithfulness=round(float(faithfulness), 4),
            answer_relevancy=round(float(relevancy), 4),
            context_precision=round(float(precision), 4),
            context_recall=round(float(recall), 4),
            aggregate=round(float(aggregate), 4),
        )

    async def _llm_judge(
        self,
        question: str,
        answer: str,
        reference_answer: str,
        context: str,
    ) -> dict[str, float]:
        if llm_status() == "offline-fallback":
            return {}
        prompt = ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "You are a strict RAG evaluator. Return only JSON with keys faithfulness and answer_relevancy, each 0 to 1.",
                ),
                (
                    "human",
                    "Question: {question}\nReference answer: {reference_answer}\nRetrieved context: {context}\nAnswer: {answer}",
                ),
            ]
        )
        chain = prompt | get_chat_model() | StrOutputParser()
        try:
            output = await chain.ainvoke(
                {
                    "question": question,
                    "reference_answer": reference_answer,
                    "context": context[:8000],
                    "answer": answer,
                }
            )
            payload = json.loads(output[output.index("{") : output.rindex("}") + 1])
            return {
                "faithfulness": min(1.0, max(0.0, float(payload.get("faithfulness", 0)))),
                "answer_relevancy": min(1.0, max(0.0, float(payload.get("answer_relevancy", 0)))),
            }
        except Exception:
            return {}

    def _faithfulness(self, answer: str, context: str) -> float:
        answer_sentences = [sentence for sentence in answer.split(".") if len(sentence.split()) > 4]
        if not answer_sentences:
            return 0.0
        context_terms = set(tokenize(context))
        supported = 0
        for sentence in answer_sentences:
            terms = set(tokenize(sentence))
            if not terms or len(terms.intersection(context_terms)) / len(terms) >= 0.45:
                supported += 1
        return supported / len(answer_sentences)

    def _answer_relevancy(self, question: str, answer: str, reference_answer: str) -> float:
        question_terms = set(tokenize(question))
        answer_terms = set(tokenize(answer))
        reference_terms = set(tokenize(reference_answer))
        if not question_terms or not answer_terms:
            return 0.0
        question_overlap = len(question_terms.intersection(answer_terms)) / len(question_terms)
        reference_overlap = len(reference_terms.intersection(answer_terms)) / max(1, len(reference_terms))
        return min(1.0, 0.45 * question_overlap + 0.55 * reference_overlap)

    def _context_precision(
        self,
        retrieved_texts: list[str],
        expected_context: list[str],
        reference_answer: str,
    ) -> float:
        if not retrieved_texts:
            return 0.0
        relevant_seen = 0
        precision_sum = 0.0
        for rank, text in enumerate(retrieved_texts, start=1):
            if self._is_relevant_context(text, expected_context, reference_answer):
                relevant_seen += 1
                precision_sum += relevant_seen / rank
        if relevant_seen == 0:
            return 0.0
        return precision_sum / relevant_seen

    def _context_recall(
        self,
        context: str,
        expected_context: list[str],
        reference_answer: str,
    ) -> float:
        context_lower = context.lower()
        if expected_context:
            covered = sum(1 for expected in expected_context if expected.lower() in context_lower)
            phrase_score = covered / len(expected_context)
            expected_terms = set(tokenize(" ".join(expected_context)))
        else:
            phrase_score = 0.0
            expected_terms = set()
        reference_terms = expected_terms or set(tokenize(reference_answer))
        if not reference_terms:
            return phrase_score
        token_score = len(reference_terms.intersection(set(tokenize(context)))) / len(reference_terms)
        return min(1.0, max(phrase_score, token_score))

    def _is_relevant_context(
        self,
        text: str,
        expected_context: list[str],
        reference_answer: str,
    ) -> bool:
        lower = text.lower()
        if any(expected.lower() in lower for expected in expected_context):
            return True
        reference_terms = set(tokenize(reference_answer))
        text_terms = set(tokenize(text))
        return bool(reference_terms) and len(reference_terms.intersection(text_terms)) / len(reference_terms) >= 0.22

    def _failure_analysis(self, scores: EvaluationScores) -> list[str]:
        failures: list[str] = []
        if scores.faithfulness < self.settings.eval_pass_threshold:
            failures.append("Faithfulness is below threshold; inspect whether answer claims are supported.")
        if scores.answer_relevancy < self.settings.eval_pass_threshold:
            failures.append("Answer relevancy is below threshold; the generation may not answer the exact question.")
        if scores.context_precision < self.settings.eval_pass_threshold:
            failures.append("Context precision is below threshold; irrelevant chunks are ranked too high.")
        if scores.context_recall < self.settings.eval_pass_threshold:
            failures.append("Context recall is below threshold; expected evidence was not retrieved.")
        return failures

