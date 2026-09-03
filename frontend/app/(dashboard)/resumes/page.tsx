"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  FileText,
  Star,
  Trash2,
  Eye,
  Sparkles,
  ExternalLink,
  X,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [previewResume, setPreviewResume] = useState<{ url: string; name: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const supabase = createClient();

  const loadResumes = async () => {
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
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const triggerExtraction = async (filePath: string, resumeId?: string) => {
    try {
      if (resumeId) setExtractingId(resumeId);
      const res = await fetch("/api/resumes/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, resumeId }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: `Auto-filled profile! Extracted ${data.skills?.length || 0} skills and target roles.`,
          type: "success",
        });
        loadResumes();
      } else {
        setMessage({
          text: `Data extraction notice: ${data.error || "Could not parse all fields"}`,
          type: "info",
        });
      }
    } catch {
      setMessage({ text: "Profile autofill request failed.", type: "error" });
    } finally {
      setExtractingId(null);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf")) {
      setMessage({ text: "Please upload a PDF file.", type: "error" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: "File size must be under 5MB.", type: "error" });
      return;
    }

    setUploading(true);
    setMessage({ text: "Uploading resume to secure storage...", type: "info" });

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
      setMessage({ text: `Upload failed: ${uploadError.message}`, type: "error" });
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
      setMessage({ text: `Error saving resume record: ${dbError.message}`, type: "error" });
      setUploading(false);
      return;
    }

    setMessage({ text: "Resume uploaded! Extracting skills & auto-filling profile...", type: "info" });
    setUploading(false);

    // Auto-extract and populate profile
    if (resume) {
      await triggerExtraction(fileName, resume.id);
    }
  };

  const handlePreview = async (filePath: string, resumeName: string) => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from("resumes")
        .createSignedUrl(filePath, 3600);

      if (error || !data?.signedUrl) {
        setMessage({
          text: `Could not load resume preview: ${error?.message || "File unavailable"}`,
          type: "error",
        });
        setPreviewLoading(false);
        return;
      }

      setPreviewResume({ url: data.signedUrl, name: resumeName });
    } catch {
      setMessage({ text: "Could not open resume.", type: "error" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDelete = async (id: string, filePath: string) => {
    await supabase.storage.from("resumes").remove([filePath]);
    await supabase.from("resumes").delete().eq("id", id);
    setResumes(resumes.filter((r) => r.id !== id));
    setMessage({ text: "Resume deleted.", type: "info" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSetMaster = async (id: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("resumes")
      .update({ is_master: false })
      .eq("user_id", user.id);

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
            <p>Upload your resume to view it and automatically extract skills into your profile</p>
          </div>
          <label className="btn btn-primary" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Upload size={16} />
            {uploading ? "Uploading & Extracting..." : "Upload Resume"}
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
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              marginBottom: "20px",
              background:
                message.type === "error"
                  ? "rgba(239, 68, 68, 0.12)"
                  : message.type === "success"
                  ? "rgba(16, 185, 129, 0.12)"
                  : "rgba(59, 130, 246, 0.12)",
              border: `1px solid ${
                message.type === "error"
                  ? "rgba(239, 68, 68, 0.3)"
                  : message.type === "success"
                  ? "rgba(16, 185, 129, 0.3)"
                  : "rgba(59, 130, 246, 0.3)"
              }`,
              color:
                message.type === "error"
                  ? "var(--accent-red)"
                  : message.type === "success"
                  ? "var(--accent-green)"
                  : "var(--accent-blue)",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {message.type === "success" && <CheckCircle2 size={16} />}
              <span>{message.text}</span>
            </div>
            {message.type === "success" && (
              <Link
                href="/profile"
                style={{
                  color: "var(--accent-blue)",
                  fontSize: "13px",
                  fontWeight: 600,
                  textDecoration: "underline",
                  marginLeft: "12px",
                }}
              >
                View Updated Profile →
              </Link>
            )}
          </div>
        )}

        {resumes.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            {resumes.map((resume) => {
              const skills = (resume.extracted_skills as string[]) || [];
              const isExtracting = extractingId === resume.id;

              return (
                <div
                  key={resume.id as string}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                >
                  <div>
                    {/* Header: Icon & Resume Name */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "14px",
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        handlePreview(
                          resume.file_path as string,
                          resume.name as string
                        )
                      }
                      title="Click to preview resume"
                    >
                      <div
                        style={{
                          width: "46px",
                          height: "46px",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(59, 130, 246, 0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--accent-blue)",
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={22} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "16px",
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
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "11px",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                background: "rgba(234, 179, 8, 0.15)",
                                color: "var(--accent-yellow)",
                                fontWeight: 600,
                              }}
                            >
                              <Star size={12} fill="var(--accent-yellow)" /> Master
                            </span>
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
                      </div>
                    </div>

                    {/* Extracted Skills Preview */}
                    {skills.length > 0 && (
                      <div style={{ marginTop: "14px" }}>
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            marginBottom: "6px",
                          }}
                        >
                          Extracted Skills ({skills.length})
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {skills.slice(0, 6).map((skill: string) => (
                            <span key={skill} className="skill-badge match">
                              {skill}
                            </span>
                          ))}
                          {skills.length > 6 && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--text-muted)",
                                padding: "3px 8px",
                              }}
                            >
                              +{skills.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginTop: "20px",
                      borderTop: "1px solid var(--border-primary)",
                      paddingTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* View PDF Button */}
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={previewLoading}
                        onClick={() =>
                          handlePreview(
                            resume.file_path as string,
                            resume.name as string
                          )
                        }
                        title="View Resume PDF"
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <Eye size={14} /> View PDF
                      </button>

                      {/* Auto-fill Profile Button */}
                      <button
                        className="btn btn-ghost btn-sm"
                        disabled={isExtracting}
                        onClick={() =>
                          triggerExtraction(
                            resume.file_path as string,
                            resume.id as string
                          )
                        }
                        title="Extract resume text and autofill profile"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--accent-purple)",
                        }}
                      >
                        <Sparkles size={14} />
                        {isExtracting ? "Extracting..." : "Auto-fill Profile"}
                      </button>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {!resume.is_master && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleSetMaster(resume.id as string)}
                          title="Set as Master Resume"
                        >
                          <Star size={14} />
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
                        style={{ color: "var(--accent-red)" }}
                        title="Delete Resume"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={32} />
            </div>
            <div className="empty-state-title">No resumes uploaded yet</div>
            <div className="empty-state-description">
              Upload your resume (PDF). You will be able to view it anytime, and
              the system will automatically extract your technical skills, contact info,
              and target roles to autofill your candidate profile!
            </div>
          </div>
        )}
      </div>

      {/* Embedded PDF Viewer Modal */}
      {previewResume && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewResume(null);
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "960px",
              height: "90vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              overflow: "hidden",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-primary)",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 20px",
                borderBottom: "1px solid var(--border-primary)",
                background: "var(--bg-secondary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} color="var(--accent-blue)" />
                <span style={{ fontWeight: 600, fontSize: "16px" }}>
                  {previewResume.name}.pdf
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <a
                  href={previewResume.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <ExternalLink size={14} /> Open in New Tab
                </a>
                <button
                  onClick={() => setPreviewResume(null)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: "6px 10px" }}
                  title="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Embedded PDF Iframe */}
            <div style={{ flex: 1, position: "relative", background: "#1e293b" }}>
              <iframe
                src={previewResume.url}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                }}
                title="Resume Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
