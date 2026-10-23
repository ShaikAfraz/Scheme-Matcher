import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  FileText,
  Gift,
  ListOrdered,
  MessageCircle,
  Copy,
  Check,
  Upload,
  Printer,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import ScoreBadge from "../components/ScoreBadge.jsx";
import VoiceReader from "../components/VoiceReader.jsx";
import { simplifyGovtText } from "../components/JargonBuster.jsx";
import { createNewApplication } from "../data/appliedSchemes.js";
import { INK, CARD, SEAL, OK, VERIFY, RULE, serif, sans, inputStyle } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function Details({
  match,
  back,
  onAskAssistant,
  onGoToDocuments,
  onOpenCsc,
  onNavigateToTracker,
  currentUser,
  profile,
  documents = [],
  onLoginUser,
  onNavigate,
  lang = "en",
  isPlainMode = false,
}) {
  const [copied, setCopied] = useState(false);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyAmount, setApplyAmount] = useState(() => {
    return profile?.financialRequirement || (match ? match.scheme.minReq : 150000);
  });
  const [applyBank, setApplyBank] = useState("State Bank of India");
  const [applyBranch, setApplyBranch] = useState("District Lead Bank Branch");
  const [guestName, setGuestName] = useState("");
  const [guestMobile, setGuestMobile] = useState("");
  const [isSubmittingApp, setIsSubmittingApp] = useState(false);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  if (!match) return null;
  const { scheme, score, reasons } = match;

  const defaultSteps = scheme.applicationSteps || [
    "Prepare required certificates & DPR",
    "Contact implementing authority / Lead Bank",
    "Submit online / physical application",
    "Verification & background due diligence",
    "Sanction and direct disbursement",
  ];

  const handleOpenPortal = (e) => {
    if (!scheme.portalUrl) return;
    try {
      const win = window.open(scheme.portalUrl, "_blank", "noopener,noreferrer");
      if (!win || win.closed || typeof win.closed === "undefined") {
        window.location.href = scheme.portalUrl;
      }
    } catch (err) {
      window.location.href = scheme.portalUrl;
    }
  };

  const handleCopyLink = () => {
    if (!scheme.portalUrl) return;
    navigator.clipboard.writeText(scheme.portalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isDocUploaded = (docName) => {
    const dLower = docName.toLowerCase();
    return documents.some(
      (d) =>
        d.name.toLowerCase().includes(dLower.split(" ")[0]) ||
        d.type.toLowerCase().includes(dLower.split(" ")[0])
    );
  };

  const speechContent = `${scheme.name}. ${scheme.description}. Financial benefits: ${scheme.benefits}`;

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Back button */}
      <button
        type="button"
        onClick={back}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "#5C6B84",
          fontFamily: sans,
          fontSize: 13.5,
          cursor: "pointer",
          marginBottom: 16,
          padding: 0,
        }}
      >
        <ArrowLeft size={15} /> {t.backToResults}
      </button>

      {/* Header section with title and score */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 280 }}>
          <div
            style={{
              fontFamily: sans,
              fontSize: 12,
              color: SEAL,
              letterSpacing: 0.5,
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {scheme.ministry}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h2
              style={{
                fontFamily: serif,
                fontSize: 28,
                color: INK,
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {scheme.name}
            </h2>
            <VoiceReader text={speechContent} lang={lang} label={t.listen} />
          </div>
          <p
            style={{
              fontFamily: sans,
              fontSize: 14,
              color: "#454B58",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {simplifyGovtText(scheme.description, isPlainMode, lang)}
          </p>
        </div>

        <ScoreBadge score={score} size="lg" />
      </div>

      {/* Action shortcuts / Redirection Buttons */}
      <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* Fast-Track Apply & Track Progress Button */}
        <button
          type="button"
          onClick={() => setIsApplyModalOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            background: "#1E3A8A",
            color: "#FFFFFF",
            borderRadius: 4,
            fontFamily: sans,
            fontSize: 13.5,
            fontWeight: 700,
            border: "none",
            boxShadow: "0 2px 5px rgba(30, 58, 138, 0.35)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#172554")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#1E3A8A")}
        >
          <Sparkles size={15} color="#FBBF24" />
          <span>Apply Online &amp; Track Status</span>
        </button>

        {scheme.portalUrl && (
          <a
            href={scheme.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleOpenPortal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              background: SEAL,
              color: "#FFFFFF",
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 4px rgba(181, 101, 29, 0.25)",
              cursor: "pointer",
            }}
          >
            <span>{t.applyPortalBtn}</span>
            <ExternalLink size={15} />
          </a>
        )}

        {scheme.portalUrl && (
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 14px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13,
              color: INK,
              cursor: "pointer",
            }}
            title="Copy portal URL to clipboard"
          >
            {copied ? <Check size={14} color={OK} /> : <Copy size={14} />}
            <span>{copied ? t.linkCopied : t.copyLinkBtn}</span>
          </button>
        )}

        {onOpenCsc && (
          <button
            type="button"
            onClick={onOpenCsc}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: "#F6F1E5",
              border: `1px solid ${SEAL}`,
              color: INK,
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Printer size={15} color={SEAL} />
            <span>{t.cscSlipBtn}</span>
          </button>
        )}

        {onGoToDocuments && (
          <button
            type="button"
            onClick={onGoToDocuments}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 16px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              color: INK,
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Upload size={14} color={SEAL} />
            <span>Document Vault ({documents.length})</span>
          </button>
        )}
      </div>

      {/* Direct Verified Portal URL Display */}
      {scheme.portalUrl && (
        <div
          style={{
            marginTop: 10,
            padding: "8px 14px",
            background: "#F7F3E9",
            borderRadius: 4,
            border: `1px solid ${RULE}`,
            fontFamily: sans,
            fontSize: 12,
            color: "#6B7280",
            display: "flex",
            alignItems: "center",
            gap: 8,
            overflowX: "auto",
          }}
        >
          <span style={{ fontWeight: 600, color: INK, flexShrink: 0 }}>Verified URL:</span>
          <a
            href={scheme.portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: SEAL, textDecoration: "underline", wordBreak: "break-all" }}
          >
            {scheme.portalUrl}
          </a>
        </div>
      )}

      {/* SECTION: WHY YOU QUALIFY */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: "0 0 12px" }}>
          {t.whyMatch}
        </h3>
        <div
          style={{
            background: CARD,
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "16px 20px",
          }}
        >
          {reasons.green.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 8,
                fontFamily: sans,
                fontSize: 13.5,
                color: INK,
              }}
            >
              <CheckCircle2 size={16} color={OK} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{simplifyGovtText(r, isPlainMode, lang)}</span>
            </div>
          ))}

          {reasons.yellow.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginTop: 8,
                fontFamily: sans,
                fontSize: 13,
                color: VERIFY,
              }}
            >
              <AlertCircle size={16} color={VERIFY} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>{simplifyGovtText(r, isPlainMode, lang)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION: FINANCIAL BENEFITS */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Gift size={18} color={SEAL} />
          <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: 0 }}>
            {t.benefitsTitle}
          </h3>
        </div>
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "16px 20px",
            fontFamily: sans,
            fontSize: 14,
            color: INK,
            lineHeight: 1.6,
          }}
        >
          {simplifyGovtText(scheme.benefits, isPlainMode, lang)}
        </div>
      </div>

      {/* SECTION: REQUIRED DOCUMENTS & READINESS */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} color={SEAL} />
            <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: 0 }}>
              {t.documentsTitle}
            </h3>
          </div>
          <span style={{ fontFamily: sans, fontSize: 12, color: "#6B7280" }}>
            {documents.length > 0
              ? `${documents.filter((d) => isDocUploaded(d.name)).length} of ${scheme.documents.length} verified`
              : "Upload in Document Vault for instant verification"}
          </span>
        </div>

        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "16px 20px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {scheme.documents.map((doc, idx) => {
              const uploaded = isDocUploaded(doc);
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom: idx !== scheme.documents.length - 1 ? `1px dashed ${RULE}` : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: uploaded ? OK : SEAL,
                      }}
                    />
                    <span style={{ fontFamily: sans, fontSize: 13.5, color: INK }}>
                      {doc}
                    </span>
                  </div>
                  {uploaded ? (
                    <span
                      style={{
                        fontFamily: sans,
                        fontSize: 11.5,
                        color: OK,
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCircle2 size={13} color={OK} />
                      Verified
                    </span>
                  ) : (
                    <span style={{ fontFamily: sans, fontSize: 11.5, color: "#8A8266" }}>
                      Required at bank
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION: STEP-BY-STEP WORKFLOW */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <ListOrdered size={18} color={SEAL} />
          <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: 0 }}>
            {t.workflowTitle}
          </h3>
        </div>
        <div
          style={{
            background: CARD,
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "16px 20px",
          }}
        >
          {defaultSteps.map((step, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: idx !== defaultSteps.length - 1 ? 12 : 0,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: INK,
                  color: "#FFFFFF",
                  fontFamily: sans,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {idx + 1}
              </span>
              <span style={{ fontFamily: sans, fontSize: 13.5, color: INK, lineHeight: 1.5 }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Assistant Callout */}
      {onAskAssistant && (
        <div
          style={{
            marginTop: 28,
            background: "#F6F1E5",
            border: `1px solid ${SEAL}`,
            borderRadius: 6,
            padding: "16px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: INK }}>
              Have questions about this scheme?
            </div>
            <div style={{ fontFamily: sans, fontSize: 12.5, color: "#6B7280" }}>
              Ask our grounded AI Assistant about subsidy calculations, documents, or bank rules.
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAskAssistant(`Explain how ${scheme.name} works and what documents I need.`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
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
            <MessageCircle size={15} />
            <span>Ask AI Assistant</span>
          </button>
        </div>
      )}

      {/* FAST-TRACK APPLICATION & TRACKING MODAL */}
      {isApplyModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setIsApplyModalOpen(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${SEAL}`,
              borderRadius: 8,
              padding: "24px 26px",
              maxWidth: 580,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: SEAL, marginBottom: 4 }}>
              <ShieldCheck size={18} />
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5 }}>
                OFFICIAL CITIZEN APPLICATION SUBMISSION
              </span>
            </div>

            <h3 style={{ fontFamily: serif, fontSize: 22, color: INK, margin: "0 0 4px 0", fontWeight: 700 }}>
              Apply for {scheme.name.split("—")[0].trim()}
            </h3>

            <p style={{ fontSize: 13, color: "#606F7B", margin: "0 0 16px 0", lineHeight: 1.45 }}>
              Confirm your verified citizen details below to register your application directly with the District Nodal Office and lead bank.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsSubmittingApp(true);
                setTimeout(() => {
                  let activeUser = currentUser;
                  if (!activeUser) {
                    const newUserId = `usr_${Date.now()}`;
                    activeUser = {
                      id: newUserId,
                      name: guestName.trim() || "Citizen Beneficiary",
                      mobile: guestMobile.trim() || "+91 98765 00000",
                      role: `${profile?.category || "Citizen"} Entrepreneur · ${profile?.businessType || "Manufacturing"}`,
                      categoryBadge: `${profile?.category || "Citizen"} Community · ${profile?.state || "India"}`,
                      badgeColor: SEAL,
                      isDemo: false,
                      profileData: profile,
                      documents: documents,
                    };
                    if (onLoginUser) {
                      onLoginUser(activeUser, null);
                    }
                  }

                  const newApp = createNewApplication({
                    scheme,
                    user: activeUser,
                    requestedAmount: applyAmount,
                    businessType: profile?.businessType || "Manufacturing / Services",
                    bankName: applyBank,
                    branchName: applyBranch,
                    district: profile?.state ? `${profile.state} Nodal Zone` : "District Zone",
                  });
                  setIsSubmittingApp(false);
                  setIsApplyModalOpen(false);
                  if (onNavigateToTracker) {
                    onNavigateToTracker(newApp.id);
                  }
                }, 600);
              }}
            >
              {/* Applicant Identity Verification Strip */}
              {!currentUser ? (
                <div
                  style={{
                    background: "#FAF7EE",
                    border: `1.5px solid ${SEAL}`,
                    borderRadius: 6,
                    padding: "12px 14px",
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: SEAL, letterSpacing: 0.5 }}>
                      CITIZEN REGISTRATION / AADHAAR LINKING
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsApplyModalOpen(false);
                        if (onNavigate) onNavigate("login");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: INK,
                        textDecoration: "underline",
                        fontSize: 11.5,
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Sign In to Existing Account
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 3 }}>
                        Applicant Full Name *
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        style={inputStyle}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 3 }}>
                        Mobile Number (for SMS & e-KYC) *
                      </label>
                      <input
                        type="tel"
                        value={guestMobile}
                        onChange={(e) => setGuestMobile(e.target.value)}
                        placeholder="+91 98765 43210"
                        style={inputStyle}
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "#F9F7F1",
                    border: `1px solid ${RULE}`,
                    borderRadius: 6,
                    padding: "10px 14px",
                    marginBottom: 14,
                    fontSize: 12.5,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <span style={{ color: "#6B7280" }}>Applicant:</span>{" "}
                    <strong>{currentUser.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Category:</span>{" "}
                    <strong>{profile?.category || currentUser.categoryBadge || "General"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>State:</span>{" "}
                    <strong>{profile?.state || "Uttar Pradesh"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#6B7280" }}>Target Sector:</span>{" "}
                    <strong>{profile?.businessType || "Manufacturing"}</strong>
                  </div>
                </div>
              )}

              {/* Loan / Financial Need Input */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                  Requested Project / Loan Amount (₹) *
                </label>
                <input
                  type="number"
                  min={scheme.minReq || 10000}
                  max={scheme.maxReq || 5000000}
                  value={applyAmount}
                  onChange={(e) => setApplyAmount(e.target.value)}
                  style={inputStyle}
                  required
                />
                <span style={{ fontSize: 11, color: "#6B7280", marginTop: 3, display: "block" }}>
                  Scheme limits: ₹{(scheme.minReq || 10000).toLocaleString("en-IN")} to ₹{(scheme.maxReq || 5000000).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Preferred Bank Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Designated Lending Bank *
                  </label>
                  <select
                    value={applyBank}
                    onChange={(e) => setApplyBank(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="State Bank of India">State Bank of India</option>
                    <option value="Punjab National Bank">Punjab National Bank</option>
                    <option value="Bank of Baroda">Bank of Baroda</option>
                    <option value="Canara Bank">Canara Bank</option>
                    <option value="Union Bank of India">Union Bank of India</option>
                    <option value="Regional Rural Bank (Gramin Bank)">Regional Rural Bank</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Preferred Branch Name *
                  </label>
                  <input
                    type="text"
                    value={applyBranch}
                    onChange={(e) => setApplyBranch(e.target.value)}
                    placeholder="e.g. Main Market Branch"
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              {/* Attached Documents Notice */}
              <div
                style={{
                  background: "#E8F5E9",
                  border: `1px solid ${OK}`,
                  borderRadius: 6,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: OK,
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>
                  <strong>{documents.length > 0 ? `${documents.length} Verified Documents` : "Aadhaar e-KYC"}</strong> will be automatically attached from your Digital Document Vault.
                </span>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  style={{
                    padding: "9px 16px",
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    color: INK,
                    borderRadius: 4,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingApp}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 20px",
                    background: SEAL,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 4px rgba(181, 101, 29, 0.25)",
                  }}
                >
                  <Sparkles size={15} color="#FFFFFF" />
                  <span>{isSubmittingApp ? "Submitting to Nodal Portal..." : "Confirm & Submit Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
