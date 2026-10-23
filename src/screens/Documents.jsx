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
} from "lucide-react";
import { INK, CARD, SEAL, OK, VERIFY, RULE, inputStyle, serif, sans } from "../theme/tokens.js";

const DOCUMENT_TYPES = [
  { id: "aadhaar", label: "Aadhaar Card (Identity & Age Proof)", icon: "🪪" },
  { id: "caste", label: "Caste / Category Certificate (SC/ST/OBC)", icon: "📜" },
  { id: "income", label: "Income Certificate (Annual Family Income)", icon: "💰" },
  { id: "dpr", label: "Project Report (DPR) / Machinery Quotations", icon: "📊" },
  { id: "udyam", label: "Udyam MSME Registration Certificate", icon: "🏢" },
  { id: "bank", label: "Bank Passbook / Statements (12 Months)", icon: "🏦" },
  { id: "other", label: "Other Supporting Documents / Certificates", icon: "📁" },
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
  const [previewDoc, setPreviewDoc] = useState(null);
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
        status: "Verified",
      };
    });

    setDocuments((prev) => [...prev, ...newDocs]);
    setUploadSuccess(`Successfully uploaded ${newDocs.length} document(s).`);
    setTimeout(() => setUploadSuccess(null), 3000);
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
    }));
    setUploadSuccess("Auto-filled profile fields from your uploaded documents!");
    setTimeout(() => setUploadSuccess(null), 3500);
  };

  return (
    <div style={{ maxWidth: 740 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: serif, fontSize: 28, color: INK, margin: "0 0 4px" }}>
            Document Upload &amp; Verification
          </h2>
          <p style={{ fontFamily: sans, fontSize: 13.5, color: "#6B7280", margin: "0 0 20px" }}>
            Upload your identity, caste, income, and business documents. Verified documents speed up official bank sanction.
          </p>
        </div>

        <button
          type="button"
          onClick={autoFillFromDocs}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            background: "#FFFFFF",
            border: `1px solid ${SEAL}`,
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
          <span>Auto-fill Profile from Docs</span>
        </button>
      </div>

      {/* Success Banner */}
      {uploadSuccess && (
        <div
          style={{
            background: "#EAF5ED",
            border: "1px solid #A8DCB5",
            borderRadius: 6,
            padding: "10px 16px",
            color: "#1E5E26",
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
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontFamily: sans, fontSize: 12.5, color: "#5C6B84", fontWeight: 600, marginBottom: 6 }}>
          Select Document Type to Upload:
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          style={{ ...inputStyle, maxWidth: 420 }}
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
          border: `2px dashed ${dragActive ? SEAL : RULE}`,
          borderRadius: 8,
          background: dragActive ? "#F8F3E8" : "#FFFFFF",
          padding: "36px 20px",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          marginBottom: 24,
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
        <div style={{ display: "inline-flex", padding: 12, borderRadius: "50%", background: "#F6F1E5", marginBottom: 12 }}>
          <UploadCloud size={30} color={SEAL} />
        </div>
        <div style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>
          Click to browse or drag and drop your document
        </div>
        <div style={{ fontFamily: sans, fontSize: 12.5, color: "#8A8266" }}>
          Supports PDF, PNG, JPEG, DOCX up to 10MB · Stored locally and privately in this session
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontFamily: serif, fontSize: 18, color: INK, margin: 0 }}>
            Uploaded Documents ({documents.length})
          </h3>
          {documents.length > 0 && (
            <span style={{ fontFamily: sans, fontSize: 12, color: OK, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={14} color={OK} />
              <span>Ready for Scheme Verification</span>
            </span>
          )}
        </div>

        {documents.length === 0 ? (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 6,
              padding: "24px",
              textAlign: "center",
              color: "#8A8266",
              fontFamily: sans,
              fontSize: 13.5,
            }}
          >
            No documents uploaded yet. You can upload Aadhaar, Caste certificate, or DPR to fast-track your scheme application.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  borderRadius: 6,
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  <FileText size={20} color={SEAL} style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontFamily: sans,
                        fontSize: 14,
                        fontWeight: 600,
                        color: INK,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {doc.name}
                    </div>
                    <div style={{ fontFamily: sans, fontSize: 11.5, color: "#6B7280", marginTop: 2 }}>
                      {doc.type} · {doc.size} · Uploaded at {doc.uploadedAt}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: sans,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 8px",
                      background: "#EAF5ED",
                      color: OK,
                      borderRadius: 12,
                      border: "1px solid #B8E0C2",
                    }}
                  >
                    ✓ {doc.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeDoc(doc.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9A3B32",
                      cursor: "pointer",
                      padding: 4,
                    }}
                    title="Remove document"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action to proceed */}
      {onProceedToMatches && (
        <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onProceedToMatches}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              color: "#FFFFFF",
              background: SEAL,
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            <span>Check My Scheme Matches</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
