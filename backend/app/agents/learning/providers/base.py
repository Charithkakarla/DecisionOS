from abc import ABC, abstractmethod
from typing import Any

class LearningProvider(ABC):
    @abstractmethod
    async def extract_learning_insights(self, state_snapshot: dict[str, Any]) -> dict[str, Any]:
        """Analyze workflow state and extract learnings."""
        pass
