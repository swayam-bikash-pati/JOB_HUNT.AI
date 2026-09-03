"""
Ollama AI provider — local development fallback.

Uses a locally running Ollama instance for development/testing
when no cloud AI API is available.

Start Ollama: ollama serve
Pull a model: ollama pull llama3.1
"""
import json
import re
from typing import Optional

import httpx

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


class OllamaProvider(AIProvider):
    """Local Ollama AI provider for development."""

    def __init__(self, base_url: str = "http://localhost:11434",
                 model: str = "llama3.1"):
        self.base_url = base_url.rstrip("/")
        self.model = model

    def get_provider_name(self) -> str:
        return "ollama"

    async def _generate(self, prompt: str) -> str:
        """Send a prompt to Ollama and get the response."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
        }

        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    async def analyze_job(self, job_description: str) -> JobAnalysis:
        prompt = JOB_ANALYSIS_PROMPT.format(job_description=job_description[:6000])
        text = await self._generate(prompt)
        data = self._parse_json(text)
        if not data:
            return JobAnalysis()
        return JobAnalysis(
            title=data.get("title", ""),
            seniority=data.get("seniority", ""),
            required_skills=data.get("required_skills", []),
            preferred_skills=data.get("preferred_skills", []),
            programming_languages=data.get("programming_languages", []),
            frameworks=data.get("frameworks", []),
            summary=data.get("summary", ""),
        )

    async def analyze_resume(self, resume_text: str) -> ResumeAnalysis:
        prompt = RESUME_ANALYSIS_PROMPT.format(resume_text=resume_text[:6000])
        text = await self._generate(prompt)
        data = self._parse_json(text)
        if not data:
            return ResumeAnalysis()
        return ResumeAnalysis(
            skills=data.get("skills", []),
            experience=data.get("experience", []),
            education=data.get("education", []),
            projects=data.get("projects", []),
            summary=data.get("summary", ""),
        )

    async def generate_cover_letter(
        self, job_title, company, job_description,
        candidate_name, candidate_skills, candidate_experience,
        relevant_projects,
    ) -> str:
        prompt = COVER_LETTER_PROMPT.format(
            job_title=job_title,
            company=company,
            job_description=job_description[:3000],
            candidate_name=candidate_name,
            candidate_skills=", ".join(candidate_skills),
            candidate_experience=candidate_experience,
            relevant_projects="\n".join(f"- {p}" for p in relevant_projects),
        )
        return await self._generate(prompt)

    async def generate_application_answers(
        self, job_title, company, job_description,
        candidate_profile, questions,
    ) -> dict[str, str]:
        prompt = APPLICATION_ANSWERS_PROMPT.format(
            job_title=job_title,
            company=company,
            job_description=job_description[:3000],
            candidate_profile=json.dumps(candidate_profile, indent=2),
            questions="\n".join(f"- {q}" for q in questions),
        )
        text = await self._generate(prompt)
        data = self._parse_json(text)
        if not data:
            return {}
        return {a["question"]: a["answer"] for a in data.get("answers", [])}

    async def recommend_resume(
        self, job_title, job_description, resumes,
    ) -> ResumeRecommendation:
        resumes_text = "\n".join(
            f"Resume: {r['name']} | Skills: {', '.join(r.get('extracted_skills', []))}"
            for r in resumes
        )
        prompt = RESUME_RECOMMENDATION_PROMPT.format(
            job_title=job_title,
            job_description=job_description[:3000],
            resumes=resumes_text,
        )
        text = await self._generate(prompt)
        data = self._parse_json(text)
        if not data:
            return ResumeRecommendation()
        return ResumeRecommendation(
            resume_name=data.get("recommended_resume", ""),
            reason=data.get("reason", ""),
            relevant_skills=data.get("relevant_skills", []),
        )

    @staticmethod
    def _parse_json(text: str) -> Optional[dict]:
        """Extract JSON from Ollama response."""
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        match = re.search(r'```(?:json)?\s*\n?(.*?)\n?```', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
        return None
