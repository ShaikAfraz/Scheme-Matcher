import React from "react";
import {
  Globe,
  Sparkles,
  HelpCircle,
  PhoneCall,
  Info,
} from "lucide-react";
import { GOVT_NAVY, SAFFRON, RULE, INK, sans } from "../theme/tokens.js";
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
        maxWidth: 1240,
        margin: "0 auto",
        padding: "6px 0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 10,
        fontFamily: sans,
        fontSize: "12px",
        color: "#475569",
        borderBottom: `1px solid ${RULE}`,
      }}
    >
      {/* Left: Official Context Notice & Helpline */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>🇮🇳</span>
          <span style={{ fontWeight: 600, color: GOVT_NAVY }}>
            Citizen Services Portal
          </span>
          <span style={{ color: "#94A3B8" }}>|</span>
          <span style={{ color: "#64748B", fontSize: 11.5 }}>
            SIH26092 · Social Justice &amp; Empowerment
          </span>
        </div>

        <a
          href="tel:1800118008"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "#166534",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 11.5,
            background: "#F0FDF4",
            padding: "2px 8px",
            borderRadius: 4,
            border: "1px solid #BBF7D0",
          }}
          title="Toll-Free National Citizen Helpdesk (09:30 AM - 06:00 PM)"
        >
          <PhoneCall size={12} color="#166534" />
          <span>Toll-Free: 1800-11-8008</span>
        </a>
      </div>

      {/* Right: Accessibility Controls (Font Size, Language, Plain Language, Jargon) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Font Size Adjusters */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#F1F5F9",
            borderRadius: 4,
            border: `1px solid ${RULE}`,
            overflow: "hidden",
          }}
          title="Adjust Text Size for Accessibility (GIGW 2.0)"
        >
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Decrease Font Size"
            style={{
              padding: "2px 7px",
              background: "none",
              border: "none",
              borderRight: `1px solid ${RULE}`,
              fontSize: "11px",
              fontWeight: 700,
              color: INK,
              cursor: "pointer",
            }}
          >
            A-
          </button>
          <button
            type="button"
            onClick={handleZoomReset}
            aria-label="Reset Font Size"
            style={{
              padding: "2px 7px",
              background: fontScale === 1.0 ? "#FFFFFF" : "none",
              border: "none",
              borderRight: `1px solid ${RULE}`,
              fontSize: "11.5px",
              fontWeight: 700,
              color: fontScale === 1.0 ? GOVT_NAVY : INK,
              cursor: "pointer",
            }}
          >
            A
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Increase Font Size"
            style={{
              padding: "2px 7px",
              background: "none",
              border: "none",
              fontSize: "12px",
              fontWeight: 700,
              color: INK,
              cursor: "pointer",
            }}
          >
            A+
          </button>
        </div>

        {/* Language Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Globe size={13} color={SAFFRON} />
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label="Choose Language"
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "3px 6px",
              fontSize: "11.5px",
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

        {/* Plain Language Toggle */}
        <button
          type="button"
          onClick={() => setIsPlainMode(!isPlainMode)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            background: isPlainMode ? "#ECFDF5" : "#FFFFFF",
            border: `1px solid ${isPlainMode ? "#10B981" : RULE}`,
            borderRadius: 4,
            fontSize: "11.5px",
            fontWeight: 600,
            color: isPlainMode ? "#047857" : "#475569",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title="Toggle simplified explanations for banking & legal terms"
        >
          <Sparkles size={12} color={isPlainMode ? "#047857" : "#64748B"} />
          <span>{isPlainMode ? "✓ सरल भाषा" : "सरल भाषा"}</span>
        </button>

        {/* Jargon Buster */}
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
            fontSize: "11.5px",
            fontWeight: 600,
            color: "#475569",
            cursor: "pointer",
          }}
          title="Open Dictionary of Government Schemes & Banking Terms"
        >
          <HelpCircle size={12} color={SAFFRON} />
          <span>Jargon Buster</span>
        </button>

        {/* CSC Sahayak Mode */}
        <button
          type="button"
          onClick={onOpenCsc}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 8px",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 4,
            fontSize: "11.5px",
            fontWeight: 600,
            color: GOVT_NAVY,
            cursor: "pointer",
          }}
          title="Open CSC / Sahayak Assisted Kiosk Mode"
        >
          <span>CSC Kiosk</span>
        </button>
      </div>
    </div>
  );
}
