import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Building2,
  KeyRound,
  Compass,
} from "lucide-react";
import { INK, PAPER, CARD, SEAL, OK, NO, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { setStoredAuthToken } from "../data/demoProfiles.js";

export default function AdminLogin({
  currentUser,
  onLogin,
  setScreen,
  onBack,
}) {
  const [adminEmail, setAdminEmail] = useState("yuvrajc5027@gmail.com");
  const [adminPassword, setAdminPassword] = useState("yuvraj1234");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDenied, setIsDenied] = useState(false);

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsDenied(false);
    setLoading(true);

    const emailTrim = adminEmail.trim().toLowerCase();
    const passTrim = adminPassword.trim();

    if (!emailTrim || !passTrim) {
      setErrorMsg("Please enter both administrative credentials.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: emailTrim,
          password: passTrim,
        }),
      });
      const data = await res.json();

      if (res.status === 403) {
        setIsDenied(true);
        setErrorMsg("Access Denied (403): This account does not possess administrator clearance.");
        setLoading(false);
        return;
      }

      if (res.ok && data.success && data.user) {
        if (data.token) {
          setStoredAuthToken(data.token);
        }
        onLogin(data.user, "admin-dashboard");
        if (setScreen) {
          setScreen("admin-dashboard");
        }
      } else {
        setErrorMsg(data.error || "Invalid administrative credentials.");
      }
    } catch (err) {
      setErrorMsg("Network error connecting to administrative authorization server: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: "30px auto" }}>
      {/* Gov Tricolor Top Accent */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%)", borderRadius: "4px 4px 0 0", marginBottom: 2 }} />

      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "32px 36px",
          boxShadow: "0 4px 16px rgba(18, 25, 38, 0.06)",
        }}
      >
        {/* Institutional Masthead */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 12px auto",
              borderRadius: 6,
              background: "#1E293B",
              border: "1px solid #334155",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FDE68A",
            }}
          >
            <ShieldCheck size={28} />
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: SEAL, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
            Institutional Administration
          </div>
          <h2 style={{ fontFamily: serif, fontSize: 22, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
            Scheme Matcher Central Desk
          </h2>
          <p style={{ fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.45 }}>
            Restricted portal for scheme catalog administrators, nodal officers, and document verification reviewers.
          </p>
        </div>

        {/* Error / Denial Alert */}
        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              background: isDenied ? "#FEF2F2" : "#FFFBEB",
              border: `1px solid ${isDenied ? "#FECACA" : "#FDE68A"}`,
              borderRadius: 4,
              padding: "10px 14px",
              marginBottom: 18,
              color: isDenied ? "#991B1B" : "#92400E",
              fontSize: 12.5,
              lineHeight: 1.45,
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>{isDenied ? "Access Denied:" : "Authentication Failure:"}</strong> {errorMsg}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminSignIn}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
              Administrative Identifier / Official Email
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="yuvrajc5027@gmail.com"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
              Security Clearance Password
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="••••••••••••"
              style={inputStyle}
              required
            />
          </div>

          <div style={{ background: "#F8F6F0", border: `1px solid ${RULE}`, borderRadius: 4, padding: "8px 12px", marginBottom: 18, fontSize: 11.5, color: "#475569" }}>
            <strong>Administrator Credentials:</strong><br />
            <code>yuvrajc5027@gmail.com</code> / <code>yuvraj1234</code> (Administrator: Yuvraj Choudhary)
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "11px 16px",
              background: "#1E293B",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 4,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
            }}
          >
            <KeyRound size={16} />
            <span>{loading ? "Verifying Authorization..." : "Access Administrative Console"}</span>
          </button>
        </form>

        {/* Statutory Compliance Footer Strip */}
        <div
          style={{
            marginTop: 22,
            paddingTop: 16,
            borderTop: `1px solid ${RULE}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#64748B",
          }}
        >
          <button
            type="button"
            onClick={() => setScreen("home")}
            style={{
              background: "none",
              border: "none",
              color: SEAL,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← Return to Citizen Portal
          </button>
          <span>Secured with Scrypt &amp; RBAC</span>
        </div>
      </div>
    </div>
  );
}
