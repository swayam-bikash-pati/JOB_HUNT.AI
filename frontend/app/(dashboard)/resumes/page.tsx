"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Star, Trash2 } from "lucide-react";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setResumes(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      setMessage("Please upload a PDF file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage("File size must be under 5MB");
      return;
    }

    setUploading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fileName = `${user.id}/${Date.now()}_${file.name}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    // Create resume record
    const isMaster = resumes.length === 0;
    const { data: resume, error: dbError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        name: file.name.replace(".pdf", ""),
        file_path: fileName,
        file_size: file.size,
        is_master: isMaster,
        version: isMaster ? "master" : "variant",
      })
      .select()
      .single();

    if (dbError) {
      setMessage(`Error saving resume: ${dbError.message}`);
    } else if (resume) {
      setResumes([resume, ...resumes]);
      setMessage("Resume uploaded successfully!");
    }

    setUploading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const handleDelete = async (id: string, filePath: string) => {
    await supabase.storage.from("resumes").remove([filePath]);
    await supabase.from("resumes").delete().eq("id", id);
    setResumes(resumes.filter((r) => r.id !== id));
  };

  const handleSetMaster = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Unset all as master
    await supabase
      .from("resumes")
      .update({ is_master: false })
      .eq("user_id", user.id);

    // Set selected as master
    await supabase.from("resumes").update({ is_master: true }).eq("id", id);

    setResumes(
      resumes.map((r) => ({
        ...r,
        is_master: r.id === id,
      }))
    );
  };

  if (loading) {
    return (
      <>
        <div className="page-header">
          <h1>Resumes</h1>
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1>Resumes</h1>
            <p>Upload and manage your resume versions</p>
          </div>
          <label className="btn btn-primary" style={{ cursor: "pointer" }}>
            <Upload size={16} />
            {uploading ? "Uploading..." : "Upload Resume"}
            <input
              type="file"
              accept=".pdf"
              onChange={handleUpload}
              style={{ display: "none" }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="page-content">
        {message && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              marginBottom: "16px",
              background: message.includes("failed") || message.includes("Error")
                ? "rgba(239, 68, 68, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
              color: message.includes("failed") || message.includes("Error")
                ? "var(--accent-red)"
                : "var(--accent-green)",
              fontSize: "13px",
            }}
          >
            {message}
          </div>
        )}

        {resumes.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "16px",
            }}
          >
            {resumes.map((resume) => (
              <div key={resume.id as string} className="card">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "var(--radius-md)",
                      background: "rgba(59, 130, 246, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--accent-blue)",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "15px",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {resume.name as string}
                      </span>
                      {(resume.is_master as boolean) && (
                        <Star
                          size={14}
                          fill="var(--accent-yellow)"
                          color="var(--accent-yellow)"
                        />
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginTop: "4px",
                      }}
                    >
                      {((resume.file_size as number) / 1024).toFixed(0)} KB •{" "}
                      {resume.version as string}
                    </div>
                    {(resume.extracted_skills as string[] || []).length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "4px",
                          marginTop: "8px",
                        }}
                      >
                        {(resume.extracted_skills as string[])
                          .slice(0, 5)
                          .map((skill: string) => (
                            <span
                              key={skill}
                              className="skill-badge match"
                            >
                              {skill}
                            </span>
                          ))}
                        {(resume.extracted_skills as string[]).length > 5 && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              padding: "3px 8px",
                            }}
                          >
                            +{(resume.extracted_skills as string[]).length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "16px",
                    borderTop: "1px solid var(--border-primary)",
                    paddingTop: "12px",
                  }}
                >
                  {!resume.is_master && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleSetMaster(resume.id as string)}
                    >
                      <Star size={14} /> Set as Master
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      handleDelete(
                        resume.id as string,
                        resume.file_path as string
                      )
                    }
                    style={{ color: "var(--accent-red)", marginLeft: "auto" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={28} />
            </div>
            <div className="empty-state-title">No resumes uploaded</div>
            <div className="empty-state-description">
              Upload your master resume (PDF) to get started. The system will
              extract your skills, experience, and projects.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
