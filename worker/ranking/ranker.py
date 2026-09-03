"""
Job Ranker — combines match score and freshness for final ranking.

A 95% match posted 5 minutes ago ranks above an identical 95% match
posted 10 days ago.

Formula:
  rank_score = (match_score × 0.75) + (freshness_score × 100 × 0.25)
"""
from datetime import datetime, timezone


class Ranker:
    """Ranks jobs by match quality × freshness."""

    MATCH_WEIGHT = 0.75
    FRESHNESS_WEIGHT = 0.25
    FRESHNESS_WINDOW_HOURS = 168  # 7 days

    @staticmethod
    def calculate_freshness(posted_at: datetime | str | None) -> float:
        """
        Calculate a 0.0–1.0 freshness score.

        1.0 = just posted
        0.0 = posted 7+ days ago or unknown
        """
        if not posted_at:
            return 0.3  # Unknown date gets a neutral score

        if isinstance(posted_at, str):
            try:
                posted_at = datetime.fromisoformat(
                    posted_at.replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                return 0.3

        # Make timezone-aware if not already
        if posted_at.tzinfo is None:
            posted_at = posted_at.replace(tzinfo=timezone.utc)

        now = datetime.now(timezone.utc)
        hours_since = (now - posted_at).total_seconds() / 3600

        if hours_since < 0:
            return 1.0  # Future date (data error) — treat as fresh

        freshness = max(0.0, 1.0 - (hours_since / Ranker.FRESHNESS_WINDOW_HOURS))
        return round(freshness, 4)

    @staticmethod
    def calculate_rank_score(
        match_score: float, freshness_score: float
    ) -> float:
        """
        Combine match and freshness into a single rank score.

        Args:
            match_score: 0-100 match score
            freshness_score: 0.0-1.0 freshness

        Returns:
            Rank score (0-100)
        """
        rank = (
            match_score * Ranker.MATCH_WEIGHT
            + freshness_score * 100 * Ranker.FRESHNESS_WEIGHT
        )
        return round(rank, 2)

    @staticmethod
    def get_freshness_label(freshness: float) -> str:
        """Human-readable freshness label."""
        if freshness >= 0.9:
            return "Just posted"
        elif freshness >= 0.7:
            return "Very fresh"
        elif freshness >= 0.5:
            return "Recent"
        elif freshness >= 0.3:
            return "A few days old"
        else:
            return "Older posting"
