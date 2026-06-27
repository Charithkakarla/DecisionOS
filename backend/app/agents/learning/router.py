from fastapi import APIRouter
from app.agents.learning.schemas import (
    ProcessLearningRequest, ProcessLearningResponse,
    LearningInsightResponse, LearningTrendResponse,
    LearningMemoryResponse, LearningRecommendationResponse
)
from app.agents.learning.service import LearningService
from app.schemas.state import WorkflowState
import logging

logger = logging.getLogger("decision_os.learning.router")
router = APIRouter(prefix="/api/v1/learning", tags=["learning"])

_service = LearningService()

def should_execute(state: WorkflowState) -> bool:
    """Execute Learning Agent only after Approval is completed."""
    return (
        state.approval_artifact is not None
        and state.learning_artifact is None
    )

@router.post("/process", response_model=ProcessLearningResponse)
async def process_learning(request: ProcessLearningRequest) -> ProcessLearningResponse:
    logger.info(f"Processing learning for workflow_id='{request.workflow_id}'")
    result = await _service.process_learning(
        workflow_id=request.workflow_id,
        execution_id=request.execution_id,
        state_snapshot=request.state_snapshot
    )
    return ProcessLearningResponse(
        success=result["success"],
        artifact_id=result["artifact_id"],
        message=result["message"]
    )

@router.get("/insights", response_model=LearningInsightResponse)
async def get_insights() -> LearningInsightResponse:
    # Mock return for dashboard
    return LearningInsightResponse(insights=[])

@router.get("/trends", response_model=LearningTrendResponse)
async def get_trends() -> LearningTrendResponse:
    # Mock return for dashboard
    return LearningTrendResponse(trends={})

@router.get("/memory", response_model=LearningMemoryResponse)
async def get_memory() -> LearningMemoryResponse:
    # Mock return for dashboard
    return LearningMemoryResponse(memory=[])

@router.get("/recommendations", response_model=LearningRecommendationResponse)
async def get_recommendations() -> LearningRecommendationResponse:
    # Mock return for dashboard
    return LearningRecommendationResponse(recommendations=[])
