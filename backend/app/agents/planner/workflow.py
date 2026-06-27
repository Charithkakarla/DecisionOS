from app.agents.planner.service import PlannerService
from app.schemas.state import WorkflowState
from app.core.database import SessionLocal
from app.agents.knowledge.repository import DBWorkflowRun
import uuid

from fastapi import HTTPException
import traceback

async def run_workflow(state: WorkflowState) -> WorkflowState:
    try:
        # 1. Create DB Workflow Run
        async with SessionLocal() as session:
            db_run = DBWorkflowRun(id=uuid.uuid4(), status="running")
            session.add(db_run)
            await session.commit()
            run_id = db_run.id
        
        # 2. Execute Planner
        planner = PlannerService()
        final_state = await planner.execute(state)
        
        # 3. Update Status
        async with SessionLocal() as session:
            db_run = await session.get(DBWorkflowRun, run_id)
            if db_run:
                db_run.status = "completed"
                await session.commit()
                
        return final_state
    except Exception as e:
        error_msg = f"Error in run_workflow: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
