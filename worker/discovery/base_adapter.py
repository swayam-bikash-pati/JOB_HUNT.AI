"""
Abstract base class for all job source adapters.

Every job source (Greenhouse, Lever, email alerts, etc.) implements this
interface. All adapters return the same NormalizedJob format so the rest
of the pipeline is source-agnostic.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class NormalizedJob:
    """Canonical job format — every source adapter produces this."""

    source: str                         # e.g. "greenhouse", "lever"
    source_job_id: str                  # ID on the source platform
    title: str
    company: str
    location: str = ""
    remote_type: str = "unknown"        # remote | hybrid | office | unknown
    employment_type: str = "full_time"  # full_time | part_time | contract | internship | unknown
    experience_required: str = ""
    experience_min_years: Optional[int] = None
    experience_max_years: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    salary_currency: str = ""
    description: str = ""
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    education_requirements: list[str] = field(default_factory=list)
    application_url: str = ""
    company_url: str = ""
    posted_at: Optional[datetime] = None
    raw_data: dict = field(default_factory=dict)


class SourceAdapter(ABC):
    """Base class for job source adapters."""

    @abstractmethod
    async def fetch_jobs(self) -> list[NormalizedJob]:
        """Fetch jobs from this source and return normalized list."""
        ...

    @abstractmethod
    def get_source_name(self) -> str:
        """Return the name of this source (e.g., 'greenhouse')."""
        ...

    def filter_by_keywords(
        self, jobs: list[NormalizedJob], keywords: list[str]
    ) -> list[NormalizedJob]:
        """Filter jobs whose title contains at least one keyword (case-insensitive)."""
        if not keywords:
            return jobs

        kw_lower = [k.lower() for k in keywords]
        return [
            job for job in jobs
            if any(kw in job.title.lower() for kw in kw_lower)
        ]
