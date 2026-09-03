"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  MapPin,
  Clock,
  Building2,
  Search,
  SlidersHorizontal,
  X,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";
import { formatDate, formatEmploymentType, formatRemoteType } from "@/lib/types";

// Common locations for quick filtering
const POPULAR_LOCATIONS = [
  "Remote",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Delhi",
  "Mumbai",
  "Chennai",
  "United States",
  "London",
];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [preferredLocationsOnly, setPreferredLocationsOnly] = useState(false);
  const [userPreferredLocations, setUserPreferredLocations] = useState<string[]>([]);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"match" | "freshness" | "company">("match");

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Fetch user preferred locations from profile
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_locations, location")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const prefs = (profile.preferred_locations as string[]) || [];
          // Also include city from location if set
          if (profile.location && !prefs.includes(profile.location as string)) {
            prefs.push(profile.location as string);
          }
          setUserPreferredLocations(prefs);
        }
      }

      // 2. Fetch all jobs with matches
      const { data: jobsData } = await supabase
        .from("jobs")
        .select(`
          *,
          job_matches!left (
            final_score, rank_score, matching_skills, missing_skills
          )
        `)
        .order("discovered_at", { ascending: false })
        .limit(600);

      const mapped = (jobsData || []).map((job: Record<string, unknown>) => {
        const matches = job.job_matches as Record<string, unknown>[] | null;
        const userMatch =
          matches?.find((m: Record<string, unknown>) => m.user_id === user?.id) ||
          matches?.[0];
        return { ...job, match: userMatch || null };
      });

      setJobs(mapped);
      setLoading(false);
    }

    loadData();
  }, []);

  // Filter jobs based on search, location, preferred locations, and remote
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const title = (job.title as string)?.toLowerCase() || "";
      const company = (job.company as string)?.toLowerCase() || "";
      const location = (job.location as string)?.toLowerCase() || "";
      const remoteType = (job.remote_type as string)?.toLowerCase() || "";
      const skills = ((job.skills as string[]) || []).join(" ").toLowerCase();

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          title.includes(q) ||
          company.includes(q) ||
          skills.includes(q) ||
          location.includes(q);
        if (!matchesQuery) return false;
      }

      // Remote Only Filter
      if (remoteOnly) {
        const isRemote =
          remoteType.includes("remote") ||
          location.includes("remote") ||
          title.includes("remote");
        if (!isRemote) return false;
      }

      // "Only Preferred Locations" Filter
      if (preferredLocationsOnly) {
        if (userPreferredLocations.length === 0) {
          // If user hasn't set any, don't filter out everything; prompt them
          return true;
        }

        const matchesPreferred = userPreferredLocations.some((prefLoc) => {
          const pref = prefLoc.toLowerCase().trim();
          if (pref === "remote") {
            return (
              remoteType.includes("remote") ||
              location.includes("remote") ||
              title.includes("remote")
            );
          }
          // Check Indian city aliases or substring match
          if (pref === "bangalore" || pref === "bengaluru") {
            return location.includes("bangalore") || location.includes("bengaluru");
          }
          if (pref === "delhi" || pref === "gurgaon" || pref === "noida") {
            return (
              location.includes("delhi") ||
              location.includes("gurgaon") ||
              location.includes("noida") ||
              location.includes("ncr")
            );
          }
          return location.includes(pref);
        });

        if (!matchesPreferred) return false;
      }

      // Free-text Location Query Filter
      if (locationQuery.trim()) {
        const loc = locationQuery.toLowerCase().trim();
        if (loc === "remote") {
          const isRemote =
            remoteType.includes("remote") ||
            location.includes("remote") ||
            title.includes("remote");
          if (!isRemote) return false;
        } else {
          // Handle aliases like Bangalore / Bengaluru
          let matchesLoc = location.includes(loc);
          if (!matchesLoc && (loc === "bangalore" || loc === "bengaluru")) {
            matchesLoc =
              location.includes("bangalore") || location.includes("bengaluru");
          }
          if (!matchesLoc && (loc === "delhi" || loc === "gurgaon" || loc === "noida")) {
            matchesLoc =
              location.includes("delhi") ||
              location.includes("gurgaon") ||
              location.includes("noida");
          }
          if (!matchesLoc) return false;
        }
      }

      return true;
    });
  }, [jobs, searchQuery, locationQuery, preferredLocationsOnly, userPreferredLocations, remoteOnly]);

  // Sort jobs
  const sortedJobs = useMemo(() => {
    const list = [...filteredJobs];
    if (sortBy === "match") {
      list.sort((a, b) => {
        const aScore =
          ((a.match as Record<string, unknown>)?.rank_score as number) ||
          ((a.match as Record<string, unknown>)?.final_score as number) ||
          0;
        const bScore =
          ((b.match as Record<string, unknown>)?.rank_score as number) ||
          ((b.match as Record<string, unknown>)?.final_score as number) ||
          0;
        return bScore - aScore;
      });
    } else if (sortBy === "freshness") {
      list.sort((a, b) => {
        const aDate = new Date((a.posted_at || a.discovered_at) as string).getTime();
        const bDate = new Date((b.posted_at || b.discovered_at) as string).getTime();
        return bDate - aDate;
      });
    } else if (sortBy === "company") {
      list.sort((a, b) =>
        ((a.company as string) || "").localeCompare((b.company as string) || "")
      );
    }
    return list;
  }, [filteredJobs, sortBy]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setLocationQuery("");
    setPreferredLocationsOnly(false);
    setRemoteOnly(false);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(locationQuery) ||
    preferredLocationsOnly ||
    remoteOnly;

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1>Job Feed</h1>
            <p>
              Showing <strong>{sortedJobs.length}</strong> of <strong>{jobs.length}</strong> discovered jobs • Continuously synced from verified ATS feeds
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Sort:</span>
            <select
              className="form-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "match" | "freshness" | "company")}
              style={{ width: "auto", padding: "6px 12px", fontSize: "13px" }}
            >
              <option value="match">Match Score × Freshness</option>
              <option value="freshness">Most Recent</option>
              <option value="company">Company (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="page-content">
        {/* Search & Location Filter Controls */}
        <div
          className="card"
          style={{
            padding: "20px",
            marginBottom: "20px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-primary)",
          }}
        >
          {/* Inputs Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            {/* Title / Keyword Search */}
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search job title, company, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "38px" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Location Search Input */}
            <div style={{ position: "relative" }}>
              <MapPin
                size={16}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: locationQuery ? "var(--accent-blue)" : "var(--text-muted)",
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search by city or area (e.g. Bangalore, Pune, Remote)..."
                value={locationQuery}
                onChange={(e) => {
                  setLocationQuery(e.target.value);
                  if (preferredLocationsOnly) setPreferredLocationsOnly(false);
                }}
                style={{
                  paddingLeft: "38px",
                  borderColor: locationQuery ? "var(--accent-blue)" : undefined,
                }}
              />
              {locationQuery && (
                <button
                  onClick={() => setLocationQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Quick Filters Toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {/* Toggle: Only My Preferred Locations */}
              <button
                onClick={() => {
                  setPreferredLocationsOnly(!preferredLocationsOnly);
                  if (!preferredLocationsOnly) {
                    setLocationQuery("");
                  }
                }}
                className={`btn btn-sm ${
                  preferredLocationsOnly ? "btn-primary" : "btn-secondary"
                }`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 600,
                  fontSize: "13px",
                  boxShadow: preferredLocationsOnly
                    ? "0 0 12px rgba(59, 130, 246, 0.4)"
                    : "none",
                }}
                title={
                  userPreferredLocations.length > 0
                    ? `Filter only jobs matching: ${userPreferredLocations.join(", ")}`
                    : "Configure preferred locations in your profile"
                }
              >
                <MapPin size={14} />
                <span>Only My Preferred Locations</span>
                {preferredLocationsOnly && <Check size={14} />}
              </button>

              {/* Remote Only Toggle */}
              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`btn btn-sm ${remoteOnly ? "btn-primary" : "btn-ghost"}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                }}
              >
                <span>🌐 Remote Only</span>
                {remoteOnly && <Check size={14} />}
              </button>

              {/* Location Quick Pills */}
              <span style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 4px" }}>
                Quick:
              </span>
              {POPULAR_LOCATIONS.slice(0, 5).map((loc) => {
                const isSelected = locationQuery.toLowerCase() === loc.toLowerCase();
                return (
                  <button
                    key={loc}
                    onClick={() => {
                      if (isSelected) {
                        setLocationQuery("");
                      } else {
                        setLocationQuery(loc);
                        setPreferredLocationsOnly(false);
                      }
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      cursor: "pointer",
                      border: isSelected
                        ? "1px solid var(--accent-blue)"
                        : "1px solid var(--border-primary)",
                      background: isSelected
                        ? "rgba(59, 130, 246, 0.18)"
                        : "var(--bg-primary)",
                      color: isSelected
                        ? "var(--accent-blue)"
                        : "var(--text-secondary)",
                      fontWeight: isSelected ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="btn btn-ghost btn-sm"
                style={{
                  fontSize: "12px",
                  color: "var(--accent-red)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>

          {/* Preferred Locations Info Bar */}
          {preferredLocationsOnly && (
            <div
              style={{
                marginTop: "14px",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "rgba(59, 130, 246, 0.08)",
                border: "1px solid rgba(59, 130, 246, 0.2)",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <div>
                {userPreferredLocations.length > 0 ? (
                  <span>
                    Filtering exclusively by your saved preferences:{" "}
                    <strong>{userPreferredLocations.join(", ")}</strong>
                  </span>
                ) : (
                  <span style={{ color: "var(--accent-yellow)" }}>
                    You have not set any preferred locations in your profile yet!
                  </span>
                )}
              </div>
              <Link
                href="/profile"
                style={{
                  color: "var(--accent-blue)",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Edit Preferred Locations in Profile →
              </Link>
            </div>
          )}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "64px" }}>
            <div className="loading-spinner" />
          </div>
        ) : sortedJobs.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {sortedJobs.map((job: Record<string, unknown>) => {
              const match = job.match as Record<string, unknown> | null;
              const score = match ? Math.round(match.final_score as number) : null;
              const category =
                score !== null
                  ? score >= 90
                    ? "excellent"
                    : score >= 80
                    ? "strong"
                    : score >= 70
                    ? "good"
                    : score >= 60
                    ? "possible"
                    : "low"
                  : null;

              const jobLocation = (job.location as string) || "";
              const matchesUserLoc = userPreferredLocations.some((p) =>
                jobLocation.toLowerCase().includes(p.toLowerCase())
              );

              return (
                <Link
                  key={job.id as string}
                  href={`/jobs/${job.id}`}
                  className="job-card"
                  style={{
                    borderColor: matchesUserLoc
                      ? "rgba(59, 130, 246, 0.35)"
                      : undefined,
                  }}
                >
                  <div className="job-card-header">
                    <div>
                      <div className="job-card-title">{job.title as string}</div>
                      <div className="job-card-company">{job.company as string}</div>
                    </div>
                    {score !== null && category && (
                      <div className={`match-score ${category}`}>{score}</div>
                    )}
                  </div>

                  <div className="job-card-meta">
                    {jobLocation && (
                      <span
                        className="job-card-tag"
                        style={{
                          background: matchesUserLoc
                            ? "rgba(59, 130, 246, 0.15)"
                            : undefined,
                          color: matchesUserLoc
                            ? "var(--accent-blue)"
                            : undefined,
                          fontWeight: matchesUserLoc ? 600 : undefined,
                        }}
                      >
                        <MapPin size={12} />
                        {jobLocation}
                        {matchesUserLoc && " (Preferred)"}
                      </span>
                    )}
                    <span className="job-card-tag">
                      <Building2 size={12} />
                      {formatEmploymentType(job.employment_type as "full_time")}
                    </span>
                    <span className="job-card-tag">
                      {formatRemoteType(job.remote_type as "unknown")}
                    </span>
                    {(job.posted_at as string) && (
                      <span className="job-card-tag">
                        <Clock size={12} />
                        {formatDate(job.posted_at as string)}
                      </span>
                    )}
                  </div>

                  {/* Skills tags */}
                  {((job.skills as string[]) || []).length > 0 && (
                    <div className="job-card-skills" style={{ marginTop: "10px" }}>
                      {((job.skills as string[]) || []).slice(0, 6).map((skill: string) => {
                        const isMatched = (
                          (match?.matching_skills as string[]) || []
                        ).includes(skill);
                        return (
                          <span
                            key={skill}
                            className={`skill-badge ${isMatched ? "match" : ""}`}
                          >
                            {skill}
                          </span>
                        );
                      })}
                      {((job.skills as string[]) || []).length > 6 && (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            padding: "3px 8px",
                          }}
                        >
                          +{((job.skills as string[]) || []).length - 6} more
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          /* Empty Search Results */
          <div className="empty-state">
            <div className="empty-state-icon">
              <MapPin size={32} />
            </div>
            <div className="empty-state-title">No jobs found matching your filters</div>
            <div className="empty-state-description">
              {locationQuery || preferredLocationsOnly ? (
                <>
                  No active openings matched the location{" "}
                  <strong>
                    &quot;{locationQuery || userPreferredLocations.join(", ")}&quot;
                  </strong>
                  . Try searching for <strong>&quot;Remote&quot;</strong>, clearing the location
                  filter, or broadening your preferences in your Profile.
                </>
              ) : (
                "Try clearing your search query or filters to browse all 573 live jobs."
              )}
            </div>
            <div style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={clearAllFilters} className="btn btn-primary btn-sm">
                Clear Filters (Show All 573 Jobs)
              </button>
              <Link href="/profile" className="btn btn-secondary btn-sm">
                Edit Preferred Locations in Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
