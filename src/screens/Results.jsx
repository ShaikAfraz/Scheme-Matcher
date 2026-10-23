import React, { useState, useMemo, useEffect } from "react";
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
  Bookmark,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  HelpCircle,
  Filter,
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
  currentUser = null,
  bookmarks = [],
  onToggleBookmark = null,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all"); // "all" | "high" | "moderate" | "gap"
  const [levelFilter, setLevelFilter] = useState("all"); // "all" | "central" | "state"
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score-desc"); // "score-desc" | "funding-desc" | "name-asc"
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Collect unique states from all matched schemes for dropdown
  const availableStates = useMemo(() => {
    const statesSet = new Set();
    matches.forEach(({ scheme }) => {
      if (Array.isArray(scheme.states)) {
        scheme.states.forEach((st) => {
          if (st && st !== "ALL" && st !== "all") {
            statesSet.add(st);
          }
        });
      }
    });
    return Array.from(statesSet).sort((a, b) => a.localeCompare(b));
  }, [matches]);

  // Dynamic counts for quick filters
  const levelCounts = useMemo(() => {
    let central = 0;
    let state = 0;
    for (const m of matches) {
      const lvl = (m.scheme.governmentLevel || m.scheme.government_level || "central").toLowerCase();
      if (lvl === "state") state++;
      else central++;
    }
    return { central, state, all: matches.length };
  }, [matches]);

  const tierCounts = useMemo(() => {
    let high = 0;
    let moderate = 0;
    let gap = 0;
    for (const m of matches) {
      if (m.score >= 70) high++;
      else if (m.score >= 40) moderate++;
      else gap++;
    }
    return { high, moderate, gap, all: matches.length };
  }, [matches]);

  // Reset page when filters change
  const handleSearchChange = (val) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };
  const handleTierChange = (val) => {
    setTierFilter(val);
    setCurrentPage(1);
  };
  const handleLevelChange = (val) => {
    setLevelFilter(val);
    setCurrentPage(1);
  };
  const handleCategoryChange = (val) => {
    setCategoryFilter(val);
    setCurrentPage(1);
  };
  const handleStateChange = (val) => {
    setStateFilter(val);
    setCurrentPage(1);
  };
  const handleSortChange = (val) => {
    setSortBy(val);
    setCurrentPage(1);
  };

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Search query filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(
        ({ scheme }) =>
          scheme.name.toLowerCase().includes(q) ||
          scheme.id.toLowerCase().includes(q) ||
          scheme.ministry.toLowerCase().includes(q) ||
          (scheme.description && scheme.description.toLowerCase().includes(q)) ||
          (scheme.benefits && scheme.benefits.toLowerCase().includes(q)) ||
          (scheme.source && scheme.source.toLowerCase().includes(q))
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

    // Government Level filter
    if (levelFilter === "central") {
      result = result.filter(({ scheme }) => {
        const lvl = (scheme.governmentLevel || scheme.government_level || "central").toLowerCase();
        return lvl === "central";
      });
    } else if (levelFilter === "state") {
      result = result.filter(({ scheme }) => {
        const lvl = (scheme.governmentLevel || scheme.government_level || "").toLowerCase();
        return lvl === "state";
      });
    }

    // State filter
    if (stateFilter !== "all") {
      result = result.filter(({ scheme }) => {
        const states = scheme.states || ["ALL"];
        return states.includes("ALL") || states.includes(stateFilter);
      });
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
  }, [matches, searchTerm, tierFilter, levelFilter, stateFilter, categoryFilter, sortBy]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedMatches = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredMatches.slice(start, start + pageSize);
  }, [filteredMatches, safeCurrentPage, pageSize]);

  const topMatch = matches[0];

  const speechSummary = topMatch
    ? lang === "hi"
      ? `आपके लिए सबसे उपयुक्त योजना है: ${topMatch.scheme.name}। आपका पात्रता स्कोर ${topMatch.score} प्रतिशत है।`
      : `Your top recommended scheme is ${topMatch.scheme.name} with an algorithmic compatibility score of ${topMatch.score} percent.`
    : "";

  const goToPage = (p) => {
    const pageNum = Math.min(Math.max(1, p), totalPages);
    setCurrentPage(pageNum);
    // Smooth scroll up to directory container
    const dirElement = document.getElementById("scheme-directory-ledger");
    if (dirElement) {
      dirElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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
            {matches.length} audited central and state programs evaluated via deterministic rule matching. Showing{" "}
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
      {/* 2. TOP MATCH EDITORIAL SPOTLIGHT (IF MATCH SCORE >= 50)                   */}
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: SEAL,
                  background: SEAL_LIGHT,
                  padding: "3px 9px",
                  borderRadius: 3,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                <Sparkles size={12} />
                <span>Top Algorithmic Match for Your Profile</span>
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
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", fontSize: 13, color: INK_LIGHT, fontWeight: 500 }}>
                <span>{topMatch.scheme.ministry}</span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#065F46",
                    background: "#D1FAE5",
                    border: "1px solid #A7F3D0",
                    padding: "2px 7px",
                    borderRadius: 3,
                  }}
                >
                  <ShieldCheck size={12} color="#059669" />
                  <span>Verified Official Source</span>
                </span>
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
        id="scheme-directory-ledger"
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 24,
          boxShadow: "0 1px 3px rgba(18, 25, 38, 0.03)",
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search across 500+ schemes by keyword, trade (farmer, artisan, youth), subsidy, state, or ministry..."
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

        {/* Filter Controls Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Row 1: Match Tier Pills */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Match Tier:
            </span>
            {[
              { id: "all", label: `All (${tierCounts.all})` },
              { id: "high", label: `Strong Match ≥70% (${tierCounts.high})` },
              { id: "moderate", label: `Partial 40–69% (${tierCounts.moderate})` },
              { id: "gap", label: `Gaps <40% (${tierCounts.gap})` },
            ].map((tOption) => {
              const active = tierFilter === tOption.id;
              return (
                <button
                  key={tOption.id}
                  type="button"
                  onClick={() => handleTierChange(tOption.id)}
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

          {/* Row 2: Level Pills + Dropdowns */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              borderTop: `1px solid ${RULE_LIGHT}`,
              paddingTop: 12,
            }}
          >
            {/* Government Level Toggle */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: INK_MUTED, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Level:
              </span>
              {[
                { id: "all", label: `All Levels (${levelCounts.all})` },
                { id: "central", label: `Central (${levelCounts.central})` },
                { id: "state", label: `State (${levelCounts.state})` },
              ].map((lvlOption) => {
                const active = levelFilter === lvlOption.id;
                return (
                  <button
                    key={lvlOption.id}
                    type="button"
                    onClick={() => handleLevelChange(lvlOption.id)}
                    style={{
                      fontFamily: sans,
                      fontSize: 12,
                      padding: "5px 10px",
                      borderRadius: 3,
                      border: `1px solid ${active ? SEAL : RULE}`,
                      background: active ? SEAL : "#FFFFFF",
                      color: active ? "#FFFFFF" : INK,
                      cursor: "pointer",
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {lvlOption.label}
                  </button>
                );
              })}
            </div>

            {/* Dropdown Filters: State, Category, Sort */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              {/* State Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <label htmlFor="dir-state-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                  State:
                </label>
                <select
                  id="dir-state-select"
                  value={stateFilter}
                  onChange={(e) => handleStateChange(e.target.value)}
                  style={{
                    padding: "5px 10px",
                    fontSize: 12.5,
                    fontFamily: sans,
                    border: `1px solid ${RULE}`,
                    borderRadius: 3,
                    color: INK,
                    background: "#FFFFFF",
                    outline: "none",
                    maxWidth: 160,
                  }}
                >
                  <option value="all">All States &amp; UTs</option>
                  {availableStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Group */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <label htmlFor="dir-category-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                  Group:
                </label>
                <select
                  id="dir-category-select"
                  value={categoryFilter}
                  onChange={(e) => handleCategoryChange(e.target.value)}
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
                  <option value="Farmers">Farmers &amp; Agri Workers</option>
                  <option value="Students">Students &amp; Scholars</option>
                  <option value="Youth">Youth &amp; Unemployed</option>
                </select>
              </div>

              {/* Sort Dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <label htmlFor="dir-sort-select" style={{ fontSize: 12, fontWeight: 600, color: INK_MUTED }}>
                  Sort:
                </label>
                <select
                  id="dir-sort-select"
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
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
      </div>

      {/* ========================================================================= */}
      {/* 4. RESULTS STATS & TOP PAGINATION INDICATOR                                */}
      {/* ========================================================================= */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          padding: "0 4px",
        }}
      >
        <div style={{ fontSize: 13.5, color: INK_MUTED, fontFamily: sans }}>
          Showing{" "}
          <strong style={{ color: INK }}>
            {filteredMatches.length > 0 ? (safeCurrentPage - 1) * pageSize + 1 : 0}
          </strong>
          –
          <strong style={{ color: INK }}>
            {Math.min(safeCurrentPage * pageSize, filteredMatches.length)}
          </strong>{" "}
          of <strong style={{ color: INK }}>{filteredMatches.length}</strong> matching schemes{" "}
          <span style={{ color: INK_LIGHT }}>(Page {safeCurrentPage} of {totalPages})</span>
        </div>

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                fontSize: 12,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage <= 1 ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage <= 1 ? "#94A3B8" : INK,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 8px",
                fontSize: 12,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage >= totalPages ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage >= totalPages ? "#94A3B8" : INK,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 5. SCHEME DIRECTORY LIST                                                  */}
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
              Try clearing your search keyword, resetting level, or switching the target group to "All Groups".
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTierFilter("all");
                setLevelFilter("all");
                setStateFilter("all");
                setCategoryFilter("all");
                setCurrentPage(1);
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
              Reset All Filters
            </button>
          </div>
        ) : (
          paginatedMatches.map(({ scheme, score, reasons }, index) => {
            const isHighMatch = score >= 70;
            const isModerate = score >= 40 && score < 70;
            const isBookmarked = (bookmarks || []).some(
              (b) => (b.scheme?.id || b.schemeId) === scheme.id
            );
            const isStateScheme =
              (scheme.governmentLevel || scheme.government_level || "").toLowerCase() === "state";
            const isArtisanScheme =
              scheme.categories.includes("Artisan") ||
              scheme.name.toLowerCase().includes("vishwakarma") ||
              scheme.description.toLowerCase().includes("artisan") ||
              scheme.description.toLowerCase().includes("weaver");

            const globalIndex = (safeCurrentPage - 1) * pageSize + index + 1;

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
                {/* Meta Header: Index, Scheme Code, Level, Verified, Ministry */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontFamily: serif,
                        fontSize: 13,
                        fontWeight: 700,
                        color: SEAL,
                      }}
                    >
                      #{String(globalIndex).padStart(2, "0")}
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

                    {/* Level Badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: isStateScheme ? "#0369A1" : "#4338CA",
                        background: isStateScheme ? "#E0F2FE" : "#EEF2FF",
                        border: `1px solid ${isStateScheme ? "#BAE6FD" : "#C7D2FE"}`,
                        padding: "1px 7px",
                        borderRadius: 3,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                      }}
                    >
                      {isStateScheme ? "State Government" : "Central Scheme"}
                    </span>

                    {/* Official Verification Badge */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#065F46",
                        background: "#D1FAE5",
                        border: "1px solid #A7F3D0",
                        padding: "1px 7px",
                        borderRadius: 3,
                      }}
                    >
                      <ShieldCheck size={12} color="#059669" />
                      <span>Verified Official Source</span>
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
                        Artisan Priority
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
                  <strong style={{ color: INK }}>Financial Assistance &amp; Benefit:</strong>{" "}
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

                {/* Parameter Pills: States, Groups, Maximum Funding, Source Citation */}
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

                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11.5,
                      color: INK_LIGHT,
                      background: SURFACE_MUTED,
                      border: `1px solid ${RULE_LIGHT}`,
                      padding: "3px 8px",
                      borderRadius: 3,
                    }}
                  >
                    <Building2 size={11} color={INK_LIGHT} />
                    <span>Source: {scheme.source || "Official Ministry Portal"}</span>
                  </span>
                </div>

                {/* Reasons / Criteria Audit */}
                <div
                  style={{
                    borderTop: `1px solid ${RULE_LIGHT}`,
                    paddingTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginBottom: 16,
                  }}
                >
                  {/* Matched Criteria */}
                  {reasons.green && reasons.green.slice(0, 2).map((reason) => (
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

                  {/* Neutral / Unknown Criteria */}
                  {reasons.yellow && reasons.yellow.slice(0, 1).map((reason) => (
                    <div
                      key={reason}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 7,
                        fontSize: 12.5,
                        color: "#B45309",
                      }}
                    >
                      <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{simplifyGovtText(reason, isPlainMode, lang)}</span>
                    </div>
                  ))}

                  {/* Criteria Gaps */}
                  {reasons.red && reasons.red.length > 0 && (
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

                    <button
                      type="button"
                      onClick={() => onToggleBookmark && onToggleBookmark(scheme.id)}
                      title={isBookmarked ? "Remove from saved bookmarks" : "Save scheme to citizen profile"}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "7px 14px",
                        background: isBookmarked ? "#FEF3C7" : "#FFFFFF",
                        border: `1px solid ${isBookmarked ? "#F59E0B" : RULE}`,
                        borderRadius: 4,
                        color: isBookmarked ? "#92400E" : INK_MUTED,
                        fontFamily: sans,
                        fontSize: 12.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <Bookmark
                        size={14}
                        fill={isBookmarked ? "#F59E0B" : "none"}
                        color={isBookmarked ? "#D97706" : INK_MUTED}
                      />
                      <span>{isBookmarked ? "Saved" : "Save Scheme"}</span>
                    </button>
                  </div>

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
                      <ExternalLink size={13} color={SEAL} />
                      <span>Official Ministry Portal</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM PAGINATION CONTROLS                                             */}
      {/* ========================================================================= */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 32,
            padding: "20px 24px",
            background: CARD,
            border: `1px solid ${RULE}`,
            borderRadius: 4,
          }}
        >
          <div style={{ fontSize: 13, color: INK_MUTED, fontFamily: sans }}>
            Page <strong style={{ color: INK }}>{safeCurrentPage}</strong> of{" "}
            <strong style={{ color: INK }}>{totalPages}</strong> ({filteredMatches.length} total schemes)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {/* First Page */}
            <button
              type="button"
              onClick={() => goToPage(1)}
              disabled={safeCurrentPage <= 1}
              title="First Page"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage <= 1 ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage <= 1 ? "#94A3B8" : INK,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <ChevronsLeft size={14} />
            </button>

            {/* Prev Page */}
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                fontSize: 12.5,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage <= 1 ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage <= 1 ? "#94A3B8" : INK,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>

            {/* Page number buttons window */}
            {(() => {
              const pages = [];
              let startP = Math.max(1, safeCurrentPage - 2);
              let endP = Math.min(totalPages, startP + 4);
              if (endP - startP < 4) {
                startP = Math.max(1, endP - 4);
              }
              for (let p = startP; p <= endP; p++) {
                const isActive = p === safeCurrentPage;
                pages.push(
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      padding: "0 6px",
                      fontSize: 12.5,
                      borderRadius: 3,
                      border: `1px solid ${isActive ? SEAL : RULE}`,
                      background: isActive ? SEAL : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : INK,
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      fontFamily: sans,
                    }}
                  >
                    {p}
                  </button>
                );
              }
              return pages;
            })()}

            {/* Next Page */}
            <button
              type="button"
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 12px",
                fontSize: 12.5,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage >= totalPages ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage >= totalPages ? "#94A3B8" : INK,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>

            {/* Last Page */}
            <button
              type="button"
              onClick={() => goToPage(totalPages)}
              disabled={safeCurrentPage >= totalPages}
              title="Last Page"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 3,
                border: `1px solid ${RULE}`,
                background: safeCurrentPage >= totalPages ? "#F1F5F9" : "#FFFFFF",
                color: safeCurrentPage >= totalPages ? "#94A3B8" : INK,
                cursor: safeCurrentPage >= totalPages ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              <ChevronsRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
