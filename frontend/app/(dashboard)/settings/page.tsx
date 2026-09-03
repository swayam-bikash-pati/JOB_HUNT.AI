"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Settings as SettingsIcon, ShieldCheck, Cpu, Sliders, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [minScore, setMinScore] = useState<number>(70);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function loadSettings() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("minimum_match_score")
        .eq("user_id", user.id)
        .single();

      if (data?.minimum_match_score) {
        setMinScore(data.minimum_match_score);
      }
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSavedMsg("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ minimum_match_score: minScore })
      .eq("user_id", user.id);

    setSaving(false);
    if (!error) {
      setSavedMsg("Settings updated successfully!");
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage match thresholds, AI safeguards, and source configurations</p>
      </div>

      <div className="page-content">
        {savedMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--accent-green)",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={16} />
            {savedMsg}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Match & Filter Configuration */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={16} color="var(--accent-blue)" />
                Match Engine Preferences
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                Minimum Match Score Threshold: <strong>{minScore}%</strong>
              </label>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                Only jobs scoring above this threshold will trigger AI application preparation and shortlist alerts.
              </p>
              <input
                type="range"
                min={50}
                max={95}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-blue)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                <span>50% (Permissive)</span>
                <span>70% (Balanced)</span>
                <span>90% (Strict)</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || loading}
              style={{ marginTop: "16px" }}
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>

          {/* ₹0 Cost Guard Shield */}
          <div className="card">
            <div className="card-header">
              <span className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={16} color="var(--accent-green)" />
                ₹0 Cost Guard Status
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontWeight: 600, color: "var(--accent-green)", marginBottom: "4px" }}>
                  Hard-Budget Guard Active
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  Auto-stops AI calls before free limits are reached. Zero risk of unexpected bills.
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-primary)" }}>
                <span style={{ color: "var(--text-muted)" }}>Supabase PostgreSQL</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>₹0 Free Tier</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-primary)" }}>
                <span style={{ color: "var(--text-muted)" }}>Netlify Frontend</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>₹0 Free Tier</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border-primary)" }}>
                <span style={{ color: "var(--text-muted)" }}>GitHub Actions Runner</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>₹0 Free Tier</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>Semantic Embeddings</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 500 }}>Open Source (Local)</span>
              </div>
            </div>
          </div>

          {/* Connected Adapters */}
          <div className="card" style={{ gridColumn: "span 2" }}>
            <div className="card-header">
              <span className="card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Cpu size={16} color="var(--accent-purple)" />
                Active Job Source Adapters
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>Greenhouse Boards</span>
                  <span className="status-badge applied">Enabled</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Direct JSON API integration with zero bot restrictions. Configured for Razorpay, Swiggy, CRED, Postman.
                </p>
              </div>

              <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>Lever Postings</span>
                  <span className="status-badge applied">Enabled</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Public postings API endpoint. Configured for Notion, Figma, and expandable via <code>worker/config/sources.json</code>.
                </p>
              </div>

              <div style={{ padding: "16px", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontWeight: 600 }}>Email Alerts (Gmail)</span>
                  <span className="status-badge discovered">Phase 2</span>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  LinkedIn & Naukri email alerts parser scheduled for Phase 2 implementation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
