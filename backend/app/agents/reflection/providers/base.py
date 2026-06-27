# Contains: base.py implementation.
from abc import ABC, abstractmethod

class ReflectionProvider(ABC):
    @abstractmethod
    async def evaluate_explainability(self, *, system_prompt: str, user_prompt: str) -> dict:
        """Evaluate strategy explainability and return structured reasoning."""
        pass
