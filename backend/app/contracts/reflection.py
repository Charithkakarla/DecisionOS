# Contains: reflection.py implementation.
from typing import Protocol
from app.schemas.state import WorkflowState

class ReflectionAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
