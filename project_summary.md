# DecisionOS — System Overview & Architecture

DecisionOS is an enterprise-ready, multi-agent decision intelligence platform. It orchestrates a linear pipeline of agents (Context → Knowledge → Decision → Strategy) to analyze raw transcripts, fetch verifying playbooks, calculate business scores, and propose action plans.

---

## Technical Stack

### Backend
- **Core Framework**: FastAPI (Python 3.13)
- **Database Layer**: PostgreSQL (v15+) with `pgvector` extension for semantic searches.
- **ORM**: SQLAlchemy (Async Engine)
- **Caching Layer**: Redis (port 6379) for caching semantic queries.
- **Asynchronous Execution**: FastAPI `BackgroundTasks` for non-blocking file ingestion.
- **AI Integrations**: Gemini API (model `text-embedding-004` and `gemini-1.5-pro` / `gemini-2.0`) and Grok API client protocols.
- **Validations**: Pydantic v2 schemas.

### Frontend
- **Core Framework**: React (v18+) with TypeScript.
- **Build Tooling**: Vite & TailwindCSS.
- **Styling**: Modern, premium CSS (glassmorphism, color-coded badges, dark modes).

---

## Repository Structure

```text
DecisionOS/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── context/        # Context Intelligence Agent (transcripts -> structured data)
│   │   │   ├── knowledge/      # Knowledge Intelligence Agent (ingest, chunk, hybrid retrieve, pgvector)
│   │   │   ├── decision/       # Decision Intelligence Agent (business reasoning, scoring, confidence)
│   │   │   ├── strategy/       # Strategy Agent (scaffold/mock)
│   │   │   └── planner/        # Planner Orchestrator (coordinates agent runs)
│   │   ├── contracts/          # Strict Protocols for agent modularity
│   │   ├── core/               # Configuration (config.py, database.py)
│   │   ├── schemas/            # Unified State Schemas (state.py)
│   │   └── main.py             # FastAPI App mounting routers & database startup migrations
│   ├── tests/                  # Backend unit & integration tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # KnowledgeDashboard, DecisionDashboard, Inspector, LogStream
│   │   ├── types/              # TypeScript typings mirroring backend schemas (agent.ts)
│   │   ├── App.tsx             # Main entry point mounting tabs
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
└── docker-compose.yml          # Houses PostgreSQL and Redis container specs
```

---

## Implemented Agent Modules

### 1. Planner Orchestrator (`app/agents/planner/`)
- **Role**: Coordinates the workflow. It reads the current `WorkflowState` and dispatches work to the next agent needing execution. It contains NO AI logic itself.
- **Core Files**: `service.py`, `router.py`, `workflow.py`.

### 2. Context Intelligence Agent (`app/agents/context/`)
- **Role**: Takes a raw conversational transcript input and extracts structured business context: meeting summaries, customer profile, timelines, budgets, stakeholders, and pain points.
- **Core Files**: `service.py`, `router.py`, `providers/`.

### 3. Enterprise Knowledge Agent (`app/agents/knowledge/`)
- **Role**: Indexes uploaded PDF, DOCX, and TXT files, chunks them using character sliding windows, computes embeddings via Gemini, and runs hybrid retrieval (pgvector cosine similarity + Postgres full-text keyword searches) to construct a validated `EvidencePackage`.
- **Core Files**: `service.py`, `router.py`, `repository.py`, `ingest.py`, `chunking.py`, `retrieval.py`, `cache.py`.

### 4. Decision Intelligence Agent (`app/agents/decision/`)
- **Role**: Computes opportunity, risk, priority, value, and readiness metrics. Performs confidence checks on missing fields. Selects exactly three ranked actions (Primary, Alternative, Fallback) and maps them to database-verified evidence citations.
- **Core Files**: `service.py`, `router.py`, `reasoning.py`, `scoring.py`, `confidence.py`, `validator.py`, `providers/`.

---

## Setup & Verification Commands

### Database & Cache Services
Starts the local dockerized services on ports `5434` (PostgreSQL) and `6379` (Redis):
```bash
docker-compose up -d
```

### Python Backend
Installs dependencies, runs migrations, executes the unit tests, and launches uvicorn:
```bash
# Run pytest unit test suites
.venv\Scripts\python -m pytest backend/app/agents/knowledge/tests.py
.venv\Scripts\python -m pytest backend/app/agents/decision/tests.py

# Launch development backend server
cd backend
..\.venv\Scripts\python -m uvicorn app.main:app --reload
```

### React Frontend
Launches the developer server and tests production bundling:
```bash
cd frontend
npm run dev

# Run production bundling checks
npm run build
```
