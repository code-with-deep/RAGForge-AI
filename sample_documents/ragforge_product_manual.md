# RAGForge Product Manual

## Document Ingestion

RAGForge accepts PDF files through PyPDFLoader, text files through TextLoader, DOCX files through UnstructuredWordDocumentLoader, and Markdown files through UnstructuredMarkdownLoader or a text fallback. Every loaded page or document is enriched with source, page_number, file_type, upload_date, tags, file size, total pages, and detected section headers.

## Chunking Strategies

The platform stores every chunk in Chroma with a strategy metadata field. Recursive chunking uses a 500 token chunk size with 50 tokens of overlap. Semantic chunking groups neighboring sentences while their embedding similarity remains high and starts a new chunk when similarity drops. Parent-child chunking creates small 200 token child chunks for retrieval and larger 1000 token parent chunks for LLM context. Section-based chunking splits documents at H1 and H2 style headers and keeps the section name in metadata.

## Retrieval Strategies

Basic Vector search uses dense vector similarity against Chroma. Hybrid search combines semantic vector results with BM25 keyword results. Reciprocal Rank Fusion merges both lists with k=60 and configurable semantic and keyword weights. Hybrid + Re-Rank retrieves the top 20 hybrid candidates, scores them with a cross-encoder, and sends the top 5 chunks to generation.

## Query Transformation

Multi-query expansion creates three to five alternative phrasings of the user question. HyDE generates a hypothetical answer passage and retrieves by that passage. Query decomposition breaks complex questions into smaller sub-questions before retrieval. Step-back prompting creates a broader background question that improves recall for very specific prompts.

## Pipeline Transparency

For every query, RAGForge records the original query, transformed queries, top retrieved chunks, vector similarity score, BM25 score, reciprocal rank fusion score, re-ranking score, original rank, new rank, selected context, full LLM prompt, generated answer, token usage, and latency per step.

