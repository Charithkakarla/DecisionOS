import uuid
import datetime
from fastapi import APIRouter, HTTPException
from app.core.database import SessionLocal
from app.agents.knowledge.repository import DBWorkflowRun, DBWorkflow
from sqlalchemy import select, desc

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])

@router.get("/")
async def list_workflows():
    async with SessionLocal() as session:
        result = await session.execute(
            select(DBWorkflowRun).order_by(desc(DBWorkflowRun.started_at)).limit(50)
        )
        runs = result.scalars().all()
        
        # We also need a mock/real workflow name. Let's just return formatted data.
        history = []
        for run in runs:
            # Map statuses
            t = "warning"
            if run.status == "completed": t = "success"
            elif run.status == "failed": t = "error"
            
            # Formulate time ago (simplified)
            now = datetime.datetime.utcnow()
            diff = now - (run.started_at or now)
            mins = int(diff.total_seconds() / 60)
            time_str = f"{mins} mins ago" if mins < 60 else f"{mins // 60} hours ago"
            
            history.append({
                "id": str(run.id),
                "name": f"Workflow Execution {str(run.id)[:6]}",
                "status": run.status.capitalize(),
                "conf": "High" if run.status == "completed" else "Medium",
                "trust": "95%" if run.status == "completed" else "75%",
                "time": time_str,
                "type": t
            })
            
        return history
