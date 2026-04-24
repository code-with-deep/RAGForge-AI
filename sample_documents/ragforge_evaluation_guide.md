# RAGForge Evaluation Guide

## Metrics

Faithfulness measures whether the generated answer is supported by retrieved context. Answer relevancy measures whether the answer addresses the user question. Context precision is rank-aware and rewards relevant chunks appearing higher in the retrieved list. Context recall measures whether the retrieved context covers the expected evidence needed for the reference answer.

## Dataset

The evaluation dataset contains 20 question and answer pairs. Each item includes a reference answer and expected context phrases that should appear in retrieved evidence. Batch evaluation runs the dataset against selected strategies and stores every result in SQLite.

## Strategy Leaderboard

The evaluation dashboard compares Basic Vector, Hybrid, Hybrid + Re-Rank, Parent-Child, Multi-Query, HyDE, and Query Decomposition. The leaderboard ranks strategies by the average of faithfulness, answer relevancy, context precision, and context recall.

## Failure Analysis

A score below the pass threshold identifies a failure mode. Low faithfulness means answer claims may not be supported. Low answer relevancy means the generated answer may drift away from the question. Low context precision means irrelevant chunks are ranked too high. Low context recall means expected evidence was not retrieved.

