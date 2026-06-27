# Contains: providers/base.py — abstract base for all Strategy providers.
from abc import ABC, abstractmethod


class StrategyProvider(ABC):
    @abstractmethod
    async def generate_strategy(self, *, system_prompt: str, user_prompt: str) -> dict:
        """
        Generate a structured strategy enrichment payload from the LLM.

        Returns a dict containing:
            selected_strategy, business_rationale, expected_business_outcome,
            execution_plan (list of phase dicts), dependencies, mitigation_plan,
            stakeholder_plan, risks, required_resources, alternative_strategies,
            supporting_evidence
        """
        pass
