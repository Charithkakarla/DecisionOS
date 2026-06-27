# Contains: base.py implementation.
from abc import ABC, abstractmethod

class DecisionProvider(ABC):
    @abstractmethod
    async def analyze(self, *, system_prompt: str, user_prompt: str) -> dict:
        """Parse structured context and return raw decision analysis dictionary."""
        pass
