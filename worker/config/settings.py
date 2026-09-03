"""
Worker settings — loaded from environment variables.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration for the worker."""

    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", os.getenv("NEXT_PUBLIC_SUPABASE_URL", ""))
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SERVICE_KEY", ""))

    # AI Provider
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "")  # "gemini", "ollama", or ""
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

    # Cost Guard
    AI_DAILY_LIMIT: int = int(os.getenv("AI_DAILY_LIMIT", "1000"))

    # Matching
    MINIMUM_MATCH_SCORE: int = int(os.getenv("MINIMUM_MATCH_SCORE", "70"))

    # Embedding model
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSION: int = 384

    # Worker
    MAX_AI_JOBS_PER_RUN: int = int(os.getenv("MAX_AI_JOBS_PER_RUN", "30"))
    JOB_FRESHNESS_HOURS: int = 168  # 7 days

    @classmethod
    def validate(cls) -> list[str]:
        """Validate required settings. Returns list of errors."""
        errors = []
        if not cls.SUPABASE_URL:
            errors.append("SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is required")
        if not cls.SUPABASE_SERVICE_KEY:
            errors.append("SUPABASE_SERVICE_ROLE_KEY is required")
        return errors

    @classmethod
    def ai_enabled(cls) -> bool:
        """Check if any AI provider is configured."""
        if cls.AI_PROVIDER == "gemini" and cls.GEMINI_API_KEY:
            return True
        if cls.AI_PROVIDER == "ollama":
            return True
        return False


settings = Settings()
