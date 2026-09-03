-- ============================================================
-- JobHunter AI — Initial Database Schema
-- Supabase PostgreSQL + pgvector
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    location TEXT DEFAULT '',
    experience_level TEXT DEFAULT 'fresher'
        CHECK (experience_level IN ('fresher', 'junior', 'mid', 'senior')),
    education JSONB DEFAULT '{}',
    target_roles TEXT[] DEFAULT '{}',
    preferred_locations TEXT[] DEFAULT '{}',
    work_preferences TEXT[] DEFAULT '{}'
        CHECK (work_preferences <@ ARRAY['remote', 'hybrid', 'office', 'relocation']::TEXT[]),
    salary_min INTEGER DEFAULT NULL,
    salary_max INTEGER DEFAULT NULL,
    salary_currency TEXT DEFAULT 'INR',
    notice_period TEXT DEFAULT '',
    minimum_match_score INTEGER DEFAULT 70 CHECK (minimum_match_score BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SKILLS (user skills)
-- ============================================================
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general'
        CHECK (category IN (
            'programming_language', 'framework', 'ml_library', 'cloud',
            'database', 'tool', 'soft_skill', 'domain', 'general'
        )),
    proficiency TEXT DEFAULT 'intermediate'
        CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- ============================================================
-- PROJECTS (user projects)
-- ============================================================
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    technologies TEXT[] DEFAULT '{}',
    url TEXT DEFAULT '',
    relevance_tags TEXT[] DEFAULT '{}',
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESUMES
-- ============================================================
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    version TEXT DEFAULT 'master',
    is_master BOOLEAN DEFAULT FALSE,
    parsed_content JSONB DEFAULT '{}',
    extracted_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SOURCE CONFIGS (configurable job sources)
-- ============================================================
CREATE TABLE source_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type TEXT NOT NULL
        CHECK (source_type IN ('greenhouse', 'lever', 'career_page', 'gmail_alert', 'custom')),
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT TRUE,
    last_fetched_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOBS (normalized job listings)
-- ============================================================
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source TEXT NOT NULL,
    source_job_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT DEFAULT '',
    remote_type TEXT DEFAULT 'unknown'
        CHECK (remote_type IN ('remote', 'hybrid', 'office', 'unknown')),
    employment_type TEXT DEFAULT 'full_time'
        CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'internship', 'unknown')),
    experience_required TEXT DEFAULT '',
    experience_min_years INTEGER DEFAULT NULL,
    experience_max_years INTEGER DEFAULT NULL,
    salary_min INTEGER DEFAULT NULL,
    salary_max INTEGER DEFAULT NULL,
    salary_currency TEXT DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    education_requirements TEXT[] DEFAULT '{}',
    application_url TEXT NOT NULL DEFAULT '',
    company_url TEXT DEFAULT '',
    posted_at TIMESTAMPTZ DEFAULT NULL,
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    content_hash TEXT DEFAULT '',
    status TEXT DEFAULT 'new'
        CHECK (status IN ('new', 'analyzed', 'shortlisted', 'rejected', 'expired')),
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, source_job_id)
);

-- ============================================================
-- JOB SKILLS (extracted per job)
-- ============================================================
CREATE TABLE job_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    skill_type TEXT DEFAULT 'required'
        CHECK (skill_type IN ('required', 'preferred')),
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, skill_name)
);

-- ============================================================
-- JOB EMBEDDINGS (pgvector)
-- ============================================================
CREATE TABLE job_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID UNIQUE NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    embedding vector(384),
    model TEXT DEFAULT 'all-MiniLM-L6-v2',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOB MATCHES (per-user match scores)
-- ============================================================
CREATE TABLE job_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    skill_score REAL DEFAULT 0,
    experience_score REAL DEFAULT 0,
    role_score REAL DEFAULT 0,
    project_score REAL DEFAULT 0,
    location_score REAL DEFAULT 0,
    education_score REAL DEFAULT 0,
    semantic_score REAL DEFAULT 0,
    freshness_score REAL DEFAULT 0,
    final_score REAL DEFAULT 0,
    rank_score REAL DEFAULT 0,
    matching_skills TEXT[] DEFAULT '{}',
    missing_skills TEXT[] DEFAULT '{}',
    explanation TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, user_id)
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'discovered'
        CHECK (status IN (
            'discovered', 'analyzing', 'shortlisted', 'approval_pending',
            'applied', 'screening', 'interview', 'offer',
            'rejected', 'withdrawn'
        )),
    cover_letter TEXT DEFAULT '',
    applied_at TIMESTAMPTZ DEFAULT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, job_id)
);

-- ============================================================
-- APPLICATION DOCUMENTS (cover letters, tailored resumes)
-- ============================================================
CREATE TABLE application_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    doc_type TEXT NOT NULL CHECK (doc_type IN ('cover_letter', 'tailored_resume', 'other')),
    content TEXT DEFAULT '',
    file_path TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATION ANSWERS (AI-generated Q&A)
-- ============================================================
CREATE TABLE application_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPLICATION OUTCOMES (feedback learning)
-- ============================================================
CREATE TABLE application_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID UNIQUE NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL
        CHECK (outcome IN ('no_response', 'rejected', 'interview', 'offer', 'accepted')),
    response_days INTEGER DEFAULT NULL,
    interview_rounds INTEGER DEFAULT NULL,
    notes TEXT DEFAULT '',
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'new_match'
        CHECK (type IN ('new_match', 'status_update', 'system', 'reminder')),
    title TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL DEFAULT '',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- AI USAGE (₹0 cost guard tracking)
-- ============================================================
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    operation TEXT NOT NULL,
    tokens_in INTEGER DEFAULT 0,
    tokens_out INTEGER DEFAULT 0,
    model TEXT DEFAULT '',
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT DEFAULT '',
    usage_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYSTEM LOGS (worker execution logs)
-- ============================================================
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id TEXT NOT NULL,
    worker_name TEXT DEFAULT 'job_worker',
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ DEFAULT NULL,
    jobs_discovered INTEGER DEFAULT 0,
    jobs_processed INTEGER DEFAULT 0,
    jobs_duplicates INTEGER DEFAULT 0,
    jobs_shortlisted INTEGER DEFAULT 0,
    ai_requests INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    status TEXT DEFAULT 'running'
        CHECK (status IN ('running', 'success', 'partial_failure', 'failure')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Jobs
CREATE INDEX idx_jobs_source ON jobs(source);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_discovered_at ON jobs(discovered_at DESC);
CREATE INDEX idx_jobs_content_hash ON jobs(content_hash);
CREATE INDEX idx_jobs_source_job_id ON jobs(source, source_job_id);

-- Job matches
CREATE INDEX idx_job_matches_user ON job_matches(user_id);
CREATE INDEX idx_job_matches_score ON job_matches(final_score DESC);
CREATE INDEX idx_job_matches_rank ON job_matches(rank_score DESC);

-- Job embeddings (pgvector index)
CREATE INDEX idx_job_embeddings_vector ON job_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);

-- Applications
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- AI usage
CREATE INDEX idx_ai_usage_date ON ai_usage(usage_date);
CREATE INDEX idx_ai_usage_provider ON ai_usage(provider, usage_date);

-- System logs
CREATE INDEX idx_system_logs_status ON system_logs(status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY profiles_insert ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Skills: users can only manage their own skills
CREATE POLICY skills_select ON skills FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY skills_insert ON skills FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY skills_update ON skills FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY skills_delete ON skills FOR DELETE USING (auth.uid() = user_id);

-- Projects: users can only manage their own projects
CREATE POLICY projects_select ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY projects_insert ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY projects_update ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY projects_delete ON projects FOR DELETE USING (auth.uid() = user_id);

-- Resumes: users can only manage their own resumes
CREATE POLICY resumes_select ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY resumes_insert ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_update ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY resumes_delete ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Jobs: all authenticated users can read jobs (jobs are global)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_select ON jobs FOR SELECT USING (auth.role() = 'authenticated');

-- Job matches: users can only see their own matches
CREATE POLICY job_matches_select ON job_matches FOR SELECT USING (auth.uid() = user_id);

-- Applications: users can only manage their own applications
CREATE POLICY apps_select ON applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY apps_insert ON applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY apps_update ON applications FOR UPDATE USING (auth.uid() = user_id);

-- Application documents
CREATE POLICY app_docs_select ON application_documents FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));

-- Application answers
CREATE POLICY app_answers_select ON application_answers FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));
CREATE POLICY app_answers_update ON application_answers FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));

-- Application outcomes
CREATE POLICY app_outcomes_select ON application_outcomes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));
CREATE POLICY app_outcomes_insert ON application_outcomes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));
CREATE POLICY app_outcomes_update ON application_outcomes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()
    ));

-- Notifications: users can only see their own notifications
CREATE POLICY notifs_select ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifs_update ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_jobs_updated_at BEFORE UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_job_matches_updated_at BEFORE UPDATE ON job_matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_applications_updated_at BEFORE UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_application_answers_updated_at BEFORE UPDATE ON application_answers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_source_configs_updated_at BEFORE UPDATE ON source_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to auto-create profile on user signup (supports Google OAuth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.email, '')
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        full_name = CASE WHEN profiles.full_name = '' THEN EXCLUDED.full_name ELSE profiles.full_name END,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: auto-create profile when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
-- Note: Run this via Supabase dashboard or API
-- Creates a 'resumes' bucket for PDF storage
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
