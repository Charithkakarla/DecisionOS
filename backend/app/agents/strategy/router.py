# Contains: router.py implementation.
from app.schemas.state import WorkflowState


def should_execute(state: WorkflowState) -> bool:
    return state.draft_recommendation is not None and state.final_action is None
