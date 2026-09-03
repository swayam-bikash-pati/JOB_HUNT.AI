"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Save, Plus, X } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [skills, setSkills] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, skillsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("skills").select("*").eq("user_id", user.id).order("name"),
      ]);

      setProfile(profileRes.data);
      setSkills(skillsRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        location: profile.location,
        experience_level: profile.experience_level,
        target_roles: profile.target_roles,
        preferred_locations: profile.preferred_locations,
        work_preferences: profile.work_preferences,
        notice_period: profile.notice_period,
        minimum_match_score: profile.minimum_match_score,
      })
      .eq("id", profile.id);

    setSaving(false);
    setMessage(error ? `Error: ${error.message}` : "Profile saved!");
    setTimeout(() => setMessage(""), 3000);
  };

  const addSkill = async () => {
    if (!newSkill.trim()) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("skills")
      .insert({ user_id: user.id, name: newSkill.trim() })
      .select()
      .single();

    if (!error && data) {
      setSkills([...skills, data]);
      setNewSkill("");
    }
  };

  const removeSkill = async (id: string) => {
    await supabase.from("skills").delete().eq("id", id);
    setSkills(skills.filter((s) => s.id !== id));
  };

  const updateField = (field: string, value: unknown) => {
    if (!profile) return;
    setProfile({ ...profile, [field]: value });
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1>Profile</h1>
        </div>
        <div className="page-content">
          <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
            <div className="loading-spinner" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>Profile</h1>
            <p>Configure your job search preferences</p>
          </div>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="page-content">
        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              background: message.startsWith("Error")
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
              color: message.startsWith("Error")
                ? "var(--accent-red)"
                : "var(--accent-green)",
              fontSize: "13px",
            }}
          >
            {message}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Basic Info */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Basic Information</span>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                className="form-input"
                value={(profile?.full_name as string) || ""}
                onChange={(e) => updateField("full_name", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input
                className="form-input"
                value={(profile?.phone as string) || ""}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input
                className="form-input"
                value={(profile?.location as string) || ""}
                onChange={(e) => updateField("location", e.target.value)}
                placeholder="Bangalore, India"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Experience Level</label>
              <select
                className="form-input"
                value={(profile?.experience_level as string) || "fresher"}
                onChange={(e) => updateField("experience_level", e.target.value)}
              >
                <option value="fresher">Fresher</option>
                <option value="junior">Junior (0-2 years)</option>
                <option value="mid">Mid (2-5 years)</option>
                <option value="senior">Senior (5+ years)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notice Period</label>
              <input
                className="form-input"
                value={(profile?.notice_period as string) || ""}
                onChange={(e) => updateField("notice_period", e.target.value)}
                placeholder="Immediately / 30 days / 60 days"
              />
            </div>
          </div>

          {/* Job Preferences */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Job Preferences</span>
            </div>
            <div className="form-group">
              <label className="form-label">
                Target Roles (comma-separated)
              </label>
              <input
                className="form-input"
                value={((profile?.target_roles as string[]) || []).join(", ")}
                onChange={(e) =>
                  updateField(
                    "target_roles",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="AI Engineer, ML Engineer, Data Scientist"
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                Preferred Locations (comma-separated)
              </label>
              <input
                className="form-input"
                value={
                  ((profile?.preferred_locations as string[]) || []).join(", ")
                }
                onChange={(e) =>
                  updateField(
                    "preferred_locations",
                    e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Bangalore, Mumbai, Remote"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Work Preferences</label>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                {(["remote", "hybrid", "office", "relocation"] as const).map(
                  (pref) => {
                    const selected = (
                      (profile?.work_preferences as string[]) || []
                    ).includes(pref);
                    return (
                      <label
                        key={pref}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "13px",
                          cursor: "pointer",
                          color: selected
                            ? "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            const current =
                              (profile?.work_preferences as string[]) || [];
                            updateField(
                              "work_preferences",
                              selected
                                ? current.filter((p) => p !== pref)
                                : [...current, pref]
                            );
                          }}
                        />
                        {pref.charAt(0).toUpperCase() + pref.slice(1)}
                      </label>
                    );
                  }
                )}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                Minimum Match Score Threshold
              </label>
              <input
                className="form-input"
                type="number"
                min={0}
                max={100}
                value={(profile?.minimum_match_score as number) || 70}
                onChange={(e) =>
                  updateField("minimum_match_score", parseInt(e.target.value) || 70)
                }
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="card" style={{ marginTop: "24px" }}>
          <div className="card-header">
            <span className="card-title">Skills</span>
          </div>

          {/* Add skill */}
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <input
              className="form-input"
              placeholder="Add a skill (e.g., Python, PyTorch, AWS)"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSkill()}
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary btn-sm" onClick={addSkill}>
              <Plus size={16} /> Add
            </button>
          </div>

          {/* Skill list */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {skills.map((skill) => (
              <span
                key={skill.id as string}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  background: "rgba(59, 130, 246, 0.1)",
                  color: "var(--accent-blue)",
                  fontSize: "13px",
                  fontWeight: 500,
                  border: "1px solid rgba(59, 130, 246, 0.2)",
                }}
              >
                {skill.name as string}
                <button
                  onClick={() => removeSkill(skill.id as string)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                  }}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            {skills.length === 0 && (
              <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                No skills added yet. Add your technical skills above.
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
