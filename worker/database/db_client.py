"""
Supabase database client wrapper.

All database operations go through this module. Uses the service role key
(not the anon key) since the worker runs server-side in GitHub Actions.
"""
from datetime import datetime, timezone
from typing import Optional
from supabase import create_client, Client

from worker.config.settings import settings
from worker.discovery.base_adapter import NormalizedJob
from worker.deduplication.dedup_engine import DedupEngine


class DatabaseClient:
    """Supabase CRUD wrapper for the worker."""

    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY,
        )

    # ================================================================
    # Jobs
    # ================================================================

    def get_existing_job_identifiers(self) -> tuple[set[str], set[str], set[str]]:
        """
        Fetch existing job hashes, source IDs, and URLs for dedup.

        Returns:
            Tuple of (content_hashes, source_ids, urls)
        """
        result = self.client.table("jobs").select(
            "content_hash, source, source_job_id, application_url"
        ).execute()

        hashes = set()
        source_ids = set()
        urls = set()

        for row in result.data:
            if row.get("content_hash"):
                hashes.add(row["content_hash"])
            if row.get("source") and row.get("source_job_id"):
                source_ids.add(f"{row['source']}:{row['source_job_id']}")
            if row.get("application_url"):
                urls.add(row["application_url"].lower().strip().rstrip("/"))

        return hashes, source_ids, urls

    def insert_job(self, job: NormalizedJob, content_hash: str) -> Optional[dict]:
        """Insert a new job. Returns the inserted row or None on conflict."""
        data = {
            "source": job.source,
            "source_job_id": job.source_job_id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "remote_type": job.remote_type,
            "employment_type": job.employment_type,
            "experience_required": job.experience_required,
            "experience_min_years": job.experience_min_years,
            "experience_max_years": job.experience_max_years,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "salary_currency": job.salary_currency,
            "description": job.description[:50000],  # Cap to avoid storage waste
            "required_skills": job.required_skills,
            "preferred_skills": job.preferred_skills,
            "education_requirements": job.education_requirements,
            "application_url": job.application_url,
            "company_url": job.company_url,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "discovered_at": datetime.now(timezone.utc).isoformat(),
            "content_hash": content_hash,
            "status": "new",
        }

        try:
            result = self.client.table("jobs").upsert(
                data,
                on_conflict="source,source_job_id",
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Failed to insert job: {e}")
            return None

    def get_new_jobs(self, limit: int = 100) -> list[dict]:
        """Get jobs with status 'new' that haven't been analyzed yet."""
        result = (
            self.client.table("jobs")
            .select("*")
            .eq("status", "new")
            .order("discovered_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data

    def update_job_status(self, job_id: str, status: str):
        """Update a job's status."""
        self.client.table("jobs").update(
            {"status": status}
        ).eq("id", job_id).execute()

    # ================================================================
    # Job Matches
    # ================================================================

    def upsert_job_match(self, match_data: dict) -> Optional[dict]:
        """Insert or update a job match score."""
        try:
            result = self.client.table("job_matches").upsert(
                match_data,
                on_conflict="job_id,user_id",
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Failed to upsert match: {e}")
            return None

    # ================================================================
    # Job Embeddings
    # ================================================================

    def upsert_job_embedding(self, job_id: str, embedding: list[float], model: str):
        """Insert or update a job embedding."""
        try:
            self.client.table("job_embeddings").upsert(
                {
                    "job_id": job_id,
                    "embedding": embedding,
                    "model": model,
                },
                on_conflict="job_id",
            ).execute()
        except Exception as e:
            print(f"[DB] Failed to upsert embedding: {e}")

    def get_jobs_without_embeddings(self, limit: int = 100) -> list[dict]:
        """Get jobs that don't have embeddings yet."""
        # Use a left join approach: get jobs where no embedding exists
        result = (
            self.client.rpc("get_jobs_without_embeddings", {"lim": limit})
            .execute()
        )
        return result.data if result.data else []

    # ================================================================
    # Profiles & Skills
    # ================================================================

    def get_all_users(self) -> list[dict]:
        """Get all user profiles for matching."""
        result = self.client.table("profiles").select("*").execute()
        return result.data

    def get_user_skills(self, user_id: str) -> list[dict]:
        """Get skills for a user."""
        result = (
            self.client.table("skills")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data

    def get_user_projects(self, user_id: str) -> list[dict]:
        """Get projects for a user."""
        result = (
            self.client.table("projects")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data

    def get_user_resumes(self, user_id: str) -> list[dict]:
        """Get resumes for a user."""
        result = (
            self.client.table("resumes")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )
        return result.data

    # ================================================================
    # Applications
    # ================================================================

    def create_application(self, data: dict) -> Optional[dict]:
        """Create a new application entry."""
        try:
            result = self.client.table("applications").upsert(
                data, on_conflict="user_id,job_id"
            ).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Failed to create application: {e}")
            return None

    # ================================================================
    # Notifications
    # ================================================================

    def create_notification(
        self, user_id: str, job_id: str, title: str, message: str,
        notif_type: str = "new_match"
    ):
        """Create an in-app notification."""
        try:
            self.client.table("notifications").insert({
                "user_id": user_id,
                "job_id": job_id,
                "type": notif_type,
                "title": title,
                "message": message,
                "read": False,
            }).execute()
        except Exception as e:
            print(f"[DB] Failed to create notification: {e}")

    # ================================================================
    # AI Usage (Cost Guard)
    # ================================================================

    def log_ai_usage(
        self, provider: str, operation: str, tokens_in: int,
        tokens_out: int, model: str, success: bool, error_msg: str = ""
    ):
        """Log an AI API call for cost tracking."""
        try:
            self.client.table("ai_usage").insert({
                "provider": provider,
                "operation": operation,
                "tokens_in": tokens_in,
                "tokens_out": tokens_out,
                "model": model,
                "success": success,
                "error_message": error_msg,
            }).execute()
        except Exception as e:
            print(f"[DB] Failed to log AI usage: {e}")

    def get_daily_ai_usage(self, provider: str = None) -> int:
        """Get total AI API calls for today."""
        today = datetime.now(timezone.utc).date().isoformat()
        query = (
            self.client.table("ai_usage")
            .select("id", count="exact")
            .eq("usage_date", today)
        )
        if provider:
            query = query.eq("provider", provider)

        result = query.execute()
        return result.count or 0

    # ================================================================
    # System Logs
    # ================================================================

    def create_execution_log(self, execution_id: str) -> Optional[dict]:
        """Create a new worker execution log entry."""
        try:
            result = self.client.table("system_logs").insert({
                "execution_id": execution_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "status": "running",
            }).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Failed to create log: {e}")
            return None

    def update_execution_log(self, log_id: str, data: dict):
        """Update a worker execution log entry."""
        try:
            self.client.table("system_logs").update(data).eq(
                "id", log_id
            ).execute()
        except Exception as e:
            print(f"[DB] Failed to update log: {e}")
