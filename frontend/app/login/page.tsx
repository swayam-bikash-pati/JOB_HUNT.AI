"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Sparkles } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        router.push(redirect);
        router.refresh();
      } else {
        setLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setLoading(false);
    }
  };

  // Optional OAuth helper preserved for future reference if ever re-enabled
  // Currently inactive as per project configuration
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGoogleLoginOptional = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}`,
      },
    });
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
            AI-powered job discovery & application assistant
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
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 600,
              marginBottom: "6px",
            }}
          >
            Sign In
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              marginBottom: "24px",
            }}
          >
            Enter your email and password to access your dashboard
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

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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
                "Sign In"
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
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              style={{
                color: "var(--accent-blue)",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary)",
          }}
        >
          <div className="loading-spinner" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
