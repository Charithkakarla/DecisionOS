# Contains: embeddings.py implementation.
import logging
from app.core.config import settings
from app.agents.knowledge.providers.base import EmbeddingProvider
from app.agents.knowledge.providers.gemini import GeminiEmbeddingProvider
from app.agents.knowledge.providers.mock import MockEmbeddingProvider
from app.core.provider_utils import is_retryable_error, log_fallback

logger = logging.getLogger("decision_os.knowledge.embeddings")


class EmbeddingService:
    def __init__(self) -> None:
        self.provider = self._build_provider()

    def _build_provider(self) -> EmbeddingProvider:
        provider_name = settings.context_provider.lower()
        if provider_name == "gemini" and settings.gemini_api_key:
            return GeminiEmbeddingProvider(api_key=settings.gemini_api_key)
        logger.warning("Gemini API Key missing or provider is mock. Falling back to MockEmbeddingProvider.")
        return MockEmbeddingProvider()

    async def embed_query(self, text: str) -> list[float]:
        try:
            return await self.provider.embed_query(text)
        except Exception as exc:
            if is_retryable_error(exc):
                log_fallback("knowledge/embeddings", self.provider.__class__.__name__,
                             "MockEmbeddingProvider", exc)
                logger.warning("Embedding quota exceeded — falling back to MockEmbeddingProvider for this request.")
                return await MockEmbeddingProvider().embed_query(text)
            raise

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        try:
            return await self.provider.embed_documents(texts)
        except Exception as exc:
            if is_retryable_error(exc):
                log_fallback("knowledge/embeddings", self.provider.__class__.__name__,
                             "MockEmbeddingProvider", exc)
                logger.warning("Embedding quota exceeded — falling back to MockEmbeddingProvider for this request.")
                return await MockEmbeddingProvider().embed_documents(texts)
            raise
