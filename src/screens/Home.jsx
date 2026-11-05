import React, { useState, useMemo } from "react";
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
  FileCheck2,
  Clock,
  FolderUp,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  IndianRupee,
  BookOpen,
} from "lucide-react";
import VoiceReader from "../components/VoiceReader.jsx";
import {
  GOVT_NAVY,
  GOVT_NAVY_DARK,
  GOVT_NAVY_LIGHT,
  SAFFRON,
  SAFFRON_HOVER,
  SAFFRON_LIGHT,
  INK,
  INK_MUTED,
  INK_LIGHT,
  PAPER,
  CARD,
  SURFACE_MUTED,
  OK,
  OK_BG,
  RULE,
  RULE_STRONG,
  serif,
  sans,
} from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";
import { SCHEMES } from "../data/schemes.js";

export default function Home({ setScreen, onOpenCsc, lang = "en", dbStatus = null }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [openFaq, setOpenFaq] = useState(0); // Accordion state for FAQ
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const totalSchemesCount = dbStatus?.counts?.schemes || SCHEMES.length;

  // Real search suggestions from verified schemes
  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length < 2) return [];
    const q = searchQuery.toLowerCase().trim();
    return SCHEMES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.ministry.toLowerCase().includes(q) ||
        (s.category && s.category.toLowerCase().includes(q)) ||
        (s.description && s.description.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (setScreen) {
      setScreen("results");
    }
  };

  const selectSuggestion = (scheme) => {
    if (setScreen) {
      setScreen("details", "slide-forward", scheme.id);
    }
  };

  const introSpeech =
    lang === "hi"
      ? "योजना मैचर में आपका स्वागत है। यह भारतीय नागरिकों और छोटे उद्यमियों के लिए एक पारदर्शी, नियम-आधारित सरकारी योजना खोज मंच है। अपनी पात्रता जांचने के लिए चेक एलिजिबिलिटी पर क्लिक करें।"
      : "Welcome to Scheme Matcher. An independent citizen discovery portal matching Indian artisans, small business owners, and citizens to official central and state welfare programs with 100% deterministic transparency.";

  return (
    <div style={{ width: "100%", color: INK }}>
      {/* ========================================================================= */}
      {/* 1. OFFICIAL HERO BANNER SECTION (GOVERNMENT PORTAL AESTHETIC)             */}
      {/* ========================================================================= */}
      <section
        style={{
          background: `linear-gradient(180deg, #0A1F3D 0%, #0F2E5A 100%)`,
          color: "#FFFFFF",
          padding: "clamp(36px, 5vw, 64px) 0 clamp(44px, 6vw, 72px) 0",
          position: "relative",
          overflow: "hidden",
          borderBottom: "4px solid #E06714",
        }}
      >
        {/* Subtle Ashoka / Geometric Emblem Pattern Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.04,
            backgroundImage: `radial-gradient(#FFFFFF 1.5px, transparent 1.5px)`,
            backgroundSize: "24px 24px",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Top Pill: Project Status & Transparent Disclaimer */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              background: "rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: "#FEF3C7",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 6px #10B981",
              }}
            />
            <span>National Citizen Discovery Initiative · SIH26092</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "clamp(32px, 5vw, 64px)",
              alignItems: "center",
            }}
          >
            {/* Left Column: Headline, Subtitle, Search Bar & CTAs */}
            <div style={{ maxWidth: 660 }}>
              <h1
                style={{
                  fontFamily: serif,
                  fontSize: "clamp(32px, 4.2vw, 50px)",
                  fontWeight: 700,
                  lineHeight: 1.18,
                  color: "#FFFFFF",
                  margin: "0 0 16px 0",
                  letterSpacing: "-0.01em",
                }}
              >
                Discover Government Schemes You Qualify For
              </h1>

              <p
                style={{
                  fontFamily: sans,
                  fontSize: "clamp(15px, 1.8vw, 17px)",
                  lineHeight: 1.6,
                  color: "#CBD5E1",
                  margin: "0 0 28px 0",
                  fontWeight: 400,
                }}
              >
                Access welfare subsidies, credit guarantees, and business grants from {totalSchemesCount}+ verified central and state programs. Our deterministic rule engine evaluates your eligibility with 100% transparent scoring.
              </p>

              {/* Prominent Search Bar with Live Suggestions Dropdown */}
              <div style={{ position: "relative", marginBottom: 28, maxWidth: 600 }}>
                <form
                  onSubmit={handleSearchSubmit}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    background: "#FFFFFF",
                    borderRadius: 8,
                    padding: "4px",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
                    border: isSearchFocused ? `2px solid ${SAFFRON}` : "2px solid transparent",
                    transition: "border-color 0.2s ease",
                  }}
                >
                  <div style={{ padding: "0 12px", color: "#64748B", display: "flex", alignItems: "center" }}>
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                    placeholder="Search schemes by name, keyword, or ministry (e.g. PMEGP, Mudra, SC/ST, Women)..."
                    aria-label="Search government schemes"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      padding: "10px 4px",
                      fontSize: 14.5,
                      fontFamily: sans,
                      color: INK,
                    }}
                  />
                  <button
                    type="submit"
                    className="gov-btn-saffron"
                    style={{
                      padding: "10px 22px",
                      borderRadius: 6,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    <span>Search</span>
                    <ArrowRight size={15} />
                  </button>
                </form>

                {/* Live Suggestions Dropdown */}
                {isSearchFocused && searchSuggestions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      left: 0,
                      right: 0,
                      background: "#FFFFFF",
                      borderRadius: 8,
                      boxShadow: "0 12px 32px rgba(15, 23, 42, 0.2)",
                      border: `1px solid ${RULE}`,
                      overflow: "hidden",
                      zIndex: 50,
                      color: INK,
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 14px",
                        background: "#F8FAFC",
                        borderBottom: `1px solid ${RULE}`,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "#64748B",
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      Matching Official Schemes
                    </div>
                    {searchSuggestions.map((item) => (
                      <div
                        key={item.id}
                        onMouseDown={() => selectSuggestion(item)}
                        style={{
                          padding: "10px 14px",
                          borderBottom: `1px solid ${RULE}`,
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#FFFFFF")}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13.5, color: GOVT_NAVY }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: "#64748B" }}>
                            {item.ministry} · {item.level} Scheme
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: SAFFRON,
                            fontWeight: 600,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          View Criteria <ArrowRight size={12} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary & Secondary CTAs */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => setScreen("profile")}
                  className="gov-btn-saffron"
                  style={{
                    padding: "13px 26px",
                    fontSize: 15,
                    borderRadius: 6,
                  }}
                >
                  <SlidersHorizontal size={17} />
                  <span>Check Eligibility</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setScreen("results")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 22px",
                    background: "rgba(255, 255, 255, 0.1)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: 6,
                    color: "#FFFFFF",
                    fontSize: 14.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
                    e.currentTarget.style.borderColor = "#FFFFFF";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                  }}
                >
                  <FileCheck2 size={16} />
                  <span>Explore {totalSchemesCount} Schemes</span>
                </button>
              </div>

              {/* Voice Reader Reassurance */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <VoiceReader text={introSpeech} lang={lang} label={t.readAloudBtn || "Listen in vernacular"} />
                <span style={{ fontSize: 12, color: "#94A3B8" }}>
                  ✓ 100% Free &amp; Confidential · No Aadhaar/PAN required to browse
                </span>
              </div>
            </div>

            {/* Right Column: Hero Citizen Feature Showcase Card */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  background: "#FFFFFF",
                  borderRadius: 12,
                  padding: 24,
                  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: INK,
                }}
              >
                {/* Card Top Pill */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingBottom: 14,
                    borderBottom: `1px solid ${RULE}`,
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "#EFF6FF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: GOVT_NAVY,
                      }}
                    >
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: GOVT_NAVY }}>
                        Verified Program Matching
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>
                        Official Ministry Guidelines Codified
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: OK_BG,
                      color: OK,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      border: "1px solid #BBF7D0",
                    }}
                  >
                    100% Deterministic
                  </span>
                </div>

                {/* Example Assessment Metrics */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: 6,
                      padding: "10px 14px",
                      border: `1px solid ${RULE}`,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 2 }}>
                      Maximum Subsidized Assistance
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: GOVT_NAVY }}>
                      Up to ₹50 Lakh Collateral-Free
                    </div>
                    <div style={{ fontSize: 11.5, color: "#166534", marginTop: 2, fontWeight: 500 }}>
                      ✓ 15% to 35% Margin Money Capital Subsidy under PMEGP
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#F8FAFC",
                      borderRadius: 6,
                      padding: "10px 14px",
                      border: `1px solid ${RULE}`,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 2 }}>
                      Special Priority Groups
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>
                      Women, SC, ST, OBC, Artisans, Divyangjan &amp; Micro-Units
                    </div>
                    <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                      Concessional interest rates (4% to 7% p.a.) with credit guarantee
                    </div>
                  </div>
                </div>

                {/* Quick Check CTA in card */}
                <button
                  type="button"
                  onClick={() => setScreen("profile")}
                  style={{
                    width: "100%",
                    marginTop: 18,
                    padding: "10px",
                    background: GOVT_NAVY,
                    color: "#FFFFFF",
                    borderRadius: 6,
                    border: "none",
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "background 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = GOVT_NAVY_LIGHT)}
                  onMouseOut={(e) => (e.currentTarget.style.background = GOVT_NAVY)}
                >
                  <span>Start Eligibility Check (2 mins)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginTop: 48,
              paddingTop: 32,
              borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {[
              { num: `${totalSchemesCount}+`, label: "Codified Schemes", sub: "Central & 28 States" },
              { num: "100%", label: "Rule-Based Matching", sub: "Zero AI Hallucinations" },
              { num: "₹0", label: "Brokerage or Intermediary", sub: "Direct State Portals" },
              { num: "5 Stages", label: "Application Tracking", sub: "Submission to DBT" },
            ].map((metric) => (
              <div key={metric.label}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#FDE68A", fontFamily: serif }}>
                  {metric.num}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "#FFFFFF" }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: 11.5, color: "#94A3B8" }}>
                  {metric.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HOW SCHEME MATCHER WORKS IN 3 SIMPLE STEPS                             */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          background: "#FFFFFF",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px, 3.5vw, 32px)" }}>
          <div style={{ textAlign: "center", maxWidth: 700, margin: "0 auto 44px auto" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SAFFRON,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Citizen Workflow
            </span>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(26px, 3.2vw, 36px)",
                fontWeight: 700,
                color: GOVT_NAVY,
                margin: "8px 0 12px 0",
              }}
            >
              How Scheme Matcher Works
            </h2>
            <p style={{ fontSize: 15, color: INK_MUTED, lineHeight: 1.6, margin: 0 }}>
              Discovering suitable affirmative welfare and financial credit schemes takes just three transparent, step-by-step actions.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {[
              {
                step: "01",
                icon: SlidersHorizontal,
                title: "Enter Your Demographic Profile",
                desc: "Provide your age, gender, state, social category (SC, ST, OBC, General), enterprise type, and credit requirement. No identity documents required to check.",
                action: "Fill Profile",
                onClick: () => setScreen("profile"),
              },
              {
                step: "02",
                icon: ShieldCheck,
                title: "Algorithmic Rule Evaluation",
                desc: "Our deterministic engine checks your parameters against official gazetted scheme rules. Transparent scoring shows exactly why you qualify and what documents you need.",
                action: "View Directory",
                onClick: () => setScreen("results"),
              },
              {
                step: "03",
                icon: FolderUp,
                title: "Prepare Documents & Bank Dossier",
                desc: "Download an official document readiness checklist and a 1-click Bank Loan Application Dossier to submit to your district nodal officer or local bank branch.",
                action: "Open Document Vault",
                onClick: () => setScreen("documents"),
              },
            ].map((card) => {
              const CardIcon = card.icon;
              return (
                <div
                  key={card.step}
                  className="gov-card-interactive"
                  onClick={card.onClick}
                  style={{
                    padding: 28,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 18,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: "#EFF6FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: GOVT_NAVY,
                        }}
                      >
                        <CardIcon size={22} />
                      </div>
                      <span
                        style={{
                          fontFamily: serif,
                          fontSize: 26,
                          fontWeight: 700,
                          color: "#CBD5E1",
                        }}
                      >
                        {card.step}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: GOVT_NAVY,
                        margin: "0 0 10px 0",
                      }}
                    >
                      {card.title}
                    </h3>
                    <p style={{ fontSize: 13.5, color: INK_MUTED, lineHeight: 1.6, margin: "0 0 20px 0" }}>
                      {card.desc}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 600,
                      color: SAFFRON,
                      borderTop: `1px solid ${RULE}`,
                      paddingTop: 14,
                    }}
                  >
                    <span>{card.action}</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE SCHEME CATEGORIES                                          */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          background: PAPER,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 clamp(16px, 3.5vw, 32px)" }}>
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
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: SAFFRON,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Target Welfare Sectors
              </span>
              <h2
                style={{
                  fontFamily: serif,
                  fontSize: "clamp(24px, 3vw, 34px)",
                  fontWeight: 700,
                  color: GOVT_NAVY,
                  margin: "6px 0 0 0",
                }}
              >
                Browse Schemes by Beneficiary Group
              </h2>
            </div>

            <button
              type="button"
              onClick={() => setScreen("results")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: SAFFRON,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span>Explore All {totalSchemesCount} Schemes in Directory</span>
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
                title: "Artisans & Craftsmen",
                tag: "PM Vishwakarma / KVIC",
                desc: "Carpenters, weavers, potters, cobblers, and blacksmiths receive toolkit grants of ₹15,000, 5% interest loans, and skill training.",
                icon: "🔨",
                schemesCount: "4 Schemes",
              },
              {
                title: "Women Entrepreneurs",
                tag: "Stand-Up India / WEP",
                desc: "Loans up to ₹1 Crore for greenfield enterprises, 35% margin money capital subsidies, and collateral-free credit guarantees.",
                icon: "👩🏽‍💼",
                schemesCount: "6 Schemes",
              },
              {
                title: "SC / ST Beneficiaries",
                tag: "NSFDC / NSTFDC / IFCI",
                desc: "Concessional term loans up to 90% project cost, Credit Enhancement guarantees, and venture capital funds for first-generation founders.",
                icon: "🏛️",
                schemesCount: "8 Schemes",
              },
              {
                title: "Micro-Credit & Street Vendors",
                tag: "PM SVANidhi / Mudra Shishu",
                desc: "Working capital collateral-free credit starting at ₹10,000 with 7% interest cashback subsidies on digital repayment transactions.",
                icon: "🛒",
                schemesCount: "5 Schemes",
              },
              {
                title: "Sanitation Workers",
                tag: "NSKFDC / NAMASTE",
                desc: "Capital subsidies for sewer mechanization machinery, sanitation worker enterprise grants, and concessional education loans.",
                icon: "🛡️",
                schemesCount: "3 Schemes",
              },
              {
                title: "Persons with Disabilities",
                tag: "NHFDC Loan Schemes",
                desc: "Subsidized self-employment credit at 4% to 8% interest rate, assistive equipment subsidies, and skill training vouchers.",
                icon: "♿",
                schemesCount: "2 Schemes",
              },
            ].map((cat) => (
              <div
                key={cat.title}
                className="gov-card-interactive"
                onClick={() => setScreen("results")}
                style={{
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{cat.icon}</span>
                    <span
                      style={{
                        fontSize: 11,
                        background: SAFFRON_LIGHT,
                        color: SAFFRON,
                        padding: "2px 8px",
                        borderRadius: 4,
                        fontWeight: 700,
                      }}
                    >
                      {cat.schemesCount}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 16.5, fontWeight: 700, color: GOVT_NAVY, margin: "0 0 6px 0" }}>
                    {cat.title}
                  </h3>
                  <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600, marginBottom: 8 }}>
                    {cat.tag}
                  </div>
                  <p style={{ fontSize: 13, color: INK_MUTED, lineHeight: 1.5, margin: 0 }}>
                    {cat.desc}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: GOVT_NAVY,
                    marginTop: 18,
                  }}
                >
                  <span>Filter by Category</span>
                  <ArrowRight size={13} color={SAFFRON} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHY DETERMINISTIC MATCHING (EXPLAINABLE CIVIC TECH)                    */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          background: "#FFFFFF",
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "clamp(32px, 5vw, 64px)",
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SAFFRON,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Auditable Architecture
            </span>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(26px, 3.2vw, 36px)",
                fontWeight: 700,
                color: GOVT_NAVY,
                margin: "8px 0 16px 0",
                lineHeight: 1.25,
              }}
            >
              Why Deterministic Rules Matter in Citizen Welfare
            </h2>

            <p style={{ fontSize: 15, color: INK_MUTED, lineHeight: 1.7, margin: "0 0 16px 0" }}>
              Generic artificial intelligence chatbots often fabricate eligibility, invent nonexistent government grants, or overlook mandatory statutory conditions like age bounds and income limits.
            </p>

            <p style={{ fontSize: 15, color: INK_MUTED, lineHeight: 1.7, margin: "0 0 24px 0" }}>
              <strong style={{ color: GOVT_NAVY }}>Scheme Matcher takes an explainable, deterministic approach:</strong> We translate official gazette notifications into verifiable mathematical rules. When you are matched, you receive an exact breakdown of satisfied criteria, required verification documents, and policy gaps.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "100% Traceable Scoring", desc: "Every match rating (0-100%) maps to specific weights in category, income, age, location, and funding." },
                { label: "No Guaranteed Sanction Claims", desc: "We respect statutory authority — final loans and grants are sanctioned solely by official nodal officers." },
                { label: "Grounded AI Sahayak", desc: "Our conversational assistant answers questions strictly using your pre-calculated eligibility results." },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <CheckCircle2 size={18} color={OK} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <strong style={{ fontSize: 13.5, color: GOVT_NAVY }}>{item.label} — </strong>
                    <span style={{ fontSize: 13, color: INK_MUTED }}>{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: Quick Application Tracking & Dossier Callout */}
          <div
            style={{
              background: "#F8FAFC",
              border: `1px solid ${RULE}`,
              borderRadius: 12,
              padding: 28,
              boxShadow: "0 4px 16px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: GOVT_NAVY,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: GOVT_NAVY, margin: 0 }}>
                  Already Applied?
                </h3>
                <div style={{ fontSize: 12, color: "#64748B" }}>
                  Track your government scheme application
                </div>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: INK_MUTED, lineHeight: 1.6, margin: "0 0 20px 0" }}>
              Enter your Application Reference ID (e.g. <code>APP-2026-UP-849201</code>) or registered mobile number to see real-time verification stages from ULB scrutiny to bank credit appraisal.
            </p>

            <button
              type="button"
              onClick={() => setScreen("tracker")}
              className="gov-btn-primary"
              style={{ width: "100%", padding: "11px", fontSize: 14 }}
            >
              <Clock size={16} />
              <span>Open Application Tracker</span>
              <ArrowRight size={14} />
            </button>

            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${RULE}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "#64748B",
              }}
            >
              <span>Need bank documentation?</span>
              <button
                type="button"
                onClick={() => setScreen("documents")}
                style={{
                  background: "none",
                  border: "none",
                  color: SAFFRON,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                Open Document Vault ↗
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FREQUENTLY ASKED QUESTIONS (ACCESSIBLE ACCORDION)                      */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "clamp(48px, 6vw, 72px) 0",
          background: PAPER,
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "0 clamp(16px, 3.5vw, 32px)" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SAFFRON,
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              Frequently Asked Questions
            </span>
            <h2
              style={{
                fontFamily: serif,
                fontSize: "clamp(24px, 3vw, 34px)",
                fontWeight: 700,
                color: GOVT_NAVY,
                margin: "6px 0 0 0",
              }}
            >
              Answers for Beneficiaries &amp; Applicants
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              {
                q: "Do I have to pay any fee or commission to use Scheme Matcher?",
                a: "No. Scheme Matcher is 100% free for all Indian citizens and micro-entrepreneurs. We never charge any fee, commission, or facilitation charge. We link directly to official ministry portals (myScheme, DBT Bharat, Udyam, Stand-Up Mitra).",
              },
              {
                q: "Does a high match score mean my loan or subsidy is guaranteed by the government?",
                a: "No. A high match score indicates that your entered age, category, income, and business type satisfy published statutory criteria. Final loan approval, subsidy release, and DBT disbursement are strictly determined by designated district officers and participating lending banks after in-person due diligence.",
              },
              {
                q: "What documents do I generally need to apply for credit and subsidy schemes?",
                a: "Most schemes require: 1) Aadhaar Card for identity and e-KYC, 2) Category / Caste Certificate (for SC, ST, OBC concessions), 3) Income Certificate from the Tehsildar, 4) Bank Passbook / Cancelled Cheque, and 5) Project Report (DPR) or machinery quotations for loans above ₹50,000.",
              },
              {
                q: "Can I check eligibility without uploading my Aadhaar or identity cards?",
                a: "Yes. You can explore all schemes, run the eligibility calculator, and view match scores without uploading any documents. Document upload is only needed when you want automated criteria extraction or want to generate a bank-ready loan dossier.",
              },
              {
                q: "How does the application tracking system work?",
                a: "When you apply for a scheme through the portal or receive a reference number from your district nodal office, you can enter your Application ID in the Application Tracker to follow its 5-stage progress from ULB inspection to bank credit release.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: 8,
                    border: `1px solid ${isOpen ? GOVT_NAVY_LIGHT : RULE}`,
                    overflow: "hidden",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    style={{
                      width: "100%",
                      padding: "16px 20px",
                      background: "none",
                      border: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 600, color: GOVT_NAVY }}>
                      {faq.q}
                    </span>
                    {isOpen ? <ChevronUp size={18} color={SAFFRON} /> : <ChevronDown size={18} color="#64748B" />}
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: "0 20px 18px 20px",
                        fontSize: 14,
                        color: INK_MUTED,
                        lineHeight: 1.6,
                        borderTop: `1px solid ${RULE}`,
                        paddingTop: 14,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. TRANSPARENT PROJECT NOTICE & CALL TO ACTION                             */}
      {/* ========================================================================= */}
      <section
        style={{
          padding: "40px 0",
          background: "#FFFFFF",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "0 clamp(16px, 3.5vw, 32px)",
          }}
        >
          <div
            style={{
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: 8,
              padding: "20px 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ maxWidth: 780 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: GOVT_NAVY, fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                <Info size={17} color={SAFFRON} />
                <span>Academic &amp; Civic Technology Notice</span>
              </div>
              <p style={{ fontSize: 13, color: "#334155", margin: 0, lineHeight: 1.5 }}>
                Scheme Matcher is an independent student civic-technology project developed for the Ministry of Social Justice &amp; Empowerment problem statement (SIH26092). It is not an official government agency and does not issue legal sanctions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setScreen("profile")}
              className="gov-btn-saffron"
              style={{ padding: "10px 20px", fontSize: 13.5 }}
            >
              <span>Check Eligibility Now</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
