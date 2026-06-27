import uuid
from fastapi import APIRouter
from app.core.database import SessionLocal
from app.agents.knowledge.repository import DBWorkflowRun, DBDocument
from sqlalchemy import select, func, desc

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])

@router.get("/metrics")
async def get_dashboard_metrics():
    async with SessionLocal() as session:
        # Total workflows
        workflows_count = await session.execute(select(func.count(DBWorkflowRun.id)))
        w_count = workflows_count.scalar() or 0
        
        # Total docs
        docs_count = await session.execute(select(func.count(DBDocument.id)))
        d_count = docs_count.scalar() or 0
        
        # Pending approvals (just mock this based on status for now)
        pending_count = await session.execute(
            select(func.count(DBWorkflowRun.id)).where(DBWorkflowRun.status == "running")
        )
        p_count = pending_count.scalar() or 0
        
        # Recent Activity
        recent_runs = await session.execute(
            select(DBWorkflowRun).order_by(desc(DBWorkflowRun.started_at)).limit(3)
        )
        runs = recent_runs.scalars().all()
        activity = []
        for r in runs:
            activity.append({
                "title": f"Workflow Execution {str(r.id)[:6]}",
                "time": "Just now",
                "status": "Completed" if r.status == "completed" else "Running"
            })
            
        # Add some mock activity if empty
        if not activity:
            activity = [
                {"title": "System Initialization", "time": "1 hour ago", "status": "Completed"}
            ]

        return {
            "total_workflows": w_count,
            "knowledge_documents": d_count,
            "average_trust_score": "95%",
            "pending_approvals": p_count,
            "recent_activity": activity
        }
