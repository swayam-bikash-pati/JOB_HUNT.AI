"""
Abstract AI provider interface.

All AI providers (Gemini, Ollama, future APIs) implement this interface.
The system can switch providers without rewriting any application code.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class JobAnalysis:
    """Structured output from AI job analysis."""
    title: str = ""
    seniority: str = ""
    department: str = ""
    required_skills: list[str] = field(default_factory=list)
    preferred_skills: list[str] = field(default_factory=list)
    programming_languages: list[str] = field(default_factory=list)
    frameworks: list[str] = field(default_factory=list)
    cloud_technologies: list[str] = field(default_factory=list)
    databases: list[str] = field(default_factory=list)
    ml_technologies: list[str] = field(default_factory=list)
    experience_min_years: Optional[int] = None
    experience_max_years: Optional[int] = None
    education_requirements: list[str] = field(default_factory=list)
    remote_type: str = "unknown"
    employment_type: str = "full_time"
    summary: str = ""


@dataclass
class ResumeAnalysis:
    """Structured output from AI resume analysis."""
    skills: list[str] = field(default_factory=list)
    experience: list[dict] = field(default_factory=list)
    education: list[dict] = field(default_factory=list)
    projects: list[dict] = field(default_factory=list)
    certifications: list[str] = field(default_factory=list)
    summary: str = ""


@dataclass
class ResumeRecommendation:
    """AI recommendation for which resume to use."""
    resume_id: str = ""
    resume_name: str = ""
    reason: str = ""
    relevant_skills: list[str] = field(default_factory=list)


class AIProvider(ABC):
    """Abstract base class for AI providers."""

    @abstractmethod
    async def analyze_job(self, job_description: str) -> JobAnalysis:
        """Extract structured requirements from a job description."""
        ...

    @abstractmethod
    async def analyze_resume(self, resume_text: str) -> ResumeAnalysis:
        """Extract structured data from resume text."""
        ...

    @abstractmethod
    async def generate_cover_letter(
        self,
        job_title: str,
        company: str,
        job_description: str,
        candidate_name: str,
        candidate_skills: list[str],
        candidate_experience: str,
        relevant_projects: list[str],
    ) -> str:
        """Generate a tailored cover letter."""
        ...

    @abstractmethod
    async def generate_application_answers(
        self,
        job_title: str,
        company: str,
        job_description: str,
        candidate_profile: dict,
        questions: list[str],
    ) -> dict[str, str]:
        """Generate draft answers for common application questions."""
        ...

    @abstractmethod
    async def recommend_resume(
        self,
        job_title: str,
        job_description: str,
        resumes: list[dict],
    ) -> ResumeRecommendation:
        """Recommend the best resume version for a specific job."""
        ...

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name (e.g., 'gemini', 'ollama')."""
        ...
