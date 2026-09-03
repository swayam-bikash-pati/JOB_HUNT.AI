"""Tests for the matching engine."""
from worker.matching.match_engine import MatchEngine


def test_high_skill_match():
    """A job where the user has most required skills should score high."""
    engine = MatchEngine()

    job = {
        "title": "ML Engineer",
        "required_skills": ["python", "pytorch", "machine learning"],
        "preferred_skills": ["aws", "docker"],
        "experience_min_years": 0,
        "location": "Bangalore",
        "remote_type": "office",
        "education_requirements": [],
    }

    profile = {
        "experience_level": "fresher",
        "target_roles": ["ML Engineer", "AI Engineer"],
        "preferred_locations": ["Bangalore"],
        "work_preferences": ["office", "remote"],
        "education": {"degree": "B.Tech CS"},
    }

    skills = [
        {"name": "Python"}, {"name": "PyTorch"},
        {"name": "Machine Learning"}, {"name": "Docker"},
    ]
    projects = [
        {"technologies": ["python", "pytorch", "nlp"]},
    ]

    result = engine.calculate_match(job, profile, skills, projects)

    assert result["skill_score"] >= 80, f"Skill score too low: {result['skill_score']}"
    assert result["role_score"] >= 80, f"Role score too low: {result['role_score']}"
    assert result["final_score"] >= 60, f"Final score too low: {result['final_score']}"
    assert "python" in result["matching_skills"]


def test_low_skill_match():
    """A job where the user has no required skills should score low."""
    engine = MatchEngine()

    job = {
        "title": "Java Backend Engineer",
        "required_skills": ["java", "spring boot", "microservices"],
        "preferred_skills": ["kafka"],
        "location": "Mumbai",
        "remote_type": "office",
    }

    profile = {
        "experience_level": "fresher",
        "target_roles": ["ML Engineer"],
        "preferred_locations": ["Bangalore"],
        "work_preferences": ["remote"],
        "education": {},
    }

    skills = [{"name": "Python"}, {"name": "PyTorch"}]
    projects = []

    result = engine.calculate_match(job, profile, skills, projects)

    assert result["skill_score"] < 20, f"Skill score too high: {result['skill_score']}"
    assert result["final_score"] < 50, f"Final score too high for a poor match"


def test_hard_filter_rejects_senior():
    """A senior role should be rejected for a fresher."""
    engine = MatchEngine()

    job = {"experience_min_years": 8}
    profile = {"experience_level": "fresher"}

    assert not engine.passes_hard_filters(job, profile)


def test_hard_filter_passes_junior():
    """A junior role should pass for a fresher."""
    engine = MatchEngine()

    job = {"experience_min_years": 0}
    profile = {"experience_level": "fresher"}

    assert engine.passes_hard_filters(job, profile)


def test_fuzzy_skill_match():
    """pytorch and torch should be treated as the same skill."""
    assert MatchEngine._fuzzy_skill_match("pytorch", "torch")
    assert MatchEngine._fuzzy_skill_match("tensorflow", "tf")
    assert MatchEngine._fuzzy_skill_match("javascript", "js")
    assert not MatchEngine._fuzzy_skill_match("python", "java")


def test_location_remote_score():
    """Remote jobs should score high for users who want remote."""
    score = MatchEngine._score_location(
        job_location="Remote",
        remote_type="remote",
        preferred_locations=["Bangalore"],
        work_preferences=["remote", "office"],
    )
    assert score >= 80
