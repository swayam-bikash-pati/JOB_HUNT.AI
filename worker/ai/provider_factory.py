"""
AI Provider Factory — creates the right provider based on configuration.

The active provider is set via the AI_PROVIDER environment variable.
If no provider is configured, the system works without AI features.
"""
from typing import Optional

from worker.ai.base_provider import AIProvider
from worker.config.settings import settings


def get_ai_provider() -> Optional[AIProvider]:
    """
    Create and return the configured AI provider.

    Returns None if no provider is configured (AI features disabled).
    """
    provider_name = settings.AI_PROVIDER.lower().strip()

    if not provider_name:
        print("[AIFactory] No AI_PROVIDER configured. AI features disabled.")
        return None

    if provider_name == "gemini":
        if not settings.GEMINI_API_KEY:
            print("[AIFactory] GEMINI_API_KEY not set. AI features disabled.")
            return None

        from worker.ai.gemini_provider import GeminiProvider
        provider = GeminiProvider(api_key=settings.GEMINI_API_KEY)
        print(f"[AIFactory] Using Gemini provider")
        return provider

    elif provider_name == "ollama":
        from worker.ai.ollama_provider import OllamaProvider
        provider = OllamaProvider(base_url=settings.OLLAMA_BASE_URL)
        print(f"[AIFactory] Using Ollama provider ({settings.OLLAMA_BASE_URL})")
        return provider

    else:
        print(f"[AIFactory] Unknown provider: '{provider_name}'. AI features disabled.")
        return None
