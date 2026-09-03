"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  User,
  BarChart3,
  Settings,
  Send,
} from "lucide-react";

const navItems = [
  {
    section: "Overview",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/jobs", label: "Job Feed", icon: Briefcase },
      { href: "/applications", label: "Applications", icon: Send },
    ],
  },
  {
    section: "Profile",
    links: [
      { href: "/resumes", label: "Resumes", icon: FileText },
      { href: "/profile", label: "Profile", icon: User },
    ],
  },
  {
    section: "Insights",
    links: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>JobHunter AI</h1>
        <span>AI-Powered Job Discovery</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-title">{section.section}</div>
            {section.links.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" &&
                  pathname.startsWith(link.href));

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`nav-link ${isActive ? "active" : ""}`}
                >
                  <Icon />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
