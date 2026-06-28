import datetime
from fastapi import APIRouter, HTTPException
from app.core.database import SessionLocal
from app.agents.knowledge.repository import DBWorkflowRun
from sqlalchemy import select, desc

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


def _format_time_ago(dt: datetime.datetime | None) -> str:
    if not dt:
        return "Unknown"
    diff = datetime.datetime.utcnow() - dt
    secs = int(diff.total_seconds())
    if secs < 60:
        return "Just now"
    if secs < 3600:
        return f"{secs // 60}m ago"
    if secs < 86400:
        return f"{secs // 3600}h ago"
    return f"{secs // 86400}d ago"


def _extract_summary(payload: dict | None) -> dict:
    """Extract key metrics from stored WorkflowState JSON."""
    if not payload:
        return {}
    try:
        dec = payload.get("decision_artifact") or {}
        dec_p = dec.get("payload") or {}
        strat = payload.get("strategy_artifact") or {}
        strat_p = strat.get("payload") or {}
        ref = payload.get("reflection_artifact") or {}
        ref_p = ref.get("payload") or {}
        ctx = payload.get("context_artifact") or {}
        ctx_p = ctx.get("payload") or {}

        top_rec = (dec_p.get("recommendations") or [{}])[0]
        return {
            "workflow_id":       payload.get("workflow_id", ""),
            "execution_id":      payload.get("execution_id", ""),
            "business_goal":     dec_p.get("business_goal") or ctx_p.get("business_goal") or "—",
            "top_recommendation": top_rec.get("title", "—"),
            "risk_level":        top_rec.get("risk_level", "—"),
            "confidence":        top_rec.get("confidence", 0),
            "trust_score":       ref_p.get("overall_trust_score", 0),
            "governance_score":  ref_p.get("governance_score", 0),
            "estimated_roi":     strat_p.get("estimated_roi", 0),
            "selected_strategy": strat_p.get("selected_strategy", "—"),
            "agents_completed":  sum(1 for k in [
                "context_artifact", "knowledge_artifact", "decision_artifact",
                "strategy_artifact", "reflection_artifact", "approval_artifact", "learning_artifact"
            ] if payload.get(k)),
        }
    except Exception:
        return {}


@router.get("/")
async def list_workflows():
    async with SessionLocal() as session:
        result = await session.execute(
            select(DBWorkflowRun).order_by(desc(DBWorkflowRun.started_at)).limit(50)
        )
        runs = result.scalars().all()
        history = []
        for run in runs:
            summary = _extract_summary(run.payload)
            history.append({
                "id":                str(run.id),
                "status":            run.status.capitalize(),
                "started_at":        run.started_at.isoformat() if run.started_at else None,
                "completed_at":      run.completed_at.isoformat() if run.completed_at else None,
                "time_ago":          _format_time_ago(run.started_at),
                "has_payload":       bool(run.payload),
                **summary,
            })
        return history


@router.get("/{run_id}/state")
async def get_workflow_state(run_id: str):
    """Return the full persisted WorkflowState JSON for a past run."""
    async with SessionLocal() as session:
        try:
            import uuid as _uuid
            rid = _uuid.UUID(run_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid run ID")

        run = await session.get(DBWorkflowRun, rid)
        if not run:
            raise HTTPException(status_code=404, detail="Workflow run not found")
        if not run.payload:
            raise HTTPException(status_code=404, detail="No state stored for this run")

        return run.payload
