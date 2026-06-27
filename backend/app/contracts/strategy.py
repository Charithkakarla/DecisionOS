# Contains: strategy.py implementation.
from typing import Protocol

from app.schemas.state import WorkflowState


class StrategyAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
