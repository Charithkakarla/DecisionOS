# Contains: router.py — Strategy Agent planner condition + FastAPI route (Sprint 6).
from fastapi import APIRouter
from app.schemas.state import WorkflowState, StrategyPackage

def should_execute(state: WorkflowState) -> bool:
    """Execute Strategy Agent after Decision Agent completes and strategy not yet generated."""
    return (
        state.draft_recommendation is not None
        and state.decision_artifact is not None
        and state.strategy_artifact is None
        and state.final_action is None
    )


# ── Standalone API endpoint ──────────────────────────────────────────────────
router = APIRouter(prefix="/api/v1/strategy", tags=["Strategy Agent"])


@router.post("/generate", response_model=StrategyPackage)
async def generate_strategy(state: WorkflowState) -> StrategyPackage:
    """
    POST /api/v1/strategy/generate

    Generate a StrategyPackage from a WorkflowState that contains a DecisionPackage.
    """
    from app.agents.strategy.service import StrategyService
    service = StrategyService()
    updated_state = await service.execute(state)
    if updated_state.strategy_package:
        return updated_state.strategy_package
    raise ValueError("Strategy generation failed — see execution_logs for details.")
