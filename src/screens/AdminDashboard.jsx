import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  FileCheck2,
  FolderUp,
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  LogOut,
  Building2,
  RefreshCw,
  Clock,
  IndianRupee,
  Activity,
  FileText,
  Filter,
} from "lucide-react";
import { INK, PAPER, CARD, SEAL, OK, VERIFY, NO, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { getStoredAuthToken } from "../data/demoProfiles.js";

export default function AdminDashboard({
  currentUser,
  onLogout,
  setScreen,
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "schemes" | "documents" | "citizens"
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Schemes Management State
  const [schemes, setSchemes] = useState([]);
  const [schemeSearch, setSchemeSearch] = useState("");
  const [schemeLevelFilter, setSchemeLevelFilter] = useState("ALL");
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null); // null or scheme obj
  const [isCreatingScheme, setIsCreatingScheme] = useState(false);
  const [schemeForm, setSchemeForm] = useState({
    code: "",
    name: "",
    ministry: "",
    level: "Central",
    category: "SC / ST / OBC / General",
    financialAssistance: "",
    description: "",
    portalUrl: "https://myscheme.gov.in",
  });

  // Documents Queue State
  const [documentsQueue, setDocumentsQueue] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [reviewModalDoc, setReviewModalDoc] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("Verified");
  const [reviewRemark, setReviewRemark] = useState("");

  // Citizens Registry State
  const [citizens, setCitizens] = useState([]);
  const [loadingCitizens, setLoadingCitizens] = useState(false);

  // Status/Feedback messages
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");

  const token = getStoredAuthToken();
  const isAdmin = currentUser?.systemRole === "admin";

  // Load Overview Stats
  const loadStats = () => {
    if (!token || !isAdmin) return;
    setLoadingStats(true);
    fetch("/api/admin/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      })
      .catch((err) => console.warn("Failed to load admin stats:", err))
      .finally(() => setLoadingStats(false));
  };

  // Load Schemes
  const loadSchemes = () => {
    if (!token || !isAdmin) return;
    setLoadingSchemes(true);
    fetch("/api/admin/schemes", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.schemes)) {
          setSchemes(data.schemes);
        }
      })
      .catch((err) => console.warn("Failed to load admin schemes:", err))
      .finally(() => setLoadingSchemes(false));
  };

  // Load Documents Queue
  const loadDocuments = () => {
    if (!token || !isAdmin) return;
    setLoadingDocs(true);
    fetch("/api/admin/documents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.documents)) {
          setDocumentsQueue(data.documents);
        }
      })
      .catch((err) => console.warn("Failed to load documents queue:", err))
      .finally(() => setLoadingDocs(false));
  };

  // Load Citizens Registry
  const loadCitizens = () => {
    if (!token || !isAdmin) return;
    setLoadingCitizens(true);
    fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.users)) {
          setCitizens(data.users);
        }
      })
      .catch((err) => console.warn("Failed to load citizens:", err))
      .finally(() => setLoadingCitizens(false));
  };

  useEffect(() => {
    if (isAdmin && token) {
      loadStats();
    }
  }, [isAdmin, token]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    if (activeTab === "schemes") loadSchemes();
    if (activeTab === "documents") loadDocuments();
    if (activeTab === "citizens") loadCitizens();
  }, [activeTab, isAdmin, token]);

  const showSuccess = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(""), 4000);
  };

  const showError = (msg) => {
    setActionError(msg);
    setTimeout(() => setActionError(""), 5000);
  };

  // Scheme Actions
  const handleToggleVerify = async (schemeId, currentVerified) => {
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(schemeId)}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isVerified: !currentVerified }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Scheme verification status updated.`);
        setSchemes((prev) =>
          prev.map((s) => (s.id === schemeId ? { ...s, isVerified: !currentVerified } : s))
        );
      } else {
        showError(data.error || "Failed to update verification status.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteScheme = async (schemeId, schemeName) => {
    if (!window.confirm(`Are you sure you want to delete scheme: ${schemeName}? This action is irreversible.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/schemes/${encodeURIComponent(schemeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Scheme deleted successfully.`);
        setSchemes((prev) => prev.filter((s) => s.id !== schemeId));
        loadStats();
      } else {
        showError(data.error || "Failed to delete scheme.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  const handleSaveScheme = async (e) => {
    e.preventDefault();
    try {
      if (isCreatingScheme) {
        const res = await fetch("/api/admin/schemes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schemeForm),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showSuccess("New scheme added to codified catalog!");
          setIsCreatingScheme(false);
          loadSchemes();
          loadStats();
        } else {
          showError(data.error || "Failed to create scheme.");
        }
      } else if (editingScheme) {
        const res = await fetch(`/api/admin/schemes/${encodeURIComponent(editingScheme.id)}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(schemeForm),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showSuccess("Scheme parameters updated successfully.");
          setEditingScheme(null);
          loadSchemes();
        } else {
          showError(data.error || "Failed to update scheme.");
        }
      }
    } catch (err) {
      showError(err.message);
    }
  };

  // Review Document Action
  const handleReviewDocument = async (e) => {
    e.preventDefault();
    if (!reviewModalDoc) return;
    try {
      const res = await fetch(`/api/admin/documents/${encodeURIComponent(reviewModalDoc.id)}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: reviewDecision,
          remark: reviewRemark,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccess(`Document marked as ${reviewDecision}.`);
        setReviewModalDoc(null);
        setReviewRemark("");
        loadDocuments();
        loadStats();
      } else {
        showError(data.error || "Failed to update document status.");
      }
    } catch (err) {
      showError(err.message);
    }
  };

  // 1. Unauthenticated Gate
  if (!token) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: 30 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: INK, margin: "0 0 10px 0" }}>
          Administrative Authentication Required
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
          This portal is restricted to authorized Ministry administrators. Please authenticate with your administrator credentials.
        </p>
        <button
          onClick={() => setScreen("admin-login")}
          style={{
            padding: "10px 20px",
            background: "#1E293B",
            color: "#FFFFFF",
            border: "none",
            borderRadius: 4,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Administrative Login
        </button>
      </div>
    );
  }

  // 2. Unauthorized Citizen Gate (403 Forbidden)
  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: 30 }}>
        <div
          style={{
            width: 60,
            height: 60,
            margin: "0 auto 16px auto",
            borderRadius: "50%",
            background: "#FEF2F2",
            border: "2px solid #FECACA",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#DC2626",
          }}
        >
          <ShieldAlert size={32} />
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: "#991B1B", margin: "0 0 10px 0" }}>
          403 Access Denied: Administrator Clearance Required
        </h2>
        <p style={{ color: "#475569", fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          You are currently signed in as citizen <strong>{currentUser?.name || "Citizen User"}</strong> (Role: <code>{currentUser?.systemRole || "citizen"}</code>). Your account does not have permission to view or manage institutional records.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => setScreen("dashboard")}
            style={{
              padding: "10px 18px",
              background: SEAL,
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Return to Citizen Dashboard
          </button>
          <button
            onClick={() => {
              onLogout();
              setScreen("admin-login");
            }}
            style={{
              padding: "10px 18px",
              background: "#1E293B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sign In with Admin Account
          </button>
        </div>
      </div>
    );
  }

  // Filter schemes
  const filteredSchemes = schemes.filter((s) => {
    const matchesSearch =
      !schemeSearch ||
      s.name.toLowerCase().includes(schemeSearch.toLowerCase()) ||
      s.ministry.toLowerCase().includes(schemeSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(schemeSearch.toLowerCase());
    const matchesLevel = schemeLevelFilter === "ALL" || s.level === schemeLevelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto" }}>
      {/* Admin Masthead */}
      <div
        style={{
          background: "#1E293B",
          color: "#FFFFFF",
          borderRadius: 4,
          padding: "20px 24px",
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 4,
              background: "#334155",
              border: "1px solid #475569",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FDE68A",
              flexShrink: 0,
            }}
          >
            <ShieldCheck size={26} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 19, fontFamily: serif, color: "#FFFFFF", fontWeight: 700 }}>
                {currentUser?.name || "System Administrator"}
              </h2>
              <span
                style={{
                  fontSize: 11,
                  background: "#3B82F6",
                  color: "#FFFFFF",
                  padding: "2px 8px",
                  borderRadius: 3,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                OFFICIAL ADMIN
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 4 }}>
              Ministry Administration Console · {currentUser?.email}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setScreen("home")}
            style={{
              padding: "7px 12px",
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#FFFFFF",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Citizen View
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 12px",
              background: "#DC2626",
              border: "none",
              color: "#FFFFFF",
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LogOut size={13} />
            <span>Admin Logout</span>
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {actionSuccess && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            color: OK,
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={16} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: `2px solid ${RULE}`,
          marginBottom: 20,
          gap: 6,
          overflowX: "auto",
        }}
      >
        {[
          { id: "overview", label: "Executive Overview", icon: Activity },
          {
            id: "schemes",
            label: `Codified Schemes (${stats?.counts?.schemes || schemes.length})`,
            icon: FileCheck2,
          },
          {
            id: "documents",
            label: `Verification Desk (${stats?.counts?.documentsNeedingReview ?? "..."})`,
            icon: FolderUp,
          },
          {
            id: "citizens",
            label: `Citizen Registry (${stats?.counts?.citizens ?? "..."})`,
            icon: Users,
          },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `3px solid #1E293B` : "3px solid transparent",
                color: isActive ? INK : "#64748B",
                fontWeight: isActive ? 700 : 500,
                fontSize: 13.5,
                cursor: "pointer",
                marginBottom: -2,
              }}
            >
              <TabIcon size={16} color={isActive ? "#1E293B" : "#94A3B8"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === "overview" && (
        <div>
          {/* Key Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>REGISTERED CITIZENS</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.citizens || 0}
              </div>
              <div style={{ fontSize: 11, color: OK, marginTop: 4 }}>✓ Authenticated DB Accounts</div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>CODIFIED SCHEMES</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.schemes || 0}
              </div>
              <div style={{ fontSize: 11, color: "#2563EB", marginTop: 4 }}>
                {stats?.counts?.centralSchemes || 0} Central · {stats?.counts?.stateSchemes || 0} State
              </div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>SUBMITTED APPLICATIONS</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.applications || 0}
              </div>
              <div style={{ fontSize: 11, color: "#D97706", marginTop: 4 }}>Under Processing Pipeline</div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>DOCUMENT QUEUE</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                {stats?.counts?.documentsNeedingReview || 0}
              </div>
              <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 4 }}>Pending Review Desk</div>
            </div>

            <div style={{ background: "#FFFFFF", border: `1px solid ${RULE}`, borderRadius: 4, padding: 16 }}>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>FUNDS PIPELINE</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: INK, marginTop: 4 }}>
                ₹{((stats?.counts?.totalSanctionedAmount || 18500000) / 10000000).toFixed(2)} Cr
              </div>
              <div style={{ fontSize: 11, color: OK, marginTop: 4 }}>Disbursement Total</div>
            </div>
          </div>

          {/* Recent Audit Trail Log */}
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: 20,
              boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontFamily: serif, fontSize: 16, color: INK }}>
                System Audit Events Log (Chronological Record)
              </h3>
              <button
                onClick={loadStats}
                style={{
                  background: "none",
                  border: "none",
                  color: SEAL,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <RefreshCw size={12} />
                <span>Refresh Log</span>
              </button>
            </div>

            {stats?.recentLogs?.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      background: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 4,
                      padding: "8px 12px",
                      fontSize: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            log.action?.includes("DENIED") || log.action?.includes("FAIL")
                              ? "#DC2626"
                              : "#1E293B",
                          marginRight: 8,
                        }}
                      >
                        [{log.action}]
                      </span>
                      <span style={{ color: "#475569" }}>
                        Target: <code>{log.targetType || "SYSTEM"}:{log.targetId || "NONE"}</code>
                      </span>
                    </div>
                    <span style={{ color: "#94A3B8", fontSize: 11 }}>
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#94A3B8", fontSize: 13, textAlign: "center", padding: 20 }}>
                No critical security events recorded in current window.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SCHEME RECORDS MANAGEMENT */}
      {activeTab === "schemes" && (
        <div>
          {/* Controls Bar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 260 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "#94A3B8" }} />
                <input
                  type="text"
                  placeholder="Search scheme name, ministry, code..."
                  value={schemeSearch}
                  onChange={(e) => setSchemeSearch(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 30 }}
                />
              </div>
              <select
                value={schemeLevelFilter}
                onChange={(e) => setSchemeLevelFilter(e.target.value)}
                style={{ ...inputStyle, width: 140 }}
              >
                <option value="ALL">All Levels</option>
                <option value="Central">Central</option>
                <option value="State">State</option>
              </select>
            </div>

            <button
              onClick={() => {
                setSchemeForm({
                  code: `SCH-${Date.now().toString().slice(-4)}`,
                  name: "",
                  ministry: "",
                  level: "Central",
                  category: "All Communities",
                  financialAssistance: "",
                  description: "",
                  portalUrl: "https://myscheme.gov.in",
                });
                setIsCreatingScheme(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#1E293B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <Plus size={14} />
              <span>Codify New Scheme</span>
            </button>
          </div>

          {/* Scheme Modal (Create or Edit) */}
          {(isCreatingScheme || editingScheme) && (
            <div
              style={{
                background: "#F8FAFC",
                border: "2px solid #334155",
                borderRadius: 4,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <h3 style={{ margin: "0 0 14px 0", fontSize: 16, color: INK, fontFamily: serif }}>
                {isCreatingScheme ? "Codify New Government Scheme" : `Edit Scheme: ${editingScheme.code}`}
              </h3>
              <form onSubmit={handleSaveScheme}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Scheme Code
                    </label>
                    <input
                      type="text"
                      value={schemeForm.code}
                      onChange={(e) => setSchemeForm({ ...schemeForm, code: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Official Scheme Title
                    </label>
                    <input
                      type="text"
                      value={schemeForm.name}
                      onChange={(e) => setSchemeForm({ ...schemeForm, name: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Level
                    </label>
                    <select
                      value={schemeForm.level}
                      onChange={(e) => setSchemeForm({ ...schemeForm, level: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="Central">Central</option>
                      <option value="State">State</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Nodal Ministry / Department
                    </label>
                    <input
                      type="text"
                      value={schemeForm.ministry}
                      onChange={(e) => setSchemeForm({ ...schemeForm, ministry: e.target.value })}
                      style={inputStyle}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Financial Assistance / Max Benefit
                    </label>
                    <input
                      type="text"
                      value={schemeForm.financialAssistance}
                      onChange={(e) => setSchemeForm({ ...schemeForm, financialAssistance: e.target.value })}
                      placeholder="e.g. Up to ₹50 Lakh subsidy (35%)"
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Operational Scheme Summary &amp; Eligibility
                  </label>
                  <textarea
                    rows={3}
                    value={schemeForm.description}
                    onChange={(e) => setSchemeForm({ ...schemeForm, description: e.target.value })}
                    style={{ ...inputStyle, height: "auto" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      background: OK,
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Save Scheme
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingScheme(false);
                      setEditingScheme(null);
                    }}
                    style={{
                      padding: "8px 14px",
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
                </div>
              </form>
            </div>
          )}

          {/* Scheme Table */}
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Code</th>
                  <th style={{ padding: "10px 14px" }}>Scheme Name</th>
                  <th style={{ padding: "10px 14px" }}>Ministry</th>
                  <th style={{ padding: "10px 14px" }}>Level</th>
                  <th style={{ padding: "10px 14px" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingSchemes ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading schemes catalog...
                    </td>
                  </tr>
                ) : filteredSchemes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No schemes matched your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredSchemes.slice(0, 50).map((s) => (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#475569" }}>
                        {s.code || s.id}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                        {s.name}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {s.ministry}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            background: s.level === "Central" ? "#EFF6FF" : "#F0FDF4",
                            color: s.level === "Central" ? "#1E40AF" : "#166534",
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontWeight: 600,
                          }}
                        >
                          {s.level}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleVerify(s.id, s.isVerified)}
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Click to toggle verification status"
                        >
                          {s.isVerified ? (
                            <span style={{ color: OK, fontWeight: 600, fontSize: 12 }}>✓ Verified</span>
                          ) : (
                            <span style={{ color: "#D97706", fontSize: 12 }}>⏳ Unverified</span>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingScheme(s);
                              setSchemeForm({
                                code: s.code || s.id,
                                name: s.name,
                                ministry: s.ministry,
                                level: s.level || "Central",
                                category: s.targetBeneficiary || "All Communities",
                                financialAssistance: s.maxBenefitAmount || "",
                                description: s.summary || "",
                                portalUrl: s.officialUrl || "https://myscheme.gov.in",
                              });
                            }}
                            style={{
                              background: "#F1F5F9",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: 3,
                              cursor: "pointer",
                              color: INK,
                            }}
                            title="Edit scheme parameters"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScheme(s.id, s.name)}
                            style={{
                              background: "#FEF2F2",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: 3,
                              cursor: "pointer",
                              color: "#DC2626",
                            }}
                            title="Delete scheme"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENT VERIFICATION DESK */}
      {activeTab === "documents" && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 16, color: INK }}>
              Citizen Document Verification Desk
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Review uploaded Aadhaar, Caste Certificates, Udyam MSME, and ITR documents before DLTFC sanction.
            </p>
          </div>

          {/* Review Modal */}
          {reviewModalDoc && (
            <div
              style={{
                background: "#F8FAFC",
                border: "2px solid #334155",
                borderRadius: 4,
                padding: 18,
                marginBottom: 18,
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", fontSize: 15, color: INK }}>
                Review Document: {reviewModalDoc.docName} ({reviewModalDoc.userName})
              </h4>
              <form onSubmit={handleReviewDocument}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Verification Decision
                    </label>
                    <select
                      value={reviewDecision}
                      onChange={(e) => setReviewDecision(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="Verified">Approve &amp; Mark Verified</option>
                      <option value="Rejected">Reject (Requires Re-upload)</option>
                      <option value="Pending">Keep in Pending Review</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                      Officer Verification Remark / Defect Note
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Document clearly matches citizen Aadhaar and State registry."
                      value={reviewRemark}
                      onChange={(e) => setReviewRemark(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="submit"
                    style={{
                      padding: "8px 16px",
                      background: reviewDecision === "Verified" ? OK : "#DC2626",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Submit Verification Decision
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewModalDoc(null)}
                    style={{
                      padding: "8px 14px",
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
                </div>
              </form>
            </div>
          )}

          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Citizen</th>
                  <th style={{ padding: "10px 14px" }}>Document Type</th>
                  <th style={{ padding: "10px 14px" }}>File Name</th>
                  <th style={{ padding: "10px 14px" }}>Uploaded</th>
                  <th style={{ padding: "10px 14px" }}>Status</th>
                  <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingDocs ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading document queue...
                    </td>
                  </tr>
                ) : documentsQueue.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No documents currently in queue.
                    </td>
                  </tr>
                ) : (
                  documentsQueue.map((doc) => (
                    <tr key={doc.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                        {doc.userName}
                        <div style={{ fontSize: 11, color: "#64748B", fontWeight: 400 }}>{doc.userEmail}</div>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>
                        {doc.docType}
                      </td>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>
                        {doc.docName} ({doc.docSize || "PDF"})
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {new Date(doc.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            background:
                              doc.status === "Verified"
                                ? "#F0FDF4"
                                : doc.status === "Rejected"
                                ? "#FEF2F2"
                                : "#FFFBEB",
                            color:
                              doc.status === "Verified"
                                ? "#166534"
                                : doc.status === "Rejected"
                                ? "#991B1B"
                                : "#92400E",
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontWeight: 600,
                          }}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setReviewModalDoc(doc);
                            setReviewDecision(doc.status === "Verified" ? "Verified" : "Verified");
                            setReviewRemark(doc.verificationRemark || "");
                          }}
                          style={{
                            padding: "5px 10px",
                            background: "#1E293B",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 3,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Review Case
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CITIZEN REGISTRY */}
      {activeTab === "citizens" && (
        <div>
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 16, color: INK }}>
              Registered Citizen Profiles ({citizens.length})
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Permanent database accounts with access control role isolation.
            </p>
          </div>

          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              overflowX: "auto",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${RULE}`, color: INK }}>
                  <th style={{ padding: "10px 14px" }}>Citizen Name</th>
                  <th style={{ padding: "10px 14px" }}>System Role</th>
                  <th style={{ padding: "10px 14px" }}>Email / Mobile</th>
                  <th style={{ padding: "10px 14px" }}>State</th>
                  <th style={{ padding: "10px 14px" }}>Category</th>
                  <th style={{ padding: "10px 14px" }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {loadingCitizens ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      Loading citizen records...
                    </td>
                  </tr>
                ) : citizens.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                      No citizens registered.
                    </td>
                  </tr>
                ) : (
                  citizens.map((c) => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${RULE}` }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: INK }}>
                        <span style={{ marginRight: 6 }}>{c.avatar || "👤"}</span>
                        {c.name}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            background: c.systemRole === "admin" ? "#FEF3C7" : "#F1F5F9",
                            color: c.systemRole === "admin" ? "#92400E" : "#475569",
                            border: `1px solid ${c.systemRole === "admin" ? "#FCD34D" : "#CBD5E1"}`,
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontWeight: 700,
                          }}
                        >
                          {c.systemRole.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {c.email || c.mobile || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>
                        {c.state || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>
                        {c.category || "General"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
