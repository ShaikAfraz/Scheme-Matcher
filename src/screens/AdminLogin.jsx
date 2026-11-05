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
  Eye,
  EyeOff,
  Mail,
  ChevronLeft,
} from "lucide-react";
import {
  GOVT_NAVY,
  GOVT_NAVY_DARK,
  SAFFRON,
  INK,
  INK_MUTED,
  PAPER,
  CARD,
  OK,
  NO,
  NO_BG,
  RULE,
  RULE_STRONG,
  serif,
  sans,
} from "../theme/tokens.js";
import { setStoredAuthToken } from "../data/demoProfiles.js";

export default function AdminLogin({
  currentUser,
  onLogin,
  setScreen,
  onBack,
}) {
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDenied, setIsDenied] = useState(false);

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setIsDenied(false);

    const emailTrim = adminEmail.trim().toLowerCase();
    const passTrim = adminPassword.trim();

    if (!emailTrim || !passTrim) {
      setErrorMsg("Please enter administrative credentials.");
      return;
    }

    setLoading(true);

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
    <div style={{ maxWidth: 520, margin: "24px auto 48px auto", fontFamily: sans }}>
      {/* Gov Tricolor Top Accent */}
      <div className="tricolor-ribbon" style={{ borderRadius: "4px 4px 0 0" }} />

      <div
        className="gov-card"
        style={{
          padding: "clamp(24px, 4vw, 36px)",
          borderTop: "none",
          borderRadius: "0 0 8px 8px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08)",
        }}
      >
        {/* Institutional Masthead */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              margin: "0 auto 12px auto",
              borderRadius: "50%",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: GOVT_NAVY,
            }}
          >
            <Building2 size={26} color={GOVT_NAVY} />
          </div>

          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: SAFFRON,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Institutional Administrative Portal
          </div>

          <h1
            style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: GOVT_NAVY,
              margin: "0 0 6px 0",
            }}
          >
            Lead Administrator Desk
          </h1>

          <p style={{ fontSize: 13, color: INK_MUTED, margin: 0 }}>
            Restricted access for designated welfare officers &amp; nodal administrators.
          </p>
        </div>

        {/* Security Advisory Pill */}
        <div
          style={{
            background: "#FFFBEB",
            border: "1px solid #FDE68A",
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "#92400E",
            fontSize: 12.5,
          }}
        >
          <Lock size={15} style={{ flexShrink: 0 }} />
          <span>Authorized administrative sessions are logged and cryptographically audited.</span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            style={{
              background: NO_BG,
              border: "1px solid #FCA5A5",
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: NO,
              fontSize: 13,
            }}
          >
            <ShieldAlert size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Admin Login Form */}
        <form onSubmit={handleAdminSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6 }}>
              Administrator Email ID <span style={{ color: NO }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="e.g. admin@directorate.gov.in"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 12px 10px 38px",
                  borderRadius: 6,
                  border: `1px solid ${RULE_STRONG}`,
                  fontSize: 14,
                  color: INK,
                }}
              />
              <Mail size={16} color="#64748B" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6 }}>
              Administrative Security Key <span style={{ color: NO }}>*</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "10px 38px 10px 38px",
                  borderRadius: 6,
                  border: `1px solid ${RULE_STRONG}`,
                  fontSize: 14,
                  color: INK,
                }}
              />
              <Lock size={16} color="#64748B" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#64748B",
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gov-btn-primary"
            style={{
              width: "100%",
              padding: "11px",
              fontSize: 14,
              marginTop: 6,
            }}
          >
            {loading ? (
              <span>Authenticating Administrator...</span>
            ) : (
              <>
                <ShieldCheck size={16} />
                <span>Verify Administrative Access</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setScreen("home")}
            style={{
              background: "none",
              border: "none",
              color: "#64748B",
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <ChevronLeft size={14} />
            <span>Return to Public Citizen Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
