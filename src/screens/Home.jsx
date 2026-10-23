import React, { useState } from "react";
import {
  Landmark,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Search,
  SlidersHorizontal,
  FileText,
  Building2,
  Sparkles,
  Info,
  ExternalLink,
} from "lucide-react";
import VoiceReader from "../components/VoiceReader.jsx";
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
  VERIFY,
  RULE,
  RULE_LIGHT,
  serif,
  sans,
} from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";
import { SCHEMES } from "../data/schemes.js";

export default function Home({ setScreen, onOpenCsc, lang = "en" }) {
  const [searchQuery, setSearchQuery] = useState("");
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const introSpeech =
    lang === "hi"
      ? "योजना मैचर में आपका स्वागत है। यह पारदर्शी, नियम-आधारित सरकारी योजना खोज मंच है, जो पात्र नागरिकों को सामाजिक न्याय और अधिकारिता मंत्रालय एवं अन्य केंद्रीय मंत्रालयों की कल्याणकारी योजनाओं से जोड़ता है।"
      : "Welcome to Scheme Matcher, an algorithmic eligibility discovery platform connecting citizens and micro-entrepreneurs to official welfare schemes under the Ministry of Social Justice and Empowerment.";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (setScreen) {
      setScreen("results");
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* 1. Official Civic Identity Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          color: SEAL,
          marginBottom: 12,
        }}
      >
        <Landmark size={18} strokeWidth={2.2} />
        <span
          style={{
            fontFamily: sans,
            fontSize: 12.5,
            letterSpacing: 0.8,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Government Scheme Discovery &amp; Eligibility Platform
        </span>
      </div>

      {/* 2. Hero Heading & Audio Read-Aloud */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <h1
          style={{
            fontFamily: serif,
            fontSize: "clamp(26px, 3.8vw, 38px)",
            lineHeight: 1.25,
            color: INK,
            margin: 0,
            fontWeight: 700,
            maxWidth: 720,
          }}
        >
          Discover Government Schemes Tailored to Your Profile
        </h1>
        <VoiceReader text={introSpeech} lang={lang} label={t.readAloudBtn} />
      </div>

      {/* 3. Value Proposition & System Description */}
      <p
        style={{
          fontFamily: sans,
          fontSize: 15.5,
          lineHeight: 1.65,
          color: INK_MUTED,
          maxWidth: 720,
          margin: "0 0 24px 0",
        }}
      >
        Scheme Matcher evaluates your demographic, social category, annual income, and enterprise requirements against codified criteria from the Ministry of Social Justice &amp; Empowerment (MoSJE) and partner central ministries. All matching is strictly deterministic with zero simulated data.
      </p>

      {/* 4. Primary & Secondary Actions */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <button
          type="button"
          onClick={() => setScreen("profile")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 24px",
            fontFamily: sans,
            fontSize: 14.5,
            fontWeight: 600,
            color: "#FFFFFF",
            background: SEAL,
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(163, 86, 25, 0.2)",
            transition: "background-color 0.15s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = SEAL_HOVER)}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SEAL)}
        >
          <span>Check My Eligibility</span>
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => setScreen("results")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 20px",
            background: CARD,
            border: `1px solid ${RULE}`,
            color: INK,
            borderRadius: 4,
            fontFamily: sans,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = INK)}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = RULE)}
        >
          <SlidersHorizontal size={15} color={SEAL} />
          <span>Explore All 19 Schemes</span>
        </button>

        <a
          href="#how-it-works"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "11px 16px",
            color: INK_MUTED,
            fontFamily: sans,
            fontSize: 13.5,
            fontWeight: 500,
            textDecoration: "none",
            borderRadius: 4,
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = INK)}
          onMouseOut={(e) => (e.currentTarget.style.color = INK_MUTED)}
        >
          <span>How It Works</span>
          <span style={{ fontSize: 16 }}>↓</span>
        </a>
      </div>

      {/* 5. Prominent Scheme Search Box */}
      <div
        style={{
          background: CARD,
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "18px 20px",
          marginBottom: 36,
          boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
        }}
      >
        <div style={{ marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label
            htmlFor="home-scheme-search"
            style={{
              fontFamily: sans,
              fontSize: 13,
              fontWeight: 700,
              color: INK,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Search size={15} color={SEAL} />
            <span>Search Central &amp; State Welfare Schemes by Keyword:</span>
          </label>
          <span style={{ fontSize: 11.5, color: INK_LIGHT, fontWeight: 500 }}>
            Includes PM Vishwakarma, Stand-Up India, PMEGP, SMILE, SEED
          </span>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id="home-scheme-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by trade (artisan, sanitation), ministry, subsidy, or scheme name..."
            style={{
              flex: 1,
              minWidth: 260,
              padding: "10px 14px",
              fontFamily: sans,
              fontSize: 14,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              outline: "none",
              color: INK,
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              background: INK,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>Search Directory</span>
            <ArrowRight size={14} />
          </button>
        </form>
      </div>

      {/* 6. Accurate, Database-Backed Statistics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 44,
        }}
      >
        {[
          {
            stat: "19",
            label: "Codified Schemes",
            detail: "Active Ministry programs with verified eligibility rules",
          },
          {
            stat: "6",
            label: "Verification Parameters",
            detail: "Age, category, income, state, enterprise, and loan requirement",
          },
          {
            stat: "100%",
            label: "Deterministic Logic",
            detail: "Calculated rule engine without fabricated predictions",
          },
          {
            stat: "5",
            label: "Approval Stages",
            detail: "Transparent application lifecycle from e-KYC to DBT credit",
          },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontFamily: serif,
                fontSize: 26,
                fontWeight: 700,
                color: SEAL,
                lineHeight: 1.1,
                marginBottom: 4,
              }}
            >
              {item.stat}
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 700,
                color: INK,
                marginBottom: 4,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 11.5,
                color: INK_MUTED,
                lineHeight: 1.45,
              }}
            >
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      {/* 7. How It Works: Three Simple Steps */}
      <section id="how-it-works" style={{ marginBottom: 44 }}>
        <div style={{ marginBottom: 18 }}>
          <h2
            style={{
              fontFamily: serif,
              fontSize: 22,
              color: INK,
              margin: "0 0 6px 0",
              fontWeight: 700,
            }}
          >
            How Scheme Matcher Works
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: INK_MUTED, margin: 0 }}>
            Three straightforward steps to identify and prepare for government financial assistance.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {[
            {
              step: "01",
              title: "Enter Your Profile",
              desc: "Provide basic parameters: age, state of domicile, social category (SC, ST, OBC, Divyangjan, Artisan), annual income, and funding requirement.",
            },
            {
              step: "02",
              title: "Review Matching Schemes",
              desc: "The rule engine tests your data against codified guidelines, highlighting fulfilled requirements, percentage subsidies, and any disqualifying limits.",
            },
            {
              step: "03",
              title: "Prepare Required Documents",
              desc: "Access the definitive checklist of certificates needed for official submission and generate a standardized beneficiary dossier summary.",
            },
          ].map((item) => (
            <div
              key={item.step}
              style={{
                background: CARD,
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "18px 20px",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 13,
                  fontWeight: 700,
                  color: SEAL,
                  marginBottom: 8,
                  letterSpacing: 0.5,
                }}
              >
                STEP {item.step}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 8,
                }}
              >
                {item.title}
              </div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 13,
                  color: INK_MUTED,
                  lineHeight: 1.55,
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8. Target Affirmative Action & Beneficiary Groups */}
      <section style={{ marginBottom: 36 }}>
        <div
          style={{
            background: SURFACE_MUTED,
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: "16px 20px",
          }}
        >
          <div
            style={{
              fontFamily: sans,
              fontSize: 12.5,
              fontWeight: 700,
              color: INK,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 10,
            }}
          >
            Target Beneficiary Focus Groups (MoSJE &amp; Partner Ministries)
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              "Scheduled Castes (NSFDC)",
              "Scheduled Tribes (NSTFDC)",
              "Other Backward Classes (NBCFDC)",
              "Traditional Artisans (PM Vishwakarma)",
              "Safai Karamcharis (NSKFDC)",
              "Persons with Disabilities (NHFDC)",
              "Transgender Individuals (SMILE)",
              "De-Notified & Nomadic Tribes (SEED)",
              "Women Entrepreneurs (WEP / Stand-Up)",
              "Urban Street Vendors (PM SVANidhi)",
            ].map((group) => (
              <span
                key={group}
                style={{
                  fontFamily: sans,
                  fontSize: 12,
                  color: INK,
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  padding: "4px 10px",
                  borderRadius: 3,
                  fontWeight: 500,
                }}
              >
                {group}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Official Informational Disclaimer */}
      <div
        style={{
          borderLeft: `3px solid ${SEAL}`,
          background: "#FFFFFF",
          padding: "14px 18px",
          borderRadius: "0 4px 4px 0",
          borderTop: `1px solid ${RULE_LIGHT}`,
          borderRight: `1px solid ${RULE_LIGHT}`,
          borderBottom: `1px solid ${RULE_LIGHT}`,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Info size={18} color={SEAL} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontFamily: sans, fontSize: 12.5, color: INK_MUTED, lineHeight: 1.6 }}>
          <strong style={{ color: INK }}>Official Advisory:</strong> Scheme Matcher is an automated decision-support and educational tool designed for academic demonstration and public welfare guidance. Eligibility match scores indicate algorithmic alignment with published Ministry guidelines. Final approval, certificate verification, and financial sanction are determined solely by the respective district implementing authorities and commercial banks upon formal application through official government portals.
        </div>
      </div>
    </div>
  );
}
