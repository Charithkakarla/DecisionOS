# Contains: base.py implementation.
from typing import Protocol

from app.agents.context.schemas import ContextExtraction


class ContextProvider(Protocol):
    async def extract(self, *, system_prompt: str, user_prompt: str) -> ContextExtraction:
        ...
