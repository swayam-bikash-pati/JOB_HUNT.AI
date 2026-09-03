"""
Lever job source adapter.

Uses the public Lever Postings API:
https://github.com/lever/postings-api

This is a free, public JSON API that requires no authentication.
URL pattern: https://api.lever.co/v0/postings/{company}?mode=json
"""
import httpx
from datetime import datetime
from typing import Optional

from worker.discovery.base_adapter import SourceAdapter, NormalizedJob


class LeverAdapter(SourceAdapter):
    """Fetches jobs from Lever-powered career pages."""

    BASE_URL = "https://api.lever.co/v0/postings"

    def __init__(self, config: dict):
        self.company_slug: str = config["company_slug"]
        self.company_name: str = config.get("name", self.company_slug)
        self.filters: dict = config.get("filters", {})

    def get_source_name(self) -> str:
        return "lever"

    async def fetch_jobs(self) -> list[NormalizedJob]:
        """Fetch all jobs from a Lever company page."""
        url = f"{self.BASE_URL}/{self.company_slug}?mode=json"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

        # Lever returns a list of postings directly
        if not isinstance(data, list):
            return []

        normalized = []
        for posting in data:
            job = self._normalize(posting)
            if job:
                normalized.append(job)

        # Apply keyword filter
        keywords = self.filters.get("title_keywords", [])
        return self.filter_by_keywords(normalized, keywords)

    def _normalize(self, data: dict) -> Optional[NormalizedJob]:
        """Convert Lever posting JSON to NormalizedJob."""
        try:
            job_id = str(data.get("id", ""))
            title = data.get("text", "").strip()

            if not title or not job_id:
                return None

            # Categories
            categories = data.get("categories", {})
            location = categories.get("location", "")
            team = categories.get("team", "")
            commitment = categories.get("commitment", "")

            # Description — Lever uses 'descriptionPlain' and 'description'
            description = data.get("descriptionPlain", "")
            if not description:
                description = data.get("description", "")

            # Additional lists (requirements, responsibilities)
            additional_text = ""
            for section in data.get("lists", []):
                section_text = section.get("text", "")
                items = section.get("content", "")
                additional_text += f"\n\n{section_text}\n{items}"

            if additional_text:
                description += additional_text

            # Posted date (Lever uses millisecond timestamps)
            posted_at = None
            if data.get("createdAt"):
                try:
                    posted_at = datetime.fromtimestamp(
                        data["createdAt"] / 1000
                    )
                except (ValueError, TypeError, OSError):
                    pass

            # Application URL
            app_url = data.get("hostedUrl", "") or data.get("applyUrl", "")

            # Remote type
            remote_type = self._detect_remote_type(
                location, data.get("workplaceType", ""), description
            )

            # Employment type from commitment
            employment_type = self._detect_employment_type(
                title, commitment, description
            )

            # Extract structured fields using JobParser
            from worker.parsers.job_parser import JobParser
            min_exp, max_exp = JobParser.extract_experience_years(f"{title} {description}")
            req_skills, pref_skills = JobParser.extract_skills(description)
            edu = JobParser.extract_education(description)

            return NormalizedJob(
                source="lever",
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
                company_url=f"https://jobs.lever.co/{self.company_slug}",
                posted_at=posted_at,
                raw_data=data,
            )
        except Exception:
            return None

    @staticmethod
    def _detect_remote_type(
        location: str, workplace_type: str, description: str
    ) -> str:
        """Infer remote type from Lever data."""
        wt_lower = workplace_type.lower() if workplace_type else ""
        loc_lower = location.lower()

        if "remote" in wt_lower or "remote" in loc_lower:
            return "remote"
        if "hybrid" in wt_lower or "hybrid" in loc_lower:
            return "hybrid"
        if "onsite" in wt_lower or "on-site" in wt_lower:
            return "office"
        if location:
            return "office"
        return "unknown"

    @staticmethod
    def _detect_employment_type(
        title: str, commitment: str, description: str
    ) -> str:
        """Infer employment type."""
        title_lower = title.lower()
        commit_lower = commitment.lower() if commitment else ""

        if "intern" in title_lower or "intern" in commit_lower:
            return "internship"
        if "contract" in commit_lower or "contract" in title_lower:
            return "contract"
        if "part-time" in commit_lower or "part time" in commit_lower:
            return "part_time"
        return "full_time"
