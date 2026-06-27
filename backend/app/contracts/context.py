# Contains: context.py implementation.
from typing import Protocol

from app.schemas.state import WorkflowState


class ContextAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
