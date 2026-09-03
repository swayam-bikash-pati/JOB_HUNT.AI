"""Tests for the deduplication engine."""
from worker.discovery.base_adapter import NormalizedJob
from worker.deduplication.dedup_engine import DedupEngine


def test_exact_url_duplicate():
    """Level 1: same URL should be detected as duplicate."""
    dedup = DedupEngine()

    job1 = NormalizedJob(
        source="greenhouse", source_job_id="123",
        title="ML Engineer", company="ABC",
        application_url="https://example.com/jobs/123"
    )
    job2 = NormalizedJob(
        source="lever", source_job_id="456",
        title="Machine Learning Engineer", company="ABC Corp",
        application_url="https://example.com/jobs/123"
    )

    assert not dedup.is_duplicate(job1)
    assert dedup.is_duplicate(job2)


def test_source_id_duplicate():
    """Level 2: same source + source_job_id should be detected."""
    dedup = DedupEngine()

    job1 = NormalizedJob(
        source="greenhouse", source_job_id="789",
        title="Data Scientist", company="XYZ",
    )
    job2 = NormalizedJob(
        source="greenhouse", source_job_id="789",
        title="Data Scientist", company="XYZ",
    )

    assert not dedup.is_duplicate(job1)
    assert dedup.is_duplicate(job2)


def test_content_hash_duplicate():
    """Level 3: normalized company + title + location should match."""
    dedup = DedupEngine()

    job1 = NormalizedJob(
        source="greenhouse", source_job_id="100",
        title="Machine Learning Engineer", company="ABC",
        location="Bangalore, India",
    )
    job2 = NormalizedJob(
        source="lever", source_job_id="200",
        title="ML Engineer", company="ABC",
        location="Bengaluru",
        application_url="https://different-url.com/apply"
    )

    assert not dedup.is_duplicate(job1)
    # Should detect as duplicate since normalized forms match
    assert dedup.is_duplicate(job2)


def test_different_jobs_not_duplicate():
    """Different jobs at the same company should not be duplicates."""
    dedup = DedupEngine()

    job1 = NormalizedJob(
        source="greenhouse", source_job_id="100",
        title="ML Engineer", company="ABC",
        location="Bangalore",
    )
    job2 = NormalizedJob(
        source="greenhouse", source_job_id="101",
        title="Data Scientist", company="ABC",
        location="Bangalore",
    )

    assert not dedup.is_duplicate(job1)
    assert not dedup.is_duplicate(job2)


def test_location_normalization():
    """Verify city aliases work correctly."""
    assert DedupEngine._normalize_location("Bengaluru") == "bangalore"
    assert DedupEngine._normalize_location("Bangalore, India") == "bangalore"
    assert DedupEngine._normalize_location("Gurgaon") == "delhi"
    assert DedupEngine._normalize_location("Delhi NCR") == "delhi"
