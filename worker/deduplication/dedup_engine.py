"""
Duplicate detection engine.

Prevents the same job from appearing multiple times using 4 levels:
  Level 1: Exact URL match
  Level 2: Source + source_job_id match
  Level 3: Normalized (company + title + location) match
  Level 4: Semantic similarity (requires embeddings — Sprint 4)
"""
import hashlib
import re
from worker.discovery.base_adapter import NormalizedJob


class DedupEngine:
    """Multi-level duplicate detection."""

    def __init__(self, existing_hashes: set[str] = None,
                 existing_source_ids: set[str] = None,
                 existing_urls: set[str] = None):
        self.seen_hashes: set[str] = existing_hashes or set()
        self.seen_source_ids: set[str] = existing_source_ids or set()
        self.seen_urls: set[str] = existing_urls or set()
        self.duplicates_found: int = 0

    def is_duplicate(self, job: NormalizedJob) -> bool:
        """
        Check if a job is a duplicate using Levels 1-3.

        Returns True if the job is a duplicate.
        """
        # Level 1: Exact URL match
        if job.application_url:
            url_normalized = self._normalize_url(job.application_url)
            if url_normalized in self.seen_urls:
                self.duplicates_found += 1
                return True
            self.seen_urls.add(url_normalized)

        # Level 2: Source + source_job_id
        source_key = f"{job.source}:{job.source_job_id}"
        if source_key in self.seen_source_ids:
            self.duplicates_found += 1
            return True
        self.seen_source_ids.add(source_key)

        # Level 3: Normalized company + title + location
        content_hash = self.compute_content_hash(job)
        if content_hash in self.seen_hashes:
            self.duplicates_found += 1
            return True
        self.seen_hashes.add(content_hash)

        return False

    @staticmethod
    def compute_content_hash(job: NormalizedJob) -> str:
        """
        Generate a normalized hash from company + title + location.

        This catches duplicates like:
          LinkedIn:   "Machine Learning Engineer — ABC — Bangalore"
          Company:    "ML Engineer — ABC — Bengaluru"
        """
        company = DedupEngine._normalize_text(job.company)
        title = DedupEngine._normalize_text(job.title)
        location = DedupEngine._normalize_location(job.location)

        combined = f"{company}|{title}|{location}"
        return hashlib.sha256(combined.encode()).hexdigest()[:16]

    @staticmethod
    def _normalize_text(text: str) -> str:
        """Lowercase, strip whitespace, remove common variations."""
        text = text.lower().strip()
        # Remove common prefixes/suffixes
        text = re.sub(r'\s+', ' ', text)
        # Normalize common abbreviations
        text = text.replace("machine learning", "ml")
        text = text.replace("artificial intelligence", "ai")
        text = text.replace("senior", "sr")
        text = text.replace("junior", "jr")
        text = text.replace("software engineer", "swe")
        text = text.replace("software developer", "swe")
        return text

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

    @staticmethod
    def _normalize_location(location: str) -> str:
        """Normalize location strings for comparison."""
        loc = location.lower().strip()
        # Remove state/country suffixes
        loc = re.sub(r',?\s*(india|in)$', '', loc)
        loc = re.sub(r',?\s*(karnataka|maharashtra|telangana|delhi|ncr)$', '', loc)
        loc = loc.strip().strip(',').strip()
        loc = re.sub(r',.*$', '', loc).strip()
        return DedupEngine.CITY_ALIASES.get(loc, loc)

    @staticmethod
    def _normalize_url(url: str) -> str:
        """Normalize URL for comparison."""
        url = url.lower().strip()
        # Remove trailing slashes
        url = url.rstrip('/')
        # Remove common tracking params
        url = re.sub(r'[?&](utm_\w+|ref|source|tracking)=[^&]*', '', url)
        return url
