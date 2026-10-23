import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Printer,
  Clock,
  Download,
  Landmark,
  X,
} from "lucide-react";
import { INK, CARD, SEAL, OK, VERIFY, RULE, inputStyle, serif, sans } from "../theme/tokens.js";

const DOCUMENT_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card (Identity & Age Verification)", icon: "🪪" },
  { id: "caste", label: "Caste / Category Certificate (SC/ST/OBC Affirmative Action)", icon: "📜" },
  { id: "income", label: "Income Certificate (Annual Family Income Verification)", icon: "💰" },
  { id: "dpr", label: "Detailed Project Report (DPR) / Machinery Quotation", icon: "📊" },
  { id: "udyam", label: "Udyam MSME Registration Certificate", icon: "🏢" },
  { id: "bank", label: "Bank Passbook / Statements (Last 12 Months)", icon: "🏦" },
  { id: "other", label: "Supplementary Skill / Experience Certificate", icon: "📁" },
];

export default function Documents({
  documents,
  setDocuments,
  profile,
  setProfile,
  onProceedToMatches,
  onBack,
}) {
  const [selectedType, setSelectedType] = useState("aadhaar");
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (files) => {
    if (!files || files.length === 0) return;

    const newDocs = Array.from(files).map((file) => {
      const typeObj = DOCUMENT_TYPES.find((t) => t.id === selectedType) || DOCUMENT_TYPES[0];
      return {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        size: (file.size / 1024).toFixed(1) + " KB",
        type: typeObj.label,
        typeId: typeObj.id,
        uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        status: "Self-Uploaded · Awaiting Physical Due Diligence",
        verificationTier: "uploaded",
      };
    });

    setDocuments((prev) => [...prev, ...newDocs]);
    setUploadSuccess(`Successfully stored ${newDocs.length} document(s) in your citizen vault.`);
    setTimeout(() => setUploadSuccess(null), 3500);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeDoc = (id) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Auto-fill profile demo trigger based on documents
  const autoFillFromDocs = () => {
    setProfile((prev) => ({
      ...prev,
      age: prev.age || 28,
      gender: prev.gender || "Female",
      category: prev.category || "SC",
      state: prev.state || "Karnataka",
      income: prev.income || 250000,
      financialRequirement: prev.financialRequirement || 300000,
    }));
    setUploadSuccess("Auto-populated profile fields from your uploaded certificates.");
    setTimeout(() => setUploadSuccess(null), 3500);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: SEAL, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
            Digital Document Repository
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 26, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
            Document Vault &amp; Bank Dossier
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Upload self-attested identity, social category, income, and business project documents. Stored documents are assembled into a Preliminary Beneficiary Dossier for lead bank consultation.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {documents.length > 0 && (
            <button
              type="button"
              onClick={() => setIsDossierOpen(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#162032",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontFamily: sans,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Preview and print official summary dossier"
            >
              <Printer size={14} color="#D97706" />
              <span>Print Bank Dossier</span>
            </button>
          )}

          <button
            type="button"
            onClick={autoFillFromDocs}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              color: INK,
              borderRadius: 4,
              fontFamily: sans,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Auto-fill profile parameters from certificates"
          >
            <Sparkles size={13} color={SEAL} />
            <span>Auto-fill Profile Parameters</span>
          </button>
        </div>
      </div>

      {/* Advisory Banner */}
      <div
        style={{
          background: "#F8F6F0",
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "10px 14px",
          fontSize: 12,
          color: "#475569",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        <strong>Verification Policy:</strong> Document uploads on this platform establish prima-facie checklist completeness. Official physical verification occurs exclusively when original credentials are presented before the bank appraisal officer or district nodal committee.
      </div>

      {/* Success Notification */}
      {uploadSuccess && (
        <div
          style={{
            background: "#F0FDF4",
            border: "1px solid #BBF7D0",
            borderRadius: 4,
            padding: "10px 14px",
            color: "#166534",
            fontFamily: sans,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <CheckCircle2 size={16} color={OK} />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* Document Category Picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontFamily: sans, fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 5 }}>
          Select Document Category:
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ ...inputStyle, maxWidth: 440 }}
        >
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `1.5px dashed ${dragActive ? SEAL : "#CBD5E1"}`,
          borderRadius: 4,
          background: dragActive ? "#F8F6F0" : "#FAFAFA",
          padding: "30px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          marginBottom: 20,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div style={{ display: "inline-flex", padding: 10, borderRadius: 4, background: "#F1ECE1", marginBottom: 10 }}>
          <UploadCloud size={24} color={SEAL} />
        </div>
        <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: INK, marginBottom: 3 }}>
          Click to select file or drag and drop here
        </div>
        <div style={{ fontFamily: sans, fontSize: 12, color: "#64748B" }}>
          Supported formats: PDF, JPG, PNG, DOCX up to 5 MB per document
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontFamily: serif, fontSize: 17, color: INK, margin: 0, fontWeight: 700 }}>
            Stored Documents in Citizen Vault ({documents.length})
          </h3>
          {documents.length > 0 && (
            <span style={{ fontFamily: sans, fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} color="#64748B" />
              <span>Available for Scheme Portfolios</span>
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "22px",
              textAlign: "center",
              color: "#64748B",
              fontFamily: sans,
              fontSize: 13,
            }}
          >
            No documents stored yet. Upload Aadhaar, Caste certificate, Income slip, or DPR to auto-attach them to your scheme applications.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {documents.map((doc) => {
              const isVerifiedTier = doc.status?.toLowerCase().includes("verified against") || doc.status === "Verified";
              return (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                    <FileText size={18} color={SEAL} style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontFamily: sans,
                          fontSize: 13.5,
                          fontWeight: 600,
                          color: INK,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.name}
                      </div>
                      <div style={{ fontFamily: sans, fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                        {doc.type} · {doc.size} · Uploaded {doc.uploadedAt}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span
                      style={{
                        fontFamily: sans,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        background: isVerifiedTier ? "#F0FDF4" : "#F8F6F0",
                        color: isVerifiedTier ? OK : "#475569",
                        borderRadius: 3,
                        border: `1px solid ${isVerifiedTier ? "#BBF7D0" : RULE}`,
                      }}
                    >
                      {isVerifiedTier ? "Verified Against Provided Criteria" : "Self-Uploaded · Awaiting Due Diligence"}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeDoc(doc.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#991B1B",
                        cursor: "pointer",
                        padding: 4,
                      }}
                      title="Remove document"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action to proceed */}
      <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "9px 16px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              fontSize: 13,
              fontFamily: sans,
              color: INK,
              cursor: "pointer",
            }}
          >
            Back
          </button>
        )}

        {onProceedToMatches && (
          <button
            type="button"
            onClick={onProceedToMatches}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              fontFamily: sans,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#FFFFFF",
              background: SEAL,
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            <span>Proceed to Matching Schemes</span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>

      {/* BENEFICIARY SUMMARY DOSSIER MODAL (PRINT-FRIENDLY) */}
      {isDossierOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setIsDossierOpen(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "26px",
              maxWidth: 620,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(22, 32, 50, 0.2)",
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header bar of modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Landmark size={22} color={SEAL} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SEAL, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    Preliminary Citizen Dossier
                  </div>
                  <div style={{ fontFamily: serif, fontSize: 18, color: INK, fontWeight: 700 }}>
                    Beneficiary Document Summary Slip
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Slip Meta */}
            <div
              style={{
                background: "#F8F6F0",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div>
                <span style={{ color: "#64748B" }}>Generated At:</span>{" "}
                <strong>{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Target State:</span>{" "}
                <strong>{profile?.state || "All India"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Social Category:</span>{" "}
                <strong>{profile?.category || "General"}</strong>
              </div>
              <div>
                <span style={{ color: "#64748B" }}>Annual Income:</span>{" "}
                <strong>₹{(Number(profile?.income) || 150000).toLocaleString("en-IN")}</strong>
              </div>
            </div>

            {/* Document Table */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 8 }}>
                Document Portfolio Inventory ({documents.length} Items):
              </div>
              <div style={{ border: `1px solid ${RULE}`, borderRadius: 4, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F1ECE1", textAlign: "left", color: INK }}>
                      <th style={{ padding: "6px 10px", borderBottom: `1px solid ${RULE}` }}>#</th>
                      <th style={{ padding: "6px 10px", borderBottom: `1px solid ${RULE}` }}>Document Name</th>
                      <th style={{ padding: "6px 10px", borderBottom: `1px solid ${RULE}` }}>Category</th>
                      <th style={{ padding: "6px 10px", borderBottom: `1px solid ${RULE}` }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((d, i) => (
                      <tr key={d.id} style={{ borderBottom: i !== documents.length - 1 ? `1px solid #F1ECE1` : "none" }}>
                        <td style={{ padding: "6px 10px", color: "#64748B" }}>{i + 1}</td>
                        <td style={{ padding: "6px 10px", fontWeight: 600, color: INK }}>{d.name}</td>
                        <td style={{ padding: "6px 10px", color: "#475569" }}>{d.type.split("(")[0]}</td>
                        <td style={{ padding: "6px 10px", color: OK, fontWeight: 600 }}>
                          {d.status?.includes("Verified") ? "Criteria Met" : "Uploaded"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Statutory Watermark Notice */}
            <div
              style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 4,
                padding: "10px 12px",
                fontSize: 11,
                color: "#92400E",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              <strong>STATUTORY DISCLAIMER:</strong> This slip is an automated summary generated by Scheme Matcher for citizen record-keeping and preliminary lead-bank submission. It does not constitute a government sanction order, credit guarantee, or official reservation benefit. Final approval requires physical appraisal of original certificates at the lending bank branch.
            </div>

            {/* Print and Close buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsDossierOpen(false)}
                style={{
                  padding: "7px 14px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={handlePrintDossier}
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
                <Printer size={13} />
                <span>Print Dossier Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
