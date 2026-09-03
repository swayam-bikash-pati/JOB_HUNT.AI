"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, CheckCircle, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";

interface JobApp {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  cover_letter: string;
  notes: string;
  created_at: string;
  updated_at: string;
  jobs?: {
    id: string;
    title: string;
    company: string;
    location: string;
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<JobApp | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const supabase = createClient();

  const statuses = [
    { key: "discovered", label: "Discovered", color: "var(--text-secondary)" },
    { key: "shortlisted", label: "Shortlisted", color: "var(--accent-blue)" },
    { key: "applied", label: "Applied", color: "var(--accent-green)" },
    { key: "interview", label: "Interview", color: "var(--accent-purple)" },
    { key: "offer", label: "Offer", color: "var(--accent-yellow)" },
  ];

  const fetchApps = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("applications")
      .select(`
        *,
        jobs:job_id (id, title, company, location)
      `)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    setApplications((data as unknown as JobApp[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    setSavingStatus(true);
    await supabase
      .from("applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", appId);

    // If terminal status (interview, offer, rejected), log to outcomes for feedback learning
    if (["interview", "offer", "rejected"].includes(newStatus)) {
      await supabase.from("application_outcomes").upsert({
        application_id: appId,
        outcome: newStatus,
        notes: outcomeNotes || `Moved to ${newStatus}`,
      }, { onConflict: "application_id" });
    }

    setSavingStatus(false);
    setActiveModal(null);
    setOutcomeNotes("");
    await fetchApps();
  };

  const appsByStatus: Record<string, JobApp[]> = {};
  statuses.forEach((s) => {
    appsByStatus[s.key] = [];
  });

  applications.forEach((app) => {
    if (appsByStatus[app.status]) {
      appsByStatus[app.status].push(app);
    }
  });

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Applications Tracker</h1>
            <p>{applications.length} applications tracked • Human approval & feedback learning loop</p>
          </div>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
            <div className="loading-spinner" />
          </div>
        ) : applications.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${statuses.length}, minmax(220px, 1fr))`,
              gap: "16px",
              overflowX: "auto",
              paddingBottom: "16px",
            }}
          >
            {statuses.map((status) => (
              <div key={status.key} style={{ display: "flex", flexDirection: "column" }}>
                {/* Column Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "12px",
                    padding: "0 4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: status.color,
                      }}
                    />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
                      {status.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      background: "var(--bg-card)",
                      padding: "2px 8px",
                      borderRadius: "10px",
                    }}
                  >
                    {appsByStatus[status.key]?.length || 0}
                  </span>
                </div>

                {/* Column Body */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    minHeight: "350px",
                    padding: "10px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                  }}
                >
                  {appsByStatus[status.key]?.map((app) => {
                    const job = app.jobs;
                    if (!job) return null;

                    return (
                      <div
                        key={app.id}
                        className="card"
                        style={{
                          padding: "14px",
                          position: "relative",
                          cursor: "pointer",
                        }}
                        onClick={() => setActiveModal(app)}
                      >
                        <div style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px" }}>
                          {job.title}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-accent)", marginBottom: "8px" }}>
                          {job.company}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
                          <span>{job.location || "Remote"}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                            Manage <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Send size={28} />
            </div>
            <div className="empty-state-title">No applications tracked yet</div>
            <div className="empty-state-description">
              When the worker shortlists matching jobs, or when you choose to prepare an application from the Job Feed, opportunities will appear on this board.
            </div>
          </div>
        )}

        {/* Status Transition & Outcome Modal */}
        {activeModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.75)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: "20px",
            }}
          >
            <div className="card" style={{ maxWidth: "480px", width: "100%", padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "6px" }}>
                Update Application Status
              </h3>
              <p style={{ fontSize: "13px", color: "var(--text-accent)", marginBottom: "16px" }}>
                {activeModal.jobs?.title} at {activeModal.jobs?.company}
              </p>

              <div style={{ marginBottom: "16px" }}>
                <label className="form-label">Move to Status:</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {["shortlisted", "applied", "interview", "offer", "rejected"].map((st) => (
                    <button
                      key={st}
                      className={`btn btn-sm ${activeModal.status === st ? "btn-primary" : "btn-secondary"}`}
                      disabled={savingStatus}
                      onClick={() => handleUpdateStatus(activeModal.id, st)}
                    >
                      {st.charAt(0).toUpperCase() + st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Outcome Notes / Interview Feedback:</label>
                <textarea
                  className="form-input"
                  placeholder="e.g. Technical interview round 1 completed; focused on PyTorch and system design."
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  style={{ minHeight: "80px" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                <Link
                  href={`/jobs/${activeModal.job_id}`}
                  className="btn btn-secondary btn-sm"
                >
                  View Job & Materials
                </Link>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setActiveModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
