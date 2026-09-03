"""
₹0 Cost Guard — Enforces free-tier limits across all metered resources.

This module is checked BEFORE every AI call and at the START/END
of every worker run. If a limit is approaching, operations are
stopped gracefully — the system NEVER triggers paid usage.
"""
from datetime import datetime, timezone
from worker.config.settings import settings


class CostGuard:
    """Hard-stops any operation that could trigger paid usage."""

    def __init__(self, db_client=None):
        self.db = db_client
        self._ai_calls_today: int = 0
        self._initialized: bool = False

    def initialize(self):
        """Load current usage from database."""
        if self.db and not self._initialized:
            try:
                self._ai_calls_today = self.db.get_daily_ai_usage()
                self._initialized = True
                print(f"[CostGuard] Today's AI usage: {self._ai_calls_today}/{settings.AI_DAILY_LIMIT}")
            except Exception as e:
                print(f"[CostGuard] Failed to load usage: {e}")
                # Default to safe mode — assume high usage
                self._ai_calls_today = settings.AI_DAILY_LIMIT

    def check_ai_budget(self) -> bool:
        """
        Check if AI API calls are within the free-tier daily limit.

        Returns True if we can make more AI calls.
        """
        if not settings.ai_enabled():
            return False

        # Safety margin: stop at 90% of limit
        safe_limit = int(settings.AI_DAILY_LIMIT * 0.9)
        remaining = safe_limit - self._ai_calls_today

        if remaining <= 0:
            print(
                f"[CostGuard] ⚠ AI budget exhausted "
                f"({self._ai_calls_today}/{settings.AI_DAILY_LIMIT}). "
                f"Stopping AI requests."
            )
            return False

        return True

    def record_ai_call(self, provider: str, operation: str,
                       tokens_in: int = 0, tokens_out: int = 0,
                       model: str = "", success: bool = True,
                       error_msg: str = ""):
        """Record an AI API call and update usage counter."""
        self._ai_calls_today += 1

        if self.db:
            self.db.log_ai_usage(
                provider=provider,
                operation=operation,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                model=model,
                success=success,
                error_msg=error_msg,
            )

        remaining = settings.AI_DAILY_LIMIT - self._ai_calls_today
        if remaining <= 50:
            print(
                f"[CostGuard] ⚠ AI calls remaining today: {remaining}"
            )

    def get_remaining_ai_budget(self) -> int:
        """Get number of AI calls remaining for today."""
        return max(0, settings.AI_DAILY_LIMIT - self._ai_calls_today)

    def get_usage_report(self) -> dict:
        """Get a summary of today's usage."""
        return {
            "ai_calls_today": self._ai_calls_today,
            "ai_daily_limit": settings.AI_DAILY_LIMIT,
            "ai_remaining": self.get_remaining_ai_budget(),
            "ai_enabled": settings.ai_enabled(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def print_report(self):
        """Print usage report to stdout."""
        report = self.get_usage_report()
        print("\n[CostGuard] === Usage Report ===")
        print(f"  AI Provider Enabled: {report['ai_enabled']}")
        print(f"  AI Calls Today:      {report['ai_calls_today']}/{report['ai_daily_limit']}")
        print(f"  AI Remaining:        {report['ai_remaining']}")
        print(f"  Timestamp:           {report['timestamp']}")
        print("[CostGuard] ==================\n")
