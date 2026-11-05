import React, { useState, useEffect } from "react";
import {
  KeyRound,
  UserCheck,
  UserPlus,
  ShieldCheck,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  PhoneCall,
  Lock,
  Mail,
  User,
  MapPin,
  Building2,
  Calendar,
  IndianRupee,
  RefreshCw,
} from "lucide-react";
import {
  GOVT_NAVY,
  GOVT_NAVY_DARK,
  GOVT_NAVY_LIGHT,
  SAFFRON,
  SAFFRON_HOVER,
  SAFFRON_LIGHT,
  INK,
  INK_MUTED,
  INK_LIGHT,
  PAPER,
  CARD,
  OK,
  OK_BG,
  NO,
  NO_BG,
  RULE,
  RULE_STRONG,
  sans,
  serif,
} from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";
import { setStoredAuthToken, getCustomUsers, saveCustomUser } from "../data/demoProfiles.js";

const STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Other",
];

export default function Login({
  currentUser,
  onLogin,
  onLogout,
  setScreen,
  initialMode = "signin",
  lang = "en",
}) {
  const [formMode, setFormMode] = useState(initialMode); // "signin" | "signup" | "forgot"
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // Sign In Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up Form State
  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    gender: "Female",
    state: "Uttar Pradesh",
    category: "General",
    age: "",
    income: "",
    financialRequirement: "",
    businessStatus: "new",
    businessType: "Manufacturing",
  });

  // Forgot Password State
  const [recoveryIdentifier, setRecoveryIdentifier] = useState("");
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: request token, 2: reset password
  const [recoveryToken, setRecoveryToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [recoveryNotice, setRecoveryNotice] = useState("");

  useEffect(() => {
    if (initialMode) {
      setFormMode(initialMode);
    }
  }, [initialMode]);

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Sign In Handler
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoginError("");
    setAuthSuccessMsg("");

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    if (!emailTrim || !passTrim) {
      setLoginError("Please enter both your registered email/mobile and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: emailTrim,
          password: passTrim,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        if (data.token) {
          setStoredAuthToken(data.token);
        }

        const authenticatedUser = {
          ...data.user,
          documents: data.user.documents || [],
          targetSchemes: data.user.targetSchemes || [],
        };

        onLogin(authenticatedUser, "dashboard");
        setAuthSuccessMsg(`Welcome, ${authenticatedUser.name}! Logging in to your citizen dashboard...`);
        if (setScreen) {
          setTimeout(() => setScreen("dashboard"), 350);
        }
        return;
      } else {
        setLoginError(data.error || "Invalid email/mobile or password. Please try again.");
      }
    } catch (netErr) {
      // Local fallback for offline mode
      const customUsers = getCustomUsers();
      const matched = customUsers.find(
        (u) => (u.email && u.email.toLowerCase() === emailTrim) || u.mobile === emailTrim
      );

      if (matched && matched.password === passTrim) {
        onLogin(matched, "dashboard");
        setAuthSuccessMsg(`Welcome, ${matched.name}! Logging into citizen dashboard...`);
        if (setScreen) {
          setTimeout(() => setScreen("dashboard"), 350);
        }
        return;
      }

      setLoginError("Invalid email/mobile or password. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up Handler
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoginError("");
    setAuthSuccessMsg("");

    if (!signUpForm.name.trim()) {
      setLoginError("Please enter your full name as per identity documents.");
      return;
    }
    if (!signUpForm.email.trim() && !signUpForm.mobile.trim()) {
      setLoginError("Please provide an email address or mobile number.");
      return;
    }
    if (!signUpForm.password || signUpForm.password.length < 6) {
      setLoginError("Password must be at least 6 characters long.");
      return;
    }
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setLoginError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);

    const payload = {
      name: signUpForm.name.trim(),
      email: signUpForm.email.trim() || `${signUpForm.mobile.trim()}@citizen.in`,
      mobile: signUpForm.mobile.trim(),
      password: signUpForm.password.trim(),
      gender: signUpForm.gender,
      state: signUpForm.state,
      category: signUpForm.category,
      businessType: signUpForm.businessType,
      profileData: {
        age: signUpForm.age ? Number(signUpForm.age) : undefined,
        gender: signUpForm.gender,
        state: signUpForm.state,
        category: signUpForm.category,
        income: signUpForm.income ? Number(signUpForm.income) : undefined,
        financialRequirement: signUpForm.financialRequirement ? Number(signUpForm.financialRequirement) : undefined,
        businessStatus: signUpForm.businessStatus,
        businessType: signUpForm.businessType,
      },
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok && data.success && data.user) {
        if (data.token) {
          setStoredAuthToken(data.token);
        }

        const newUser = {
          ...data.user,
          documents: [],
          targetSchemes: [],
        };

        saveCustomUser(newUser);
        onLogin(newUser, "dashboard");
        setAuthSuccessMsg(`Registration successful! Welcome, ${newUser.name}. Directing to your citizen dashboard...`);

        if (setScreen) {
          setTimeout(() => setScreen("dashboard"), 400);
        }
        return;
      } else {
        setLoginError(data.error || "Registration could not be completed. Please review fields.");
      }
    } catch (netErr) {
      const newUser = {
        id: `usr_${Date.now()}`,
        name: signUpForm.name.trim(),
        email: signUpForm.email.trim() || `${signUpForm.mobile.trim()}@citizen.in`,
        mobile: signUpForm.mobile.trim(),
        password: signUpForm.password.trim(),
        role: "Citizen Beneficiary",
        systemRole: "citizen",
        profileData: payload.profileData,
        documents: [],
        targetSchemes: [],
      };

      saveCustomUser(newUser);
      onLogin(newUser, "dashboard");
      setAuthSuccessMsg(`Account created! Welcome, ${newUser.name}. Redirecting...`);

      if (setScreen) {
        setTimeout(() => setScreen("dashboard"), 400);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Token Request
  const handleRequestResetToken = async (e) => {
    e.preventDefault();
    setLoginError("");
    setRecoveryNotice("");
    const identTrim = recoveryIdentifier.trim();
    if (!identTrim) {
      setLoginError("Please enter your registered email address or mobile number.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identTrim }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRecoveryStep(2);
        setRecoveryNotice(`Password recovery initiated for ${identTrim}. Verification token generated.`);
      } else {
        setLoginError(data.error || "Account not found with provided identifier.");
      }
    } catch (err) {
      setLoginError("Network connection error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Reset Submission
  const handleCompleteReset = async (e) => {
    e.preventDefault();
    setLoginError("");
    setRecoveryNotice("");

    if (!recoveryToken.trim()) {
      setLoginError("Please enter your verification reset token.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setLoginError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setLoginError("Passwords do not match. Please verify.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: recoveryToken.trim(),
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAuthSuccessMsg("Password successfully reset! You can now sign in with your new password.");
        setFormMode("signin");
        setRecoveryStep(1);
        setRecoveryToken("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setLoginError(data.error || "Password reset failed. Invalid or expired token.");
      }
    } catch (err) {
      setLoginError("Network connection error during password reset.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: "24px auto 48px auto", fontFamily: sans }}>
      {/* Official Government Portal Authentication Card */}
      <div
        className="gov-card"
        style={{
          padding: "clamp(24px, 4vw, 36px)",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
        }}
      >
        {/* Header Branding */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#EFF6FF",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: GOVT_NAVY,
              marginBottom: 12,
              border: "1px solid #BFDBFE",
            }}
          >
            <ShieldCheck size={26} color={GOVT_NAVY} />
          </div>
          <h1
            style={{
              fontFamily: serif,
              fontSize: 24,
              fontWeight: 700,
              color: GOVT_NAVY,
              margin: "0 0 6px 0",
            }}
          >
            {formMode === "signin"
              ? "Citizen Portal Sign In"
              : formMode === "signup"
              ? "Create Citizen Account"
              : "Account Recovery"}
          </h1>
          <p style={{ fontSize: 13, color: INK_MUTED, margin: 0 }}>
            {formMode === "signin"
              ? "Access your saved schemes, assessment history, and application dossiers"
              : formMode === "signup"
              ? "Register to preserve demographic parameters and track official applications"
              : "Reset your password via registered email or mobile number"}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {formMode !== "forgot" && (
          <div
            style={{
              display: "flex",
              background: "#F1F5F9",
              borderRadius: 6,
              padding: 3,
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={() => {
                setFormMode("signin");
                setLoginError("");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 5,
                border: "none",
                background: formMode === "signin" ? "#FFFFFF" : "transparent",
                color: formMode === "signin" ? GOVT_NAVY : "#64748B",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: formMode === "signin" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setFormMode("signup");
                setLoginError("");
              }}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 5,
                border: "none",
                background: formMode === "signup" ? "#FFFFFF" : "transparent",
                color: formMode === "signup" ? GOVT_NAVY : "#64748B",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                boxShadow: formMode === "signup" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              New Citizen Registration
            </button>
          </div>
        )}

        {/* Success Banner */}
        {authSuccessMsg && (
          <div
            style={{
              background: OK_BG,
              border: "1px solid #86EFAC",
              borderRadius: 6,
              padding: "10px 14px",
              marginBottom: 18,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: OK,
              fontSize: 13,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{authSuccessMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {loginError && (
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
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{loginError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SIGN IN FORM                                                       */}
        {/* ========================================================================= */}
        {formMode === "signin" && (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6 }}>
                Registered Email Address or Mobile Number <span style={{ color: NO }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="e.g. citizen@example.com or 9876543210"
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: INK }}>
                  Password <span style={{ color: NO }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setFormMode("forgot");
                    setLoginError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: SAFFRON,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your confidential account password"
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
              disabled={isLoading}
              className="gov-btn-primary"
              style={{
                width: "100%",
                padding: "11px",
                fontSize: 14.5,
                marginTop: 6,
              }}
            >
              {isLoading ? (
                <span>Authenticating Credentials...</span>
              ) : (
                <>
                  <KeyRound size={16} />
                  <span>Sign In to Citizen Portal</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: CITIZEN REGISTRATION FORM                                          */}
        {/* ========================================================================= */}
        {formMode === "signup" && (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                Full Name (as per Aadhaar / Official ID) <span style={{ color: NO }}>*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  required
                  value={signUpForm.name}
                  onChange={(e) => setSignUpForm({ ...signUpForm, name: e.target.value })}
                  placeholder="e.g. Rajesh Kumar Sharma"
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
                <User size={16} color="#64748B" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={signUpForm.email}
                  onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                  placeholder="citizen@example.com"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${RULE_STRONG}`,
                    fontSize: 13.5,
                    color: INK,
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Mobile Number <span style={{ color: NO }}>*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={signUpForm.mobile}
                  onChange={(e) => setSignUpForm({ ...signUpForm, mobile: e.target.value })}
                  placeholder="10-digit mobile"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${RULE_STRONG}`,
                    fontSize: 13.5,
                    color: INK,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  State / UT <span style={{ color: NO }}>*</span>
                </label>
                <select
                  value={signUpForm.state}
                  onChange={(e) => setSignUpForm({ ...signUpForm, state: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${RULE_STRONG}`,
                    fontSize: 13.5,
                    color: INK,
                    background: "#FFFFFF",
                  }}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Social Category <span style={{ color: NO }}>*</span>
                </label>
                <select
                  value={signUpForm.category}
                  onChange={(e) => setSignUpForm({ ...signUpForm, category: e.target.value })}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px",
                    borderRadius: 6,
                    border: `1px solid ${RULE_STRONG}`,
                    fontSize: 13.5,
                    color: INK,
                    background: "#FFFFFF",
                  }}
                >
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="OBC">Other Backward Class (OBC)</option>
                  <option value="General">General / Open Category</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Create Password <span style={{ color: NO }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                    placeholder="Min. 6 chars"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 32px 10px 10px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 13.5,
                      color: INK,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#64748B",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Confirm Password <span style={{ color: NO }}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={signUpForm.confirmPassword}
                    onChange={(e) => setSignUpForm({ ...signUpForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 32px 10px 10px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 13.5,
                      color: INK,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#64748B",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="gov-btn-saffron"
              style={{
                width: "100%",
                padding: "11px",
                fontSize: 14.5,
                marginTop: 6,
              }}
            >
              {isLoading ? (
                <span>Registering Account...</span>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Create Citizen Account</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FORGOT PASSWORD RECOVERY FORM                                      */}
        {/* ========================================================================= */}
        {formMode === "forgot" && (
          <div>
            {recoveryNotice && (
              <div
                style={{
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  borderRadius: 6,
                  padding: "10px 14px",
                  marginBottom: 16,
                  color: GOVT_NAVY,
                  fontSize: 13,
                }}
              >
                {recoveryNotice}
              </div>
            )}

            {recoveryStep === 1 ? (
              <form onSubmit={handleRequestResetToken} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6 }}>
                    Enter Your Registered Email or Mobile Number
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="e.g. citizen@example.com or 9876543210"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 14,
                      color: INK,
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("signin");
                      setLoginError("");
                    }}
                    className="gov-btn-secondary"
                    style={{ flex: 1, padding: "10px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="gov-btn-primary"
                    style={{ flex: 2, padding: "10px" }}
                  >
                    {isLoading ? "Generating Token..." : "Send Verification Token"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCompleteReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                    Verification Reset Token <span style={{ color: NO }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recoveryToken}
                    onChange={(e) => setRecoveryToken(e.target.value)}
                    placeholder="Paste the reset token generated"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 13.5,
                      color: INK,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                    New Password <span style={{ color: NO }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 13.5,
                      color: INK,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 5 }}>
                    Confirm New Password <span style={{ color: NO }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-type new password"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 6,
                      border: `1px solid ${RULE_STRONG}`,
                      fontSize: 13.5,
                      color: INK,
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("signin");
                      setRecoveryStep(1);
                    }}
                    className="gov-btn-secondary"
                    style={{ flex: 1, padding: "10px" }}
                  >
                    Back to Sign In
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="gov-btn-saffron"
                    style={{ flex: 2, padding: "10px" }}
                  >
                    {isLoading ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer Links & Administrative Desk Access */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 18,
            borderTop: `1px solid ${RULE}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            fontSize: 12,
            color: "#64748B",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Lock size={12} color="#166534" />
            <span>256-Bit Encrypted Session</span>
          </div>

          <button
            type="button"
            onClick={() => setScreen("admin-login")}
            style={{
              background: "none",
              border: "none",
              color: GOVT_NAVY,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            Institutional Admin Portal ↗
          </button>
        </div>
      </div>
    </div>
  );
}
