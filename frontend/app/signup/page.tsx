"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, CheckCircle2, Sparkles } from "lucide-react";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // If session is immediately returned (email confirmation disabled/auto-confirmed)
      if (data?.session) {
        // Ensure profile is created/synced
        if (data.user) {
          await supabase.from("profiles").upsert(
            {
              user_id: data.user.id,
              full_name: fullName.trim(),
              email: email.trim(),
            },
            { onConflict: "user_id" }
          );
        }
        router.push("/dashboard");
        router.refresh();
      } else {
        // Email confirmation is required by Supabase settings
        setConfirmationRequired(true);
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected signup error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "radial-gradient(ellipse at top, #1e293b 0%, #0f172a 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
        }}
      >
        {/* Branding */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              background: "rgba(59, 130, 246, 0.12)",
              borderRadius: "20px",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              color: "var(--accent-blue)",
              fontSize: "12px",
              fontWeight: 600,
              marginBottom: "16px",
            }}
          >
            <Sparkles size={14} />
            <span>₹0 Cost Architecture</span>
          </div>

          <h1
            style={{
              fontSize: "30px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background:
                "linear-gradient(135deg, #60a5fa 0%, #a855f7 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              marginBottom: "6px",
            }}
          >
            JobHunter AI
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
            }}
          >
            Create your account to start discovering matching jobs
          </p>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: "32px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-primary)",
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(12px)",
          }}
        >
          {confirmationRequired ? (
            <div style={{ textAlign: "center", padding: "12px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "var(--accent-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
                Check your email
              </h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                  marginBottom: "24px",
                }}
              >
                We have sent a confirmation link to{" "}
                <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
                Please click the link in your email to activate your account.
              </p>
              <Link
                href="/login"
                className="btn btn-primary"
                style={{
                  display: "inline-block",
                  width: "100%",
                  padding: "12px",
                  textAlign: "center",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  marginBottom: "6px",
                }}
              >
                Create Account
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  marginBottom: "24px",
                }}
              >
                Sign up with your email and password
              </p>

              {error && (
                <div
                  style={{
                    padding: "10px 14px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--accent-red)",
                    fontSize: "13px",
                    marginBottom: "20px",
                  }}
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={14} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="e.g. Swayam Bikash"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Mail size={14} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Lock size={14} />
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="form-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginTop: "8px",
                  }}
                >
                  {loading ? (
                    <span className="loading-spinner" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <p
                style={{
                  textAlign: "center",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginTop: "24px",
                }}
              >
                Already have an account?{" "}
                <Link
                  href="/login"
                  style={{
                    color: "var(--accent-blue)",
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
