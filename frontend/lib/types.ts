/* ============================================================
   JobHunter AI — TypeScript Types
   ============================================================ */

// ============================================================
// User & Profile
// ============================================================
export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  location: string;
  experience_level: "fresher" | "junior" | "mid" | "senior";
  education: Record<string, unknown>;
  target_roles: string[];
  preferred_locations: string[];
  work_preferences: ("remote" | "hybrid" | "office" | "relocation")[];
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  notice_period: string;
  minimum_match_score: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  name: string;
  category:
    | "programming_language"
    | "framework"
    | "ml_library"
    | "cloud"
    | "database"
    | "tool"
    | "soft_skill"
    | "domain"
    | "general";
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  technologies: string[];
  url: string;
  relevance_tags: string[];
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number;
  version: string;
  is_master: boolean;
  parsed_content: Record<string, unknown>;
  extracted_skills: string[];
  created_at: string;
  updated_at: string;
}

// ============================================================
// Jobs
// ============================================================
export type RemoteType = "remote" | "hybrid" | "office" | "unknown";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "internship"
  | "unknown";
export type JobStatus =
  | "new"
  | "analyzed"
  | "shortlisted"
  | "rejected"
  | "expired";

export interface Job {
  id: string;
  source: string;
  source_job_id: string;
  title: string;
  company: string;
  location: string;
  remote_type: RemoteType;
  employment_type: EmploymentType;
  experience_required: string;
  experience_min_years: number | null;
  experience_max_years: number | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  education_requirements: string[];
  application_url: string;
  company_url: string;
  posted_at: string | null;
  discovered_at: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Matching
// ============================================================
export type MatchCategory =
  | "excellent"
  | "strong"
  | "good"
  | "possible"
  | "low";

export interface JobMatch {
  id: string;
  job_id: string;
  user_id: string;
  skill_score: number;
  experience_score: number;
  role_score: number;
  project_score: number;
  location_score: number;
  education_score: number;
  semantic_score: number;
  freshness_score: number;
  final_score: number;
  rank_score: number;
  matching_skills: string[];
  missing_skills: string[];
  explanation: string;
  created_at: string;
  updated_at: string;
}

export interface JobWithMatch extends Job {
  match?: JobMatch;
}

// ============================================================
// Applications
// ============================================================
export type ApplicationStatus =
  | "discovered"
  | "analyzing"
  | "shortlisted"
  | "approval_pending"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
  status: ApplicationStatus;
  cover_letter: string;
  applied_at: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  job?: Job;
  match?: JobMatch;
}

export interface ApplicationOutcome {
  id: string;
  application_id: string;
  outcome: "no_response" | "rejected" | "interview" | "offer" | "accepted";
  response_days: number | null;
  interview_rounds: number | null;
  notes: string;
  recorded_at: string;
}

// ============================================================
// Notifications
// ============================================================
export interface Notification {
  id: string;
  user_id: string;
  job_id: string | null;
  type: "new_match" | "status_update" | "system" | "reminder";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// ============================================================
// Dashboard Stats
// ============================================================
export interface DashboardStats {
  total_jobs: number;
  high_matches: number;
  applications: number;
  interviews: number;
  offers: number;
}

// ============================================================
// Helpers
// ============================================================
export function getMatchCategory(score: number): MatchCategory {
  if (score >= 90) return "excellent";
  if (score >= 80) return "strong";
  if (score >= 70) return "good";
  if (score >= 60) return "possible";
  return "low";
}

export function getMatchCategoryLabel(category: MatchCategory): string {
  const labels: Record<MatchCategory, string> = {
    excellent: "Excellent",
    strong: "Strong",
    good: "Good",
    possible: "Possible",
    low: "Low",
  };
  return labels[category];
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatEmploymentType(type: EmploymentType): string {
  const labels: Record<EmploymentType, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    contract: "Contract",
    internship: "Internship",
    unknown: "Unknown",
  };
  return labels[type];
}

export function formatRemoteType(type: RemoteType): string {
  const labels: Record<RemoteType, string> = {
    remote: "Remote",
    hybrid: "Hybrid",
    office: "On-site",
    unknown: "Unknown",
  };
  return labels[type];
}
