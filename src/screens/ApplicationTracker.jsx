import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Filter,
  Download,
  Building2,
  Calendar,
  IndianRupee,
  PhoneCall,
  UserCheck,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ShieldCheck,
  Printer,
  Sparkles,
  ExternalLink,
  Info,
  KeyRound,
  Trash2,
  XCircle,
  RotateCcw,
  User,
  HelpCircle,
} from "lucide-react";
import {
  getStoredApplications,
  lookupApplicationPublicly,
  withdrawApplication,
  deleteApplication,
} from "../data/appliedSchemes.js";
import { DEMO_PROFILES } from "../data/demoProfiles.js";
import { INK, CARD, SEAL, OK, VERIFY, NO, RULE, serif, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

export default function ApplicationTracker({
  currentUser,
  applications: externalApps,
  setApplications: setExternalApps,
  onNavigate,
  onOpenDetails,
  onLoginUser,
  matchedSchemesCount = 15,
  lang = "en",
}) {
  const [internalApps, setInternalApps] = useState(() => {
    return currentUser?.id ? getStoredApplications(currentUser.id) : [];
  });

  const applications = externalApps !== undefined ? externalApps : internalApps;
  const setApplications = setExternalApps || setInternalApps;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState(null);
  const [expandedAppId, setExpandedAppId] = useState(null);
  const [receiptApp, setReceiptApp] = useState(null);
  const [withdrawingApp, setWithdrawingApp] = useState(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Public reference search state for visitors
  const [publicQuery, setPublicQuery] = useState("");
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [publicResult, setPublicResult] = useState(null);
  const [publicSearchError, setPublicSearchError] = useState("");

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Strict synchronization: When currentUser changes, reload applications
  useEffect(() => {
    if (currentUser?.id) {
      const userApps = getStoredApplications(currentUser.id);
      setApplications(userApps);
    } else {
      setApplications([]);
    }
  }, [currentUser]);

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePublicSearch = async (e) => {
    if (e) e.preventDefault();
    if (!publicQuery.trim()) return;

    setIsSearchingPublic(true);
    setPublicSearchError("");
    setPublicResult(null);

    try {
      const match = await lookupApplicationPublicly(publicQuery.trim());
      if (match) {
        setPublicResult(match);
      } else {
        setPublicSearchError(
          `No application found for Reference ID / Mobile "${publicQuery.trim()}". Please verify your reference number or sign in to your citizen account.`
        );
      }
    } catch (err) {
      setPublicSearchError("Search service temporarily unreachable. Please try again.");
    } finally {
      setIsSearchingPublic(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawingApp) return;
    setIsProcessingAction(true);
    try {
      await withdrawApplication(withdrawingApp.id, currentUser?.id);
      if (currentUser?.id) {
        setApplications(getStoredApplications(currentUser.id));
      }
      setWithdrawingApp(null);
    } catch (err) {
      console.error("Error withdrawing application:", err);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteApp = async (appId) => {
    if (!window.confirm(`Are you sure you want to permanently delete application ${appId}?`)) {
      return;
    }
    await deleteApplication(appId, currentUser?.id);
    if (currentUser?.id) {
      setApplications(getStoredApplications(currentUser.id));
    }
  };

  const filteredApps = (applications || []).filter((app) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      app.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.schemeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.applicantPhone && app.applicantPhone.includes(searchQuery.trim())) ||
      (app.applicantName && app.applicantName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "in_review") return app.currentStage <= 3 && app.currentStage > 0 && app.status !== "Withdrawn by Citizen";
    if (statusFilter === "sanctioned") return app.currentStage === 4;
    if (statusFilter === "disbursed") return app.currentStage === 5;
    if (statusFilter === "withdrawn") return app.status === "Withdrawn by Citizen";
    return true;
  });

  const totalApplied = (applications || []).length;
  const sanctionedCount = (applications || []).filter((a) => a.currentStage >= 4 && a.status !== "Withdrawn by Citizen").length;
  const totalSanctionedAmt = (applications || []).reduce(
    (acc, a) => (a.status === "Withdrawn by Citizen" ? acc : acc + (a.sanctionedAmount || a.requestedAmount || 0)),
    0
  );
  const totalSubsidyAmt = (applications || []).reduce(
    (acc, a) => (a.status === "Withdrawn by Citizen" ? acc : acc + (a.subsidyAmount || 0)),
    0
  );

  // Helper function to render an authentic application card
  const renderApplicationCard = (app, isPublicView = false) => {
    if (!app) return null;
    const isExpanded = expandedAppId === app.id;
    const isWithdrawn = app.status === "Withdrawn by Citizen";

    return (
      <div
        key={app.id}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderRadius: 8,
          padding: "18px 20px",
          boxShadow: "0 2px 6px rgba(35, 50, 74, 0.04)",
          transition: "all 0.2s ease",
          opacity: isWithdrawn ? 0.75 : 1,
        }}
      >
        {/* Application Header Strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 12,
            paddingBottom: 14,
            borderBottom: `1px solid #EFEAE0`,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: SEAL,
                  letterSpacing: 0.5,
                }}
              >
                {app.ministry}
              </span>
              <span style={{ color: "#CBD5E1" }}>•</span>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>
                Applied on: <strong>{app.appliedDate}</strong>
              </span>
            </div>

            <h3
              style={{
                fontFamily: serif,
                fontSize: 20,
                fontWeight: 700,
                color: INK,
                margin: "0 0 6px 0",
                lineHeight: 1.3,
              }}
            >
              {app.schemeName}
            </h3>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: 12,
                  background: "#F1F5F9",
                  padding: "2px 8px",
                  borderRadius: 4,
                  color: "#334155",
                  fontWeight: 600,
                }}
              >
                {app.id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(app.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px",
                  fontSize: 11,
                  color: copiedId === app.id ? OK : "#6B7280",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
                title="Copy Application Reference ID"
              >
                {copiedId === app.id ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedId === app.id ? "Copied" : "Copy ID"}</span>
              </button>
            </div>
          </div>

          {/* Status Badge & Stage Label */}
          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                background:
                  isWithdrawn
                    ? "#F1F5F9"
                    : app.currentStage === 5
                    ? "#E8F5E9"
                    : app.currentStage === 4
                    ? "#E3F2FD"
                    : "#FFF8E1",
                color:
                  isWithdrawn
                    ? "#64748B"
                    : app.currentStage === 5
                    ? OK
                    : app.currentStage === 4
                    ? "#0284C7"
                    : "#B45309",
                border: `1px solid ${
                  isWithdrawn
                    ? "#CBD5E1"
                    : app.currentStage === 5
                    ? OK
                    : app.currentStage === 4
                    ? "#0284C7"
                    : "#F59E0B"
                }`,
              }}
            >
              <Clock size={13} />
              <span>{app.status}</span>
            </span>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
              {isWithdrawn
                ? "Application Archived"
                : `Current Stage: ${app.currentStage} of 5 Completed`}
            </div>
          </div>
        </div>

        {/* Financial & Field Overview */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            padding: "12px 0",
            fontSize: 12.5,
            borderBottom: `1px solid #EFEAE0`,
          }}
        >
          <div>
            <span style={{ color: "#6B7280" }}>Sanctioned / Requested:</span>
            <div style={{ fontWeight: 700, color: INK, fontSize: 15, marginTop: 2 }}>
              ₹{(app.sanctionedAmount || app.requestedAmount)?.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <span style={{ color: "#6B7280" }}>Govt Subsidy Assistance:</span>
            <div style={{ fontWeight: 700, color: SEAL, fontSize: 15, marginTop: 2 }}>
              ₹{(app.subsidyAmount || 0)?.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <span style={{ color: "#6B7280" }}>Implementing Bank:</span>
            <div style={{ fontWeight: 600, color: INK, marginTop: 2 }}>
              {app.bankName}
            </div>
            <div style={{ fontSize: 11, color: "#64748B" }}>{app.bankBranch}</div>
          </div>
          <div>
            <span style={{ color: "#6B7280" }}>Estimated Target:</span>
            <div style={{ fontWeight: 600, color: OK, marginTop: 2 }}>
              {app.estimatedDisbursement}
            </div>
          </div>
        </div>

        {/* 5-STAGE APPLICATION PROGRESS TRACKER */}
        <div style={{ padding: "18px 0 10px 0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 12 }}>
            OFFICIAL WORKFLOW PROGRESS (5 MANDATORY STAGES):
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 8,
              position: "relative",
              marginBottom: 16,
            }}
          >
            {[
              { stage: 1, label: "Submitted" },
              { stage: 2, label: "Verification" },
              { stage: 3, label: "Committee" },
              { stage: 4, label: "Bank Credit" },
              { stage: 5, label: "DBT Disbursed" },
            ].map((s) => {
              const isDone = app.currentStage >= s.stage && !isWithdrawn;
              const isCurrent = app.currentStage === s.stage && !isWithdrawn;

              return (
                <div key={s.stage} style={{ textAlign: "center", position: "relative" }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      margin: "0 auto 6px auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: isDone ? OK : isCurrent ? SEAL : "#F1F5F9",
                      color: isDone || isCurrent ? "#FFFFFF" : "#64748B",
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: isCurrent ? "0 0 0 3px rgba(181, 101, 29, 0.2)" : "none",
                    }}
                  >
                    {isDone ? <Check size={14} /> : s.stage}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: isCurrent || isDone ? 700 : 500,
                      color: isDone ? OK : isCurrent ? INK : "#64748B",
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setExpandedAppId(isExpanded ? null : app.id)}
            style={{
              background: "#FAF7EE",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "8px 12px",
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12.5,
              fontWeight: 600,
              color: INK,
              cursor: "pointer",
            }}
          >
            <span>
              {isExpanded
                ? "Hide Detailed Inspection Audit Log"
                : `View Detailed Inspection Audit Log (${app.timeline?.length || 5} milestones)`}
            </span>
            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>

          {isExpanded && (
            <div
              style={{
                marginTop: 12,
                padding: "14px 16px",
                background: "#FAF7EE",
                borderRadius: 6,
                border: `1px solid ${RULE}`,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(app.timeline || []).map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      fontSize: 12.5,
                    }}
                  >
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: step.completed ? OK : "#CBD5E1",
                        color: "#FFFFFF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {step.completed ? <Check size={12} /> : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 4 }}>
                        <span style={{ fontWeight: 700, color: INK }}>{step.title}</span>
                        <span style={{ fontSize: 11, color: "#64748B" }}>{step.date}</span>
                      </div>
                      <p style={{ margin: "3px 0 0 0", color: "#475569", fontSize: 12, lineHeight: 1.4 }}>
                        {step.remarks}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Officer Contact & Actions Footer */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: `1px solid #EFEAE0`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4B5563" }}>
            <PhoneCall size={14} color={SEAL} />
            <span>
              Nodal Authority: <strong>{app.nodalOfficer || "District Industries Centre"}</strong> ({app.officerPhone})
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setReceiptApp(app)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "#FFFFFF",
                border: `1px solid ${SEAL}`,
                color: SEAL,
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={13} />
              <span>Official Acknowledgement Slip</span>
            </button>

            {!isPublicView && !isWithdrawn && (
              <button
                type="button"
                onClick={() => setWithdrawingApp(app)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "7px 12px",
                  background: "none",
                  border: "1px solid #F87171",
                  color: "#DC2626",
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Withdraw Application"
              >
                <XCircle size={13} />
                <span>Withdraw</span>
              </button>
            )}

            {!isPublicView && (
              <button
                type="button"
                onClick={() => handleDeleteApp(app.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94A3B8",
                  padding: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Permanently remove application record"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 40 }}>
      {/* ------------------------------------------------------------- */}
      {/* PAGE HEADER */}
      {/* ------------------------------------------------------------- */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: SEAL, marginBottom: 4 }}>
          <ShieldCheck size={18} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
            CITIZEN APPLICATION LIFE-CYCLE TRACKER
          </span>
          <span
            style={{
              fontSize: 10.5,
              background: "#F7F4EB",
              border: `1px solid ${SEAL}`,
              color: SEAL,
              padding: "2px 8px",
              borderRadius: 12,
              fontWeight: 600,
            }}
          >
            National DBT Portal Standard
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontFamily: serif, fontSize: 26, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
              Scheme Application Progress
            </h2>
            <p style={{ fontFamily: sans, fontSize: 13.5, color: "#596275", margin: 0, maxWidth: 650 }}>
              End-to-end transparent verification tracking from digital submission to District Industries Centre (DIC) scrutiny, Lead Bank credit appraisal, and Direct Benefit Transfer (DBT).
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("results")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 16px",
              background: SEAL,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(181, 101, 29, 0.2)",
            }}
          >
            <span>Browse Eligible Schemes</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* CASE A: USER IS LOGGED IN */}
      {/* ------------------------------------------------------------- */}
      {currentUser ? (
        <>
          {/* Active Citizen Session Banner */}
          <div
            style={{
              background: "#F7F4EB",
              border: `1px solid ${RULE}`,
              borderLeft: `4px solid ${SEAL}`,
              borderRadius: 6,
              padding: "12px 16px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                }}
              >
                {currentUser.avatar || "👤"}
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>
                  Beneficiary: {currentUser.name}
                </div>
                <div style={{ fontSize: 11.5, color: "#6B7280" }}>
                  Aadhaar/Mobile ID: <strong>{currentUser.mobile || "+91 98765 00000"}</strong> ·{" "}
                  {currentUser.categoryBadge || "Verified Citizen"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11.5,
                  padding: "4px 10px",
                  borderRadius: 14,
                  background: "#E8F5E9",
                  color: OK,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <CheckCircle2 size={13} />
                <span>e-KYC Verified</span>
              </span>
              <button
                type="button"
                onClick={() => onNavigate("login")}
                style={{
                  fontSize: 11.5,
                  color: SEAL,
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Account Details
              </button>
            </div>
          </div>

          {/* Genuine Dynamic Metrics Banner (Computed strictly from active applications) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 6,
                padding: "14px 16px",
                borderLeft: `4px solid ${SEAL}`,
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Active Applications</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: INK, marginTop: 4 }}>
                {totalApplied}
              </div>
              <div style={{ fontSize: 11.5, color: "#8A5A17", marginTop: 2 }}>
                {totalApplied === 1 ? "1 Scheme Registered" : `${totalApplied} Schemes Registered`}
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 6,
                padding: "14px 16px",
                borderLeft: `4px solid ${OK}`,
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Sanctioned / Disbursed</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: OK, marginTop: 4 }}>
                {sanctionedCount}
              </div>
              <div style={{ fontSize: 11.5, color: "#4B5563", marginTop: 2 }}>
                Bank Credit Sanctions Cleared
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 6,
                padding: "14px 16px",
                borderLeft: `4px solid #23324A`,
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Total Loan Capital Applied</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginTop: 4 }}>
                ₹{totalSanctionedAmt.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11.5, color: "#4B5563", marginTop: 2 }}>
                At Concessional Priority Rates
              </div>
            </div>

            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 6,
                padding: "14px 16px",
                borderLeft: `4px solid #8A5A17`,
              }}
            >
              <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 600 }}>Estimated Govt Subsidy</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: SEAL, marginTop: 4 }}>
                ₹{totalSubsidyAmt.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: 11.5, color: "#4B5563", marginTop: 2 }}>
                Direct Margin Assistance via DBT
              </div>
            </div>
          </div>

          {/* ZERO APPLICATIONS REALISTIC STATE */}
          {totalApplied === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: `1.5px dashed ${RULE}`,
                borderRadius: 8,
                padding: "44px 24px",
                textAlign: "center",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
              }}
            >
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: "50%",
                  background: "#FAF7EE",
                  border: `1.5px solid ${SEAL}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px auto",
                }}
              >
                <FileCheck2 size={28} color={SEAL} />
              </div>

              <h3 style={{ fontFamily: serif, fontSize: 22, color: INK, margin: "0 0 8px 0", fontWeight: 700 }}>
                No Scheme Applications Submitted Yet
              </h3>

              <p style={{ fontSize: 14, color: "#596275", maxWidth: 540, margin: "0 auto 20px auto", lineHeight: 1.5 }}>
                Welcome, <strong>{currentUser.name}</strong>. You currently have 0 active scheme applications under your citizen ID. We matched <strong>{matchedSchemesCount} eligible government schemes</strong> based on your demographic profile.
              </p>

              <div style={{ display: "inline-flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => onNavigate("results")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 22px",
                    background: SEAL,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(181, 101, 29, 0.25)",
                  }}
                >
                  <Sparkles size={16} />
                  <span>Browse {matchedSchemesCount} Matched Schemes to Apply</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate("profile")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    color: INK,
                    borderRadius: 4,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>Update Profile Requirements</span>
                </button>
              </div>

              {/* Fast-Track Application Preview Box */}
              <div
                style={{
                  marginTop: 32,
                  paddingTop: 24,
                  borderTop: `1px solid ${RULE}`,
                  textAlign: "left",
                  maxWidth: 720,
                  margin: "32px auto 0 auto",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: SEAL, letterSpacing: 0.5, marginBottom: 12 }}>
                  TOP RECOMMENDED SCHEMES FOR IMMEDIATE APPLICATION:
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                  <div
                    style={{
                      background: "#FAF7EE",
                      border: `1px solid ${RULE}`,
                      borderRadius: 6,
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "border 0.2s",
                    }}
                    onClick={() => {
                      if (onOpenDetails) onOpenDetails("SC001");
                      else onNavigate("results");
                    }}
                  >
                    <div style={{ fontSize: 11, color: SEAL, fontWeight: 700 }}>MINISTRY OF MSME (KVIC)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 2 }}>
                      Prime Minister's Employment Generation Programme (PMEGP)
                    </div>
                    <div style={{ fontSize: 12, color: OK, fontWeight: 600, marginTop: 4 }}>
                      Up to 35% Margin Money Subsidy · Loans up to ₹50 Lakhs
                    </div>
                    <div style={{ fontSize: 12, color: SEAL, fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>View Requirements & Apply Online</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FAF7EE",
                      border: `1px solid ${RULE}`,
                      borderRadius: 6,
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "border 0.2s",
                    }}
                    onClick={() => {
                      if (onOpenDetails) onOpenDetails("SC008");
                      else onNavigate("results");
                    }}
                  >
                    <div style={{ fontSize: 11, color: SEAL, fontWeight: 700 }}>MINISTRY OF MSME & SKILL DEV</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 2 }}>
                      PM Vishwakarma Scheme
                    </div>
                    <div style={{ fontSize: 12, color: OK, fontWeight: 600, marginTop: 4 }}>
                      ₹15,000 Tool Kit Grant · 5% Concessional Collateral-free Credit
                    </div>
                    <div style={{ fontSize: 12, color: SEAL, fontWeight: 600, marginTop: 8, display: "flex", alignItems: "center", gap: 4 }}>
                      <span>View Requirements & Apply Online</span>
                      <ArrowRight size={13} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* APPLICATION LIST WITH SEARCH & FILTERS */
            <>
              <div
                style={{
                  background: "#F7F4EB",
                  border: `1px solid ${RULE}`,
                  borderRadius: 6,
                  padding: "12px 16px",
                  marginBottom: 20,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ position: "relative", flex: 1, minWidth: 260 }}>
                  <Search
                    size={16}
                    color="#7E8A9B"
                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    type="text"
                    placeholder="Search your applications by reference ID or scheme name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      border: `1px solid ${RULE}`,
                      borderRadius: 4,
                      fontSize: 13,
                      fontFamily: sans,
                      boxSizing: "border-box",
                      background: "#FFFFFF",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { id: "all", label: "All Applications" },
                    { id: "in_review", label: "In Scrutiny / Review" },
                    { id: "sanctioned", label: "Sanctioned by Bank" },
                    { id: "disbursed", label: "DBT Disbursed" },
                    { id: "withdrawn", label: "Withdrawn" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setStatusFilter(tab.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontFamily: sans,
                        borderRadius: 4,
                        cursor: "pointer",
                        border: statusFilter === tab.id ? `1.5px solid ${SEAL}` : `1px solid ${RULE}`,
                        background: statusFilter === tab.id ? "#FFFFFF" : "transparent",
                        color: statusFilter === tab.id ? INK : "#6B7280",
                        fontWeight: statusFilter === tab.id ? 700 : 500,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {filteredApps.map((app) => renderApplicationCard(app))}
              </div>
            </>
          )}
        </>
      ) : (
        /* ------------------------------------------------------------- */
        /* CASE B: VISITOR IS LOGGED OUT (PUBLIC TRANSPARENT PORTAL)     */
        /* ------------------------------------------------------------- */
        <div>
          {/* Public Track By Reference ID Form */}
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid ${SEAL}`,
              borderRadius: 8,
              padding: "24px 26px",
              boxShadow: "0 4px 12px rgba(35, 50, 74, 0.06)",
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: SEAL, marginBottom: 6 }}>
              <Search size={18} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                PUBLIC APPLICATION STATUS INQUIRY
              </span>
            </div>

            <h3 style={{ fontFamily: serif, fontSize: 20, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
              Track Application Without Citizen Sign-In
            </h3>

            <p style={{ fontSize: 13.5, color: "#596275", margin: "0 0 16px 0", lineHeight: 1.45 }}>
              Enter your 16-digit Application Reference Number or registered mobile number to retrieve live verification stages, lead bank sanctions, and DBT records.
            </p>

            <form onSubmit={handlePublicSearch} style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <input
                type="text"
                value={publicQuery}
                onChange={(e) => {
                  setPublicQuery(e.target.value);
                  setPublicSearchError("");
                }}
                placeholder="Enter Application Reference ID (e.g. APP-2026-UP-849201) or Mobile..."
                style={{
                  flex: 1,
                  minWidth: 280,
                  padding: "10px 14px",
                  fontSize: 13.5,
                  border: `1.5px solid ${RULE}`,
                  borderRadius: 4,
                  fontFamily: sans,
                }}
                required
              />
              <button
                type="submit"
                disabled={isSearchingPublic}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Search size={16} />
                <span>{isSearchingPublic ? "Verifying..." : "Track Application"}</span>
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11.5, color: "#6B7280", fontWeight: 600 }}>Quick Verification Samples:</span>
              {[
                { id: "APP-2026-UP-849201", label: "APP-2026-UP-849201 (Ramesh Kumar · PM Vishwakarma)" },
                { id: "APP-2026-MH-492015", label: "APP-2026-MH-492015 (Priya Sharma · Divyangjan Loan)" },
                { id: "APP-2026-UP-339102", label: "APP-2026-UP-339102 (PMEGP Review)" },
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setPublicQuery(chip.id);
                    lookupApplicationPublicly(chip.id).then((match) => {
                      if (match) {
                        setPublicResult(match);
                        setPublicSearchError("");
                      }
                    });
                  }}
                  style={{
                    background: "#F7F4EB",
                    border: `1px solid ${RULE}`,
                    color: INK,
                    padding: "3px 10px",
                    borderRadius: 12,
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {publicSearchError && (
              <div
                style={{
                  marginTop: 14,
                  background: "#FDF2F2",
                  border: "1px solid #F87171",
                  borderRadius: 4,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#991B1B",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <AlertCircle size={16} />
                <span>{publicSearchError}</span>
              </div>
            )}
          </div>

          {publicResult && (
            <div style={{ marginBottom: 30 }}>
              <div
                style={{
                  background: "#E8F5E9",
                  border: `1px solid ${OK}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: OK,
                  marginBottom: 14,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>Official Record Found: Application Reference {publicResult.id} verified from National Scheme Registry.</span>
              </div>
              {renderApplicationCard(publicResult, true)}
            </div>
          )}

          {/* Citizen Account Callout Banner */}
          <div
            style={{
              background: "#FAF7EE",
              border: `1px solid ${RULE}`,
              borderRadius: 8,
              padding: "24px 26px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div style={{ maxWidth: 560 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: SEAL, marginBottom: 4 }}>
                  <KeyRound size={17} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                    CITIZEN BENEFICIARY PORTAL
                  </span>
                </div>
                <h3 style={{ fontFamily: serif, fontSize: 20, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
                  Sign In to Manage Your Applications
                </h3>
                <p style={{ fontSize: 13.5, color: "#596275", margin: 0, lineHeight: 1.5 }}>
                  Sign in to view all applications linked to your citizen profile, manage document submissions, print official sanction letters, or submit fast-track applications with pre-verified credentials.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate("login")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 22px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <KeyRound size={15} />
                <span>Citizen Sign In / Register</span>
              </button>
            </div>

            {/* Quick Demo Citizen Login Shortcuts */}
            <div
              style={{
                marginTop: 20,
                paddingTop: 16,
                borderTop: `1px solid ${RULE}`,
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: INK, marginBottom: 8 }}>
                Quick Test Citizen Accounts (Instant 1-Click Verification):
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {DEMO_PROFILES.slice(0, 3).map((demo) => {
                  const demoAppsCount = getStoredApplications(demo.id).length;
                  return (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        if (onLoginUser) {
                          onLoginUser(demo, "tracker");
                        }
                      }}
                      style={{
                        background: "#FFFFFF",
                        border: `1px solid ${RULE}`,
                        padding: "8px 14px",
                        borderRadius: 6,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        textAlign: "left",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{demo.avatar}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>{demo.name}</div>
                        <div style={{ fontSize: 10.5, color: SEAL }}>
                          {demoAppsCount} Active {demoAppsCount === 1 ? "App" : "Apps"}
                        </div>
                      </div>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => onNavigate("login")}
                  style={{
                    background: "#FFFFFF",
                    border: `1px dashed ${SEAL}`,
                    padding: "8px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: SEAL,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <User size={14} />
                  <span>Register Fresh Account (0 Apps)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WITHDRAW APPLICATION CONFIRMATION MODAL                      */}
      {/* ------------------------------------------------------------- */}
      {withdrawingApp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setWithdrawingApp(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `1.5px solid #DC2626`,
              borderRadius: 8,
              padding: "24px 26px",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.25)",
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#DC2626", marginBottom: 6 }}>
              <AlertCircle size={20} />
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5 }}>
                CONFIRM APPLICATION WITHDRAWAL
              </span>
            </div>

            <h3 style={{ fontFamily: serif, fontSize: 20, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
              Withdraw Application {withdrawingApp.id}?
            </h3>

            <p style={{ fontSize: 13.5, color: "#4B5563", lineHeight: 1.5, margin: "0 0 16px 0" }}>
              Are you sure you want to withdraw your application for <strong>{withdrawingApp.schemeName}</strong>? Once withdrawn, District DIC and bank scrutiny for this reference number will be paused and marked as withdrawn.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setWithdrawingApp(null)}
                style={{
                  padding: "8px 16px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  color: INK,
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Keep Application Active
              </button>

              <button
                type="button"
                onClick={handleConfirmWithdraw}
                disabled={isProcessingAction}
                style={{
                  padding: "8px 18px",
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {isProcessingAction ? "Processing..." : "Yes, Withdraw Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* PRINTABLE OFFICIAL ACKNOWLEDGEMENT SLIP MODAL                 */}
      {/* ------------------------------------------------------------- */}
      {receiptApp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setReceiptApp(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `2px solid ${SEAL}`,
              borderRadius: 8,
              padding: "28px 30px",
              maxWidth: 620,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.3)",
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Government Emblem Header */}
            <div style={{ textAlign: "center", borderBottom: `2px solid ${RULE}`, paddingBottom: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>🏛️</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: SEAL, letterSpacing: 1 }}>
                GOVERNMENT OF INDIA · DIGITAL CITIZEN REGISTRY
              </div>
              <div style={{ fontFamily: serif, fontSize: 18, fontWeight: 700, color: INK, marginTop: 2 }}>
                Official Scheme Application Acknowledgement Slip
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                National Single-Window Citizen Scheme Registry · Direct Benefit Transfer (DBT) Mission
              </div>
            </div>

            {/* Application Details Table */}
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse", marginBottom: 18 }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280", width: "40%" }}>Application Reference No:</td>
                  <td style={{ padding: "6px 0", fontWeight: 700, color: INK }}>{receiptApp.id}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Scheme Name:</td>
                  <td style={{ padding: "6px 0", fontWeight: 700, color: INK }}>{receiptApp.schemeName}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Applicant Name:</td>
                  <td style={{ padding: "6px 0", fontWeight: 600 }}>{receiptApp.applicantName}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Social Category:</td>
                  <td style={{ padding: "6px 0" }}>{receiptApp.category}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Location:</td>
                  <td style={{ padding: "6px 0" }}>{receiptApp.district}, {receiptApp.state}</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Project / Assistance Amount:</td>
                  <td style={{ padding: "6px 0", fontWeight: 700, color: OK }}>
                    ₹{receiptApp.requestedAmount?.toLocaleString("en-IN")}
                  </td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Designated Bank Branch:</td>
                  <td style={{ padding: "6px 0" }}>{receiptApp.bankName} ({receiptApp.bankBranch})</td>
                </tr>
                <tr style={{ borderBottom: `1px solid ${RULE}` }}>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Current Status:</td>
                  <td style={{ padding: "6px 0", fontWeight: 700, color: SEAL }}>{receiptApp.status}</td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 0", color: "#6B7280" }}>Date of Submission:</td>
                  <td style={{ padding: "6px 0" }}>{receiptApp.appliedDate}</td>
                </tr>
              </tbody>
            </table>

            {/* Official Disclaimer */}
            <div
              style={{
                background: "#FAF7EE",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "10px 12px",
                fontSize: 11,
                color: "#6B7280",
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Note: This is a digitally signed electronic receipt under National e-Governance standards. No physical signature is required. For any inquiries, quote your Application Reference No: <strong>{receiptApp.id}</strong> at your nearest District Industries Centre (DIC) or Lead Bank branch.
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Printer size={15} />
                <span>Print / Save PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptApp(null)}
                style={{
                  padding: "8px 16px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  color: INK,
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
