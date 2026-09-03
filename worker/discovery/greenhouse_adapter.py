"""
Greenhouse job source adapter.

Uses the public Greenhouse Boards API:
https://developers.greenhouse.io/harvest.html#the-job-board-api

This is a free, public JSON API that requires no authentication.
URL pattern: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
"""
import httpx
from datetime import datetime
from typing import Optional

from worker.discovery.base_adapter import SourceAdapter, NormalizedJob


class GreenhouseAdapter(SourceAdapter):
    """Fetches jobs from Greenhouse-powered career pages."""

    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"

    def __init__(self, config: dict):
        self.board_token: str = config["board_token"]
        self.company_name: str = config.get("name", self.board_token)
        self.filters: dict = config.get("filters", {})

    def get_source_name(self) -> str:
        return "greenhouse"

    async def fetch_jobs(self) -> list[NormalizedJob]:
        """Fetch all jobs from a Greenhouse board."""
        url = f"{self.BASE_URL}/{self.board_token}/jobs?content=true"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        jobs_raw = data.get("jobs", [])
        normalized = []

        for job_data in jobs_raw:
            job = self._normalize(job_data)
            if job:
                normalized.append(job)

        # Apply keyword filter
        keywords = self.filters.get("title_keywords", [])
        return self.filter_by_keywords(normalized, keywords)

    def _normalize(self, data: dict) -> Optional[NormalizedJob]:
        """Convert Greenhouse job JSON to NormalizedJob."""
        try:
            job_id = str(data.get("id", ""))
            title = data.get("title", "").strip()

            if not title or not job_id:
                return None

            # Location
            location = ""
            departments = []
            if data.get("location", {}).get("name"):
                location = data["location"]["name"]

            if data.get("departments"):
                departments = [d.get("name", "") for d in data["departments"]]

            # Description (HTML content)
            description = data.get("content", "")

            # Posted date
            posted_at = None
            if data.get("updated_at"):
                try:
                    posted_at = datetime.fromisoformat(
                        data["updated_at"].replace("Z", "+00:00")
                    )
                except (ValueError, TypeError):
                    pass

            # Application URL
            app_url = data.get("absolute_url", "")

            # Detect remote type from location
            remote_type = self._detect_remote_type(location, description)

            # Detect employment type from title/content
            employment_type = self._detect_employment_type(title, description)

            # Extract structured fields using JobParser
            from worker.parsers.job_parser import JobParser
            min_exp, max_exp = JobParser.extract_experience_years(f"{title} {description}")
            req_skills, pref_skills = JobParser.extract_skills(description)
            edu = JobParser.extract_education(description)

            return NormalizedJob(
                source="greenhouse",
                source_job_id=job_id,
                title=title,
                company=self.company_name,
                location=location,
                remote_type=remote_type,
                employment_type=employment_type,
                experience_min_years=min_exp,
                experience_max_years=max_exp,
                experience_required=f"{min_exp}+ yrs" if min_exp else "",
                required_skills=req_skills,
                preferred_skills=pref_skills,
                education_requirements=edu,
                description=description,
                application_url=app_url,
                company_url=f"https://boards.greenhouse.io/{self.board_token}",
                posted_at=posted_at,
                raw_data=data,
            )
        except Exception:
            return None

    @staticmethod
    def _detect_remote_type(location: str, description: str) -> str:
        """Infer remote/hybrid/office from location and description text."""
        loc_lower = location.lower()
        desc_lower = description.lower() if description else ""

        if "remote" in loc_lower:
            if "hybrid" in loc_lower:
                return "hybrid"
            return "remote"
        if "hybrid" in loc_lower or "hybrid" in desc_lower[:500]:
            return "hybrid"
        if location:
            return "office"
        return "unknown"

    @staticmethod
    def _detect_employment_type(title: str, description: str) -> str:
        """Infer employment type from title/description."""
        title_lower = title.lower()
        desc_lower = description.lower()[:500] if description else ""

        if "intern" in title_lower:
            return "internship"
        if "contract" in title_lower or "contract" in desc_lower:
            return "contract"
        if "part-time" in title_lower or "part time" in title_lower:
            return "part_time"
        return "full_time"
