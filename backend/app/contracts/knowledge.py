# Contains: knowledge.py implementation.
from typing import Protocol

from app.schemas.state import WorkflowState


class KnowledgeAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
