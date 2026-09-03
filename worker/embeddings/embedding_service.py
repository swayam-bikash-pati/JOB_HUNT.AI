"""
Embedding service — generates vector embeddings for jobs and resumes.

Uses the sentence-transformers library with the all-MiniLM-L6-v2 model:
  - Free, open-source
  - ~80MB download
  - 384-dimensional embeddings
  - Runs locally (no API calls)
  - Fast enough for GitHub Actions
"""
import re
from typing import Optional

try:
    from sentence_transformers import SentenceTransformer
    ST_AVAILABLE = True
except ImportError:
    ST_AVAILABLE = False


class EmbeddingService:
    """Generate embeddings for semantic similarity matching."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        if not ST_AVAILABLE:
            raise ImportError(
                "sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )

        self.model = SentenceTransformer(model_name)
        self.model_name = model_name
        self.dimension = self.model.get_sentence_embedding_dimension()

    def embed_text(self, text: str) -> list[float]:
        """Generate an embedding vector for a text string."""
        # Clean and truncate text
        text = self._clean_text(text)
        embedding = self.model.encode(text, show_progress_bar=False)
        return embedding.tolist()

    def embed_job(self, job: dict) -> list[float]:
        """
        Generate an embedding for a job listing.

        Combines title, company, description, and skills into a single
        text for embedding. Weights important fields by repeating them.
        """
        parts = []

        # Title gets extra weight
        title = job.get("title", "")
        if title:
            parts.extend([title] * 3)

        # Company
        company = job.get("company", "")
        if company:
            parts.append(company)

        # Key skills
        skills = job.get("required_skills", []) + job.get("preferred_skills", [])
        if skills:
            parts.append("Skills: " + ", ".join(skills))

        # Description (truncated)
        desc = job.get("description", "")
        if desc:
            # Remove HTML tags
            desc = re.sub(r'<[^>]+>', ' ', desc)
            parts.append(desc[:2000])

        combined = " ".join(parts)
        return self.embed_text(combined)

    def embed_profile(self, profile: dict, skills: list[dict],
                      projects: list[dict]) -> list[float]:
        """
        Generate an embedding for a candidate profile.

        Combines target roles, skills, and project descriptions.
        """
        parts = []

        # Target roles
        for role in profile.get("target_roles", []):
            parts.extend([role] * 2)

        # Skills
        skill_names = [s["name"] for s in skills]
        if skill_names:
            parts.append("Skills: " + ", ".join(skill_names))

        # Projects
        for project in projects:
            name = project.get("name", "")
            desc = project.get("description", "")
            techs = ", ".join(project.get("technologies", []))
            parts.append(f"{name}: {desc} ({techs})")

        # Experience level and location
        parts.append(f"Experience: {profile.get('experience_level', 'fresher')}")
        locs = profile.get("preferred_locations", [])
        if locs:
            parts.append(f"Location: {', '.join(locs)}")

        combined = " ".join(parts)
        return self.embed_text(combined)

    def cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        """Calculate cosine similarity between two vectors."""
        import numpy as np

        a = np.array(vec_a)
        b = np.array(vec_b)

        dot = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        return float(dot / (norm_a * norm_b))

    @staticmethod
    def _clean_text(text: str) -> str:
        """Clean text for embedding."""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', ' ', text)
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Truncate to ~1000 words
        words = text.split()
        if len(words) > 1000:
            text = " ".join(words[:1000])
        return text.strip()
