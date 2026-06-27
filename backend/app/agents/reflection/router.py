# Contains: router.py implementation.
import logging
from typing import Dict
from fastapi import APIRouter, HTTPException

from app.schemas.state import WorkflowState, ReflectionArtifact
from app.agents.reflection.service import ReflectionService
from app.agents.reflection.report import WorkflowReport, generate_report
from app.core.database import SessionLocal
from app.agents.knowledge.repository import DBWorkflowRun, DBArtifact

logger = logging.getLogger("decision_os.reflection.router")
router = APIRouter(prefix="/api/v1/reflection", tags=["reflection"])

# Simple in-memory fallback cache to store state across loop dispatches
_workflow_state_cache: Dict[str, WorkflowState] = {}

def should_execute(state: WorkflowState) -> bool:
    # Execute Reflection Agent after Strategy Agent completes
    return (
        state.strategy_artifact is not None
        and state.reflection_artifact is None
        and state.final_action is not None
    )

@router.post("/validate", response_model=ReflectionArtifact)
async def validate_strategy(state: WorkflowState) -> ReflectionArtifact:
    logger.info(f"API: validation requested for workflow {state.workflow_id}")
    
    service = ReflectionService()
    updated_state = await service.execute(state)
    
    if not updated_state.reflection_artifact:
        raise HTTPException(status_code=500, detail="Reflection audit generation failed.")
        
    # Save to memory cache
    _workflow_state_cache[state.workflow_id] = updated_state
    
    # Non-blocking SQLite persistence
    async with SessionLocal() as db_session:
        try:
            import uuid
            # Derive UUID or use random
            run_uuid = uuid.uuid4()
            run_db = DBWorkflowRun(
                id=run_uuid,
                status="completed"
            )
            db_session.add(run_db)
            await db_session.commit()
            
            artifact_db = DBArtifact(
                id=uuid.uuid4(),
                workflow_run_id=run_uuid,
                agent_name="reflection",
                artifact_type="reflection",
                payload=updated_state.reflection_artifact.model_dump(mode="json")
            )
            db_session.add(artifact_db)
            await db_session.commit()
        except Exception as e:
            logger.warning(f"Database persistence skipped during validate: {e}")
            
    return updated_state.reflection_artifact

@router.get("/report/{workflow_id}", response_model=WorkflowReport)
async def get_workflow_report(workflow_id: str) -> WorkflowReport:
    logger.info(f"API: request report for workflow {workflow_id}")
    
    if workflow_id in _workflow_state_cache:
        state = _workflow_state_cache[workflow_id]
        return generate_report(state)
        
    raise HTTPException(status_code=404, detail=f"Workflow report not found for ID: {workflow_id}")
