# Contains: cache.py implementation.
import json
import logging
import hashlib
from typing import Any
import redis
from app.core.config import settings

logger = logging.getLogger("decision_os.knowledge.cache")

class RedisCacheService:
    def __init__(self) -> None:
        self.redis_client = None
        try:
            if settings.redis_url:
                self.redis_client = redis.Redis.from_url(
                    settings.redis_url, 
                    decode_responses=True,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Connected to Redis cache successfully.")
        except Exception as e:
            logger.warning(f"Redis cache initialization failed, falling back to database: {e}")
            self.redis_client = None

    def get_query_hash(self, query: str, department: str | None, owner: str | None, version: str | None, tags: list[str] | None, limit: int) -> str:
        # Create a unique hash for the search configuration
        filter_str = f"{query}:{department or ''}:{owner or ''}:{version or ''}:{sorted(tags) if tags else ''}:{limit}"
        return hashlib.md5(filter_str.encode("utf-8")).hexdigest()

    def get(self, key: str) -> list[dict] | None:
        if not self.redis_client:
            return None
        try:
            cached_data = self.redis_client.get(f"knowledge:search:{key}")
            if cached_data:
                logger.info(f"Cache HIT for key knowledge:search:{key}")
                return json.loads(cached_data)
            logger.info(f"Cache MISS for key knowledge:search:{key}")
        except Exception as e:
            logger.warning(f"Failed to read from Redis cache: {e}")
        return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        if not self.redis_client:
            return
        try:
            serialized = json.dumps(value)
            self.redis_client.setex(f"knowledge:search:{key}", ttl, serialized)
            logger.info(f"Successfully cached search results under knowledge:search:{key} for {ttl}s.")
        except Exception as e:
            logger.warning(f"Failed to write to Redis cache: {e}")
            
cache_service = RedisCacheService()
