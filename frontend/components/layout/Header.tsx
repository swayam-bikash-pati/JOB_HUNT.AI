"use client";

import { useState } from "react";
import { Bell, LogOut, User as UserIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface HeaderProps {
  userName: string;
}

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="header-bar">
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
          Welcome, <strong style={{ color: "var(--text-primary)" }}>{userName || "Candidate"}</strong>
        </span>
      </div>

      <div className="header-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button className="notification-btn" title="Notifications" type="button">
          <Bell size={18} />
        </button>

        <Link
          href="/profile"
          style={{ textDecoration: "none", color: "inherit" }}
          title="View Profile"
        >
          <div className="user-avatar" role="button" tabIndex={0}>
            {initials}
          </div>
        </Link>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="btn btn-ghost btn-sm"
          title="Sign out of JobHunter AI"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "13px",
            color: "var(--text-secondary)",
            padding: "6px 12px",
          }}
        >
          <LogOut size={15} />
          <span>{signingOut ? "Signing out..." : "Sign Out"}</span>
        </button>
      </div>
    </header>
  );
}
