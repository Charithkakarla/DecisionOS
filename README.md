# DecisionOS — Agentic Decision Intelligence Platform

> Transforms customer interactions and enterprise knowledge into explainable, evidence-backed next best actions through a fully autonomous 7-agent pipeline with human-in-the-loop governance.

---

## Business Use Case

**Domain:** B2B SaaS Sales Intelligence

A sales executive pastes a meeting transcript. DecisionOS automatically extracts business context, retrieves relevant playbooks, scores opportunities and risks, generates ranked next-best-action recommendations with traceable evidence, critiques its own reasoning, simulates alternative scenarios, and routes the output for human approval — all before a single recommendation is acted upon.

**Decision Points Covered:**
- Should we expand this account or protect revenue?
- Which strategy has the best risk/ROI balance given our constraints?
- Is this decision ready to be made with the information we have?
- What would happen if we changed budget, timeline, or team size?

---

## Architecture

```
Transcript / CRM Update
        │
        ▼
┌──────────────────┐
│  Planner Agent   │  ← orchestrates the full chain via agent_registry
└────────┬─────────┘
         │
    ┌────▼────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Context │───▶│Knowledge │───▶│ Decision │───▶│ Strategy │
    │  Agent  │    │  Agent   │    │  Agent   │    │  Agent   │
    └─────────┘    └──────────┘    └──────────┘    └────┬─────┘
                        │                               │
                   Hybrid Search                  3-Scenario
                  (Qdrant + FTS)                  Simulation
                        │                               │
                        └──────────────┬────────────────┘
                                       ▼
                               ┌──────────────┐
                               │  Reflection  │  ← hallucination detection,
                               │    Agent     │    trust score, governance
                               └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │   Approval   │  ← human-in-the-loop gate
                               │    Agent     │    approve / modify / escalate / reject
                               └──────┬───────┘
                                      │
                               ┌──────▼───────┐
                               │   Learning   │  ← indexes to OrganizationalMemory,
                               │    Agent     │    updates trends, generates insights
                               └──────────────┘
```

**Stack:**
- Backend: FastAPI + SQLAlchemy (async) + PostgreSQL + pgvector + Qdrant + Redis
- Frontend: React + TypeScript + Vite + Tailwind CSS
- LLM Providers: Gemini (embeddings + reasoning), Groq/Grok (via OpenAI-compatible API), Mock (dev/testing)
- Infrastructure: Docker Compose

---

## Key Features

| Feature | Description |
|---|---|
| **Planner Orchestration** | `PlannerService` dynamically routes through 7 agents using a pluggable registry |
| **Hybrid RAG** | Semantic (Qdrant vectors) + BM25 keyword search, blended 70/30 |
| **Traceable Evidence** | Every recommendation links to document, chunk, similarity score, and quoted text |
| **Decision Readiness Score** | Evaluates 7 criteria before recommendations — tells you if you're ready to decide |
| **Devil's Advocate** | AI self-critique: counter-arguments, weak evidence, alternative paths per recommendation |
| **What-If Simulator** | Adjust budget/timeline/team/risk in real time, watch scores and ROI recalculate instantly |
| **Confidence Split** | Context / Evidence / Provider / Decision confidence shown separately |
| **Human-in-the-Loop** | Full approval workflow: approve, modify with diffs, escalate, or reject |
| **Organizational Memory** | Every decision indexed to `OrganizationalMemory` + `LearningHistory` for future retrieval |
| **Executive Report** | One-click PDF report generation from any completed workflow |
| **War Room View** | Single-page executive workspace: readiness + recommendations + simulator + approval |

---

## Setup

### Prerequisites
- Docker Desktop (or Docker Engine + Compose)
- A Gemini API key and/or a Groq API key

### 1. Configure environment
```bash
cd backend
cp .env.example .env
# Edit .env and add your API keys:
# DECISION_OS_GEMINI_API_KEY=your_key
# DECISION_OS_GROK_API_KEY=your_groq_key
# DECISION_OS_GROK_BASE_URL=https://api.groq.com/openai/v1
# DECISION_OS_GROK_MODEL=llama-3.3-70b-versatile
# DECISION_OS_CONTEXT_PROVIDER=grok   # or gemini
```

### 2. Run
```bash
# From project root
docker-compose up --build
```

### 3. Access
| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

### Local development (without Docker)
```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

> You'll need PostgreSQL with pgvector, Qdrant, and Redis running locally. See `docker-compose.yml` for connection details.

---

## How to Use

1. **Upload knowledge** — Go to Knowledge Base, upload PDF/DOCX/TXT playbooks. They're chunked and embedded automatically.
2. **Run a workflow** — Go to Workflows → New Analysis, paste a meeting transcript or CRM note, click Run.
3. **Inspect results** — Open the workflow → explore tabs: Context, Decision, What-If Simulator, Devil's Advocate, Strategy, Reflection.
4. **War Room** — Click the "War Room" tab for a single-page executive view of readiness, top recommendation, evidence, and simulator.
5. **Submit approval** — In the Approval tab: approve, modify, escalate, or reject with structured feedback.
6. **Review learning** — After approval, the Learning tab shows extracted patterns, insights, and Decision DNA from historical decisions.
7. **Generate report** — Click the Report tab to generate and print a formatted executive PDF.

---

## Project Structure

```
DecisionOS/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── context/      # Context extraction agent
│   │   │   ├── knowledge/    # Hybrid RAG agent
│   │   │   ├── decision/     # Reasoning & recommendation agent
│   │   │   ├── strategy/     # 3-scenario strategy agent
│   │   │   ├── reflection/   # Governance & hallucination agent
│   │   │   ├── approval/     # Human-in-the-loop agent
│   │   │   ├── learning/     # Organizational memory agent
│   │   │   ├── planner/      # Orchestrator (registry + router)
│   │   │   ├── dashboard/    # Metrics API
│   │   │   └── workflows/    # Workflow history API
│   │   ├── contracts/        # Agent protocol interfaces
│   │   ├── core/             # Config, database, provider utils
│   │   ├── schemas/          # Shared state & artifact schemas
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/       # Agent dashboards, simulator, report
│       ├── pages/            # Dashboard, Workflows, Knowledge, Reports, Analytics
│       ├── lib/              # API client, workflow store
│       └── types/            # TypeScript agent type definitions
└── docker-compose.yml
```

---

## Extending the Platform

To add a new agent:
1. Create `backend/app/agents/<name>/service.py` implementing `execute(state) -> state`
2. Add a contract in `backend/app/contracts/<name>.py`
3. Register in `backend/app/agents/planner/registry.py`: `agent_registry.register("<name>", MyService())`
4. Add routing condition in `backend/app/agents/planner/router.py`

The platform is provider-agnostic — each agent has a `providers/` directory with `base.py` (abstract), `gemini.py`, `grok.py`, and `mock.py`. Switch providers via `.env`.
