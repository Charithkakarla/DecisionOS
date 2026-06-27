from typing import Any
from .base import LearningProvider

class MockLearningProvider(LearningProvider):
    async def extract_learning_insights(self, state_snapshot: dict[str, Any]) -> dict[str, Any]:
        return {
            "learning_summary": "Mock learning summary based on approval.",
            "organizational_insights": ["The team prefers aggressive timelines.", "Cloud migrations require extra risk mitigation."],
            "accepted_patterns": ["High ROI with medium risk", "Clear stakeholder communication"],
            "rejected_patterns": ["Undefined scope", "Missing ROI calculations"],
            "strategy_success_patterns": ["Phased rollouts"],
            "common_risks": ["Resource constraints", "Vendor lock-in"],
            "common_failures": ["Unclear success criteria"],
            "reviewer_preferences": ["Wants concise summaries", "Needs budget breakdown"],
            "prompt_improvement_suggestions": ["Add 'focus on budget' to Strategy prompt."],
            "knowledge_gaps": ["Missing latest compliance guidelines."],
            "recommended_playbook_updates": ["Update Cloud Migration playbook with compliance checks."]
        }
