# Contains: parser.py implementation.
from app.schemas.state import WorkflowState


def parse_transcript(state: WorkflowState) -> list[str]:
    return state.transcript.strip().split()
