# Contains: decision.py implementation.
from typing import Protocol

from app.schemas.state import WorkflowState


class DecisionAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
