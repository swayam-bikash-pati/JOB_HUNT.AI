"""
Google Gemini AI provider — uses the free tier.

Free tier limits (as of 2024):
  - Gemini 1.5 Flash: 15 RPM, 1M tokens/day, 1500 requests/day
  - Gemini 2.0 Flash: 10 RPM, variable token limits

The CostGuard module enforces these limits externally.
This provider focuses on making good API calls.
"""
import json
import re
from typing import Optional

from worker.ai.base_provider import (
    AIProvider, JobAnalysis, ResumeAnalysis, ResumeRecommendation
)
from worker.ai.prompts import (
    JOB_ANALYSIS_PROMPT,
    RESUME_ANALYSIS_PROMPT,
    COVER_LETTER_PROMPT,
    APPLICATION_ANSWERS_PROMPT,
    RESUME_RECOMMENDATION_PROMPT,
)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False


class GeminiProvider(AIProvider):
    """Google Gemini free-tier AI provider."""

    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        if not GEMINI_AVAILABLE:
            raise ImportError(
                "google-generativeai package not installed. "
                "Run: pip install google-generativeai"
            )

        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.model_name = model_name

    def get_provider_name(self) -> str:
        return "gemini"

    async def analyze_job(self, job_description: str) -> JobAnalysis:
        """Extract structured requirements from a job description."""
        prompt = JOB_ANALYSIS_PROMPT.format(job_description=job_description[:8000])

        response = self.model.generate_content(prompt)
        data = self._parse_json_response(response.text)

        if not data:
            return JobAnalysis()

        return JobAnalysis(
            title=data.get("title", ""),
            seniority=data.get("seniority", ""),
            department=data.get("department", ""),
            required_skills=data.get("required_skills", []),
            preferred_skills=data.get("preferred_skills", []),
            programming_languages=data.get("programming_languages", []),
            frameworks=data.get("frameworks", []),
            cloud_technologies=data.get("cloud_technologies", []),
            databases=data.get("databases", []),
            ml_technologies=data.get("ml_technologies", []),
            experience_min_years=data.get("experience_min_years"),
            experience_max_years=data.get("experience_max_years"),
            education_requirements=data.get("education_requirements", []),
            remote_type=data.get("remote_type", "unknown"),
            employment_type=data.get("employment_type", "full_time"),
            summary=data.get("summary", ""),
        )

    async def analyze_resume(self, resume_text: str) -> ResumeAnalysis:
        """Extract structured data from resume text."""
        prompt = RESUME_ANALYSIS_PROMPT.format(resume_text=resume_text[:10000])

        response = self.model.generate_content(prompt)
        data = self._parse_json_response(response.text)

        if not data:
            return ResumeAnalysis()

        return ResumeAnalysis(
            skills=data.get("skills", []),
            experience=data.get("experience", []),
            education=data.get("education", []),
            projects=data.get("projects", []),
            certifications=data.get("certifications", []),
            summary=data.get("summary", ""),
        )

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
        prompt = COVER_LETTER_PROMPT.format(
            job_title=job_title,
            company=company,
            job_description=job_description[:4000],
            candidate_name=candidate_name,
            candidate_skills=", ".join(candidate_skills),
            candidate_experience=candidate_experience,
            relevant_projects="\n".join(f"- {p}" for p in relevant_projects),
        )

        response = self.model.generate_content(prompt)
        return response.text.strip()

    async def generate_application_answers(
        self,
        job_title: str,
        company: str,
        job_description: str,
        candidate_profile: dict,
        questions: list[str],
    ) -> dict[str, str]:
        """Generate draft answers for application questions."""
        prompt = APPLICATION_ANSWERS_PROMPT.format(
            job_title=job_title,
            company=company,
            job_description=job_description[:3000],
            candidate_profile=json.dumps(candidate_profile, indent=2),
            questions="\n".join(f"- {q}" for q in questions),
        )

        response = self.model.generate_content(prompt)
        data = self._parse_json_response(response.text)

        if not data or "answers" not in data:
            return {}

        return {a["question"]: a["answer"] for a in data.get("answers", [])}

    async def recommend_resume(
        self,
        job_title: str,
        job_description: str,
        resumes: list[dict],
    ) -> ResumeRecommendation:
        """Recommend the best resume version for a job."""
        resumes_text = "\n\n".join(
            f"Resume: {r['name']}\nSkills: {', '.join(r.get('extracted_skills', []))}"
            for r in resumes
        )

        prompt = RESUME_RECOMMENDATION_PROMPT.format(
            job_title=job_title,
            job_description=job_description[:4000],
            resumes=resumes_text,
        )

        response = self.model.generate_content(prompt)
        data = self._parse_json_response(response.text)

        if not data:
            return ResumeRecommendation()

        return ResumeRecommendation(
            resume_name=data.get("recommended_resume", ""),
            reason=data.get("reason", ""),
            relevant_skills=data.get("relevant_skills", []),
        )

    @staticmethod
    def _parse_json_response(text: str) -> Optional[dict]:
        """Extract JSON from model response, handling markdown code blocks."""
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code block
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding JSON object in text
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        return None
