import React, { useState } from "react";
import { CheckCircle2, ArrowRight, Filter, AlertTriangle, Printer } from "lucide-react";
import ScoreBadge from "../components/ScoreBadge.jsx";
import VoiceReader from "../components/VoiceReader.jsx";
import { simplifyGovtText } from "../components/JargonBuster.jsx";
import { INK, CARD, SEAL, OK, VERIFY, RULE, serif, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function Results({
  matches,
  openDetails,
  onRetakeProfile,
  onOpenCsc,
  lang = "en",
  isPlainMode = false,
}) {
  const [filter, setFilter] = useState("all");
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const filteredMatches = matches.filter((m) => {
    if (filter === "high") return m.score >= 70;
    if (filter === "moderate") return m.score >= 40 && m.score < 70;
    return true;
  });

  const topMatch = matches[0];

  const speechSummary = topMatch
    ? lang === "hi"
      ? `आपके लिए सबसे उपयुक्त योजना है: ${topMatch.scheme.name}। आपका पात्रता स्कोर ${topMatch.score} प्रतिशत है।`
      : `Your top recommended scheme is ${topMatch.scheme.name} with a ${topMatch.score} percent match score.`
    : "";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ fontFamily: serif, fontSize: 28, color: INK, margin: "0 0 4px" }}>
              {t.resultsTitle}
            </h2>
            {speechSummary && (
              <VoiceReader text={speechSummary} lang={lang} label={t.listen} />
            )}
          </div>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#6B7280", margin: "0 0 14px" }}>
            {t.resultsSubtitle}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {onOpenCsc && (
            <button
              type="button"
              onClick={onOpenCsc}
              style={{
                fontFamily: sans,
                fontSize: 12,
                padding: "6px 12px",
                border: `1px solid ${SEAL}`,
                borderRadius: 4,
                background: "#FFFFFF",
                color: INK,
                cursor: "pointer",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Printer size={13} color={SEAL} />
              <span>{t.printDossier}</span>
            </button>
          )}

          {onRetakeProfile && (
            <button
              type="button"
              onClick={onRetakeProfile}
              style={{
                fontFamily: sans,
                fontSize: 12,
                padding: "6px 12px",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                background: CARD,
                color: INK,
                cursor: "pointer",
              }}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Top Match Highlight Banner if high score exists */}
      {topMatch && topMatch.score >= 70 && (
        <div
          onClick={() => openDetails(topMatch.scheme.id)}
          style={{
            background: "#EAF3EF",
            border: `1px solid #B4D5C6`,
            borderRadius: 6,
            padding: "14px 18px",
            marginBottom: 20,
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div>
            <span
              style={{
                fontFamily: sans,
                fontSize: 11,
                fontWeight: 700,
                color: OK,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}
            >
              {t.topMatchBadge}
            </span>
            <div style={{ fontFamily: sans, fontSize: 16, fontWeight: 700, color: INK, marginTop: 2 }}>
              {topMatch.scheme.name}
            </div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: "#4A5568", marginTop: 2 }}>
              {simplifyGovtText(topMatch.reasons.green[0], isPlainMode, lang)} · {topMatch.scheme.ministry}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ScoreBadge score={topMatch.score} size="md" />
            <ArrowRight size={18} color={OK} />
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: sans, fontSize: 12, color: "#6B7280" }}>
          <Filter size={13} /> Filter:
        </span>
        {[
          { id: "all", label: `All Schemes (${matches.length})` },
          { id: "high", label: `High Match ≥70% (${matches.filter((m) => m.score >= 70).length})` },
          { id: "moderate", label: `Moderate 40–69% (${matches.filter((m) => m.score >= 40 && m.score < 70).length})` },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            style={{
              fontFamily: sans,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 4,
              border: `1px solid ${filter === f.id ? INK : RULE}`,
              background: filter === f.id ? INK : "#FFFFFF",
              color: filter === f.id ? "#FFFFFF" : INK,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div style={{ marginTop: 8 }}>
        {filteredMatches.map(({ scheme, score, reasons }, i) => (
          <div
            key={scheme.id}
            onClick={() => openDetails(scheme.id)}
            style={{
              display: "flex",
              gap: 18,
              alignItems: "center",
              padding: "18px 8px",
              borderTop: i === 0 ? `1px solid ${RULE}` : "none",
              borderBottom: `1px solid ${RULE}`,
              cursor: "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#F7F3E9")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            {/* Rank index */}
            <div
              style={{
                fontFamily: serif,
                fontSize: 16,
                color: "#B7AF97",
                width: 26,
                fontWeight: 600,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </div>

            {/* Scheme details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                {scheme.name}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12.5,
                  color: "#8A8266",
                  marginTop: 2,
                }}
              >
                {scheme.ministry}
              </div>

              {/* Reasons tags */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginTop: 6,
                  flexWrap: "wrap",
                }}
              >
                {reasons.green.slice(0, 3).map((r) => (
                  <span
                    key={r}
                    style={{
                      fontFamily: sans,
                      fontSize: 11.5,
                      color: OK,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <CheckCircle2 size={12} /> {simplifyGovtText(r, isPlainMode, lang)}
                  </span>
                ))}
                {reasons.red.length > 0 && (
                  <span
                    key={reasons.red[0]}
                    style={{
                      fontFamily: sans,
                      fontSize: 11.5,
                      color: VERIFY,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <AlertTriangle size={12} /> {simplifyGovtText(reasons.red[0], isPlainMode, lang)}
                  </span>
                )}
              </div>
            </div>

            {/* Score */}
            <ScoreBadge score={score} />

            {/* Arrow */}
            <ArrowRight size={18} color="#B7AF97" />
          </div>
        ))}

        {filteredMatches.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#6B7280", fontFamily: sans, fontSize: 14 }}>
            No schemes found under this filter criterion.
          </div>
        )}
      </div>
    </div>
  );
}
