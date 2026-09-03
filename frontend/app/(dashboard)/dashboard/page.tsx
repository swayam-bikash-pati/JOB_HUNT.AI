import { createClient } from "@/lib/supabase/server";
import {
  Briefcase,
  Target,
  Send,
  MessageSquare,
  Trophy,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch stats
  const [jobsResult, matchesResult, appsResult, interviewsResult, offersResult] =
    await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }),
      supabase
        .from("job_matches")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("final_score", 75),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "interview"),
      supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("status", "offer"),
    ]);

  const stats = [
    {
      label: "Jobs Discovered",
      value: jobsResult.count ?? 0,
      icon: Briefcase,
      color: "var(--accent-blue)",
      bg: "rgba(59, 130, 246, 0.12)",
    },
    {
      label: "High Matches",
      value: matchesResult.count ?? 0,
      icon: Target,
      color: "var(--accent-green)",
      bg: "rgba(16, 185, 129, 0.12)",
    },
    {
      label: "Applications",
      value: appsResult.count ?? 0,
      icon: Send,
      color: "var(--accent-purple)",
      bg: "rgba(139, 92, 246, 0.12)",
    },
    {
      label: "Interviews",
      value: interviewsResult.count ?? 0,
      icon: MessageSquare,
      color: "var(--accent-cyan)",
      bg: "rgba(6, 182, 212, 0.12)",
    },
    {
      label: "Offers",
      value: offersResult.count ?? 0,
      icon: Trophy,
      color: "var(--accent-yellow)",
      bg: "rgba(245, 158, 11, 0.12)",
    },
  ];

  // Fetch recent high-match jobs
  const { data: recentMatches } = await supabase
    .from("job_matches")
    .select(
      `
      *,
      jobs:job_id (
        id, title, company, location, remote_type,
        employment_type, posted_at, application_url, source
      )
    `
    )
    .eq("user_id", user!.id)
    .gte("final_score", 70)
    .order("rank_score", { ascending: false })
    .limit(5);

  // Fetch recent applications
  const { data: recentApps } = await supabase
    .from("applications")
    .select(
      `
      *,
      jobs:job_id (id, title, company)
    `
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Your AI-powered job search at a glance</p>
      </div>

      <div className="page-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="stat-card">
                <div className="stat-card-header">
                  <span className="stat-card-label">{stat.label}</span>
                  <div
                    className="stat-card-icon"
                    style={{ background: stat.bg, color: stat.color }}
                  >
                    <Icon size={18} />
                  </div>
                </div>
                <div className="stat-card-value">{stat.value}</div>
              </div>
            );
          })}
        </div>

        {/* Two-column: Recent Matches + Recent Applications */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px",
          }}
        >
          {/* Recent High Matches */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent High Matches</span>
            </div>
            {recentMatches && recentMatches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentMatches.map((match: Record<string, unknown>) => {
                  const job = match.jobs as Record<string, unknown> | null;
                  if (!job) return null;
                  const score = Math.round(match.final_score as number);
                  const category =
                    score >= 90
                      ? "excellent"
                      : score >= 80
                      ? "strong"
                      : score >= 70
                      ? "good"
                      : "possible";

                  return (
                    <a
                      key={match.id as string}
                      href={`/jobs/${job.id}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-secondary)",
                        textDecoration: "none",
                        color: "inherit",
                        transition: "background 0.15s",
                      }}
                    >
                      <div className={`match-score ${category}`}>
                        {score}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {job.title as string}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "var(--text-accent)",
                          }}
                        >
                          {job.company as string}
                        </div>
                      </div>
                      <span
                        className="job-card-tag"
                        style={{ flexShrink: 0 }}
                      >
                        {job.location as string || "Remote"}
                      </span>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <div className="empty-state-icon">
                  <Target size={28} />
                </div>
                <div className="empty-state-title">No matches yet</div>
                <div className="empty-state-description">
                  Jobs will appear here once the worker discovers and scores them against your profile.
                </div>
              </div>
            )}
          </div>

          {/* Recent Applications */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Recent Applications</span>
            </div>
            {recentApps && recentApps.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {recentApps.map((app: Record<string, unknown>) => {
                  const job = app.jobs as Record<string, unknown> | null;
                  if (!job) return null;

                  return (
                    <div
                      key={app.id as string}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-secondary)",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: "14px",
                            fontWeight: 600,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {job.title as string}
                        </div>
                        <div
                          style={{ fontSize: "13px", color: "var(--text-accent)" }}
                        >
                          {job.company as string}
                        </div>
                      </div>
                      <span className={`status-badge ${app.status as string}`}>
                        {(app.status as string).replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "32px 16px" }}>
                <div className="empty-state-icon">
                  <Send size={28} />
                </div>
                <div className="empty-state-title">No applications yet</div>
                <div className="empty-state-description">
                  Your tracked applications will appear here.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
