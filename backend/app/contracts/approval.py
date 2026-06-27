from typing import Protocol
from app.schemas.state import WorkflowState


class ApprovalAgent(Protocol):
    async def execute(self, state: WorkflowState) -> WorkflowState:
        ...
