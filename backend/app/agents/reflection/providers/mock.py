# Contains: mock.py implementation.
from app.agents.reflection.providers.base import ReflectionProvider

class MockReflectionProvider(ReflectionProvider):
    async def evaluate_explainability(self, *, system_prompt: str, user_prompt: str) -> dict:
        return {
            "explainability_score": 0.95,
            "executive_summary": "The cloud database migration strategy prioritizes low-risk phased execution. It leverages secondary environments for testing before main data migration.",
            "why_selected": "A phased approach minimizes cutover risks and ensures business continuity during high-traffic periods.",
            "why_alternatives_rejected": "A direct cutover carries high operational risks of downtime. An automated approach without manual checkpoint validation lacks proper safety controls.",
            "evidence_influence": "The selection was highly influenced by SOP guidelines on cloud migrations and previous SLA validation playbooks.",
            "business_reasoning_summary": "Phased database rollout ensures zero disruption. It divides risks into distinct components that can be separately verified."
        }
