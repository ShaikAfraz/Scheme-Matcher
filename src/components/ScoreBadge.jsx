import React from "react";
import { OK, VERIFY, NO, serif, sans } from "../theme/tokens.js";

export default function ScoreBadge({ score, size = "md" }) {
  const color = score >= 70 ? OK : score >= 40 ? VERIFY : NO;
  const isLarge = size === "lg";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minWidth: isLarge ? 80 : 66,
        padding: isLarge ? "6px 12px" : "2px 6px",
        borderRadius: 6,
        border: isLarge ? `1.5px solid ${color}` : "none",
        background: isLarge ? `${color}0A` : "transparent",
      }}
    >
      <div
        style={{
          fontFamily: serif,
          fontSize: isLarge ? 32 : 28,
          color,
          lineHeight: 1,
          fontWeight: 700,
        }}
      >
        {score}%
      </div>
      <div
        style={{
          fontFamily: sans,
          fontSize: isLarge ? 10.5 : 10,
          color: isLarge ? color : "#8A8266",
          letterSpacing: 0.5,
          fontWeight: 700,
          marginTop: 2,
        }}
      >
        MATCH
      </div>
    </div>
  );
}
