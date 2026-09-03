import { createClient } from "@/lib/supabase/server";
import { BarChart3 } from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch application stats
  const { data: applications } = await supabase
    .from("applications")
    .select("status, created_at")
    .eq("user_id", user!.id);

  const totalApps = (applications || []).length;
  const statusCounts: Record<string, number> = {};
  (applications || []).forEach((app: Record<string, unknown>) => {
    const status = app.status as string;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Fetch match score distribution
  const { data: matches } = await supabase
    .from("job_matches")
    .select("final_score")
    .eq("user_id", user!.id);

  const scoreDistribution = { excellent: 0, strong: 0, good: 0, possible: 0, low: 0 };
  (matches || []).forEach((m: Record<string, unknown>) => {
    const s = m.final_score as number;
    if (s >= 90) scoreDistribution.excellent++;
    else if (s >= 80) scoreDistribution.strong++;
    else if (s >= 70) scoreDistribution.good++;
    else if (s >= 60) scoreDistribution.possible++;
    else scoreDistribution.low++;
  });

  const statCards = [
    { label: "Total Applications", value: totalApps },
    { label: "Applied", value: statusCounts["applied"] || 0 },
    { label: "Interviews", value: statusCounts["interview"] || 0 },
    { label: "Offers", value: statusCounts["offer"] || 0 },
    {
      label: "Response Rate",
      value:
        totalApps > 0
          ? `${Math.round(
              (((statusCounts["interview"] || 0) + (statusCounts["offer"] || 0)) / totalApps) * 100
            )}%`
          : "—",
    },
    { label: "Jobs Matched", value: (matches || []).length },
  ];

  return (
    <>
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Track your job search performance</p>
      </div>

      <div className="page-content">
        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span className="stat-card-label">{stat.label}</span>
              <div className="stat-card-value" style={{ marginTop: "8px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Match Score Distribution */}
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <span className="card-title">Match Score Distribution</span>
          </div>
          {(matches || []).length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Excellent (90–100)", count: scoreDistribution.excellent, color: "var(--score-excellent)" },
                { label: "Strong (80–89)", count: scoreDistribution.strong, color: "var(--score-strong)" },
                { label: "Good (70–79)", count: scoreDistribution.good, color: "var(--score-good)" },
                { label: "Possible (60–69)", count: scoreDistribution.possible, color: "var(--score-possible)" },
                { label: "Low (<60)", count: scoreDistribution.low, color: "var(--score-low)" },
              ].map((bucket) => {
                const total = (matches || []).length;
                const pct = total > 0 ? (bucket.count / total) * 100 : 0;
                return (
                  <div key={bucket.label}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        marginBottom: "4px",
                      }}
                    >
                      <span style={{ color: "var(--text-secondary)" }}>{bucket.label}</span>
                      <span style={{ fontWeight: 600 }}>{bucket.count}</span>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        borderRadius: "4px",
                        background: "var(--bg-secondary)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: "4px",
                          background: bucket.color,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                color: "var(--text-muted)",
                fontSize: "14px",
              }}
            >
              No match data yet. Scores will appear after the worker processes jobs.
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <span className="card-title">Application Status Breakdown</span>
          </div>
          {totalApps > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
              {Object.entries(statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <span className={`status-badge ${status}`}>
                    {status.replace("_", " ")}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "16px" }}>
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                color: "var(--text-muted)",
                fontSize: "14px",
              }}
            >
              No applications tracked yet.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
