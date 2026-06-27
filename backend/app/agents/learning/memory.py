from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.learning.repository import OrganizationalMemory

async def index_workflow_memory(session: AsyncSession, workflow_id: str, artifact_id: str, state_snapshot: dict) -> OrganizationalMemory:
    """Stores workflow decision, approval, and reflection history into memory."""
    
    memory = OrganizationalMemory(
        workflow_id=workflow_id,
        artifact_id=artifact_id,
        decision_history=state_snapshot.get("decision_artifact", {}),
        approval_history=state_snapshot.get("approval_artifact", {}),
        reflection_history=state_snapshot.get("reflection_artifact", {}),
    )
    session.add(memory)
    await session.commit()
    await session.refresh(memory)
    return memory
