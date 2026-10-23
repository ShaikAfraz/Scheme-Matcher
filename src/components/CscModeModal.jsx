import React from "react";
import { X, Printer, PhoneCall, ShieldAlert, CheckCircle2, Building, UserCheck } from "lucide-react";
import { INK, CARD, SEAL, OK, RULE, serif, sans } from "../theme/tokens.js";
import { formatINR } from "../engine/matcher.js";

export const HELPLINES = [
  {
    dept: "National SC / ST Helpline (Ministry of Social Justice)",
    number: "14566",
    timing: "24x7 Toll-Free",
    note: "Assistance for SC/ST credit schemes, grievance redressal, and Stand-Up India issues.",
  },
  {
    dept: "National Safai Karamcharis Helpline (NSKFDC)",
    number: "1800-200-2131",
    timing: "Mon–Fri 9:30 AM – 6:00 PM",
    note: "Direct queries for sanitation workers, manual scavenger rehabilitation, and mechanized cleaning loans.",
  },
  {
    dept: "National Backward Classes Helpline (NBCFDC)",
    number: "1800-180-6025",
    timing: "Toll-Free, Working Hours",
    note: "Inquiries regarding OBC concessional term loans, interest subvention, and State Channelising Agencies.",
  },
  {
    dept: "Department of Empowerment of Persons with Disabilities (DEPwD / NHFDC)",
    number: "1800-22-2014",
    timing: "Toll-Free Helpline",
    note: "Divyangjan Swavalamban Yojana queries and disability-friendly loan assistance.",
  },
  {
    dept: "PM SVANidhi Street Vendor Toll-Free",
    number: "1800-11-1979",
    timing: "Mon–Sat 9:00 AM – 6:00 PM",
    note: "Working capital loan verification for urban street vendors and local body letters of recommendation.",
  },
  {
    dept: "Pradhan Mantri MUDRA Yojana National Toll-Free",
    number: "1800-180-1111 / 1800-11-0001",
    timing: "National Banking Hours",
    note: "Grievances regarding collateral-free loans up to ₹10 Lakh at public/private bank branches.",
  },
];

export default function CscModeModal({
  isOpen,
  onClose,
  profile,
  topMatch,
  lang = "en",
}) {
  if (!isOpen) return null;

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(35, 50, 74, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: CARD,
          maxWidth: 780,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          borderRadius: 8,
          border: `1px solid ${RULE}`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
          padding: "24px 28px",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: SEAL, marginBottom: 4 }}>
              <UserCheck size={18} />
              <span style={{ fontFamily: sans, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
                Common Service Centre (CSC) &amp; Panchayat Sahayak Hub
              </span>
            </div>
            <h2 style={{ fontFamily: serif, fontSize: 24, color: INK, margin: 0 }}>
              Assisted Citizen Facilitation &amp; Helplines
            </h2>
            <p style={{ fontFamily: sans, fontSize: 13, color: "#6B7280", margin: "4px 0 0" }}>
              Tools for Village Level Entrepreneurs (VLEs), Gram Sevaks, and NGO facilitators assisting marginalized entrepreneurs.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 6, color: INK }}
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. Printable Application Slip Section */}
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 6,
            padding: "16px 20px",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            <div>
              <h3 style={{ fontFamily: serif, fontSize: 17, color: INK, margin: "0 0 2px" }}>
                📄 Bank Submission Slip / Citizen Scheme Dossier
              </h3>
              <p style={{ fontFamily: sans, fontSize: 12.5, color: "#6B7280", margin: 0 }}>
                Print this physical dossier to take directly to the local Bank Branch Manager or District Industries Centre (DIC).
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrintDossier}
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
              <Printer size={15} color="#FFFFFF" />
              <span>Print Application Slip 🖨️</span>
            </button>
          </div>

          {/* Dossier Preview Card */}
          <div
            style={{
              background: "#F9F7F1",
              border: `1px dashed ${SEAL}`,
              borderRadius: 6,
              padding: "12px 16px",
              fontSize: 12.5,
              fontFamily: sans,
              color: INK,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 13, borderBottom: `1px solid ${RULE}`, paddingBottom: 6, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>GOVERNMENT OF INDIA · SCHEME MATCHING DOSSIER</span>
              <span style={{ color: SEAL }}>CONFIDENTIAL / PHYSICAL SUBMISSION SLIP</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
              <div><strong>Applicant Category:</strong> {profile?.category || "SC / OBC / EWS"}</div>
              <div><strong>Venture Stage:</strong> {profile?.businessStatus === "new" ? "New Enterprise" : "Existing Business"}</div>
              <div><strong>Target Business:</strong> {profile?.businessType || "Micro-Enterprise"}</div>
              <div><strong>Requested Funding:</strong> ₹{formatINR(profile?.financialRequirement || 100000)}</div>
              <div><strong>State / Location:</strong> {profile?.state || "All India"}</div>
              <div><strong>Top Matched Scheme:</strong> {topMatch?.scheme?.name || "PMEGP / Stand-Up India / MUDRA"}</div>
            </div>
          </div>
        </div>

        {/* 2. RBI Collateral-Free Rule Guidance */}
        <div
          style={{
            background: "#EAF5ED",
            border: "1px solid #A8DCB5",
            borderRadius: 6,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 12.5,
            fontFamily: sans,
            color: "#1E5E26",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <ShieldAlert size={18} color={OK} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Important Citizen Right: No Collateral for Loans up to ₹10 Lakh!</strong>
            <p style={{ margin: "2px 0 0", lineHeight: 1.45 }}>
              As per <strong>Reserve Bank of India (RBI) Circular RPCD.SME&amp;NFS.BC.No.79/06.02.31/2009-10</strong>, scheduled banks are mandated not to accept collateral security in the case of loans up to ₹10 lakh extended to units in the MSE sector. If a branch manager insists on property papers, cite this circular or call the MoSJE toll-free helpline below.
            </p>
          </div>
        </div>

        {/* 3. Official MoSJE Helplines Directory */}
        <div>
          <h3 style={{ fontFamily: serif, fontSize: 17, color: INK, margin: "0 0 10px" }}>
            📞 Official Ministry of Social Justice &amp; National Helplines
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {HELPLINES.map((h, idx) => (
              <div
                key={idx}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  borderRadius: 6,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ minWidth: 260 }}>
                  <div style={{ fontFamily: sans, fontSize: 13, fontWeight: 700, color: INK }}>
                    {h.dept}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 11.5, color: "#6B7280", marginTop: 2 }}>
                    {h.note} · <span style={{ color: SEAL, fontWeight: 600 }}>{h.timing}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <a
                    href={`tel:${h.number.split("/")[0].trim()}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      background: "#F6F1E5",
                      border: `1px solid ${SEAL}`,
                      borderRadius: 4,
                      padding: "6px 12px",
                      color: INK,
                      textDecoration: "none",
                      fontFamily: sans,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    <PhoneCall size={14} color={SEAL} />
                    <span>{h.number}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Close Button */}
        <div style={{ marginTop: 20, textAlign: "right" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 20px",
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
            Close Window ✓
          </button>
        </div>
      </div>
    </div>
  );
}
