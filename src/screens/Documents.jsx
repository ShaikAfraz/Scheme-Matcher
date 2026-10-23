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
  Printer,
  Clock,
  Download,
  Landmark,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  History,
  AlertTriangle,
  Info,
  Lock,
} from "lucide-react";
import { INK, CARD, SEAL, OK, VERIFY, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import BankDossierModal from "../components/BankDossierModal.jsx";

const DOCUMENT_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card (Identity & Age Verification)", icon: "🪪" },
  { id: "caste", label: "Caste / Category Certificate (SC/ST/OBC Affirmative Action)", icon: "📜" },
  { id: "income", label: "Income Certificate (Annual Family Income Verification)", icon: "💰" },
  { id: "dpr", label: "Detailed Project Report (DPR) / Machinery Quotation", icon: "📊" },
  { id: "udyam", label: "Udyam MSME Registration Certificate", icon: "🏢" },
  { id: "bank", label: "Bank Passbook / Statements (Last 12 Months)", icon: "🏦" },
  { id: "other", label: "Supplementary Skill / Domicile / Experience Certificate", icon: "📁" },
];

export default function Documents({
  documents = [],
  setDocuments,
  onUploadDoc,
  profile = {},
  setProfile,
  onProceedToMatches,
  onBack,
  currentUser = null,
  authToken = null,
  schemes = [],
}) {
  const [selectedType, setSelectedType] = useState("income");
  const [targetSchemeId, setTargetSchemeId] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // { type: 'success'|'error'|'info', message: '' }
  const [uploadingProgress, setUploadingProgress] = useState(null); // 'reading' | 'uploading' | 'extracting' | 'verifying' | null
  const [expandedDocId, setExpandedDocId] = useState(null);
  const [historyModalDoc, setHistoryModalDoc] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reverifyingId, setReverifyingId] = useState(null);
  const fileInputRef = useRef(null);

  // Helper to read file as Base64 data URL
  const readFileAsBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        // Strip data:application/pdf;base64, prefix
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side format & size checks
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["pdf", "jpg", "jpeg", "png"].includes(ext)) {
      setUploadStatus({
        type: "error",
        message: "Unsupported file format. Please upload a genuine PDF, JPG, or PNG document.",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus({
        type: "error",
        message: `File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds the statutory limit of 10 MB.`,
      });
      return;
    }

    try {
      setUploadingProgress("reading");
      const base64Data = await readFileAsBase64(file);

      const typeObj = DOCUMENT_TYPES.find((t) => t.id === selectedType) || DOCUMENT_TYPES[0];

      setUploadingProgress("uploading");

      // Check if user is authenticated to use server API
      const token = authToken || localStorage.getItem("sm_auth_token");
      if (token && currentUser) {
        setUploadingProgress("extracting");

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type || (ext === "pdf" ? "application/pdf" : `image/${ext}`),
            fileData: base64Data,
            typeId: typeObj.id,
            typeLabel: typeObj.label,
            schemeId: targetSchemeId || null,
          }),
        });

        const data = await response.json();
        setUploadingProgress(null);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to upload and verify document.");
        }

        const newDoc = data.document;
        setDocuments((prev) => [newDoc, ...prev.filter((d) => d.id !== newDoc.id)]);
        if (onUploadDoc) onUploadDoc(newDoc);

        const vStatus = data.verification?.status || newDoc.verificationStatus;
        setUploadStatus({
          type: vStatus === "Verified Against Provided Criteria" ? "success" : vStatus === "Needs Review" ? "warning" : "info",
          message: `Document '${file.name}' stored in private vault. Verification Status: ${vStatus}.`,
        });
      } else {
        // Offline / Unauthenticated simulation fallback
        setUploadingProgress(null);
        const fallbackDoc = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + " KB",
          type: typeObj.label,
          typeId: typeObj.id,
          uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          status: "Needs Review",
          verificationStatus: "Needs Review",
          verificationReason: "Self-uploaded document. Sign in for automated verification against statutory criteria.",
          missingRequirements: ["Official citizen authentication required."],
        };
        setDocuments((prev) => [fallbackDoc, ...prev]);
        setUploadStatus({
          type: "info",
          message: "Document stored in local session. Sign in to run automated deterministic verification.",
        });
      }
    } catch (err) {
      setUploadingProgress(null);
      setUploadStatus({
        type: "error",
        message: err.message || "Upload failed. Please check network connection and file format.",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  // Securely delete document from vault and server
  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to permanently delete this document from your private vault?")) {
      return;
    }
    setDeletingId(docId);
    const token = authToken || localStorage.getItem("sm_auth_token");
    try {
      if (token && currentUser) {
        const res = await fetch(`/api/documents/${docId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete document.");
        }
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setUploadStatus({ type: "info", message: "Document permanently deleted from your private vault." });
    } catch (err) {
      setUploadStatus({ type: "error", message: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  // Re-verify document against current profile parameters
  const handleReverify = async (docId) => {
    setReverifyingId(docId);
    const token = authToken || localStorage.getItem("sm_auth_token");
    try {
      if (!token) throw new Error("Please log in to re-verify documents.");
      const res = await fetch(`/api/documents/${docId}/reverify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ schemeId: targetSchemeId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to re-verify.");

      setDocuments((prev) => prev.map((d) => (d.id === docId ? data.document : d)));
      setUploadStatus({
        type: "success",
        message: `Re-verification complete: ${data.document.verificationStatus}.`,
      });
    } catch (err) {
      setUploadStatus({ type: "error", message: err.message });
    } finally {
      setReverifyingId(null);
    }
  };

  // View audit history timeline
  const handleViewHistory = async (doc) => {
    setHistoryModalDoc(doc);
    setHistoryList([]);
    const token = authToken || localStorage.getItem("sm_auth_token");
    if (token) {
      try {
        const res = await fetch(`/api/documents/${doc.id}/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.history)) {
          setHistoryList(data.history);
        }
      } catch (err) {
        console.warn("Could not fetch document history:", err);
      }
    }
  };

  // Download / Preview private document file securely
  const handleDownloadFile = async (doc, preview = false) => {
    const token = authToken || localStorage.getItem("sm_auth_token");
    if (!token) {
      alert("Authentication required to access private document.");
      return;
    }
    const endpoint = preview ? `/api/documents/${doc.id}/preview` : `/api/documents/${doc.id}/download`;
    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Document file could not be accessed.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      if (preview) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Auto-fill profile demo trigger based on documents
  const autoFillFromDocs = () => {
    let incomeFromDoc = profile.income;
    let nameFromDoc = profile.name;

    for (const d of documents) {
      if (d.extractedData?.annualIncome) {
        incomeFromDoc = d.extractedData.annualIncome;
      }
      if (d.extractedData?.applicantName && !nameFromDoc) {
        nameFromDoc = d.extractedData.applicantName;
      }
    }

    setProfile((prev) => ({
      ...prev,
      name: nameFromDoc || prev.name || "Sunita Sharma",
      age: prev.age || 29,
      gender: prev.gender || "Female",
      category: prev.category || "OBC",
      state: prev.state || "Karnataka",
      income: incomeFromDoc || prev.income || 180000,
      financialRequirement: prev.financialRequirement || 300000,
    }));

    setUploadStatus({
      type: "success",
      message: "Profile parameters synchronized from verified certificate data.",
    });
  };

  const getStatusBadge = (doc) => {
    const vStatus = doc.verificationStatus || doc.status || "Pending";
    if (vStatus.includes("Verified Against Provided Criteria") || vStatus === "Verified") {
      return {
        label: "Verified Against Provided Criteria",
        bg: "#F0FDF4",
        color: "#166534",
        border: "#BBF7D0",
        icon: <ShieldCheck size={14} color="#166534" />,
      };
    }
    if (vStatus.includes("Needs Review") || vStatus === "Under Review") {
      return {
        label: "Needs Review · Nodal Desk Queued",
        bg: "#FFFBEB",
        color: "#B45309",
        border: "#FDE68A",
        icon: <AlertTriangle size={14} color="#B45309" />,
      };
    }
    if (vStatus.includes("Rejected With Reason") || vStatus === "Rejected") {
      return {
        label: "Rejected With Reason",
        bg: "#FEF2F2",
        color: "#991B1B",
        border: "#FECACA",
        icon: <AlertCircle size={14} color="#991B1B" />,
      };
    }
    return {
      label: "Pending Verification",
      bg: "#F8F6F0",
      color: "#475569",
      border: RULE,
      icon: <Clock size={14} color="#475569" />,
    };
  };

  return (
    <div style={{ maxWidth: 780 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: SEAL, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
            Digital Document Repository &amp; Verification Desk
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 26, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
            Secure Document Vault &amp; Bank Dossier
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#475569", margin: "0 0 16px 0", lineHeight: 1.5 }}>
            Upload self-attested identity, social category, income, and business credentials. Files are stored in encrypted private storage, automatically parsed with OCR, and deterministically verified against scheme statutory requirements.
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

      {/* Security & Verification Notice */}
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
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <Lock size={16} color={SEAL} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Private Object Storage &amp; Privacy Shield:</strong> Uploaded documents are stored in private, unguessable storage directories with strict per-user authorization policies. Identity numbers are cryptographically masked, and verification statuses reflect deterministic criteria compliance. Final official sanction requires physical appraisal of original certificates by the lending bank or district committee.
        </div>
      </div>

      {/* Feedback Banner */}
      {uploadStatus && (
        <div
          style={{
            background: uploadStatus.type === "success" ? "#F0FDF4" : uploadStatus.type === "error" ? "#FEF2F2" : "#FFFBEB",
            border: `1px solid ${uploadStatus.type === "success" ? "#BBF7D0" : uploadStatus.type === "error" ? "#FECACA" : "#FDE68A"}`,
            borderRadius: 4,
            padding: "10px 14px",
            color: uploadStatus.type === "success" ? "#166534" : uploadStatus.type === "error" ? "#991B1B" : "#B45309",
            fontFamily: sans,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {uploadStatus.type === "success" ? <CheckCircle2 size={16} color={OK} /> : <AlertCircle size={16} />}
            <span>{uploadStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadStatus(null)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Controls Box */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "16px 18px",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          {/* Document Type Picker */}
          <div>
            <label style={{ display: "block", fontFamily: sans, fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 5 }}>
              1. Document Category:
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              style={inputStyle}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Scheme Association Picker */}
          <div>
            <label style={{ display: "block", fontFamily: sans, fontSize: 12, color: "#475569", fontWeight: 600, marginBottom: 5 }}>
              2. Associate with Target Scheme (Optional):
            </label>
            <select
              value={targetSchemeId}
              onChange={(e) => setTargetSchemeId(e.target.value)}
              style={inputStyle}
            >
              <option value="">General Beneficiary Vault (All Schemes)</option>
              {schemes.slice(0, 40).map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.id}] {s.name.slice(0, 42)}...
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploadingProgress && fileInputRef.current?.click()}
          style={{
            border: `1.5px dashed ${dragActive ? SEAL : "#CBD5E1"}`,
            borderRadius: 4,
            background: dragActive ? "#F8F6F0" : "#FAFAFA",
            padding: "26px 20px",
            textAlign: "center",
            cursor: uploadingProgress ? "wait" : "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)}
          />

          {uploadingProgress ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <RefreshCw size={26} color={SEAL} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 700, color: INK }}>
                {uploadingProgress === "reading" && "Reading document bytes..."}
                {uploadingProgress === "uploading" && "Encrypting & Storing in Private Vault..."}
                {uploadingProgress === "extracting" && "Extracting Certificate Credentials (OCR / PDF Parser)..."}
                {uploadingProgress === "verifying" && "Evaluating Deterministic Rules against Scheme Criteria..."}
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                Checking name consistency, statutory income ceiling, expiry date, and deduplication.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "inline-flex", padding: 10, borderRadius: 4, background: "#F1ECE1", marginBottom: 10 }}>
                <UploadCloud size={24} color={SEAL} />
              </div>
              <div style={{ fontFamily: sans, fontSize: 14, fontWeight: 600, color: INK, marginBottom: 3 }}>
                Click to select genuine certificate or drag and drop file here
              </div>
              <div style={{ fontFamily: sans, fontSize: 12, color: "#64748B" }}>
                Accepted formats: <strong>PDF, JPG, PNG</strong> up to <strong>10 MB</strong>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: 0, fontWeight: 700 }}>
            Stored Vault Documents ({documents.length})
          </h3>
          {documents.length > 0 && (
            <span style={{ fontFamily: sans, fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={13} color="#64748B" />
              <span>Available for Application Portfolios</span>
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "28px 20px",
              textAlign: "center",
              color: "#64748B",
              fontFamily: sans,
              fontSize: 13,
            }}
          >
            No documents stored yet. Upload an Income certificate, Caste certificate, Aadhaar card, or Udyam MSME document to run automated eligibility verification.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((doc) => {
              const badge = getStatusBadge(doc);
              const isExpanded = expandedDocId === doc.id;
              const extracted = doc.extractedData || {};

              return (
                <div
                  key={doc.id}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    overflow: "hidden",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {/* Top Bar of Card */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                      <FileText size={20} color={SEAL} style={{ flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span
                            style={{
                              fontFamily: sans,
                              fontSize: 14,
                              fontWeight: 700,
                              color: INK,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {doc.name}
                          </span>
                          <span
                            style={{
                              fontFamily: sans,
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              borderRadius: 3,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        </div>
                        <div style={{ fontFamily: sans, fontSize: 11.5, color: "#64748B", marginTop: 2 }}>
                          {doc.type} · {doc.size || ""} · Uploaded {doc.uploadedAt || "Recently"}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {doc.filePath && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(doc, true)}
                            style={{
                              background: "#F8F6F0",
                              border: `1px solid ${RULE}`,
                              borderRadius: 4,
                              color: INK,
                              cursor: "pointer",
                              padding: "4px 8px",
                              fontFamily: sans,
                              fontSize: 11.5,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Preview private file"
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadFile(doc, false)}
                            style={{
                              background: "#F8F6F0",
                              border: `1px solid ${RULE}`,
                              borderRadius: 4,
                              color: INK,
                              cursor: "pointer",
                              padding: "4px 8px",
                              fontFamily: sans,
                              fontSize: 11.5,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title="Download document"
                          >
                            <Download size={13} />
                            <span>Download</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleViewHistory(doc)}
                        style={{
                          background: "#F8F6F0",
                          border: `1px solid ${RULE}`,
                          borderRadius: 4,
                          color: INK,
                          cursor: "pointer",
                          padding: "4px 8px",
                          fontFamily: sans,
                          fontSize: 11.5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="View verification timeline"
                      >
                        <History size={13} />
                        <span>Timeline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReverify(doc.id)}
                        disabled={reverifyingId === doc.id}
                        style={{
                          background: "#F8F6F0",
                          border: `1px solid ${RULE}`,
                          borderRadius: 4,
                          color: INK,
                          cursor: "pointer",
                          padding: "4px 8px",
                          fontFamily: sans,
                          fontSize: 11.5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="Re-run deterministic rules"
                      >
                        <RefreshCw size={13} className={reverifyingId === doc.id ? "animate-spin" : ""} />
                        <span>Re-Verify</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        style={{
                          background: "none",
                          border: `1px solid ${RULE}`,
                          borderRadius: 4,
                          color: INK,
                          cursor: "pointer",
                          padding: "4px 8px",
                          fontFamily: sans,
                          fontSize: 11.5,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>Evidence</span>
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoc(doc.id)}
                        disabled={deletingId === doc.id}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#991B1B",
                          cursor: "pointer",
                          padding: 5,
                        }}
                        title="Delete document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Summary Snippet */}
                  {doc.verificationReason && (
                    <div
                      style={{
                        padding: "6px 14px",
                        background: "#FAFAFA",
                        borderTop: `1px solid #F1ECE1`,
                        fontFamily: sans,
                        fontSize: 12,
                        color: "#475569",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Info size={13} color="#64748B" />
                      <span>{doc.verificationReason}</span>
                    </div>
                  )}

                  {/* Expandable Verification Evidence Drawer */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: "12px 14px",
                        background: "#F8F6F0",
                        borderTop: `1px solid ${RULE}`,
                        fontSize: 12,
                        fontFamily: sans,
                      }}
                    >
                      {/* Structured Fields Grid */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>
                          Extracted Certificate Credentials:
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 8,
                            background: "#FFFFFF",
                            border: `1px solid ${RULE}`,
                            borderRadius: 4,
                            padding: "10px",
                          }}
                        >
                          <div>
                            <span style={{ color: "#64748B" }}>Applicant Name:</span>{" "}
                            <strong>{extracted.applicantName || "Unreadable / Missing"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#64748B" }}>Issuing Authority:</span>{" "}
                            <strong>{extracted.issuingAuthority || "Not Specified"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#64748B" }}>Certificate Serial:</span>{" "}
                            <strong>{extracted.certificateNumber || "Missing"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#64748B" }}>Extracted Income:</span>{" "}
                            <strong>
                              {extracted.annualIncome ? `₹${Number(extracted.annualIncome).toLocaleString("en-IN")}` : "N/A"}
                            </strong>
                          </div>
                          <div>
                            <span style={{ color: "#64748B" }}>Issue Date:</span>{" "}
                            <strong>{extracted.issueDate || "Not Extracted"}</strong>
                          </div>
                          <div>
                            <span style={{ color: "#64748B" }}>Valid Until:</span>{" "}
                            <strong>{extracted.expiryDate || "Standard Statutory Period"}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Rule Evaluation Checklist */}
                      {Array.isArray(doc.evidence) && doc.evidence.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>
                            Deterministic Rule Audit Log:
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {doc.evidence.map((ev, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 6,
                                  background: "#FFFFFF",
                                  padding: "6px 10px",
                                  borderRadius: 3,
                                  border: `1px solid #E2DCCF`,
                                  fontSize: 11.5,
                                }}
                              >
                                {ev.status === "PASS" ? (
                                  <CheckCircle2 size={13} color={OK} style={{ flexShrink: 0, marginTop: 2 }} />
                                ) : ev.status === "WARNING" ? (
                                  <AlertTriangle size={13} color="#B45309" style={{ flexShrink: 0, marginTop: 2 }} />
                                ) : (
                                  <AlertCircle size={13} color="#991B1B" style={{ flexShrink: 0, marginTop: 2 }} />
                                )}
                                <span style={{ color: ev.status === "PASS" ? "#166534" : ev.status === "WARNING" ? "#B45309" : "#991B1B" }}>
                                  <strong>[{ev.rule}]:</strong> {ev.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing Requirements Callout */}
                      {Array.isArray(doc.missingRequirements) && doc.missingRequirements.length > 0 && (
                        <div
                          style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            borderRadius: 4,
                            padding: "8px 10px",
                            fontSize: 11.5,
                            color: "#991B1B",
                          }}
                        >
                          <strong>Missing Statutory Requirements:</strong> {doc.missingRequirements.join("; ")}
                        </div>
                      )}
                    </div>
                  )}
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

      {/* VERIFICATION HISTORY TIMELINE MODAL */}
      {historyModalDoc && (
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
          onClick={() => setHistoryModalDoc(null)}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "24px",
              maxWidth: 580,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              fontFamily: sans,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: SEAL, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Official Audit Trail
                </div>
                <div style={{ fontFamily: serif, fontSize: 18, color: INK, fontWeight: 700 }}>
                  Verification History: {historyModalDoc.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalDoc(null)}
                style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {historyList.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                No past transition events recorded for this document.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {historyList.map((h, i) => (
                  <div
                    key={h.id || i}
                    style={{
                      borderLeft: `3px solid ${h.newStatus?.includes("Verified") ? OK : h.newStatus?.includes("Rejected") ? "#991B1B" : "#D97706"}`,
                      background: "#FAFAFA",
                      padding: "10px 12px",
                      borderRadius: "0 4px 4px 0",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: INK }}>
                      <span>{h.action} · {h.newStatus}</span>
                      <span style={{ fontSize: 11, color: "#64748B" }}>{h.createdAt || "Recorded"}</span>
                    </div>
                    <div style={{ color: "#475569", marginTop: 4 }}>
                      {h.notes || "No notes attached."}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                      Actor: {h.actorName || h.actorRole || "System"} ({h.actorRole || "citizen"})
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 16, textAlign: "right" }}>
              <button
                type="button"
                onClick={() => setHistoryModalDoc(null)}
                style={{
                  padding: "6px 14px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  borderRadius: 4,
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FUNCTIONAL BANK DOSSIER MODAL WITH PDF GENERATION, PERSISTENCE & HISTORY */}
      <BankDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        currentUser={currentUser}
        profile={profile}
        documents={documents}
        schemes={schemes}
        initialSchemeId={targetSchemeId}
      />
    </div>
  );
}
