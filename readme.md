# 🕵️ Root Cause Analysis (RCA) Generator API

A log-based RCA generator powered by **RAG (Retrieval-Augmented Generation)**, **OpenRouter LLMs**, and **Pinecone vector search**. Built for transaction debugging and failure analysis.

---

## 🚀 Key Highlights

- ⚙️ **RAG**: Extract failed transaction data and enrich it with contextual vector search.
- 🧠 **LLM-Driven Analysis**: Uses OpenRouter (Mistral model) to generate structured RCA reports in Markdown format.
- 📦 **Dockerized**: Easily deployable with Docker (containerized API and dependencies).
- 🔄 **CI/CD Pipeline**: GitHub Actions handles build, test, and deployment workflows.

---

## 📦 Features

- Upload `.log` files containing transaction data.
- Extract failed transactions with `getFailedTransactionsTool` .
- Semantic search in **Pinecone** to retrieve similar failure patterns.
- Prompt OpenRouter LLM to generate an RCA report.
- Output as clean, structured Markdown for easy reporting or audit.

---

## 🛠️ Technologies Used

| Technology       | Purpose                             |
|------------------|-------------------------------------|
| **Express.js**   | API server                          |
| **Multer**       | File upload middleware              |
| **Pinecone**     | Vector DB for contextual retrieval  |
| **OpenRouter**   | Access to open LLMs (Mistral)       |
| **Docker**       | Containerization                    |
| **GitHub Actions** | CI/CD for testing and deployment |

---

## 🔌 API Endpoint

### `POST /rca`

Upload a `.log` file and receive a Markdown-based RCA.

#### Request

- Content-Type: `multipart/form-data`
- Field: `logfile`

```bash
curl -X POST http://localhost:3000/rca \
  -H "Content-Type: multipart/form-data" \
  -F "logfile=@transaction.log"
