"""
Notification service — creates in-app notifications for users.
"""


class Notifier:
    """Creates notifications for shortlisted jobs."""

    def __init__(self, db_client):
        self.db = db_client

    def notify_new_match(
        self,
        user_id: str,
        job_id: str,
        job_title: str,
        company: str,
        match_score: float,
        matching_skills: list[str],
        missing_skills: list[str],
    ):
        """
        Create a notification for a new high-quality job match.

        Example notification:
          New 91% AI/ML Match
          Machine Learning Engineer — ABC Technologies
          ✓ Python ✓ PyTorch ✓ NLP
          ⚠ AWS experience preferred
        """
        score = round(match_score)
        title = f"New {score}% Match"

        # Build message
        parts = [f"{job_title} — {company}"]

        if matching_skills:
            match_str = " ".join(f"✓ {s}" for s in matching_skills[:5])
            parts.append(match_str)

        if missing_skills:
            miss_str = " ".join(f"⚠ {s}" for s in missing_skills[:3])
            parts.append(miss_str)

        message = "\n".join(parts)

        self.db.create_notification(
            user_id=user_id,
            job_id=job_id,
            title=title,
            message=message,
            notif_type="new_match",
        )

    def notify_system(self, user_id: str, title: str, message: str):
        """Create a system notification."""
        self.db.create_notification(
            user_id=user_id,
            job_id="",
            title=title,
            message=message,
            notif_type="system",
        )
