"""
Shared provider fallback utilities.

Usage pattern in any service:
    from app.core.provider_utils import is_quota_error, is_rate_limit_error

Any provider call that raises a quota/rate-limit exception should be caught
and the next provider in the chain tried.
"""
import logging

logger = logging.getLogger("decision_os.provider_utils")

# Exception types that should trigger a provider fallback
_FALLBACK_KEYWORDS = (
    "quota",
    "rate limit",
    "rate_limit",
    "resource exhausted",
    "resourceexhausted",
    "429",
    "too many requests",
    "exceeded",
)


def is_retryable_error(exc: Exception) -> bool:
    """Return True if the exception is a quota/rate-limit that warrants fallback."""
    msg = str(exc).lower()
    return any(kw in msg for kw in _FALLBACK_KEYWORDS)


def log_fallback(agent: str, from_provider: str, to_provider: str, exc: Exception) -> None:
    logger.warning(
        f"[{agent}] {from_provider} hit quota/rate-limit ({exc.__class__.__name__}). "
        f"Falling back to {to_provider}."
    )
