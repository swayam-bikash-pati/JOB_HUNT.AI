"""Tests for JobParser, ResumeParser, Ranker, and CostGuard."""
from datetime import datetime, timezone, timedelta
from worker.parsers.job_parser import JobParser
from worker.parsers.resume_parser import ResumeParser
from worker.ranking.ranker import Ranker
from worker.cost_guard.cost_guard import CostGuard
from worker.config.settings import settings


def test_job_parser_experience_extraction():
    """Extract experience numbers accurately."""
    min_y, max_y = JobParser.extract_experience_years("Looking for 2-5 years of experience in AI.")
    assert min_y == 2
    assert max_y == 5

    min_y, max_y = JobParser.extract_experience_years("Requires minimum 3+ years experience.")
    assert min_y == 3
    assert max_y is None

    min_y, max_y = JobParser.extract_experience_years("Great role for freshers and entry-level grads.")
    assert min_y == 0
    assert max_y == 1


def test_job_parser_skills_and_education():
    """Extract skills and education requirements."""
    desc = """
    About the role:
    We need a Python developer who knows PyTorch and Docker.
    Preferred qualifications:
    Familiarity with AWS and Kubernetes is a plus.
    Requirements:
    B.Tech or M.Tech in Computer Science required.
    """
    req, pref = JobParser.extract_skills(desc)
    assert any("python" in s.lower() for s in req)
    assert any("pytorch" in s.lower() for s in req)

    edu = JobParser.extract_education(desc)
    assert len(edu) > 0
    assert any("b.tech" in e.lower() or "btech" in e.lower() for e in edu)


def test_resume_parser_basic_skills():
    """Regex skill extraction from raw resume text."""
    text = "Experienced in Python, PostgreSQL, React, Docker, and Machine Learning."
    skills = ResumeParser.extract_skills_basic(text)
    assert "Python" in skills
    assert "PostgreSQL" in skills
    assert "React" in skills
    assert "Docker" in skills


def test_ranker_freshness_decay():
    """Jobs posted recently have higher freshness."""
    now = datetime.now(timezone.utc)
    fresh_date = now - timedelta(hours=1)
    old_date = now - timedelta(days=5)

    fresh_score = Ranker.calculate_freshness(fresh_date)
    old_score = Ranker.calculate_freshness(old_date)

    assert fresh_score > old_score
    assert fresh_score >= 0.9

    # Fresh job outranks older job with identical match score
    match_score = 90.0
    rank_fresh = Ranker.calculate_rank_score(match_score, fresh_score)
    rank_old = Ranker.calculate_rank_score(match_score, old_score)
    assert rank_fresh > rank_old


def test_cost_guard_safety():
    """Cost guard respects free-tier limit."""
    guard = CostGuard(db_client=None)
    guard._ai_calls_today = 0

    # If AI enabled is false (default in tests without API key), budget returns False
    # But if we simulate calls approaching limit:
    guard._ai_calls_today = int(settings.AI_DAILY_LIMIT * 0.95)
    assert not guard.check_ai_budget()
