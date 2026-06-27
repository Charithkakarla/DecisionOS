# Contains: embeddings.py implementation.
import logging
from app.core.config import settings
from app.agents.knowledge.providers.base import EmbeddingProvider
from app.agents.knowledge.providers.gemini import GeminiEmbeddingProvider
from app.agents.knowledge.providers.mock import MockEmbeddingProvider

logger = logging.getLogger("decision_os.knowledge.embeddings")

class EmbeddingService:
    def __init__(self) -> None:
        self.provider = self._build_provider()

    def _build_provider(self) -> EmbeddingProvider:
        # If API key exists and provider is set to gemini
        provider_name = settings.context_provider.lower()
        if provider_name == "gemini" and settings.gemini_api_key:
            return GeminiEmbeddingProvider(api_key=settings.gemini_api_key)
        
        # Fall back to mock if context provider is mock or missing api key
        logger.warning("Gemini API Key missing or provider is mock. Falling back to MockEmbeddingProvider.")
        return MockEmbeddingProvider()

    async def embed_query(self, text: str) -> list[float]:
        return await self.provider.embed_query(text)

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return await self.provider.embed_documents(texts)
