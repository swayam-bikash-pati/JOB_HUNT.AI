"""
Prompt templates for AI operations.

All prompts include safety guardrails:
  - Never invent skills or experience
  - Only use factual information from the candidate's profile
  - Distinguish between required and preferred qualifications
"""

JOB_ANALYSIS_PROMPT = """Analyze this job description and extract structured information.

JOB DESCRIPTION:
{job_description}

Return a JSON object with these fields:
{{
  "title": "exact job title",
  "seniority": "intern/junior/mid/senior/lead",
  "department": "engineering/data science/product/etc",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "programming_languages": ["Python", "Java"],
  "frameworks": ["PyTorch", "TensorFlow"],
  "cloud_technologies": ["AWS", "GCP"],
  "databases": ["PostgreSQL", "MongoDB"],
  "ml_technologies": ["NLP", "Computer Vision"],
  "experience_min_years": 0,
  "experience_max_years": 2,
  "education_requirements": ["B.Tech in CS", "M.Tech preferred"],
  "remote_type": "remote/hybrid/office/unknown",
  "employment_type": "full_time/internship/contract/part_time",
  "summary": "brief 2-sentence summary of the role"
}}

Only include skills explicitly mentioned in the description. Do not guess or infer unmentioned skills.
Return ONLY the JSON object, no other text."""


RESUME_ANALYSIS_PROMPT = """Extract structured information from this resume.

RESUME:
{resume_text}

Return a JSON object with these fields:
{{
  "skills": ["Python", "PyTorch", "SQL"],
  "experience": [
    {{
      "company": "Company Name",
      "title": "Job Title",
      "duration": "6 months",
      "description": "brief description"
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "B.Tech Computer Science",
      "year": "2024"
    }}
  ],
  "projects": [
    {{
      "name": "Project Name",
      "description": "brief description",
      "technologies": ["Python", "TensorFlow"]
    }}
  ],
  "certifications": ["cert1", "cert2"],
  "summary": "brief 2-sentence professional summary"
}}

Extract ONLY what is explicitly stated. Do not invent or assume anything.
Return ONLY the JSON object, no other text."""


COVER_LETTER_PROMPT = """Write a professional cover letter for the following job application.

JOB TITLE: {job_title}
COMPANY: {company}
JOB DESCRIPTION: {job_description}

CANDIDATE NAME: {candidate_name}
CANDIDATE SKILLS: {candidate_skills}
CANDIDATE EXPERIENCE: {candidate_experience}
RELEVANT PROJECTS:
{relevant_projects}

IMPORTANT RULES:
1. Only mention skills, experience, and projects from the candidate's profile above.
2. NEVER invent or fabricate any qualifications, skills, or experience.
3. Be specific about how the candidate's background matches the job requirements.
4. Keep it professional, concise, and under 300 words.
5. Show genuine interest in the company and role.
6. If the candidate lacks a required skill, do NOT pretend they have it.

Write the cover letter now:"""


APPLICATION_ANSWERS_PROMPT = """Draft answers for these job application questions.

JOB TITLE: {job_title}
COMPANY: {company}
JOB DESCRIPTION: {job_description}

CANDIDATE PROFILE:
{candidate_profile}

QUESTIONS:
{questions}

IMPORTANT RULES:
1. Only use information from the candidate's profile above.
2. NEVER invent skills, experience, or qualifications.
3. Be honest and specific.
4. Keep answers concise but thoughtful.

Return a JSON object:
{{
  "answers": [
    {{
      "question": "the question",
      "answer": "the drafted answer"
    }}
  ]
}}

Return ONLY the JSON object, no other text."""


RESUME_RECOMMENDATION_PROMPT = """Given this job and available resumes, recommend the best resume version.

JOB TITLE: {job_title}
JOB DESCRIPTION: {job_description}

AVAILABLE RESUMES:
{resumes}

Return a JSON object:
{{
  "recommended_resume": "resume name",
  "reason": "why this resume is the best match",
  "relevant_skills": ["skill1", "skill2"]
}}

Return ONLY the JSON object, no other text."""
