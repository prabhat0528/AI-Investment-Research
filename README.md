# 📈 AI-Powered Investment Research Suite

* **GitHub Repository:** [https://github.com/prabhat0528/AI-Investment-Research](https://github.com/prabhat0528/AI-Investment-Research)
* **Live Deployment:** [https://ai-investment-research-analysis.vercel.app/](https://ai-investment-research-analysis.vercel.app/)

An advanced, enterprise-grade investment intelligence platform combining **conversational financial analysis** and **autonomous multi-agent audit reporting** powered by Google Gemini, LangGraph, and PostgreSQL.

---

## 🌟 Overview

The **AI Investment Research Suite** is a next-generation terminal designed for institutional-grade financial analysis. It bridges the gap between raw market data and high-signal investment logic by orchestrating a team of autonomous AI agents to research, audit, and analyze companies.

Instead of navigating fragmented balance sheets and news aggregators, analysts can run comprehensive strategic audits or hold deep conversations with an AI specialist injected with real-time financial metrics, news sentiment, and historical reports.

### 💡 Core Value Proposition

* **High-Signal Intelligence:** Bypasses noisy news and extracts only verified market triggers, valuation multiples, and structural risks.
* **Sequential Multi-Agent Pipeline:** Utilizes a pipeline of specialized LangGraph agents (planner, financial, risk, news, sentiment, valuation, and writer) to build a cohesive investment memo.
* **Stateful Conversations:** Employs server-side session checkpointers (`MemorySaver`) to maintain context-aware chat memory with built-in topic restrictions and guardrails.
* **Real-time Synchronization:** Keeps ticker feeds and alerts actively syncing to provide a cohesive terminal experience.

---

## ⚙️ How It Works: Our Approach & Architecture

Our approach is built on two core pillars: **Separation of Concerns** (dividing analytical tasks among specialized, chained agents) and **Resilient Execution** (ensuring high availability and fault-tolerant APIs).

### 1. The Multi-Agent Design Pattern
Investment analysis requires looking at a company through multiple orthogonal lenses. Rather than prompting a single monolithic LLM—which often leads to generic insights and hallucinations—we delegate specific dimensions of research to distinct, specialized agent nodes using **LangGraph**:

* **Planner Agent:** Interprets the audit request, resolves the target stock symbol, fetches baseline financial statements, and schedules the execution pipeline.
* **Financial Analyst Agent:** Scans historical balance sheets, evaluates profitability margins, computes debt-to-equity and liquidity ratios, and grades structural health.
* **Risk Analyst Agent:** Analyzes debt loads, cash flow constraints, and operational vulnerabilities.
* **News & Sentiment Agent:** Scrapes real-time headlines, extracts sentiment trends, and flags positive/negative market indicators.
* **Valuation Specialist Agent:** Benchmarks multiples (P/E, EV/EBITDA, P/B) and assesses peer valuation models.
* **Report Generator Agent:** Collects inputs from all nodes, validates them against strict fact-based guards to prevent hallucination, and compiles a structured PDF/Markdown report.

### 2. Sequential Execution & Pipeline Stability
The auditor executes these specialized nodes sequentially inside a clean LangGraph pipeline to prevent state-merging latency and Pregel fan-in write conflict bugs (such as Pregel `LastValue` channel collisions). This guarantees deterministic execution flows and robust, error-free state accumulation across all agent steps.

### 3. Stateful Session Memory & Caching
* **Checkpointed Memory (`MemorySaver`):** The chat interface relies on a server-side `MemorySaver` thread manager. Every interaction is saved as a session state checkpoint, ensuring conversation continuity even if a user refreshes their browser or logs out.
* **O(1) LRU Cache:** The backend maintains an in-memory Least-Recently-Used (LRU) cache of compiled reports. Repeated requests bypass database queries entirely, delivering reports instantly while validating user ownership.

## 🚀 Key Features

### 1. 🤖 Conversational Research Agent
* **Contextual Data Injection:** Automatically detects stock symbols in user conversations, fetches live balance sheets, margins, and ratios, and feeds them to the LLM.
* **LangGraph MemorySaver:** Remembers past conversation states and questions server-side, allowing users to exit and return without losing thread memory.
* **Strict Guardrails:** Guided by prompt instructions to restrict answers strictly to the financial and stock market domain, gracefully rejecting out-of-context queries.

### 2. 📋 Sequential Multi-Agent Audit Graph
* **Chained Analysis Pipeline:** Chained nodes execute financial, risk, news, sentiment, and valuation audits sequentially to avoid state-merging conflicts.
* **Deterministic Report Generation:** Synthesizes analysis into professional, downloadable PDF reports.
* **Hallucination Guards:** Enforces strict facts-only validation to prevent extrapolation of missing data.
* **O(1) LRU Caching:** Caches compiled reports to minimize database queries and latency.

### 3. 📰 4-Hour Background Polling Service
* **News Summarization:** Scrapes Yahoo Finance news for pinned/bookmarked tickers every 4 hours.
* **Synthesized Alerts:** Compiles raw news headlines into concise, 2-bullet emoji summaries displayed directly in the user's notification dropdown.

---

## ⚖️ Key Decisions & Trade-offs

During development, we evaluated several technical choices to balance architectural robustness, performance, and API rate constraints:

### 1. What We Implemented & Why
* **Sequential Pipeline over Parallel Concurrency:** Implemented a sequential multi-agent LangGraph workflow instead of concurrent branching. This completely resolves state-merging latency and bypasses Pregel fan-in write conflict bugs (such as LastValue write collisions) present in `@langchain/langgraph` v0.0.12, ensuring highly stable, deterministic data flows.
* **Server-Side Thread Checkpointing over LocalStorage:** Implemented LangGraph's `MemorySaver` on the backend rather than storing history in the browser's `localStorage`. This ensures chat memory persists securely across user sessions, devices, and tabs.
* **CORS-Bypassing Proxies with Active Fallback Loops:** To handle corporate decrypting firewalls (like Sophos) and client-side CORS blocks, we routed all stock quotes through a local Express proxy. If the outbound proxy calls are blocked at the firewall, the system seamlessly triggers a client-side random-walk simulator to ensure marquee prices remain dynamic.
* **API Key Rotation, Fallbacks & Resilient Groq Retry:** Cleaned and deduplicated the backup API keys pool with a 500ms cool-down delay. We integrated multiple Gemini models (3.5 & 2.0 flash) for key-rotation failover. Furthermore, we implemented a resilient Groq (Llama 3.3 70B) backup system: if a Gemini rate limit (429) is hit anywhere in the workflow, the system triggers a global cooldown, aborts the current run, and restarts the entire audit from scratch utilising Groq/Llama exclusively to ensure execution success.
* **Real-Time Stock Fetching via Finnhub API:** Implemented real-time market data retrieval querying the Finnhub API directly on the client side to keep stock metrics, price movements, and percentage changes accurate and synchronized.
* **Interactive Financial Advisory Chatbot:** Built a context-aware chat specialist that automatically extracts stock tickers from user queries, resolves live financial statements/metrics, and provides structured stock analysis and investment advice under strict anti-jailbreak domain restrictions.

### 2. What We Left Out (Future Roadmap)
* **Redis for Notification Queue:** Left out Redis for the notifications queue (currently using an in-memory database queue fallback). We plan to integrate Redis in production to support persistent message queuing, broker isolation, and high-frequency pub/sub alerts.
* **Premium Memberships & High-Limit Paid APIs:** Left out paid financial endpoints (like paid Bloomberg, Reuters, or premium Finnhub accounts). In the future, we plan to implement a "Premium Tier" where paid members unlock high-limit, highly accurate API integrations bypassing free-tier rate limits.
* **LLM Evaluation Framework (Evals):** Skipped automated LLM output validation (e.g., using Ragas, Phoenix, or TruLens). We plan to implement LLM Evals to systematically evaluate the generated audit reports for faithfulness, answer relevance, and context recall.
* **Sentiment Model Fine-Tuning:** Skipped fine-tuning a custom localized language model (like a BERT or LLaMA variant) for financial sentiment analysis due to **GPU and hardware resource constraints**. Instead, we leveraged specialized prompting instructions on top of Gemini's foundational models.
* **Persistent Chat Memory & Caching:** Left out persistent database storage and caching for the conversational chatbot (currently using an in-memory `MemorySaver` checkpointer). In the future, we plan to use persistent storage (such as PostgreSQL or Redis) and caching to fast-track quote fetches and provide long-term, durable chat history that survives server restarts.
* **User Feedback Loops for Audit Alignment:** Skipped direct user feedback loops over generated reports in the initial version. In the future, we plan to implement structured feedback widgets (ratings, metrics adjustments, and thesis corrections) to backpropagate analyst inputs, enabling continuous reinforcement learning (RLHF) and few-shot alignment to refine valuation decisions and overall report quality.
* **Token Optimization & User Rate Limiting:** Skipped advanced input/output token reduction filters and user-level request throttling in the initial release. In the future, we plan to implement: (1) Input Token Reduction by stripping noise data (such as boilerplate HTML tags, style scripts, and duplicate news JSON payloads) before feeding context to the LLM, (2) Output Token Minimization by enforcing strict constraints that prioritize highly summarized, high-signal bulleted results, and (3) User-Level Rate Limiting (using Redis Token Bucket or Leaky Bucket algorithms) to throttle user requests over specific intervals, preventing API quota abuse.

---

## 🛠️ System Architecture

```mermaid
graph TD
    User["User Client"] -->|Queries Chat / Requests Audit| UI["React Frontend Terminal"]
    UI -->|API Requests| Express["Express Node.js Server"]

    subgraph "AI Orchestration Layer (LangGraph)"
        Planner["planner"]
        FinAgent["financial_agent"]
        RiskAgent["risk_agent"]
        NewsAgent["news_agent"]
        SentAgent["sentiment_agent"]
        ValAgent["valuation_agent"]
        RepGen["report_generator"]

        Planner --> FinAgent
        FinAgent --> RiskAgent
        RiskAgent --> NewsAgent
        NewsAgent --> SentAgent
        SentAgent --> ValAgent
        ValAgent --> RepGen
    end

    Express -->|Trigger Graph| Planner
    Express -->|Session Memory| Saver["LangGraph MemorySaver"]
    Express -->|Real-time Quotes| Finnhub["Finnhub Client API"]
    Express -->|Financials & Headlines| Yahoo["Yahoo Finance API"]
    Express -->|Store Reports & Bookmarks| Neon["Neon PostgreSQL Database"]
```

---

## 💻 Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React, TailwindCSS, Vite, Lucide React, React Router |
| **Backend** | Node.js, Express, PostgreSQL (Neon client) |
| **AI Orchestration** | `@langchain/langgraph`, Google Gemini SDK |
| **Data Providers** | Finnhub API (Real-time), Yahoo Finance API (Historical & News) |
| **Deployment** | Vercel  |

---

## 💬 My Chats with AI

To explore the conceptual roadmap, pair-programming thought process, and architectural decisions made while developing this project, check out the chat transcript:
* 🔗 [Investment Research Agent Project Design Chat](https://chatgpt.com/c/6a48fa48-328c-83e8-84f1-4de73b02b174) — A transcript detailing how we conceptualized, debugged, and optimized the suite.

---


## 📬 Support & Contact

If you need any assistance, have questions, or require help running the application on your localhost, please feel free to reach out:
* **Email:** [prabhatrai0528@gmail.com](mailto:prabhatrai0528@gmail.com)
