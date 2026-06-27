from sqlalchemy.ext.asyncio import AsyncSession
from app.agents.learning.repository import LearningInsights

async def optimize_patterns(session: AsyncSession, workflow_id: str, insights: dict) -> None:
    """Analyze bottlenecks, repeated mistakes, and improvement opportunities."""
    
    db_insights = []
    for insight in insights.get("organizational_insights", []):
        db_insights.append(LearningInsights(
            workflow_id=workflow_id,
            insight_type="operational",
            description=insight,
            confidence=0.85
        ))
        
    for failure in insights.get("common_failures", []):
        db_insights.append(LearningInsights(
            workflow_id=workflow_id,
            insight_type="bottleneck",
            description=f"Common failure: {failure}",
            confidence=0.9
        ))
        
    if db_insights:
        session.add_all(db_insights)
        await session.commit()
