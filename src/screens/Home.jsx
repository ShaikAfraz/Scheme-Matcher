import React from "react";
import { Landmark, ArrowRight, ShieldCheck, Cpu, Sparkles, CheckCircle2, HeartHandshake, PhoneCall } from "lucide-react";
import VoiceReader from "../components/VoiceReader.jsx";
import { INK, SEAL, RULE, serif, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function Home({ setScreen, onOpenCsc, lang = "en" }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const introSpeech =
    lang === "hi"
      ? "एआई योजना साथी में आपका स्वागत है। यह सामाजिक न्याय और अधिकारिता मंत्रालय का आधिकारिक मंच है, जो अनुसूचित जाति, अनुसूचित जनजाति, पिछड़ा वर्ग, सफाई कर्मचारियों, दिव्यांगजनों और महिला उद्यमियों को सीधे सरकारी योजनाओं से जोड़ता है।"
      : "Welcome to AI Scheme Matcher, an initiative for the Ministry of Social Justice & Empowerment, providing transparent, explainable government scheme matching for India's marginalized entrepreneurs.";

  return (
    <div>
      {/* Official MoSJE Tagline */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, color: SEAL, marginBottom: 14 }}>
        <Landmark size={18} />
        <span style={{ fontFamily: sans, fontSize: 13, letterSpacing: 0.5, fontWeight: 700 }}>
          {t.homeHeroBadge}
        </span>
      </div>

      {/* Hero Heading & Audio Read-aloud */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(28px, 4vw, 42px)",
            lineHeight: 1.2,
            color: INK,
            margin: 0,
            fontWeight: 700,
            maxWidth: 680,
          }}
        >
          {t.homeHeroTitle}
        </h1>
        <VoiceReader text={introSpeech} lang={lang} label={t.readAloudBtn} />
      </div>

      {/* Problem Statement & Mission */}
      <p
        style={{
          fontFamily: sans,
          fontSize: 15.5,
          lineHeight: 1.6,
          color: "#454B58",
          maxWidth: 680,
          marginBottom: 10,
        }}
      >
        {t.homeHeroSubtitle}
      </p>

      <p
        style={{
          fontFamily: sans,
          fontSize: 13.5,
          color: "#8A8266",
          marginBottom: 32,
          fontStyle: "italic",
        }}
      >
        No middlemen, no bribery, no confusing legal jargon. Directly transparent government benefits with bank loan guarantees.
      </p>

      {/* CTA Button & Helplines */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 24 }}>
        <button
          onClick={() => setScreen("profile")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 28px",
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 600,
            color: "#FFFFFF",
            background: SEAL,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(181, 101, 29, 0.25)",
            transition: "all 0.15s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = "0.92")}
          onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <span>{t.findSchemesBtn}</span>
          <ArrowRight size={17} />
        </button>

        {/* Track Application Progress Button */}
        <button
          type="button"
          onClick={() => setScreen("tracker")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 22px",
            background: "#1E3A8A",
            border: "none",
            color: "#FFFFFF",
            borderRadius: 4,
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 2px 6px rgba(30, 58, 138, 0.25)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#172554")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#1E3A8A")}
        >
          <Sparkles size={16} color="#FBBF24" />
          <span>Track Applied Schemes Live</span>
        </button>

        <button
          type="button"
          onClick={() => setScreen("login")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 20px",
            background: "#FFFFFF",
            border: `1.5px solid ${SEAL}`,
            color: INK,
            borderRadius: 4,
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: "0 1px 3px rgba(35, 50, 74, 0.05)",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#FAF6EF")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#FFFFFF")}
        >
          <span>⚡ Citizen Login / Demo</span>
        </button>

        {onOpenCsc && (
          <button
            type="button"
            onClick={onOpenCsc}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "12px 18px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              color: INK,
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <PhoneCall size={14} color={SEAL} />
            <span>{t.helpline}</span>
          </button>
        )}
      </div>

      {/* QUICK APPLICATION STATUS SEARCH BOX */}
      <div
        style={{
          background: "#F8F5EE",
          border: `1px solid ${RULE}`,
          borderRadius: 6,
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: INK, display: "flex", alignItems: "center", gap: 6 }}>
            <span>🔍 Already Applied for a Scheme?</span>
            <span style={{ fontSize: 11, background: "#E8F5E9", color: "#2E7D32", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
              Live e-Tracking
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#606F7B", marginTop: 2 }}>
            Track your 5-stage progress (Scrutiny, Committee Review, Bank Sanction, and DBT Subsidy release).
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setScreen("tracker")}
            style={{
              padding: "9px 18px",
              background: SEAL,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Open Application Tracker</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* 3 Core Architecture Pillars */}
      <div
        style={{
          marginTop: 48,
          borderTop: `1px solid ${RULE}`,
          paddingTop: 28,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
        }}
      >
        {[
          {
            icon: ShieldCheck,
            title: "Inclusive Marginalized Profiling",
            desc: "Specific categories for Safai Karamcharis, Divyangjan, Traditional Artisans, Transgender persons, DNTs, SC/ST, and Women.",
          },
          {
            icon: Cpu,
            title: "Deterministic Rule Engine",
            desc: "Deterministic eligibility matching across 6 criteria — the AI never hallucinates or invents fake qualifications.",
          },
          {
            icon: Sparkles,
            title: "Plain Language & Audio Guidance",
            desc: "Every recommendation explained in simple, everyday words with voice read-aloud support and printable bank submission slips.",
          },
        ].map((pillar) => (
          <div key={pillar.title} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <pillar.icon size={18} color={SEAL} />
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 14,
                  fontWeight: 700,
                  color: INK,
                }}
              >
                {pillar.title}
              </div>
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 13,
                color: "#6B7280",
                lineHeight: 1.55,
              }}
            >
              {pillar.desc}
            </div>
          </div>
        ))}
      </div>

      {/* Focus Groups / Target Beneficiaries Callout */}
      <div
        style={{
          marginTop: 32,
          background: "#F5EFE3",
          border: `1px dashed ${RULE}`,
          borderRadius: 6,
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <HeartHandshake size={16} color={SEAL} />
          <span style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: INK }}>
            Target Marginalized Groups Supported (Ministry of Social Justice &amp; Empowerment):
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            "🧹 Safai Karamcharis & Sanitation Workers (NSKFDC)",
            "🦽 Persons with Disabilities / Divyangjan (NHFDC)",
            "🧵 Traditional Artisans & Craftspeople (PM Vishwakarma)",
            "⚧ Transgender Entrepreneurs (SMILE Scheme)",
            "🌾 De-Notified & Nomadic Tribes (SEED Scheme)",
            "🛖 Scheduled Castes & Scheduled Tribes (NSFDC / Stand-Up)",
            "📜 Other Backward Classes (NBCFDC)",
            "🍲 Urban Street Vendors (PM SVANidhi)",
            "👩‍🌾 Women Self-Help Groups (WEP / Mahila Samridhi)",
          ].map((tag) => (
            <span
              key={tag}
              style={{
                fontFamily: sans,
                fontSize: 12,
                color: "#374151",
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                padding: "4px 10px",
                borderRadius: 14,
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
