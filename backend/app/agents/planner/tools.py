# Contains: tools.py implementation.
from app.schemas.state import WorkflowState


def has_empty_transcript(state: WorkflowState) -> bool:
    return not state.transcript.strip()
