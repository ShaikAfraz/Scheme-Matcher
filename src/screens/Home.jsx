import React, { useState } from "react";
import {
  ArrowRight,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Info,
  Building2,
  Users,
  BadgePercent,
  Compass,
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
  SEAL_LIGHT,
  OK,
  OK_BG,
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
      ? "योजना मैचर में आपका स्वागत है। यह भारतीय नागरिकों और छोटे उद्यमियों के लिए एक पारदर्शी, नियम-आधारित सरकारी योजना खोज मंच है। अपनी पात्रता जांचने के लिए चेक माय एलिजिबिलिटी पर क्लिक करें।"
      : "Welcome to Scheme Matcher. Find the government welfare and credit support your work deserves. Our deterministic engine matches your profile directly against official Ministry guidelines.";

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (setScreen) {
      setScreen("results");
    }
  };

  return (
    <div style={{ width: "100%", color: INK }}>
      {/* ========================================================================= */}
      {/* 1. HERO SECTION: EDITORIAL SPLIT LAYOUT                                    */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(24px, 4vw, 56px) 0 clamp(36px, 5vw, 64px) 0",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "clamp(32px, 5vw, 64px)",
            alignItems: "center",
          }}
        >
          {/* Left Column: Editorial Headline & Actions */}
          <div style={{ maxWidth: 580 }}>
            {/* Tagline / Civic badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                background: SEAL_LIGHT,
                border: `1px solid ${RULE}`,
                borderRadius: 3,
                color: SEAL,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: SEAL,
                }}
              />
              <span>Civic Welfare &amp; Enterprise Discovery</span>
            </div>

            {/* Main Editorial Headline */}
            <h1
              style={{
                fontFamily: serif,
                fontSize: "clamp(32px, 4.4vw, 50px)",
                fontWeight: 700,
                lineHeight: 1.15,
                color: INK,
                margin: "0 0 20px 0",
                letterSpacing: "-0.01em",
              }}
            >
              Find the support your work deserves.
            </h1>

            {/* Sub-headline explanation */}
            <p
              style={{
                fontFamily: sans,
                fontSize: "clamp(15px, 1.8vw, 17px)",
                lineHeight: 1.65,
                color: INK_MUTED,
                margin: "0 0 28px 0",
              }}
            >
              Government welfare and subsidized loan programs shouldn't require
              intermediaries or bureaucratic deciphering. Scheme Matcher evaluates
              your age, trade, social category, and income against 19 codified central
              welfare programs — with 100% deterministic transparency.
            </p>

            {/* Primary CTA & Secondary Links */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
                marginBottom: 24,
              }}
            >
              <button
                type="button"
                onClick={() => setScreen("profile")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "13px 26px",
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: SEAL,
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "background-color 0.15s ease",
                  boxShadow: "0 2px 4px rgba(180, 83, 9, 0.2)",
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = SEAL_HOVER)}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = SEAL)}
              >
                <span>Check My Eligibility</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => setScreen("results")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 18px",
                  fontFamily: sans,
                  fontSize: 14.5,
                  fontWeight: 600,
                  color: INK,
                  background: "transparent",
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = INK;
                  e.currentTarget.style.backgroundColor = CARD;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = RULE;
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <span>Explore All 19 Schemes</span>
                <ArrowRight size={14} color={SEAL} />
              </button>
            </div>

            {/* Reassurance Micro-copy & Read Aloud */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
                fontSize: 12.5,
                color: INK_LIGHT,
                borderTop: `1px solid ${RULE_LIGHT}`,
                paddingTop: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} color={OK} />
                <span>Deterministic rules · No Aadhaar/PAN required</span>
              </div>
              <VoiceReader text={introSpeech} lang={lang} label={t.readAloudBtn} />
            </div>
          </div>

          {/* Right Column: Hero Artisan Photograph */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                position: "relative",
                borderRadius: 4,
                overflow: "hidden",
                border: `1px solid ${RULE}`,
                boxShadow: "0 4px 20px rgba(18, 25, 38, 0.08)",
                background: SURFACE_MUTED,
              }}
            >
              <img
                src="/images/scheme-matcher-hero.png"
                alt="Traditional Indian artisan handloom weaver at work in a rural workshop with handwoven textiles in warm daylight"
                loading="eager"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "cover",
                  maxHeight: 460,
                }}
              />
              <div
                style={{
                  background: "linear-gradient(180deg, transparent 60%, rgba(18, 25, 38, 0.85) 100%)",
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 16,
                  right: 16,
                  color: "#FFFFFF",
                  fontSize: 12,
                  lineHeight: 1.4,
                  fontFamily: sans,
                }}
              >
                <strong style={{ color: "#FDE68A" }}>Grassroots Artisans &amp; Craftspersons:</strong>{" "}
                Prioritized under PM Vishwakarma and National Backward Classes Finance &amp; Development Corporation guidelines.
              </div>
            </div>

            {/* Caption under photo */}
            <div
              style={{
                marginTop: 10,
                fontSize: 11.5,
                color: INK_LIGHT,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Field Photography · Traditional Textile Weavers</span>
              <span style={{ fontStyle: "italic" }}>Documentation for Civic Welfare Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. THE PROBLEM WE SOLVE: ASYMMETRICAL EDITORIAL TWO-COLUMN                */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(40px, 5vw, 64px) 0",
          borderBottom: `1px solid ${RULE}`,
          background: CARD,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "clamp(28px, 4vw, 56px)",
            alignItems: "baseline",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: sans,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: SEAL,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              The Information Gap
            </div>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(24px, 3.2vw, 36px)",
                lineHeight: 1.25,
                color: INK,
                margin: 0,
                fontWeight: 700,
              }}
            >
              Public schemes exist for every marginalized trade, yet millions remain unaware.
            </h2>
          </div>

          <div style={{ fontFamily: sans, fontSize: 15, lineHeight: 1.7, color: INK_MUTED }}>
            <p style={{ margin: "0 0 16px 0" }}>
              India has over ₹25,000 crores in specialized affirmative credit and welfare
              programs codified across central ministries. However, eligibility criteria
              are buried across hundreds of pages of disjointed gazette notifications,
              making it nearly impossible for a solo artisan or street vendor to know where they qualify.
            </p>
            <p style={{ margin: 0 }}>
              <strong style={{ color: INK }}>Scheme Matcher bridges this divide.</strong> By
              transforming statutory criteria into verifiable decision parameters, our platform
              allows citizens to instantly check eligibility, identify required documents, and
              apply directly through authorized state channels.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. WIDE IMPACT BANNER WITH PHOTOGRAPHIC TEXTURED BACKGROUND                */}
      {/* ========================================================================= */}
      <section
        style={{
          position: "relative",
          backgroundImage: `linear-gradient(rgba(18, 25, 38, 0.90), rgba(18, 25, 38, 0.94)), url('/govt_portal_bg.jpg')`,
          backgroundSize: "cover",
          backgroundPosition: "center 25%",
          backgroundAttachment: "scroll",
          color: "#FFFFFF",
          padding: "clamp(48px, 6vw, 72px) 0",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
          }}
        >
          <div style={{ maxWidth: 700, marginBottom: 40 }}>
            <div
              style={{
                color: "#FDE68A",
                fontFamily: sans,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Audited Database &amp; Decision System
            </div>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(26px, 3.5vw, 40px)",
                lineHeight: 1.2,
                fontWeight: 700,
                color: "#FFFFFF",
                margin: "0 0 12px 0",
              }}
            >
              Grounding technology in verifiable civic criteria
            </h2>
            <p style={{ fontSize: 15, color: "#CBD5E1", lineHeight: 1.6, margin: 0 }}>
              Unlike generic AI platforms that hallucinate schemes or invent approvals,
              Scheme Matcher operates strictly against a curated SQLite database of official
              program guidelines.
            </p>
          </div>

          {/* 4 Pillars Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                stat: "19",
                label: "Codified Schemes",
                desc: "Active welfare programs with fully audited rules across MSJE, MSME, and MoHUA.",
              },
              {
                stat: "6",
                label: "Validation Parameters",
                desc: "Age limits, social categories, income ceilings, enterprise type, and credit requirement.",
              },
              {
                stat: "100%",
                label: "Deterministic Matching",
                desc: "Mathematical rule evaluation. Transparent scoring explains exactly why you qualify.",
              },
              {
                stat: "0",
                label: "Middlemen & Commissions",
                desc: "Direct referrals to official government portals (myScheme, DBT Bharat, Udyam).",
              },
            ].map((pillar) => (
              <div
                key={pillar.label}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 4,
                  padding: "20px 22px",
                }}
              >
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 34,
                    fontWeight: 700,
                    color: "#FDE68A",
                    lineHeight: 1,
                    marginBottom: 8,
                  }}
                >
                  {pillar.stat}
                </div>
                <div
                  style={{
                    fontFamily: sans,
                    fontSize: 14.5,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    marginBottom: 6,
                  }}
                >
                  {pillar.label}
                </div>
                <div style={{ fontSize: 12.5, color: "#94A3B8", lineHeight: 1.5 }}>
                  {pillar.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHO WE SERVE: ARTISANS, MARGINALIZED ENTERPRISES & BENEFICIARIES      */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 36,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: sans,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.8,
                  color: SEAL,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Tailored Affirmative Categories
              </div>
              <h2
                style={{
                  fontFamily: serif,
                  fontSize: "clamp(24px, 3vw, 34px)",
                  fontWeight: 700,
                  color: INK,
                  margin: 0,
                }}
              >
                Supporting India's diverse workforce
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setScreen("results")}
              style={{
                background: "transparent",
                border: "none",
                color: SEAL,
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: 0,
              }}
            >
              <span>View all target categories in Directory</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {[
              {
                title: "Traditional Artisans & Craftspersons",
                tag: "PM Vishwakarma / NBCFDC",
                desc: "Weavers, blacksmiths, carpenters, potters, cobblers, and sculptors receive collateral-free credit up to ₹3 Lakh, modern toolkit grants of ₹15,000, and stipend-supported skill training.",
                schemesCount: "4 Schemes",
              },
              {
                title: "Women Micro-Entrepreneurs",
                tag: "Stand-Up India / PMEGP / Mudra",
                desc: "Preferential margin money, concessional credit guarantees, and business establishment support from ₹50,000 up to ₹1 Crore for manufacturing and service ventures.",
                schemesCount: "5 Schemes",
              },
              {
                title: "Scheduled Castes & Tribes (SC / ST)",
                tag: "NSFDC / NSTFDC Programs",
                desc: "Concessional term loans up to 90% project cost, interest subsidies under Credit Enhancement, and targeted venture capital funds for first-generation founders.",
                schemesCount: "6 Schemes",
              },
              {
                title: "Sanitation Workers & Safai Karamcharis",
                tag: "NSKFDC / NAMASTE",
                desc: "100% mechanization grants for sewer sanitation machinery, alternative livelihood capital, and education loans for children of sanitation workers.",
                schemesCount: "3 Schemes",
              },
              {
                title: "Persons with Disabilities (Divyangjan)",
                tag: "NHFDC Loan Schemes",
                desc: "Accessible commercial credit at subsidized interest rates (4–8% p.a.), assistive equipment grants, and specialized training grants for self-employment.",
                schemesCount: "2 Schemes",
              },
              {
                title: "Nomadic & De-Notified Tribes (DNT)",
                tag: "SEED Scheme",
                desc: "Health insurance through PM-JAY, livelihood loan assistance through corporations, and housing assistance for nomadic communities without land records.",
                schemesCount: "2 Schemes",
              },
            ].map((cat) => (
              <div
                key={cat.title}
                style={{
                  background: CARD,
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  padding: "22px 24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.15s ease",
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
                      marginBottom: 12,
                      letterSpacing: 0.3,
                    }}
                  >
                    {cat.tag}
                  </div>
                  <h3
                    style={{
                      fontFamily: serif,
                      fontSize: 18,
                      fontWeight: 700,
                      color: INK,
                      margin: "0 0 10px 0",
                      lineHeight: 1.3,
                    }}
                  >
                    {cat.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: sans,
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: INK_MUTED,
                      margin: 0,
                    }}
                  >
                    {cat.desc}
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: `1px solid ${RULE_LIGHT}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span style={{ color: INK_LIGHT }}>{cat.schemesCount} Active</span>
                  <button
                    type="button"
                    onClick={() => setScreen("results")}
                    style={{
                      background: "none",
                      border: "none",
                      color: SEAL,
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  >
                    Explore →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HOW IT WORKS: THREE STEPS TO CITIZEN SUPPORT                           */}
      {/* ========================================================================= */}
      <section
        id="how-it-works"
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          borderBottom: `1px solid ${RULE}`,
          background: CARD,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
          }}
        >
          <div style={{ maxWidth: 640, marginBottom: 40 }}>
            <div
              style={{
                fontFamily: sans,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.8,
                color: SEAL,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Transparent Workflow
            </div>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(24px, 3.2vw, 34px)",
                fontWeight: 700,
                color: INK,
                margin: "0 0 10px 0",
              }}
            >
              How Scheme Matcher works in three steps
            </h2>
            <p style={{ fontFamily: sans, fontSize: 14.5, color: INK_MUTED, margin: 0, lineHeight: 1.6 }}>
              No fees, no private agent commissions, and no sensitive data storage.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 32,
            }}
          >
            {[
              {
                num: "01",
                title: "Complete the 3-Minute Questionnaire",
                desc: "Answer structured questions regarding age, domicile state, trade or craft, social reservation category, and estimated financial capital required.",
                detail: "No login or confidential identifiers (Aadhaar/PAN) required to check initial compatibility.",
              },
              {
                num: "02",
                title: "Review Algorithmic Compatibility",
                desc: "The deterministic rule engine evaluates your parameters against statutory guidelines, breaking down fulfilled rules, subsidy ceilings, and unmet prerequisites.",
                detail: "Full auditability: See exactly why a scheme was ranked first or why a cap applies.",
              },
              {
                num: "03",
                title: "Assemble Documents & Apply Officially",
                desc: "Access the exact checklist of certificates required by district verification officers and follow verified direct links to official Ministry portals to submit.",
                detail: "Download an official Beneficiary Summary Slip to take to your local Common Service Centre.",
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  position: "relative",
                  borderLeft: `2px solid ${SEAL}`,
                  paddingLeft: 22,
                }}
              >
                <div
                  style={{
                    fontFamily: serif,
                    fontSize: 20,
                    fontWeight: 700,
                    color: SEAL,
                    marginBottom: 8,
                  }}
                >
                  Step {step.num}
                </div>
                <h3
                  style={{
                    fontFamily: sans,
                    fontSize: 16.5,
                    fontWeight: 700,
                    color: INK,
                    margin: "0 0 10px 0",
                    lineHeight: 1.3,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: sans,
                    fontSize: 13.5,
                    color: INK_MUTED,
                    lineHeight: 1.6,
                    margin: "0 0 12px 0",
                  }}
                >
                  {step.desc}
                </p>
                <div
                  style={{
                    fontSize: 12,
                    color: INK_LIGHT,
                    lineHeight: 1.5,
                    background: SURFACE_MUTED,
                    padding: "8px 12px",
                    borderRadius: 3,
                  }}
                >
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SEARCH BAR: ORGANIC INLINE DIRECTORY EXPLORATION                       */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(36px, 5vw, 56px) 0",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: 880,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: serif,
              fontSize: "clamp(22px, 2.8vw, 30px)",
              fontWeight: 700,
              color: INK,
              margin: "0 0 10px 0",
            }}
          >
            Looking for a specific welfare program or craft?
          </h2>
          <p
            style={{
              fontFamily: sans,
              fontSize: 14,
              color: INK_MUTED,
              margin: "0 auto 24px auto",
              maxWidth: 600,
            }}
          >
            Search by trade (artisan, handloom, street vendor), ministry, loan limit, or scheme code.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Vishwakarma, Mudra, Stand-Up India, Weavers, Street Vendors..."
              style={{
                flex: "1 1 340px",
                maxWidth: 520,
                padding: "12px 16px",
                fontFamily: sans,
                fontSize: 14.5,
                color: INK,
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                outline: "none",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "12px 24px",
                fontFamily: sans,
                fontSize: 14.5,
                fontWeight: 600,
                color: "#FFFFFF",
                background: INK,
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Search size={16} />
              <span>Search Schemes</span>
            </button>
          </form>

          <div
            style={{
              fontSize: 12,
              color: INK_LIGHT,
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <span>Popular searches:</span>
            {["Artisans & Craftspersons", "Women Entrepreneurs", "Sanitation Equipment", "Street Vendors"].map(
              (tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setScreen("results")}
                  style={{
                    background: "none",
                    border: "none",
                    color: SEAL,
                    padding: 0,
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                >
                  {tag}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. TRANSPARENCY & STATUTORY DISCLAIMER                                   */}
      {/* ========================================================================= */}
      <section style={{ padding: "32px 0 48px 0" }}>
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
          }}
        >
          <div
            style={{
              background: CARD,
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "18px 22px",
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <Info size={20} color={SEAL} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontFamily: sans, fontSize: 13, color: INK_MUTED, lineHeight: 1.65 }}>
              <strong style={{ color: INK }}>Public Notice &amp; Academic Scope:</strong> Scheme Matcher is
              an independent civic-technology project developed for academic research and public welfare awareness
              (Final Year BCA AI/ML Capstone). It is not operated or formally sponsored by any government department.
              Match scores represent algorithmic compatibility with published Ministry gazettes. Final application,
              due diligence, and fund disbursement remain strictly under the jurisdiction of authorized district authorities
              and designated public sector banks.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
