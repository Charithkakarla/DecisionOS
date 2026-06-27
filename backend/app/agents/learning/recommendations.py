from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.learning.repository import KnowledgeRecommendations

async def generate_recommendations(session: AsyncSession, workflow_id: str, insights: dict) -> None:
    """Generate prompt improvement and playbook recommendations without applying them."""
    
    recs = []
    for prompt_rec in insights.get("prompt_improvement_suggestions", []):
        recs.append(KnowledgeRecommendations(
            workflow_id=workflow_id,
            recommendation_type="prompt_update",
            target="system_prompt",
            suggestion=prompt_rec,
            reasoning="Derived from workflow rejections and modifications."
        ))
        
    for playbook_rec in insights.get("recommended_playbook_updates", []):
        recs.append(KnowledgeRecommendations(
            workflow_id=workflow_id,
            recommendation_type="playbook_update",
            target="knowledge_base",
            suggestion=playbook_rec,
            reasoning="Derived from identified knowledge gaps."
        ))
        
    if recs:
        session.add_all(recs)
        await session.commit()
