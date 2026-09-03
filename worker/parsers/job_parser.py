"""
Job parser and requirement extractor.

Extracts structured information from job titles and descriptions:
- Experience requirements (min/max years)
- Skills (required and preferred) using heuristic pattern matching
- Education requirements
- Salary estimates if present in text
"""
import re
from typing import Optional
from bs4 import BeautifulSoup

from worker.parsers.resume_parser import ResumeParser


class JobParser:
    """Extracts structured fields from raw job data and descriptions."""

    # Experience regex patterns like "2-5 years", "3+ years", "at least 4 years"
    EXP_RANGE_PATTERN = re.compile(
        r'(?:(\d+)\s*(?:-|to)\s*(\d+))\s*(?:\+)?\s*(?:years|yrs)',
        re.IGNORECASE
    )
    EXP_MIN_PATTERN = re.compile(
        r'(?:(?:at\s+least|minimum|min|over|\+)?\s*(\d+)\s*(?:\+)?\s*(?:years|yrs))',
        re.IGNORECASE
    )
    EXP_FRESHER_PATTERN = re.compile(
        r'\b(fresher|entry[\s-]level|0[\s-]years|college\s+grad|new\s+grad)\b',
        re.IGNORECASE
    )

    # Education degree keywords
    EDUCATION_KEYWORDS = [
        "b.tech", "b.e.", "btech", "m.tech", "mtech",
        "bachelor", "master", "phd", "ph.d", "degree in computer science",
        "degree in cs", "degree in engineering", "m.s.", "b.s.", "mca", "bca"
    ]

    # Salary patterns (INR and USD)
    SALARY_INR_PATTERN = re.compile(
        r'(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(lpa|lakh|crore|k)?',
        re.IGNORECASE
    )
    SALARY_USD_PATTERN = re.compile(
        r'\$\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:-|to|–)\s*\$?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k|yr|year|annual)?',
        re.IGNORECASE
    )

    @classmethod
    def clean_html(cls, html_or_text: str) -> str:
        """Strip HTML tags and normalize spacing."""
        if not html_or_text:
            return ""
        if "<" in html_or_text and ">" in html_or_text:
            try:
                soup = BeautifulSoup(html_or_text, "html.parser")
                text = soup.get_text(separator="\n")
            except Exception:
                text = re.sub(r'<[^>]+>', ' ', html_or_text)
        else:
            text = html_or_text

        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @classmethod
    def extract_experience_years(cls, text: str) -> tuple[Optional[int], Optional[int]]:
        """
        Extract min and max experience in years from job text.
        Returns: (min_years, max_years)
        """
        if cls.EXP_FRESHER_PATTERN.search(text):
            return 0, 1

        range_match = cls.EXP_RANGE_PATTERN.search(text)
        if range_match:
            try:
                min_y = int(range_match.group(1))
                max_y = int(range_match.group(2))
                return min_y, max_y
            except (ValueError, TypeError):
                pass

        min_match = cls.EXP_MIN_PATTERN.search(text)
        if min_match:
            try:
                min_y = int(min_match.group(1))
                return min_y, None
            except (ValueError, TypeError):
                pass

        return None, None

    @classmethod
    def extract_skills(cls, text: str) -> tuple[list[str], list[str]]:
        """
        Extract required and preferred skills using heuristic sections and skill list.
        Returns: (required_skills, preferred_skills)
        """
        cleaned = cls.clean_html(text)
        all_skills = ResumeParser.extract_skills_basic(cleaned)

        # Look for section splits (e.g., "Requirements" vs "Nice to have" / "Preferred")
        sections = re.split(
            r'\b(preferred|nice\s+to\s+have|bonus|good\s+to\s+have|plus)\b',
            cleaned,
            flags=re.IGNORECASE
        )

        if len(sections) > 1:
            req_text = sections[0]
            pref_text = " ".join(sections[1:])
            req_skills = [s for s in all_skills if re.search(r'\b' + re.escape(s) + r'\b', req_text, re.IGNORECASE)]
            pref_skills = [s for s in all_skills if s not in req_skills and re.search(r'\b' + re.escape(s) + r'\b', pref_text, re.IGNORECASE)]
            return req_skills, pref_skills

        return all_skills, []

    @classmethod
    def extract_education(cls, text: str) -> list[str]:
        """Extract mentioned educational requirements."""
        cleaned = cls.clean_html(text).lower()
        found = []
        for kw in cls.EDUCATION_KEYWORDS:
            if re.search(r'\b' + re.escape(kw) + r'\b', cleaned):
                found.append(kw.upper() if len(kw) <= 5 else kw.title())
        return list(dict.fromkeys(found))
