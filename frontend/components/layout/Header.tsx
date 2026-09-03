"use client";

import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface HeaderProps {
  userName: string;
}

export default function Header({ userName }: HeaderProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
      <div />
      <div className="header-right">
        <button className="notification-btn" title="Notifications">
          <Bell size={18} />
        </button>
        <div
          className="user-avatar"
          onClick={handleSignOut}
          title="Sign out"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleSignOut()}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
