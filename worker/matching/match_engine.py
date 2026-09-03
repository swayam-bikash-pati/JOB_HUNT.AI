"""
Job Matching Engine — combines deterministic rules and semantic scoring.

Pipeline:
  Stage 1: Hard filters (reject impossible matches)
  Stage 2: Weighted scoring across 7 factors
  Stage 3: Freshness-adjusted ranking

The engine does NOT rely entirely on an LLM. Most scoring is deterministic.
"""
import re
from typing import Optional


# City aliases for Indian locations
CITY_ALIASES: dict[str, str] = {
    "bengaluru": "bangalore",
    "mumbai": "mumbai",
    "bombay": "mumbai",
    "chennai": "chennai",
    "madras": "chennai",
    "kolkata": "kolkata",
    "calcutta": "kolkata",
    "new delhi": "delhi",
    "delhi ncr": "delhi",
    "noida": "delhi",
    "gurugram": "delhi",
    "gurgaon": "delhi",
    "hyderabad": "hyderabad",
    "pune": "pune",
}


class MatchEngine:
    """
    Calculates match scores between jobs and candidate profiles.

    Scoring weights:
      Required skills:  25%
      Semantic:          20%  (requires embeddings)
      Role relevance:    15%
      Project relevance: 15%
      Experience:        10%
      Location:          10%
      Education:          5%
    """

    WEIGHTS = {
        "skill": 25,
        "semantic": 20,
        "role": 15,
        "project": 15,
        "experience": 10,
        "location": 10,
        "education": 5,
    }

    def __init__(self, minimum_score: int = 70):
        self.minimum_score = minimum_score

    def calculate_match(
        self,
        job: dict,
        profile: dict,
        user_skills: list[dict],
        user_projects: list[dict],
        semantic_score: float = 0.0,
    ) -> dict:
        """
        Calculate a comprehensive match score.

        Returns a dict with per-factor scores, final score, and metadata.
        """
        # Extract data
        job_required = set(s.lower() for s in (job.get("required_skills") or []))
        job_preferred = set(s.lower() for s in (job.get("preferred_skills") or []))
        job_all_skills = job_required | job_preferred
        user_skill_names = set(s["name"].lower() for s in user_skills)

        # Calculate each factor
        skill_score = self._score_skills(job_required, job_preferred, user_skill_names)
        role_score = self._score_role_relevance(
            job.get("title", ""), profile.get("target_roles", [])
        )
        project_score = self._score_projects(job_all_skills, user_projects)
        experience_score = self._score_experience(
            job.get("experience_min_years"),
            job.get("experience_max_years"),
            profile.get("experience_level", "fresher"),
        )
        location_score = self._score_location(
            job.get("location", ""),
            job.get("remote_type", "unknown"),
            profile.get("preferred_locations", []),
            profile.get("work_preferences", []),
        )
        education_score = self._score_education(
            job.get("education_requirements", []),
            profile.get("education", {}),
        )

        # Weighted final score
        final_score = (
            skill_score * self.WEIGHTS["skill"] / 100
            + semantic_score * 100 * self.WEIGHTS["semantic"] / 100
            + role_score * self.WEIGHTS["role"] / 100
            + project_score * self.WEIGHTS["project"] / 100
            + experience_score * self.WEIGHTS["experience"] / 100
            + location_score * self.WEIGHTS["location"] / 100
            + education_score * self.WEIGHTS["education"] / 100
        )

        # Determine matching and missing skills
        matching = sorted(user_skill_names & job_all_skills)
        missing = sorted(job_required - user_skill_names)

        # Explanation
        explanation = self._build_explanation(
            skill_score, semantic_score * 100, role_score, project_score,
            experience_score, location_score, education_score,
            matching, missing
        )

        return {
            "skill_score": round(skill_score, 1),
            "semantic_score": round(semantic_score * 100, 1),
            "role_score": round(role_score, 1),
            "project_score": round(project_score, 1),
            "experience_score": round(experience_score, 1),
            "location_score": round(location_score, 1),
            "education_score": round(education_score, 1),
            "final_score": round(final_score, 1),
            "matching_skills": matching,
            "missing_skills": missing,
            "explanation": explanation,
        }

    # ================================================================
    # Hard Filters
    # ================================================================

    def passes_hard_filters(self, job: dict, profile: dict) -> bool:
        """
        Reject jobs that are clearly impossible matches.

        Returns False if the job should be rejected.
        """
        # Check experience requirement
        exp_min = job.get("experience_min_years")
        user_level = profile.get("experience_level", "fresher")
        user_years = self._level_to_years(user_level)

        if exp_min is not None and exp_min > user_years + 2:
            # Allow some stretch, but reject impossibly senior roles
            return False

        return True

    # ================================================================
    # Individual Scoring Functions
    # ================================================================

    @staticmethod
    def _score_skills(
        required: set[str], preferred: set[str], user_skills: set[str]
    ) -> float:
        """Score based on skill overlap. 0-100."""
        if not required and not preferred:
            return 50  # No skills listed — neutral

        total_weight = 0
        matched_weight = 0

        # Required skills weighted at 2x
        for skill in required:
            total_weight += 2
            if skill in user_skills or any(
                MatchEngine._fuzzy_skill_match(skill, us) for us in user_skills
            ):
                matched_weight += 2

        # Preferred skills weighted at 1x
        for skill in preferred:
            total_weight += 1
            if skill in user_skills or any(
                MatchEngine._fuzzy_skill_match(skill, us) for us in user_skills
            ):
                matched_weight += 1

        if total_weight == 0:
            return 50

        return (matched_weight / total_weight) * 100

    @staticmethod
    def _score_role_relevance(job_title: str, target_roles: list[str]) -> float:
        """Score based on how well the job title matches target roles. 0-100."""
        if not target_roles:
            return 50

        job_lower = job_title.lower()
        best_score = 0

        for role in target_roles:
            role_lower = role.lower()
            # Exact match
            if role_lower in job_lower or job_lower in role_lower:
                return 100

            # Partial match — check key words
            role_words = set(role_lower.split())
            job_words = set(job_lower.split())
            overlap = len(role_words & job_words)
            if role_words:
                score = (overlap / len(role_words)) * 100
                best_score = max(best_score, score)

        return best_score

    @staticmethod
    def _score_projects(job_skills: set[str], projects: list[dict]) -> float:
        """Score based on project-to-job skill overlap. 0-100."""
        if not projects or not job_skills:
            return 50

        project_techs = set()
        for p in projects:
            for tech in p.get("technologies", []):
                project_techs.add(tech.lower())

        if not project_techs:
            return 30

        overlap = len(project_techs & job_skills)
        total = len(job_skills)

        if total == 0:
            return 50

        return min(100, (overlap / total) * 100 * 1.5)  # Boost factor

    @staticmethod
    def _score_experience(
        min_years: Optional[int],
        max_years: Optional[int],
        user_level: str,
    ) -> float:
        """Score based on experience compatibility. 0-100."""
        user_years = MatchEngine._level_to_years(user_level)

        if min_years is None and max_years is None:
            return 80  # No requirement specified

        if min_years is not None and user_years < min_years:
            # Under-qualified
            gap = min_years - user_years
            if gap <= 1:
                return 70  # Close enough
            elif gap <= 2:
                return 40
            else:
                return 10

        if max_years is not None and user_years > max_years:
            # Over-qualified
            gap = user_years - max_years
            if gap <= 2:
                return 70
            else:
                return 30

        return 100  # Within range

    @staticmethod
    def _score_location(
        job_location: str,
        remote_type: str,
        preferred_locations: list[str],
        work_preferences: list[str],
    ) -> float:
        """Score based on location match. 0-100."""
        # Remote jobs always score high if user wants remote
        if remote_type == "remote":
            if "remote" in work_preferences:
                return 100
            return 80

        if remote_type == "hybrid" and "hybrid" in work_preferences:
            return 90

        if not job_location or not preferred_locations:
            return 50

        # Normalize and compare cities
        job_city = MatchEngine._normalize_city(job_location)
        for pref in preferred_locations:
            pref_city = MatchEngine._normalize_city(pref)
            if pref_city == "remote":
                continue
            if job_city == pref_city:
                return 100
            if job_city and pref_city and (
                job_city in pref_city or pref_city in job_city
            ):
                return 90

        # Location doesn't match but user is open to relocation
        if "relocation" in work_preferences:
            return 60

        return 20

    @staticmethod
    def _score_education(
        requirements: list[str], user_education: dict
    ) -> float:
        """Score based on education match. 0-100."""
        if not requirements:
            return 80  # No requirement

        # Simple keyword matching
        user_degree = str(user_education.get("degree", "")).lower()
        user_field = str(user_education.get("field", "")).lower()

        for req in requirements:
            req_lower = req.lower()
            if any(
                kw in user_degree or kw in user_field
                for kw in ["computer", "cs", "engineering", "technology", "science", "it"]
                if kw in req_lower
            ):
                return 100

        return 50  # Partial match or unknown

    # ================================================================
    # Helpers
    # ================================================================

    @staticmethod
    def _level_to_years(level: str) -> int:
        """Convert experience level to approximate years."""
        mapping = {
            "fresher": 0,
            "junior": 1,
            "mid": 3,
            "senior": 6,
        }
        return mapping.get(level, 0)

    @staticmethod
    def _fuzzy_skill_match(skill_a: str, skill_b: str) -> bool:
        """Check if two skill names are essentially the same."""
        # Remove common suffixes/variations
        a = re.sub(r'[\s\-_\.]+', '', skill_a.lower())
        b = re.sub(r'[\s\-_\.]+', '', skill_b.lower())

        if a == b:
            return True

        # Common equivalences
        equivalences = [
            ("pytorch", "torch"),
            ("tensorflow", "tf"),
            ("javascript", "js"),
            ("typescript", "ts"),
            ("postgresql", "postgres"),
            ("mongodb", "mongo"),
            ("kubernetes", "k8s"),
            ("machinelearning", "ml"),
            ("deeplearning", "dl"),
            ("naturallanguageprocessing", "nlp"),
            ("computervision", "cv"),
            ("amazonwebservices", "aws"),
            ("googlecloudplatform", "gcp"),
        ]

        for eq_a, eq_b in equivalences:
            if (a == eq_a and b == eq_b) or (a == eq_b and b == eq_a):
                return True

        return False

    @staticmethod
    def _normalize_city(location: str) -> str:
        """Normalize city name for comparison."""
        city = location.lower().strip()
        city = re.sub(r',.*$', '', city).strip()
        return CITY_ALIASES.get(city, city)

    @staticmethod
    def _build_explanation(
        skill: float, semantic: float, role: float, project: float,
        experience: float, location: float, education: float,
        matching: list[str], missing: list[str],
    ) -> str:
        """Build a human-readable explanation of the match score."""
        parts = []

        if skill >= 80:
            parts.append(f"Strong skill match ({skill:.0f}%)")
        elif skill >= 50:
            parts.append(f"Partial skill match ({skill:.0f}%)")
        else:
            parts.append(f"Low skill match ({skill:.0f}%)")

        if matching:
            parts.append(f"Matching: {', '.join(matching[:5])}")
        if missing:
            parts.append(f"Missing: {', '.join(missing[:3])}")

        if role >= 80:
            parts.append("Role closely matches your targets")
        if location >= 80:
            parts.append("Location matches your preferences")
        elif location < 40:
            parts.append("Location may not match your preferences")

        return ". ".join(parts)
