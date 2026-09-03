"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=/profile`,
      },
    });
  };

  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "var(--bg-primary)",
        }}
      >
        <div className="card" style={{ maxWidth: "400px", padding: "32px", textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "var(--accent-green)",
              fontSize: "24px",
            }}
          >
            ✓
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
            Check your email
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            We&apos;ve sent a confirmation link to <strong>{email}</strong>. 
            Click the link to activate your account.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: "24px" }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "var(--bg-primary)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              background:
                "linear-gradient(135deg, var(--accent-blue), var(--accent-purple))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            JobHunter AI
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            Start your AI-powered job search
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: "32px" }}>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              marginBottom: "24px",
              textAlign: "center",
            }}
          >
            Create your account
          </h2>

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

          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">
                Full Name
              </label>
              <input
                id="fullName"
                className="form-input"
                type="text"
                placeholder="Your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                className="form-input"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: "100%", marginBottom: "12px" }}
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              margin: "16px 0",
            }}
          >
            <div
              style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>or</span>
            <div
              style={{ flex: 1, height: "1px", background: "var(--border-primary)" }}
            />
          </div>

          <button
            onClick={handleGoogleSignup}
            className="btn btn-secondary"
            style={{ width: "100%" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>

          <p
            style={{
              textAlign: "center",
              fontSize: "13px",
              color: "var(--text-secondary)",
              marginTop: "24px",
            }}
          >
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--text-accent)" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
