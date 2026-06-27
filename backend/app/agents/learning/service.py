from datetime import datetime
from typing import Any
import uuid

from app.core.database import SessionLocal
from app.schemas.state import LearningPayload, LearningArtifact
from app.agents.learning.providers.mock import MockLearningProvider

from app.agents.learning.memory import index_workflow_memory
from app.agents.learning.trend import analyze_trends
from app.agents.learning.analytics import calculate_analytics
from app.agents.learning.recommendations import generate_recommendations
from app.agents.learning.optimizer import optimize_patterns
from app.agents.learning.repository import LearningHistory

class LearningService:
    def __init__(self):
        self.provider = MockLearningProvider()

    async def process_learning(self, workflow_id: str, execution_id: str, state_snapshot: dict[str, Any]) -> dict[str, Any]:
        """Main entrypoint for the Learning Agent to process the queue."""
        
        # 1. Extract learnings using AI provider
        insights = await self.provider.extract_learning_insights(state_snapshot)
        
        artifact_id = str(uuid.uuid4())
        
        async with SessionLocal() as session:
            # 2. Index to Organizational Memory
            memory = await index_workflow_memory(session, workflow_id, artifact_id, state_snapshot)
            
            # 3. Analyze Trends
            await analyze_trends(session, workflow_id, insights)
            
            # 4. Calculate Analytics
            await calculate_analytics(session, workflow_id, execution_id)
            
            # 5. Generate Recommendations
            await generate_recommendations(session, workflow_id, insights)
            
            # 6. Optimize Patterns
            await optimize_patterns(session, workflow_id, insights)
            
            # 7. Store Learning History
            history = LearningHistory(
                workflow_id=workflow_id,
                artifact_id=artifact_id,
                execution_id=execution_id,
                learning_summary=insights.get("learning_summary", ""),
                accepted_patterns=insights.get("accepted_patterns", []),
                rejected_patterns=insights.get("rejected_patterns", []),
                strategy_success_patterns=insights.get("strategy_success_patterns", []),
                common_risks=insights.get("common_risks", []),
                common_failures=insights.get("common_failures", []),
                reviewer_preferences=insights.get("reviewer_preferences", [])
            )
            session.add(history)
            await session.commit()
            
            # 8. Create Learning Artifact
            payload = LearningPayload(
                **insights,
                organizational_memory_reference=str(memory.id),
                learning_timestamp=datetime.utcnow().isoformat() + "Z",
                execution_metadata={
                    "agent_name": "LearningAgent",
                    "provider": "mock",
                    "latency_ms": 120.0
                }
            )
            
            artifact = LearningArtifact(
                artifact_id=artifact_id,
                workflow_id=workflow_id,
                agent_name="LearningAgent",
                created_at=datetime.utcnow().isoformat() + "Z",
                provider="mock",
                confidence=0.9,
                payload=payload
            )
            
            return {
                "success": True,
                "artifact_id": artifact_id,
                "artifact": artifact,
                "message": "Learning Engine completed successfully."
            }
