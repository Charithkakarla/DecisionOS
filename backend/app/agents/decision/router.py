# Contains: router.py implementation.
import logging
from typing import Any
from fastapi import APIRouter, HTTPException
from app.schemas.state import WorkflowState
from app.agents.decision.schemas import DecisionAnalysis
from app.agents.decision.service import DecisionService

logger = logging.getLogger("decision_os.decision.router")
router = APIRouter(prefix="/api/v1/decision", tags=["decision"])

def should_execute(state: WorkflowState) -> bool:
    # Execute if context and playbooks exist, but decision package is missing
    return state.decision_package is None

@router.post("/analyze", response_model=DecisionAnalysis)
async def analyze_decision(state: WorkflowState) -> Any:
    logger.info("API: analyze decision requested.")
    if not state.extracted_context:
        raise HTTPException(status_code=400, detail="WorkflowState must contain extracted_context.")
        
    service = DecisionService()
    updated_state = await service.execute(state)
    
    if updated_state.decision_package:
        return updated_state.decision_package.analysis
        
    raise HTTPException(status_code=500, detail="Decision Analysis computation failed.")
