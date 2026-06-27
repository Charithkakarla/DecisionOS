# Contains: mock.py implementation.
import random
import logging
from app.agents.knowledge.providers.base import EmbeddingProvider

logger = logging.getLogger("decision_os.knowledge.providers.mock")

class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dimension: int = 768) -> None:
        self.dimension = dimension
        logger.info(f"Initialized Mock Embedding Provider with dimension {dimension}")

    async def embed_query(self, text: str) -> list[float]:
        # Generate a deterministic vector using Python's random seeded by hash of text
        rng = random.Random(text)
        vector = [rng.uniform(-1.0, 1.0) for _ in range(self.dimension)]
        # Normalize vector
        magnitude = sum(x*x for x in vector) ** 0.5
        if magnitude > 0:
            vector = [x / magnitude for x in vector]
        return vector

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        results = []
        for text in texts:
            rng = random.Random(text)
            vector = [rng.uniform(-1.0, 1.0) for _ in range(self.dimension)]
            magnitude = sum(x*x for x in vector) ** 0.5
            if magnitude > 0:
                vector = [x / magnitude for x in vector]
            results.append(vector)
        return results
