# Contains: planner.py implementation.
from typing import Protocol

from app.schemas.state import WorkflowState


class PlannerAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
