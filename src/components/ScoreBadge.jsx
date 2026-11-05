import React from "react";
import { serif, sans } from "../theme/tokens.js";
import { getRatingLabel } from "../engine/matcher.js";

export function getTierColor(rating) {
  if (rating === null || rating === undefined || rating === "Not Assessed") {
    return { text: "#64748B", bg: "#F8FAFC", border: "#CBD5E1" }; // Not Assessed (Neutral Slate)
  }
  const r = Number(rating) || 0;
  if (r >= 85) return { text: "#047857", bg: "#ECFDF5", border: "#A7F3D0" }; // Excellent Match (Emerald)
  if (r >= 70) return { text: "#15803D", bg: "#F0FDF4", border: "#BBF7D0" }; // Strong Match (Green)
  if (r >= 50) return { text: "#B45309", bg: "#FFFBEB", border: "#FDE68A" }; // Moderate Match (Amber)
  if (r >= 25) return { text: "#C2410C", bg: "#FFF7ED", border: "#FFEDD5" }; // Low Match (Orange)
  if (r >= 1) return { text: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" }; // Weak Match (Red)
  return { text: "#475569", bg: "#F8FAFC", border: "#E2E8F0" }; // No Match (Slate)
}

export default function ScoreBadge({ score, size = "md", showLabel = true }) {
  const isNotAssessed = score === null || score === undefined || score === "Not Assessed";
  const numScore = isNotAssessed ? null : (Number(score) || 0);
  const label = isNotAssessed ? "Not Assessed" : getRatingLabel(numScore);
  const colors = getTierColor(isNotAssessed ? null : numScore);
  const isLarge = size === "lg";

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: isLarge ? 96 : 82,
        padding: isLarge ? "6px 14px" : "3px 8px",
        borderRadius: 6,
        border: `1.5px solid ${colors.border}`,
        background: colors.bg,
        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
      }}
      title={isNotAssessed ? "Eligibility Not Assessed — Complete profile to calculate match rating" : `Match Rating: ${numScore}/100 (${label})`}
    >
      <div
        style={{
          fontFamily: serif,
          fontSize: isLarge ? 26 : 20,
          color: colors.text,
          lineHeight: 1.1,
          fontWeight: 700,
          letterSpacing: -0.3,
          display: "flex",
          alignItems: "baseline",
          gap: 1,
        }}
      >
        {isNotAssessed ? (
          <span style={{ fontSize: isLarge ? 20 : 16, fontWeight: 700, color: "#64748B" }}>—</span>
        ) : (
          <>
            <span>{numScore}</span>
            <span style={{ fontSize: isLarge ? 13 : 11, fontWeight: 600, color: colors.text, opacity: 0.85 }}>/100</span>
          </>
        )}
      </div>

      {showLabel && (
        <div
          style={{
            fontFamily: sans,
            fontSize: isLarge ? 10.5 : 9.5,
            color: colors.text,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginTop: 2,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
