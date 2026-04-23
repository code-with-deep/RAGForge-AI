# 🚀 RAGForge AI  
### Production-Grade Advanced RAG Platform with Hybrid Search, Re-Ranking & Evaluation

---

## 📌 Overview

RAGForge AI is a **production-grade Advanced Retrieval-Augmented Generation (RAG) system** built using LangChain (LCEL), FastAPI, and Next.js.

This project goes beyond basic RAG by implementing **hybrid search, cross-encoder re-ranking, multiple retrieval strategies, and a full evaluation pipeline**, making it reliable and explainable for real-world applications.

---

## 🎯 Key Features

### 🔍 Advanced Retrieval System
- Hybrid Search (Semantic + BM25)
- Reciprocal Rank Fusion (RRF)
- Multiple Retrieval Strategies:
  - Basic Vector
  - Hybrid
  - Hybrid + Re-Rank
  - Parent-Child
  - Multi-Query
  - HyDE
  - Query Decomposition

---

### 🧠 Query Intelligence
- Multi-Query Expansion
- Query Decomposition
- Step-back prompting
- HyDE (Hypothetical Document Embeddings)

---

### ⚡ Re-Ranking
- Cross-Encoder Re-ranking
- Improves retrieval precision significantly

---

### 📂 Document Processing
- Supports:
  - PDF
  - TXT
  - DOCX
  - Markdown
- Multiple chunking strategies:
  - Recursive chunking
  - Parent-child chunking
  - Section-based chunking
  - Semantic chunking

---

### 📊 RAG Evaluation System
- Faithfulness
- Answer Relevancy
- Context Precision
- Context Recall
- Evaluation dataset (15–30 Q&A pairs)
- Strategy comparison

---

### 🔎 Pipeline Transparency (Core Highlight)
- Full pipeline visualization:
  - Query → Transform → Retrieve → Re-rank → Generate
- Shows:
  - Retrieved chunks
  - Vector similarity scores
  - BM25 scores
  - Re-ranking scores
  - Rank changes
  - Final LLM prompt

---

### ⚙️ Metadata Filtering
- Filter by:
  - Source document
  - Page number
  - Section
  - Tags
  - Chunking strategy

---

### 📈 A/B Testing
- Compare retrieval strategies side-by-side
- Evaluate performance differences

---

### 🖥️ Frontend (Next.js)
- Query interface with strategy selector
- Pipeline visualizer
- Evaluation dashboard (charts)
- Document management system
- A/B comparison UI

---

### 🔐 Bonus Features
- JWT Authentication
- User-specific document storage
- Home, Features, Workflow pages

---

## 🏗️ Architecture
