import React, { useState, useEffect } from "react";
import {
  Landmark,
  FileText,
  Download,
  Printer,
  RefreshCw,
  Clock,
  History,
  ShieldCheck,
  AlertTriangle,
  X,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import { INK, PAPER, CARD, SEAL, OK, VERIFY, NO, RULE, serif, sans } from "../theme/tokens.js";
import { getStoredAuthToken } from "../data/demoProfiles.js";

export default function BankDossierModal({
  isOpen,
  onClose,
  currentUser,
  profile,
  documents = [],
  schemes = [],
  eligibilityResults = [],
  initialSchemeId = null,
}) {
  const [dossier, setDossier] = useState(null);
  const [dossierHistory, setDossierHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeView, setActiveView] = useState("preview"); // "preview" | "history"

  const token = getStoredAuthToken();

  // Load user dossiers on modal open
  useEffect(() => {
    if (isOpen && token) {
      loadDossiers();
    }
  }, [isOpen, token]);

  const loadDossiers = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/dossiers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDossierHistory(data.dossiers || []);
        if (data.dossiers && data.dossiers.length > 0) {
          setDossier(data.dossiers[0]);
        } else {
          // If no existing dossier, auto-create initial one
          await createNewDossier();
        }
      } else {
        setErrorMessage(data.error || "Failed to load dossier records.");
      }
    } catch (err) {
      setErrorMessage(err.message || "Network error loading dossiers.");
    } finally {
      setLoading(false);
    }
  };

  const createNewDossier = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      // Determine scheme IDs to include
      let schemeIds = [];
      if (initialSchemeId) {
        schemeIds = [initialSchemeId];
      } else if (Array.isArray(schemes) && schemes.length > 0) {
        schemeIds = schemes.slice(0, 5).map((s) => s.id);
      }

      const res = await fetch("/api/dossiers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemeIds,
          profileSnapshot: profile || currentUser || {},
          documentsSummary: documents || [],
          eligibilitySummary: eligibilityResults || [],
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDossier(data.dossier);
        setDossierHistory((prev) => [data.dossier, ...prev]);
        setActiveView("preview");
      } else {
        setErrorMessage(data.error || "Failed to generate bank dossier.");
      }
    } catch (err) {
      setErrorMessage(err.message || "Network error generating dossier.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!dossier) return;
    setRegenerating(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(dossier.id)}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDossier(data.dossier);
        setDossierHistory((prev) => [data.dossier, ...prev]);
        setActiveView("preview");
      } else {
        setErrorMessage(data.error || "Failed to regenerate dossier.");
      }
    } catch (err) {
      setErrorMessage(err.message || "Network error regenerating dossier.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPdf = async (dossierId = null) => {
    const targetId = dossierId || dossier?.id;
    if (!targetId) return;
    setDownloadingPdf(true);
    setErrorMessage("");
    try {
      const res = await fetch(`/api/dossiers/${encodeURIComponent(targetId)}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${dossier?.referenceNumber || "Bank_Dossier"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setErrorMessage(err.message || "Failed to download PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const currentProfile = dossier?.profileSnapshot || profile || currentUser || {};
  const currentSchemes = dossier?.schemeIds?.length > 0 && Array.isArray(schemes) && schemes.length > 0
    ? schemes.filter((s) => dossier.schemeIds.includes(s.id))
    : (dossier?.eligibilitySummary?.length > 0 ? dossier.eligibilitySummary : schemes.slice(0, 3));
  const currentDocs = dossier?.documentsSummary?.length > 0 ? dossier.documentsSummary : documents;

  return (
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
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderRadius: 6,
          maxWidth: 740,
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 20px 45px rgba(15, 23, 42, 0.25)",
          fontFamily: sans,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Header */}
        <div
          style={{
            padding: "16px 20px",
            background: "#0F1E36",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 4,
                background: "rgba(255, 255, 255, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E2B755",
              }}
            >
              <Landmark size={20} />
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "#E2B755", fontWeight: 700 }}>
                Government of India · Lead Bank Submission Slip
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: serif }}>
                Bank Dossier & Citizen Portfolio Slip
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", background: "rgba(255, 255, 255, 0.1)", borderRadius: 4, padding: 2 }}>
              <button
                type="button"
                onClick={() => setActiveView("preview")}
                style={{
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                  background: activeView === "preview" ? "#FFFFFF" : "transparent",
                  color: activeView === "preview" ? "#0F1E36" : "#CBD5E1",
                }}
              >
                Current Dossier
              </button>
              <button
                type="button"
                onClick={() => setActiveView("history")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 3,
                  cursor: "pointer",
                  background: activeView === "history" ? "#FFFFFF" : "transparent",
                  color: activeView === "history" ? "#0F1E36" : "#CBD5E1",
                }}
              >
                <History size={12} />
                <span>History ({dossierHistory.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#94A3B8",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            style={{
              padding: "10px 16px",
              background: "#FEF2F2",
              borderBottom: "1px solid #FCA5A5",
              color: "#991B1B",
              fontSize: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
          {loading && !dossier ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748B" }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: "0 auto 12px auto" }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Loading official bank dossier record...</div>
            </div>
          ) : activeView === "history" ? (
            /* DOSSIER HISTORY VIEW */
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Dossier Generation History</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Track all previously generated submission dossiers and download archived PDF copies.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={createNewDossier}
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    background: SEAL,
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                  <span>Generate New Dossier</span>
                </button>
              </div>

              {dossierHistory.length === 0 ? (
                <div style={{ padding: "30px 0", textAlign: "center", color: "#64748B", fontSize: 13 }}>
                  No historical dossiers found. Click "Generate New Dossier" to create one.
                </div>
              ) : (
                <div style={{ border: `1px solid ${RULE}`, borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8F6F0", textAlign: "left", color: INK, borderBottom: `1px solid ${RULE}` }}>
                        <th style={{ padding: "8px 12px" }}>Reference</th>
                        <th style={{ padding: "8px 12px" }}>Generated At</th>
                        <th style={{ padding: "8px 12px" }}>Schemes</th>
                        <th style={{ padding: "8px 12px" }}>Documents</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dossierHistory.map((h, i) => (
                        <tr
                          key={h.id}
                          style={{
                            borderBottom: i !== dossierHistory.length - 1 ? `1px solid #F1ECE1` : "none",
                            background: dossier?.id === h.id ? "#FEF9C3" : "transparent",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 700, color: SEAL }}>
                            {h.referenceNumber}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>
                            {new Date(h.generatedAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>
                            {h.schemeIds?.length || 0} Schemes
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>
                            {h.documentsSummary?.length || 0} Files
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDossier(h);
                                  setActiveView("preview");
                                }}
                                style={{
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  background: "#FFFFFF",
                                  border: `1px solid ${RULE}`,
                                  borderRadius: 3,
                                  cursor: "pointer",
                                }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(h.id)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  background: "#0F1E36",
                                  color: "#FFFFFF",
                                  border: "none",
                                  borderRadius: 3,
                                  cursor: "pointer",
                                }}
                              >
                                <Download size={11} />
                                <span>PDF</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* DOSSIER PREVIEW */
            <div>
              {/* Dossier Meta Top Banner */}
              <div
                style={{
                  background: "#F8F6F0",
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  padding: "14px 16px",
                  marginBottom: 16,
                  display: "grid",
                  gridTemplateColumns: "1.4fr 1fr",
                  gap: 12,
                  fontSize: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>
                    Official Reference Number
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: SEAL, letterSpacing: 0.5, marginTop: 2 }}>
                    {dossier?.referenceNumber || "DOS-PENDING-REF"}
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                    Issued: {dossier?.generatedAt ? new Date(dossier.generatedAt).toLocaleString("en-IN") : "Current Session"}
                  </div>
                </div>

                <div style={{ borderLeft: `1px solid ${RULE}`, paddingLeft: 12 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: "#64748B", fontWeight: 700 }}>
                    Submission Target
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, marginTop: 2 }}>
                    Lead Bank Branch / District Industries Centre
                  </div>
                  <div style={{ fontSize: 11, color: OK, fontWeight: 600, marginTop: 4 }}>
                    ✓ Ready for Branch Document Appraisal
                  </div>
                </div>
              </div>

              {/* Beneficiary Details Grid */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  1. Beneficiary Demographics
                </div>
                <div
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    padding: "12px 14px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ color: "#64748B" }}>Applicant Name:</span>{" "}
                    <strong>{currentProfile.name || "Citizen Beneficiary"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Target State:</span>{" "}
                    <strong>{currentProfile.state || "All India"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Social Category:</span>{" "}
                    <strong>{currentProfile.category || "General"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Annual Income:</span>{" "}
                    <strong style={{ color: "#166534" }}>
                      ₹{(Number(currentProfile.income) || 150000).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Age:</span>{" "}
                    <strong>{currentProfile.age ? `${currentProfile.age} Years` : "Adult (18+)"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "#64748B" }}>Occupation:</span>{" "}
                    <strong>{currentProfile.occupation || currentProfile.businessType || "Self-Employed"}</strong>
                  </div>
                </div>
              </div>

              {/* Evaluated Schemes Section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  2. Evaluated Schemes & Verified Criteria
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currentSchemes.map((s, idx) => (
                    <div
                      key={s.id || idx}
                      style={{
                        background: "#FAFAFA",
                        border: `1px solid ${RULE}`,
                        borderRadius: 4,
                        padding: "10px 12px",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: INK }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                            {s.ministry || "Ministry of Social Justice & Empowerment"}
                          </div>
                        </div>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            background: "#DCFCE7",
                            color: "#166534",
                            border: "1px solid #86EFAC",
                          }}
                        >
                          ELIGIBLE
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#334155", marginTop: 6 }}>
                        <strong>Assistance:</strong> {s.benefits || "Direct financial assistance / credit support"}
                      </div>
                      {s.portalUrl && (
                        <div style={{ fontSize: 11, color: "#0369A1", marginTop: 4 }}>
                          Source Link: <a href={s.portalUrl} target="_blank" rel="noreferrer" style={{ color: "#0369A1" }}>{s.portalUrl}</a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Inventory Section */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  3. Document Portfolio Verification Status
                </div>
                <div style={{ border: `1px solid ${RULE}`, borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#F8F6F0", textAlign: "left", color: INK, borderBottom: `1px solid ${RULE}` }}>
                        <th style={{ padding: "6px 10px" }}>#</th>
                        <th style={{ padding: "6px 10px" }}>Document Name</th>
                        <th style={{ padding: "6px 10px" }}>Category</th>
                        <th style={{ padding: "6px 10px" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentDocs.map((d, i) => {
                        const isV = d.verificationStatus?.includes("Verified") || d.status === "Verified";
                        return (
                          <tr key={d.id || i} style={{ borderBottom: i !== currentDocs.length - 1 ? `1px solid #F1ECE1` : "none" }}>
                            <td style={{ padding: "6px 10px", color: "#64748B" }}>{i + 1}</td>
                            <td style={{ padding: "6px 10px", fontWeight: 600, color: INK }}>{d.name}</td>
                            <td style={{ padding: "6px 10px", color: "#475569" }}>{(d.type || "").split("(")[0]}</td>
                            <td style={{ padding: "6px 10px" }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 600,
                                  color: isV ? "#166534" : "#B45309",
                                }}
                              >
                                {isV ? "✓ Verified Against Criteria" : "⚠ Under Review"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Statutory Disclaimer Notice */}
              <div
                style={{
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: 4,
                  padding: "12px 14px",
                  fontSize: 11,
                  color: "#92400E",
                  lineHeight: 1.5,
                }}
              >
                <strong>STATUTORY DISCLAIMER:</strong> This dossier is system-generated and is not an official approval or guarantee of funding. Scheme Matcher provides automated eligibility matching based on self-reported citizen profile data. Sanction and disbursement remain subject to independent physical verification of original documents, field inspection, and statutory credit appraisal by the participating financial institution or designated nodal agency.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            padding: "14px 20px",
            background: "#F8F6F0",
            borderTop: `1px solid ${RULE}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={regenerating || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 12px",
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                fontSize: 12,
                color: INK,
                cursor: "pointer",
                fontWeight: 600,
              }}
              title="Regenerate dossier using latest profile and document status"
            >
              <RefreshCw size={13} className={regenerating ? "animate-spin" : ""} />
              <span>{regenerating ? "Regenerating..." : "Regenerate with Current Data"}</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "7px 14px",
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                fontSize: 12.5,
                cursor: "pointer",
                color: "#475569",
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: "#E2E8F0",
                color: INK,
                border: `1px solid #CBD5E1`,
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Printer size={13} />
              <span>Print Slip</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownloadPdf()}
              disabled={downloadingPdf || !dossier}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 16px",
                background: SEAL,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download size={14} className={downloadingPdf ? "animate-spin" : ""} />
              <span>{downloadingPdf ? "Generating PDF..." : "Download Official PDF"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
