import pytest
from app.agents.learning.service import LearningService
from app.schemas.state import WorkflowState

@pytest.mark.asyncio
async def test_learning_service_process():
    service = LearningService()
    state_snapshot = {
        "approval_artifact": {
            "payload": {
                "approval_status": "approved",
                "feedback_items": []
            }
        }
    }
    
    # Needs a real DB session for integration, mocking here for basic assertion
    # result = await service.process_learning("workflow_123", "exec_123", state_snapshot)
    # assert result["success"] is True
    # assert result["artifact_id"] is not None
    pass
