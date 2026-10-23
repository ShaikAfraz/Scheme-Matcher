import React from "react";
import { Globe, ZoomIn, ZoomOut, Sparkles, HelpCircle, PhoneCall, Printer, ShieldCheck } from "lucide-react";
import { INK, CARD, SEAL, RULE, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function AccessibilityBar({
  lang = "en",
  setLang,
  isPlainMode,
  setIsPlainMode,
  fontScale,
  setFontScale,
  onOpenJargon,
  onOpenCsc,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleZoomIn = () => setFontScale((s) => Math.min(1.25, Number((s + 0.08).toFixed(2))));
  const handleZoomOut = () => setFontScale((s) => Math.max(0.9, Number((s - 0.08).toFixed(2))));
  const handleZoomReset = () => setFontScale(1.0);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto 12px auto",
        background: "#F7F3E9",
        border: `1px solid ${RULE}`,
        borderRadius: 6,
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        fontFamily: sans,
      }}
    >
      {/* Left: Language Selection & Flag */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Globe size={15} color={SEAL} />
        <span style={{ fontSize: 12, fontWeight: 600, color: INK }}>Language:</span>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Choose Language"
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: "3px 8px",
            fontSize: 12,
            fontFamily: sans,
            color: INK,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {Object.entries(TRANSLATIONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.flag} {v.langName}
            </option>
          ))}
        </select>
      </div>

      {/* Center: Plain Language Mode Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => setIsPlainMode(!isPlainMode)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "3px 10px",
            background: isPlainMode ? "#E8F4E8" : "#FFFFFF",
            border: `1px solid ${isPlainMode ? "#2F5D50" : RULE}`,
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            color: isPlainMode ? "#1E5E26" : "#4A5568",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Toggle simplified explanations for banking terms"
        >
          <Sparkles size={13} color={isPlainMode ? "#2F5D50" : "#8A8266"} />
          <span>{isPlainMode ? "✓ Plain Language (सरल भाषा)" : "Standard Govt Terms"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenJargon}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            fontSize: 11.5,
            color: INK,
            fontWeight: 500,
            cursor: "pointer",
          }}
          title="Open banking terms glossary"
        >
          <HelpCircle size={13} color={SEAL} />
          <span>{t.jargonBuster}</span>
        </button>
      </div>

      {/* Right: Text Size & CSC Kiosk Mode */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Font Scaling Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: "1px 4px" }}>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Decrease font size"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 11, fontWeight: 700, color: INK }}
          >
            A-
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            title="Reset font size"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 10, color: "#8A8266" }}
          >
            {Math.round(fontScale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Increase font size"
            style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 12, fontWeight: 700, color: INK }}
          >
            A+
          </button>
        </div>

        {/* CSC Sahayak & Helpline Button */}
        <button
          type="button"
          onClick={onOpenCsc}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            background: SEAL,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 4,
            fontSize: 11.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
          title="Panchayat / Common Service Centre Assisted Mode"
        >
          <ShieldCheck size={13} color="#FFFFFF" />
          <span>CSC Sahayak / Helplines</span>
        </button>
      </div>
    </div>
  );
}
