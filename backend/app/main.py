# Contains: main.py implementation.
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.planner.workflow import run_workflow
from app.schemas.state import WorkflowState
from app.core.database import engine
from app.agents.knowledge.repository import init_db
from app.agents.knowledge.router import router as knowledge_router
from app.agents.decision.router import router as decision_router
from app.agents.strategy.router import router as strategy_router
from app.agents.reflection.router import router as reflection_router
from app.agents.approval.router import router as approval_router
from app.agents.learning.router import router as learning_router
from app.agents.workflows.router import router as workflows_router
from app.agents.dashboard.router import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize the database on startup (pgvector and tables including Sprint 8 tables)
    await init_db(engine)
    yield


app = FastAPI(title="Decision OS API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge_router)
app.include_router(decision_router)
app.include_router(strategy_router)
app.include_router(reflection_router)
app.include_router(approval_router)
app.include_router(learning_router)
app.include_router(workflows_router)
app.include_router(dashboard_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/agent/run", response_model=WorkflowState)
async def run_agent(state: WorkflowState) -> WorkflowState:
    return await run_workflow(state)

# touch
