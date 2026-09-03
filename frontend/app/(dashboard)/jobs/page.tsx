import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Building2,
  ExternalLink,
} from "lucide-react";
import { formatDate, formatEmploymentType, formatRemoteType } from "@/lib/types";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch jobs with their match scores for this user
  const { data: jobs } = await supabase
    .from("jobs")
    .select(`
      *,
      job_matches!left (
        final_score, rank_score, matching_skills, missing_skills
      )
    `)
    .order("discovered_at", { ascending: false })
    .limit(50);

  // Filter matches to only this user's matches
  const jobsWithMatches = (jobs || []).map((job: Record<string, unknown>) => {
    const matches = job.job_matches as Record<string, unknown>[] | null;
    const userMatch = matches?.find(
      (m: Record<string, unknown>) => m.user_id === user?.id
    ) || matches?.[0];
    return { ...job, match: userMatch || null };
  });

  // Sort by rank_score (match × freshness) if available
  jobsWithMatches.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
    const aScore = (a.match as Record<string, unknown>)?.rank_score as number || 0;
    const bScore = (b.match as Record<string, unknown>)?.rank_score as number || 0;
    return bScore - aScore;
  });

  return (
    <>
      <div className="page-header">
        <h1>Job Feed</h1>
        <p>
          {jobsWithMatches.length} jobs discovered • Ranked by match score ×
          freshness
        </p>
      </div>

      <div className="page-content">
        {jobsWithMatches.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {jobsWithMatches.map((job: Record<string, unknown>) => {
              const match = job.match as Record<string, unknown> | null;
              const score = match
                ? Math.round(match.final_score as number)
                : null;
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

              return (
                <Link
                  key={job.id as string}
                  href={`/jobs/${job.id}`}
                  className="job-card"
                >
                  <div className="job-card-header">
                    <div>
                      <div className="job-card-title">
                        {job.title as string}
                      </div>
                      <div className="job-card-company">
                        {job.company as string}
                      </div>
                    </div>
                    {score !== null && category && (
                      <div className={`match-score ${category}`}>{score}</div>
                    )}
                  </div>

                  <div className="job-card-meta">
                    {(job.location as string) && (
                      <span className="job-card-tag">
                        <MapPin size={12} />
                        {job.location as string}
                      </span>
                    )}
                    <span className="job-card-tag">
                      <Building2 size={12} />
                      {formatEmploymentType(job.employment_type as "full_time")}
                    </span>
                    <span className="job-card-tag">
                      {formatRemoteType(job.remote_type as "unknown")}
                    </span>
                    {(job.posted_at as string) && (
                      <span className="job-card-tag">
                        <Clock size={12} />
                        {formatDate(job.posted_at as string)}
                      </span>
                    )}
                    <span className="job-card-tag">
                      <ExternalLink size={12} />
                      {job.source as string}
                    </span>
                  </div>

                  {match && (
                    <div className="job-card-skills">
                      {((match.matching_skills as string[]) || [])
                        .slice(0, 5)
                        .map((skill: string) => (
                          <span key={skill} className="skill-badge match">
                            ✓ {skill}
                          </span>
                        ))}
                      {((match.missing_skills as string[]) || [])
                        .slice(0, 3)
                        .map((skill: string) => (
                          <span key={skill} className="skill-badge missing">
                            ✗ {skill}
                          </span>
                        ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Building2 size={28} />
            </div>
            <div className="empty-state-title">No jobs discovered yet</div>
            <div className="empty-state-description">
              Jobs will appear here once the worker runs. It fetches from
              Greenhouse and Lever career pages automatically.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
