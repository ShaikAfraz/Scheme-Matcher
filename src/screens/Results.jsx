import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Search,
  Printer,
  ExternalLink,
  SlidersHorizontal,
  Building2,
  IndianRupee,
  MapPin,
  Info,
  Check,
  Sparkles,
  Users,
  Compass,
} from "lucide-react";
import ScoreBadge from "../components/ScoreBadge.jsx";
import VoiceReader from "../components/VoiceReader.jsx";
import { simplifyGovtText } from "../components/JargonBuster.jsx";
import {
  INK,
  INK_MUTED,
  INK_LIGHT,
  PAPER,
  CARD,
  SURFACE_MUTED,
  SEAL,
  SEAL_HOVER,
  SEAL_LIGHT,
  OK,
  OK_BG,
  VERIFY,
  VERIFY_BG,
  NO,
  NO_BG,
  RULE,
  RULE_LIGHT,
  serif,
  sans,
} from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function Results({
  matches,
  openDetails,
  onRetakeProfile,
  onOpenCsc,
  lang = "en",
  isPlainMode = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all"); // "all" | "high" | "moderate" | "gap"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc"); // "score-desc" | "funding-desc" | "name-asc"

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        ({ scheme }) =>
          scheme.name.toLowerCase().includes(q) ||
          scheme.ministry.toLowerCase().includes(q) ||
          (scheme.description && scheme.description.toLowerCase().includes(q)) ||
          (scheme.benefits && scheme.benefits.toLowerCase().includes(q))
      );
    }

    // Match tier filter
    if (tierFilter === "high") {
      result = result.filter((m) => m.score >= 70);
    } else if (tierFilter === "moderate") {
      result = result.filter((m) => m.score >= 40 && m.score < 70);
    } else if (tierFilter === "gap") {
      result = result.filter((m) => m.score < 40);
    }

    // Target category filter
    if (categoryFilter !== "all") {
      result = result.filter(
        ({ scheme }) =>
          scheme.categories.includes("ALL") ||
          scheme.categories.includes(categoryFilter)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "score-desc") {
        return b.score - a.score;
      }
      if (sortBy === "funding-desc") {
        const reqA = a.scheme.maxReq || 0;
        const reqB = b.scheme.maxReq || 0;
        return reqB - reqA;
      }
      if (sortBy === "name-asc") {
        return a.scheme.name.localeCompare(b.scheme.name);
      }
      return 0;
    });

    return result;
  }, [matches, searchTerm, tierFilter, categoryFilter, sortBy]);

  const topMatch = matches[0];

  const speechSummary = topMatch
    ? lang === "hi"
      ? `आपके लिए सबसे उपयुक्त योजना है: ${topMatch.scheme.name}। आपका पात्रता स्कोर ${topMatch.score} प्रतिशत है।`
      : `Your top recommended scheme is ${topMatch.scheme.name} with an algorithmic compatibility score of ${topMatch.score} percent.`
    : "";

  return (
    <div style={{ width: "100%", maxWidth: 1140, margin: "0 auto", color: INK }}>
      {/* ========================================================================= */}
      {/* 1. EDITORIAL HEADER & METRICS                                             */}
      {/* ========================================================================= */}
      <div
        style={{
          borderBottom: `1px solid ${RULE}`,
          paddingBottom: 24,
          marginBottom: 28,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 20,
        }}
      >
        <div style={{ maxWidth: 740 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              color: SEAL,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            <Compass size={14} />
            <span>Curated Civic Ledger</span>
          </div>
          <h1
            style={{
              fontFamily: serif,
              fontSize: "clamp(26px, 3.5vw, 36px)",
              color: INK,
              margin: "0 0 10px 0",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            Government Scheme Directory
          </h1>
          <p
            style={{
              fontFamily: sans,
              fontSize: 14.5,
              color: INK_MUTED,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            19 audited central programs evaluated via deterministic rule matching. Showing{" "}
            <strong style={{ color: INK }}>{filteredMatches.length}</strong> of {matches.length} schemes.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {speechSummary && (
            <VoiceReader text={speechSummary} lang={lang} label={t.listen} />
          )}

          {onOpenCsc && (
            <button
              type="button"
              onClick={onOpenCsc}
              style={{
                fontFamily: sans,
                fontSize: 13,
                padding: "9px 16px",
                border: `1px solid ${SEAL}`,
                borderRadius: 4,
                background: "#FFFFFF",
                color: INK,
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <Printer size={14} color={SEAL} />
              <span>Print Dossier Summary</span>
            </button>
          )}

          {onRetakeProfile && (
            <button
              type="button"
              onClick={onRetakeProfile}
              style={{
                fontFamily: sans,
                fontSize: 13,
                padding: "9px 16px",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                background: CARD,
                color: INK,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SlidersHorizontal size={14} color={SEAL} />
              <span>Adjust Profile</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. TOP MATCH EDITORIAL SPOTLIGHT (IF MATCH SCORE >= 60)                   */}
      {/* ========================================================================= */}
      {topMatch && topMatch.score >= 50 && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${RULE}`,
            borderLeft: `4px solid ${SEAL}`,
            borderRadius: 4,
            padding: "24px 28px",
            marginBottom: 32,
            boxShadow: "0 2px 8px rgba(18, 25, 38, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  color: SEAL,
                  background: SEAL_LIGHT,
                  padding: "2px 8px",
                  borderRadius: 2,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Top Algorithmic Match for Your Profile
              </div>
              <h2
                style={{
                  fontFamily: serif,
                  fontSize: "clamp(20px, 2.6vw, 26px)",
                  fontWeight: 700,
                  color: INK,
                  margin: "0 0 6px 0",
                  lineHeight: 1.25,
                }}
              >
                {topMatch.scheme.name}
              </h2>
              <div style={{ fontSize: 13, color: INK_LIGHT, fontWeight: 500 }}>
                {topMatch.scheme.ministry}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: serif, color: OK }}>
                  {topMatch.score}%
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: INK_LIGHT, textTransform: "uppercase" }}>
                  Compatibility Score
                </div>
              </div>
              <ScoreBadge score={topMatch.score} size="lg" />
            </div>
          </div>

          <p style={{ fontFamily: sans, fontSize: 14.5, color: INK_MUTED, lineHeight: 1.6, margin: "0 0 16px 0" }}>
            {topMatch.scheme.description}
          </p>

          <div
            style={{
              background: SURFACE_MUTED,
              border: `1px solid ${RULE_LIGHT}`,
              borderRadius: 4,
              padding: "12px 16px",
              marginBottom: 18,
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: INK }}>Financial Benefit:</strong>{" "}
            <span style={{ color: INK_MUTED }}>{topMatch.scheme.benefits}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12.5, color: OK }}>
              {topMatch.reasons.green.slice(0, 2).map((r) => (
                <span key={r} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <CheckCircle2 size={14} />
                  <span>{simplifyGovtText(r, isPlainMode, lang)}</span>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => openDetails(topMatch.scheme.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                background: SEAL,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              <span>View Full Criteria &amp; Checklist</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTER TOOLBAR                                                */}
      {/* ========================================================================= */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 28,
        }}
      >
        {/* Search Input */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={16}
              color={INK_LIGHT}
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search schemes by keyword, trade (artisan, handloom, sanitation), subsidy, or ministry..."
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                fontFamily: sans,
                fontSize: 14,
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                outline: "none",
                color: INK,
                background: "#FFFFFF",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Filter Controls Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          {/* Compatibility Filters */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Match Tier:
            </span>
            {[
              { id: "all", label: `All (${matches.length})` },
              { id: "high", label: `Strong Match ≥70% (${matches.filter((m) => m.score >= 70).length})` },
              { id: "moderate", label: `Partial 40–69% (${matches.filter((m) => m.score >= 40 && m.score < 70).length})` },
              { id: "gap", label: `Gaps <40% (${matches.filter((m) => m.score < 40).length})` },
            ].map((tOption) => {
              const active = tierFilter === tOption.id;
              return (
                <button
                  key={tOption.id}
                  type="button"
                  onClick={() => setTierFilter(tOption.id)}
                  style={{
                    fontFamily: sans,
                    fontSize: 12,
                    padding: "5px 10px",
                    borderRadius: 3,
                    border: `1px solid ${active ? INK : RULE}`,
                    background: active ? INK : "#FFFFFF",
                    color: active ? "#FFFFFF" : INK,
                    cursor: "pointer",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {tOption.label}
                </button>
              );
            })}
          </div>

          {/* Category & Sort Dropdowns */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="dir-category-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                Target Group:
              </label>
              <select
                id="dir-category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: 12.5,
                  fontFamily: sans,
                  border: `1px solid ${RULE}`,
                  borderRadius: 3,
                  color: INK,
                  background: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="all">All Groups</option>
                <option value="SC">Scheduled Caste (SC)</option>
                <option value="ST">Scheduled Tribe (ST)</option>
                <option value="OBC">Other Backward Classes</option>
                <option value="Women">Women Entrepreneurs</option>
                <option value="Artisan">Artisans &amp; Craftspersons</option>
                <option value="Divyangjan">Persons with Disabilities</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="dir-sort-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                Sort:
              </label>
              <select
                id="dir-sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: 12.5,
                  fontFamily: sans,
                  border: `1px solid ${RULE}`,
                  borderRadius: 3,
                  color: INK,
                  background: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="score-desc">Match Score (Highest First)</option>
                <option value="funding-desc">Maximum Funding Limit</option>
                <option value="name-asc">Alphabetical (A to Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SCHEME DIRECTORY LIST                                                  */}
      {/* ========================================================================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {filteredMatches.length === 0 ? (
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: serif, fontSize: 18, color: INK, margin: "0 0 8px 0" }}>
              No schemes match the current filters.
            </p>
            <p style={{ fontSize: 13.5, color: INK_MUTED, margin: "0 0 16px 0" }}>
              Try clearing your search keyword or switching the target group to "All Groups".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTierFilter("all");
                setCategoryFilter("all");
              }}
              style={{
                padding: "8px 18px",
                background: INK,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredMatches.map(({ scheme, score, reasons }, index) => {
            const isHighMatch = score >= 70;
            const isModerate = score >= 40 && score < 70;
            const isArtisanScheme =
              scheme.categories.includes("Artisan") ||
              scheme.name.toLowerCase().includes("vishwakarma") ||
              scheme.description.toLowerCase().includes("artisan") ||
              scheme.description.toLowerCase().includes("weaver");

            return (
              <article
                key={scheme.id}
                style={{
                  background: CARD,
                  border: `1px solid ${RULE}`,
                  borderLeft: isHighMatch
                    ? `4px solid ${OK}`
                    : isModerate
                    ? `4px solid ${VERIFY}`
                    : `4px solid ${RULE}`,
                  borderRadius: 4,
                  padding: "22px 26px",
                  boxShadow: "0 1px 3px rgba(18, 25, 38, 0.03)",
                  transition: "border-color 0.15s ease",
                }}
              >
                {/* Meta Header: Index, Scheme Code, Ministry, Artisan Flag */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 13,
                        fontWeight: 700,
                        color: SEAL,
                      }}
                    >
                      #{String(index + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: INK_MUTED,
                        background: SURFACE_MUTED,
                        padding: "2px 6px",
                        borderRadius: 2,
                        letterSpacing: 0.5,
                      }}
                    >
                      {scheme.id}
                    </span>
                    <span style={{ fontSize: 12, color: INK_LIGHT, fontWeight: 500 }}>
                      {scheme.ministry}
                    </span>
                    {isArtisanScheme && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: SEAL,
                          background: SEAL_LIGHT,
                          border: `1px solid ${RULE_LIGHT}`,
                          padding: "1px 6px",
                          borderRadius: 2,
                        }}
                      >
                        Artisan / Craftsperson Priority
                      </span>
                    )}
                  </div>

                  {/* Score Pill */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: isHighMatch ? OK : isModerate ? VERIFY : NO,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {isHighMatch ? "Strong Match" : isModerate ? "Partial Match" : "Criteria Gaps"}
                    </span>
                    <ScoreBadge score={score} size="md" />
                  </div>
                </div>

                {/* Scheme Title */}
                <h2
                  style={{
                    fontFamily: serif,
                    fontSize: 20,
                    fontWeight: 700,
                    color: INK,
                    margin: "0 0 10px 0",
                    lineHeight: 1.3,
                  }}
                >
                  {scheme.name}
                </h2>

                {/* Benefits Callout */}
                <div
                  style={{
                    background: SURFACE_MUTED,
                    border: `1px solid ${RULE_LIGHT}`,
                    borderRadius: 3,
                    padding: "10px 14px",
                    marginBottom: 12,
                    fontSize: 13.5,
                    lineHeight: 1.55,
                  }}
                >
                  <strong style={{ color: INK }}>Financial Assistance:</strong>{" "}
                  <span style={{ color: INK_MUTED }}>{scheme.benefits}</span>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontFamily: sans,
                    fontSize: 13.5,
                    color: INK_MUTED,
                    lineHeight: 1.6,
                    margin: "0 0 14px 0",
                  }}
                >
                  {scheme.description}
                </p>

                {/* Parameter Pills: States, Groups, Maximum Funding */}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: INK_MUTED,
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    <MapPin size={12} color={SEAL} />
                    <span>{scheme.states.includes("ALL") ? "All States & UTs" : scheme.states.join(", ")}</span>
                  </span>

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      color: INK_MUTED,
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    <Users size={12} color={SEAL} />
                    <span>Groups: {scheme.categories.join(", ")}</span>
                  </span>

                  {scheme.maxReq && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 12,
                        color: INK,
                        fontWeight: 600,
                        background: "#FFFFFF",
                        border: `1px solid ${RULE}`,
                        padding: "3px 8px",
                        borderRadius: 3,
                      }}
                    >
                      <IndianRupee size={12} color={OK} />
                      <span>Ceiling: ₹{Number(scheme.maxReq).toLocaleString("en-IN")}</span>
                    </span>
                  )}
                </div>

                {/* Reasons / Criteria Audit */}
                <div
                  style={{
                    borderTop: `1px solid ${RULE_LIGHT}`,
                    paddingTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 5,
                    marginBottom: 16,
                  }}
                >
                  {reasons.green.slice(0, 2).map((reason) => (
                    <div
                      key={reason}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        fontSize: 12.5,
                        color: OK,
                      }}
                    >
                      <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{simplifyGovtText(reason, isPlainMode, lang)}</span>
                    </div>
                  ))}

                  {reasons.red.length > 0 && (
                    <div
                      key={reasons.red[0]}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        fontSize: 12.5,
                        color: NO,
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        Criteria Gap: {simplifyGovtText(reasons.red[0], isPlainMode, lang)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openDetails(scheme.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 18px",
                      background: SEAL,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontFamily: sans,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = SEAL_HOVER)}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SEAL)}
                  >
                    <span>View Scheme Details &amp; Checklist</span>
                    <ArrowRight size={14} />
                  </button>

                  {scheme.portalUrl && (
                    <a
                      href={scheme.portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        color: INK_MUTED,
                        fontFamily: sans,
                        fontSize: 12.5,
                        textDecoration: "none",
                        fontWeight: 500,
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.color = INK)}
                      onMouseOut={(e) => (e.currentTarget.style.color = INK_MUTED)}
                    >
                      <span>Official Ministry Portal</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
