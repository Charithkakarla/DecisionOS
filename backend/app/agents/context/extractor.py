# Contains: extractor.py implementation.
from app.schemas.state import WorkflowState


def build_context(state: WorkflowState, words: list[str]) -> dict[str, object]:
    transcript = state.transcript.strip()
    return {
        "word_count": len(words),
        "has_deadline": "deadline" in transcript.lower(),
        "summary": transcript[:180],
    }
