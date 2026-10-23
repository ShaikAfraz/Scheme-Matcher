import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Search,
  Printer,
  ExternalLink,
  SlidersHorizontal,
  Building2,
  IndianRupee,
  MapPin,
  Info,
  Check,
  ChevronDown,
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
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* 1. Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1
              style={{
                fontFamily: serif,
                fontSize: 26,
                color: INK,
                margin: "0 0 4px 0",
                fontWeight: 700,
              }}
            >
              Recommended Welfare Schemes
            </h1>
            {speechSummary && (
              <VoiceReader text={speechSummary} lang={lang} label={t.listen} />
            )}
          </div>
          <p
            style={{
              fontFamily: sans,
              fontSize: 13.5,
              color: INK_MUTED,
              margin: 0,
              maxWidth: 680,
            }}
          >
            Algorithmic criteria matching across 19 codified government programs. Showing {filteredMatches.length} matching result(s).
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onOpenCsc && (
            <button
              type="button"
              onClick={onOpenCsc}
              style={{
                fontFamily: sans,
                fontSize: 12.5,
                padding: "8px 14px",
                border: `1px solid ${SEAL}`,
                borderRadius: 4,
                background: "#FFFFFF",
                color: INK,
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Printer size={13} color={SEAL} />
              <span>Print Dossier Summary</span>
            </button>
          )}

          {onRetakeProfile && (
            <button
              type="button"
              onClick={onRetakeProfile}
              style={{
                fontFamily: sans,
                fontSize: 12.5,
                padding: "8px 14px",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                background: CARD,
                color: INK,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Adjust Parameters
            </button>
          )}
        </div>
      </div>

      {/* 2. Official Advisory Notice */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderLeft: `3px solid ${SEAL}`,
          borderRadius: 4,
          padding: "10px 14px",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 12,
          color: INK_MUTED,
        }}
      >
        <Info size={15} color={SEAL} style={{ flexShrink: 0 }} />
        <span>
          <strong style={{ color: INK }}>Advisory:</strong> A high match score indicates strong alignment with published criteria. Final sanction and DBT disbursement require physical document scrutiny by district authorities and partner financial institutions.
        </span>
      </div>

      {/* 3. Search and Filtering Toolbar */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "14px 16px",
          marginBottom: 20,
        }}
      >
        {/* Keyword Search Row */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              color={INK_LIGHT}
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by keyword (e.g. leather, margin subsidy, stipend, interest subvention)..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                fontFamily: sans,
                fontSize: 13.5,
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                outline: "none",
                color: INK,
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
            gap: 10,
          }}
        >
          {/* Tier Buttons */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>Compatibility:</span>
            {[
              { id: "all", label: `All (${matches.length})` },
              { id: "high", label: `Strong Match ≥70% (${matches.filter((m) => m.score >= 70).length})` },
              { id: "moderate", label: `Partial 40–69% (${matches.filter((m) => m.score >= 40 && m.score < 70).length})` },
              { id: "gap", label: `Gaps <40% (${matches.filter((m) => m.score < 40).length})` },
            ].map((tOption) => (
              <button
                key={tOption.id}
                type="button"
                onClick={() => setTierFilter(tOption.id)}
                style={{
                  fontFamily: sans,
                  fontSize: 11.5,
                  padding: "4px 9px",
                  borderRadius: 3,
                  border: `1px solid ${tierFilter === tOption.id ? INK : RULE}`,
                  background: tierFilter === tOption.id ? INK : "#FFFFFF",
                  color: tierFilter === tOption.id ? "#FFFFFF" : INK,
                  cursor: "pointer",
                  fontWeight: tierFilter === tOption.id ? 600 : 500,
                }}
              >
                {tOption.label}
              </button>
            ))}
          </div>

          {/* Category Dropdown and Sort Dropdown */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="category-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                Category:
              </label>
              <select
                id="category-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
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
                <option value="Artisan">Artisans &amp; Craftspeople</option>
                <option value="Divyangjan">Persons with Disabilities</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="sort-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                Sort:
              </label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "4px 8px",
                  fontSize: 12,
                  fontFamily: sans,
                  border: `1px solid ${RULE}`,
                  borderRadius: 3,
                  color: INK,
                  background: "#FFFFFF",
                  outline: "none",
                }}
              >
                <option value="score-desc">Match Score (Highest First)</option>
                <option value="funding-desc">Maximum Funding / Loan</option>
                <option value="name-asc">Alphabetical (A to Z)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Scheme Directory Results List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredMatches.map(({ scheme, score, reasons }, index) => {
          const isHighMatch = score >= 70;
          const isModerate = score >= 40 && score < 70;

          return (
            <article
              key={scheme.id}
              style={{
                background: CARD,
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "18px 20px",
                boxShadow: "0 1px 2px rgba(22, 32, 50, 0.03)",
                transition: "border-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = "#B5AD97")}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = RULE)}
            >
              {/* Card Header: Ministry + Scope + Match Score Badge */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: sans,
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: SEAL,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                      marginBottom: 2,
                    }}
                  >
                    {scheme.ministry}
                  </div>
                  <h2
                    style={{
                      fontFamily: sans,
                      fontSize: 17,
                      fontWeight: 700,
                      color: INK,
                      margin: 0,
                      lineHeight: 1.3,
                    }}
                  >
                    {scheme.name}
                  </h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <ScoreBadge score={score} size="md" />
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isHighMatch ? OK : isModerate ? VERIFY : NO,
                    }}
                  >
                    {isHighMatch
                      ? "Strong Match"
                      : isModerate
                      ? "Partial Match"
                      : "Criteria Gaps"}
                  </span>
                </div>
              </div>

              {/* Key Scheme Benefits */}
              <p
                style={{
                  fontFamily: sans,
                  fontSize: 13.5,
                  color: INK_MUTED,
                  lineHeight: 1.55,
                  margin: "0 0 12px 0",
                }}
              >
                <strong>Financial Assistance:</strong> {scheme.benefits}
              </p>

              {/* Parameter Tags: State, Category, Requirement range */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontFamily: sans,
                    color: INK_MUTED,
                    background: SURFACE_MUTED,
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: `1px solid ${RULE_LIGHT}`,
                  }}
                >
                  <MapPin size={11} color={SEAL} />
                  <span>
                    {scheme.states.includes("ALL") ? "All States & UTs" : scheme.states.join(", ")}
                  </span>
                </span>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    fontFamily: sans,
                    color: INK_MUTED,
                    background: SURFACE_MUTED,
                    padding: "3px 8px",
                    borderRadius: 3,
                    border: `1px solid ${RULE_LIGHT}`,
                  }}
                >
                  <span>Groups: {scheme.categories.join(", ")}</span>
                </span>

                {scheme.maxReq && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      fontFamily: sans,
                      color: INK_MUTED,
                      background: SURFACE_MUTED,
                      padding: "3px 8px",
                      borderRadius: 3,
                      border: `1px solid ${RULE_LIGHT}`,
                    }}
                  >
                    <IndianRupee size={11} color={SEAL} />
                    <span>Up to ₹{Number(scheme.maxReq).toLocaleString("en-IN")}</span>
                  </span>
                )}
              </div>

              {/* Deterministic Criteria Explanations */}
              <div
                style={{
                  borderTop: `1px solid ${RULE_LIGHT}`,
                  paddingTop: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  marginBottom: 14,
                }}
              >
                {reasons.green.slice(0, 2).map((reason) => (
                  <div
                    key={reason}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      fontSize: 12,
                      fontFamily: sans,
                      color: OK,
                    }}
                  >
                    <CheckCircle2 size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{simplifyGovtText(reason, isPlainMode, lang)}</span>
                  </div>
                ))}

                {reasons.red.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 6,
                      fontSize: 12,
                      fontFamily: sans,
                      color: NO,
                    }}
                  >
                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      Criteria Restriction: {simplifyGovtText(reasons.red[0], isPlainMode, lang)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: View Details & Official Portal */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => openDetails(scheme.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 16px",
                    background: SEAL,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13,
                    fontFamily: sans,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = SEAL_HOVER)}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SEAL)}
                >
                  <span>View Details &amp; Checklist</span>
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
                      gap: 4,
                      fontSize: 12.5,
                      fontFamily: sans,
                      color: INK,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = SEAL)}
                    onMouseOut={(e) => (e.currentTarget.style.color = INK)}
                  >
                    <span>Official Portal</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </article>
          );
        })}

        {filteredMatches.length === 0 && (
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 18, color: INK, marginBottom: 6 }}>
              No Welfare Schemes Found
            </div>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: INK_MUTED, maxWidth: 440, margin: "0 auto 16px" }}>
              No schemes currently match the applied filter criteria ("{searchTerm}" / {tierFilter} / {categoryFilter}). Try clearing search keywords or selecting "All Groups".
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
                background: CARD,
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                color: INK,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
