# Contains: router.py implementation.
from app.schemas.state import WorkflowState


def should_execute(state: WorkflowState) -> bool:
    return state.extracted_context is None
