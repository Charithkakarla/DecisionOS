# Contains: gemini.py implementation.
import asyncio
import logging
from app.agents.knowledge.providers.base import EmbeddingProvider

logger = logging.getLogger("decision_os.knowledge.providers.gemini")

class GeminiEmbeddingProvider(EmbeddingProvider):
    def __init__(self, api_key: str, model: str = "models/text-embedding-004") -> None:
        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise RuntimeError(
                "Google Generative AI SDK is not installed. Add google-generativeai to requirements."
            ) from exc

        self._genai = genai
        genai.configure(api_key=api_key)
        self.model = model
        logger.info(f"Initialized Gemini Embedding Provider with model {model}")

    async def embed_query(self, text: str) -> list[float]:
        try:
            response = await asyncio.to_thread(
                self._genai.embed_content,
                model=self.model,
                content=text,
                task_type="retrieval_query"
            )
            return response["embedding"]
        except Exception as e:
            logger.error(f"Failed to generate query embedding: {e}")
            raise

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        try:
            # Gemini SDK embed_content can take a list of strings
            response = await asyncio.to_thread(
                self._genai.embed_content,
                model=self.model,
                content=texts,
                task_type="retrieval_document"
            )
            return response["embedding"]
        except Exception as e:
            logger.error(f"Failed to generate document embeddings: {e}")
            raise
