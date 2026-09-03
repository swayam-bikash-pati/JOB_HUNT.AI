import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import {
  MapPin,
  Clock,
  Building2,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Copy,
} from "lucide-react";
import {
  formatDate,
  formatEmploymentType,
  formatRemoteType,
} from "@/lib/types";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch job
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  // Fetch match for this user
  const { data: match } = await supabase
    .from("job_matches")
    .select("*")
    .eq("job_id", id)
    .eq("user_id", user!.id)
    .single();

  // Fetch application if exists
  const { data: application } = await supabase
    .from("applications")
    .select("*")
    .eq("job_id", id)
    .eq("user_id", user!.id)
    .single();

  const score = match ? Math.round(match.final_score) : null;
  const category =
    score !== null
      ? score >= 90
        ? "excellent"
        : score >= 80
        ? "strong"
        : score >= 70
        ? "good"
        : score >= 60
        ? "possible"
        : "low"
      : null;

  // Score breakdown factors
  const scoreFactors = match
    ? [
        { label: "Skill Match", value: Math.round(match.skill_score), weight: "25%" },
        { label: "Semantic Similarity", value: Math.round(match.semantic_score), weight: "20%" },
        { label: "Role Relevance", value: Math.round(match.role_score), weight: "15%" },
        { label: "Project Relevance", value: Math.round(match.project_score), weight: "15%" },
        { label: "Experience", value: Math.round(match.experience_score), weight: "10%" },
        { label: "Location", value: Math.round(match.location_score), weight: "10%" },
        { label: "Education", value: Math.round(match.education_score), weight: "5%" },
      ]
    : [];

  return (
    <>
      <div className="page-header">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <h1>{job.title}</h1>
            <p style={{ color: "var(--text-accent)", fontSize: "16px" }}>
              {job.company}
            </p>
          </div>
          {score !== null && category && (
            <div
              className={`match-score ${category}`}
              style={{ width: "64px", height: "64px", fontSize: "22px" }}
            >
              {score}
            </div>
          )}
        </div>
      </div>

      <div className="page-content">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 340px",
            gap: "24px",
          }}
        >
          {/* Left: Job Description */}
          <div>
            {/* Meta tags */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "24px",
              }}
            >
              {job.location && (
                <span className="job-card-tag">
                  <MapPin size={12} /> {job.location}
                </span>
              )}
              <span className="job-card-tag">
                <Building2 size={12} />{" "}
                {formatEmploymentType(job.employment_type)}
              </span>
              <span className="job-card-tag">
                {formatRemoteType(job.remote_type)}
              </span>
              {job.experience_required && (
                <span className="job-card-tag">
                  <Briefcase size={12} /> {job.experience_required}
                </span>
              )}
              {job.posted_at && (
                <span className="job-card-tag">
                  <Clock size={12} /> {formatDate(job.posted_at)}
                </span>
              )}
              <span className="job-card-tag">
                <ExternalLink size={12} /> {job.source}
              </span>
            </div>

            {/* Description */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">Job Description</span>
              </div>
              <div
                style={{
                  fontSize: "14px",
                  lineHeight: "1.7",
                  color: "var(--text-secondary)",
                  whiteSpace: "pre-wrap",
                }}
                dangerouslySetInnerHTML={{ __html: job.description }}
              />
            </div>

            {/* Cover Letter (if application exists) */}
            {application?.cover_letter && (
              <div className="card" style={{ marginTop: "16px" }}>
                <div className="card-header">
                  <span className="card-title">Generated Cover Letter</span>
                  <button className="btn btn-sm btn-ghost" title="Copy to clipboard">
                    <Copy size={14} /> Copy
                  </button>
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    lineHeight: "1.7",
                    color: "var(--text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {application.cover_letter}
                </div>
              </div>
            )}
          </div>

          {/* Right: Match Analysis + Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Apply button */}
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
              style={{ width: "100%", textAlign: "center" }}
            >
              <ExternalLink size={16} />
              Apply on {job.source}
            </a>

            {/* Application status */}
            {application && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Application Status</span>
                  <span
                    className={`status-badge ${application.status}`}
                  >
                    {application.status.replace("_", " ")}
                  </span>
                </div>
              </div>
            )}

            {/* Match Breakdown */}
            {match && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Match Breakdown</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {scoreFactors.map((factor) => (
                    <div key={factor.label}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "13px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          {factor.label}{" "}
                          <span style={{ color: "var(--text-muted)" }}>
                            ({factor.weight})
                          </span>
                        </span>
                        <span style={{ fontWeight: 600 }}>
                          {factor.value}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: "6px",
                          borderRadius: "3px",
                          background: "var(--bg-secondary)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${factor.value}%`,
                            height: "100%",
                            borderRadius: "3px",
                            background:
                              factor.value >= 80
                                ? "var(--accent-green)"
                                : factor.value >= 60
                                ? "var(--accent-blue)"
                                : factor.value >= 40
                                ? "var(--accent-yellow)"
                                : "var(--accent-red)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Freshness */}
                <div
                  style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-secondary)",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ color: "var(--text-muted)" }}>
                    Freshness:{" "}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    {Math.round(match.freshness_score * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Skills */}
            {match && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Skills Analysis</span>
                </div>
                <div>
                  {match.matching_skills?.length > 0 && (
                    <div style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginBottom: "8px",
                        }}
                      >
                        MATCHING
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {match.matching_skills.map((skill: string) => (
                          <span key={skill} className="skill-badge match">
                            ✓ {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {match.missing_skills?.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          marginBottom: "8px",
                        }}
                      >
                        MISSING / PREFERRED
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {match.missing_skills.map((skill: string) => (
                          <span key={skill} className="skill-badge missing">
                            ✗ {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Education */}
            {job.education_requirements?.length > 0 && (
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Education</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {job.education_requirements.map(
                    (req: string, i: number) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <GraduationCap size={14} />
                        {req}
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
