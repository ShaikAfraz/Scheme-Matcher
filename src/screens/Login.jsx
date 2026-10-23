import React, { useState } from "react";
import {
  UserCheck,
  UserPlus,
  LogIn,
  KeyRound,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  IndianRupee,
  MapPin,
  Briefcase,
  LogOut,
  Info,
  ChevronLeft,
} from "lucide-react";
import { DEMO_PROFILES, getCustomUsers, saveCustomUser, setStoredAuthToken } from "../data/demoProfiles.js";
import { INK, PAPER, CARD, SEAL, OK, VERIFY, NO, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { TRANSLATIONS } from "../theme/i18n.js";

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
  onBack,
  lang = "en",
}) {
  const [formMode, setFormMode] = useState("signin"); // "signin" | "signup"
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authSuccessMsg, setAuthSuccessMsg] = useState("");

  // Sign up form state
  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    age: "30",
    gender: "Female",
    state: "Uttar Pradesh",
    category: "SC",
    income: "150000",
    financialRequirement: "250000",
    businessStatus: "new",
    businessType: "Manufacturing",
    isSafaiKaramchari: false,
    isDivyangjan: false,
    isArtisan: false,
    isTransgender: false,
    isDnt: false,
  });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Handle demo profile instant 1-click login
  const handleSelectDemo = async (demo) => {
    let serverUser = null;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: demo.email,
          password: "demo123",
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.token) {
        setStoredAuthToken(data.token);
        serverUser = data.user;
      }
    } catch (err) {
      console.warn("Backend auth offline, using local session:", err.message);
    }

    const demoData = {
      id: demo.id,
      name: demo.name,
      avatar: demo.avatar,
      role: demo.role,
      email: demo.email,
      mobile: demo.mobile,
      categoryBadge: demo.categoryBadge,
      badgeColor: demo.badgeColor,
      isDemo: true,
      systemRole: serverUser?.systemRole || "citizen",
      profileData: demo.profileData,
      documents: demo.documents,
      targetSchemes: demo.targetSchemes,
    };
    onLogin(demoData, "results");
    setAuthSuccessMsg(`Logged in successfully as ${demo.name}! Transferring to eligible schemes...`);
    if (setScreen) {
      setTimeout(() => {
        setScreen("results");
      }, 350);
    }
  };

  // Handle standard credential sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoginError("");

    const emailTrim = loginEmail.trim().toLowerCase();
    const passTrim = loginPassword.trim();

    if (!emailTrim || !passTrim) {
      setLoginError("Please enter both email/mobile and password.");
      return;
    }

    // 1. Attempt server-side authentication
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

        const matchedDemo = DEMO_PROFILES.find(
          (d) => d.email.toLowerCase() === emailTrim || d.mobile.replace(/\s+/g, "") === emailTrim.replace(/\s+/g, "")
        );

        const authenticatedUser = {
          ...data.user,
          avatar: data.user.avatar || (matchedDemo ? matchedDemo.avatar : "👤"),
          categoryBadge: data.user.categoryBadge || (matchedDemo ? matchedDemo.categoryBadge : undefined),
          badgeColor: data.user.badgeColor || (matchedDemo ? matchedDemo.badgeColor : undefined),
          documents: data.user.documents?.length ? data.user.documents : (matchedDemo ? matchedDemo.documents : []),
          targetSchemes: data.user.targetSchemes?.length ? data.user.targetSchemes : (matchedDemo ? matchedDemo.targetSchemes : ["PMEGP", "MUDRA"]),
        };

        onLogin(authenticatedUser, "results");
        setAuthSuccessMsg(`Welcome back, ${authenticatedUser.name}! Transferring to your schemes...`);
        if (setScreen) {
          setTimeout(() => {
            setScreen("results");
          }, 350);
        }
        return;
      } else {
        setLoginError(data.error || "Invalid email/mobile or password.");
        return;
      }
    } catch (netErr) {
      // 2. Offline fallback to local demo and custom user store
      const matchedDemo = DEMO_PROFILES.find(
        (d) => d.email.toLowerCase() === emailTrim || d.mobile.replace(/\s+/g, "") === emailTrim.replace(/\s+/g, "")
      );

      if (matchedDemo && (passTrim === "demo123" || passTrim === matchedDemo.password)) {
        handleSelectDemo(matchedDemo);
        return;
      }

      const customUsers = getCustomUsers();
      const matchedCustom = customUsers.find(
        (u) => u.email.toLowerCase() === emailTrim || u.mobile === emailTrim
      );

      if (matchedCustom && matchedCustom.password === passTrim) {
        onLogin(matchedCustom, "results");
        setAuthSuccessMsg(`Welcome back, ${matchedCustom.name}! Transferring to your schemes...`);
        if (setScreen) {
          setTimeout(() => {
            setScreen("results");
          }, 350);
        }
        return;
      }

      setLoginError("Invalid email/mobile or password. For demo accounts, use password 'demo123' or 1-click login below.");
    }
  };

  // Handle custom citizen signup - Transfers user directly to the next page!
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (!signUpForm.name.trim()) {
      setLoginError("Please enter your full name.");
      return;
    }
    if (!signUpForm.mobile.trim() && !signUpForm.email.trim()) {
      setLoginError("Please enter a valid mobile number or email address.");
      return;
    }
    if (!signUpForm.password.trim() || signUpForm.password.length < 4) {
      setLoginError("Password must be at least 4 characters.");
      return;
    }

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
        age: Number(signUpForm.age) || 28,
        gender: signUpForm.gender,
        state: signUpForm.state,
        category: signUpForm.category,
        income: Number(signUpForm.income) || 100000,
        financialRequirement: Number(signUpForm.financialRequirement) || 100000,
        businessStatus: signUpForm.businessStatus,
        businessType: signUpForm.businessType,
        isSafaiKaramchari: signUpForm.isSafaiKaramchari,
        isDivyangjan: signUpForm.isDivyangjan,
        isArtisan: signUpForm.isArtisan,
        isTransgender: signUpForm.isTransgender,
        isDnt: signUpForm.isDnt,
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
          documents: [
            {
              id: `doc_reg_aadhaar_${Date.now()}`,
              name: "Aadhaar_Self_Declaration.pdf",
              size: "650 KB",
              type: "Aadhaar Card (Identity & Age Proof)",
              typeId: "aadhaar",
              uploadedAt: "Just now",
              status: "Verified",
            },
          ],
          targetSchemes: ["PMEGP", "MUDRA", "State Subsidy"],
        };

        saveCustomUser(newUser);
        onLogin(newUser, "results");
        setAuthSuccessMsg(`Registration successful! Welcome, ${newUser.name}. Transferring to your matched government schemes...`);

        if (setScreen) {
          setTimeout(() => {
            setScreen("results");
          }, 400);
        }
        return;
      } else {
        setLoginError(data.error || "Registration failed. Please check your inputs.");
        return;
      }
    } catch (netErr) {
      // Offline fallback
      const newUser = {
        id: `usr_${Date.now()}`,
        name: signUpForm.name.trim(),
        avatar: signUpForm.gender === "Female" ? "👩🏽" : "👨🏽",
        role: `${signUpForm.category} Entrepreneur · ${signUpForm.businessType}`,
        email: signUpForm.email.trim() || `${signUpForm.mobile.trim()}@citizen.in`,
        mobile: signUpForm.mobile.trim(),
        categoryBadge: `${signUpForm.category} Community · ${signUpForm.state}`,
        badgeColor: SEAL,
        isDemo: false,
        profileData: payload.profileData,
        documents: [
          {
            id: `doc_reg_aadhaar_${Date.now()}`,
            name: "Aadhaar_Self_Declaration.pdf",
            size: "650 KB",
            type: "Aadhaar Card (Identity & Age Proof)",
            typeId: "aadhaar",
            uploadedAt: "Just now",
            status: "Verified",
          },
        ],
        targetSchemes: ["PMEGP", "MUDRA", "State Subsidy"],
      };

      saveCustomUser(newUser);
      onLogin(newUser, "results");
      setAuthSuccessMsg(`Registration saved! Welcome, ${newUser.name}. Transferring...`);

      if (setScreen) {
        setTimeout(() => {
          setScreen("results");
        }, 400);
      }
    }
  };


  return (
    <div style={{ maxWidth: 920, margin: "0 auto" }}>
      {/* Back Button */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            color: "#5C6B84",
            cursor: "pointer",
            fontFamily: sans,
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            padding: 0,
          }}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: SEAL, marginBottom: 4 }}>
          <ShieldCheck size={16} />
          <span style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Citizen Authentication &amp; Verification Personas
          </span>
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 26, color: INK, margin: "0 0 6px 0", fontWeight: 700 }}>
          {currentUser ? `Active Citizen Account: ${currentUser.name}` : "Citizen Access & Verification Personas"}
        </h2>
        <p style={{ fontFamily: sans, fontSize: 13.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>
          Sign in with your registered mobile or email, register a new citizen profile, or select an authentic citizen persona to test deterministic matching against ministry rules.
        </p>
      </div>

      {/* Success Notification */}
      {authSuccessMsg && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#F0FDF4",
            border: `1px solid #BBF7D0`,
            borderRadius: 4,
            padding: "10px 14px",
            marginBottom: 20,
            color: OK,
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <CheckCircle2 size={16} color={OK} />
          <span>{authSuccessMsg}</span>
        </div>
      )}

      {/* Logged In Active Banner */}
      {currentUser && (
        <div
          style={{
            background: "#F8F6F0",
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: "16px 18px",
            marginBottom: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 30 }}>{currentUser.avatar || "👤"}</span>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 15, color: INK }}>{currentUser.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    background: currentUser.badgeColor || SEAL,
                    color: "#FFFFFF",
                    padding: "2px 8px",
                    borderRadius: 3,
                    fontWeight: 600,
                  }}
                >
                  {currentUser.categoryBadge || "Active Citizen"}
                </span>
                {currentUser.isDemo && (
                  <span
                    style={{
                      fontSize: 10,
                      background: "#E2DCCF",
                      color: "#475569",
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontWeight: 600,
                    }}
                  >
                    DEMO PERSONA
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                {currentUser.role} · {currentUser.email || currentUser.mobile}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setScreen("results")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: SEAL,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>View Eligible Schemes</span>
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => setScreen("profile")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                color: INK,
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>Review Profile</span>
            </button>
            <button
              onClick={onLogout}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "transparent",
                border: `1px solid #CBD5E1`,
                color: "#991B1B",
                borderRadius: 4,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
              title="Sign out"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN INTEGRATED LAYOUT: Form on Left, Demo Profiles on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* COLUMN 1: CITIZEN SIGN IN & SIGN UP */}
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: "20px",
            boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
          }}
        >
          {/* Mode Switcher: Sign In vs Sign Up */}
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${RULE}`,
              marginBottom: 18,
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
                padding: "10px 14px",
                fontFamily: sans,
                fontSize: 13.5,
                fontWeight: formMode === "signin" ? 700 : 500,
                border: "none",
                borderBottom: formMode === "signin" ? `2.5px solid ${SEAL}` : "2.5px solid transparent",
                background: "none",
                color: formMode === "signin" ? INK : "#6B7280",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <LogIn size={15} color={formMode === "signin" ? SEAL : "#9CA3AF"} />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFormMode("signup");
                setLoginError("");
              }}
              style={{
                flex: 1,
                padding: "10px 14px",
                fontFamily: sans,
                fontSize: 13.5,
                fontWeight: formMode === "signup" ? 700 : 500,
                border: "none",
                borderBottom: formMode === "signup" ? `2.5px solid ${SEAL}` : "2.5px solid transparent",
                background: "none",
                color: formMode === "signup" ? INK : "#6B7280",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <UserPlus size={15} color={formMode === "signup" ? SEAL : "#9CA3AF"} />
              <span>New Sign Up</span>
            </button>
          </div>

          {/* Error Message */}
          {loginError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FFEBEE",
                border: `1px solid ${NO}`,
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 16,
                color: NO,
                fontSize: 12.5,
              }}
            >
              <AlertCircle size={15} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form: Sign In Mode */}
          {formMode === "signin" ? (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Email or Registered Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. ramesh.artisan@demo.gov.in"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
                <span style={{ fontSize: 11, color: "#6B7280", marginTop: 4, display: "block" }}>
                  Demo accounts password: <strong>demo123</strong>
                </span>
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <LogIn size={16} />
                <span>Sign In to Scheme Matcher</span>
              </button>
            </form>
          ) : (
            /* Form: New Citizen Sign Up Mode */
            <form onSubmit={handleSignUp}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Anand Shinde"
                  value={signUpForm.name}
                  onChange={(e) => setSignUpForm({ ...signUpForm, name: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={signUpForm.mobile}
                    onChange={(e) => setSignUpForm({ ...signUpForm, mobile: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    placeholder="Min 4 characters"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Age
                  </label>
                  <input
                    type="number"
                    min="18"
                    max="90"
                    value={signUpForm.age}
                    onChange={(e) => setSignUpForm({ ...signUpForm, age: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Gender
                  </label>
                  <select
                    value={signUpForm.gender}
                    onChange={(e) => setSignUpForm({ ...signUpForm, gender: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Transgender">Transgender</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Category
                  </label>
                  <select
                    value={signUpForm.category}
                    onChange={(e) => setSignUpForm({ ...signUpForm, category: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC">OBC</option>
                    <option value="DNT">DNT</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    State / UT
                  </label>
                  <select
                    value={signUpForm.state}
                    onChange={(e) => setSignUpForm({ ...signUpForm, state: e.target.value })}
                    style={inputStyle}
                  >
                    {STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Income (₹/year)
                  </label>
                  <input
                    type="number"
                    value={signUpForm.income}
                    onChange={(e) => setSignUpForm({ ...signUpForm, income: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Loan Needed (₹)
                  </label>
                  <input
                    type="number"
                    value={signUpForm.financialRequirement}
                    onChange={(e) => setSignUpForm({ ...signUpForm, financialRequirement: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 4 }}>
                    Business Type
                  </label>
                  <select
                    value={signUpForm.businessType}
                    onChange={(e) => setSignUpForm({ ...signUpForm, businessType: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Services">Services</option>
                    <option value="Trading">Trading</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <UserPlus size={16} />
                <span>Create Citizen Account & Save Data</span>
              </button>
            </form>
          )}
        </div>

        {/* COLUMN 2: DEMO CITIZEN PROFILES (1-CLICK INSTANT LOGIN) */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={16} color={SEAL} />
              <h3 style={{ margin: 0, fontSize: 16, color: INK, fontFamily: serif, fontWeight: 700 }}>
                Demo Citizen Profiles
              </h3>
            </div>
            <span style={{ fontSize: 11, color: "#6B7280" }}>
              1-Click Login (Pre-saved Data)
            </span>
          </div>

          <p style={{ fontSize: 12.5, color: "#606F7B", margin: "0 0 14px 0", lineHeight: 1.45 }}>
            Click on any citizen persona to instantly load their personal information and pre-saved documents into the scheme matcher:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {DEMO_PROFILES.map((demo) => {
              const isCurrent = currentUser?.id === demo.id;
              return (
                <div
                  key={demo.id}
                  className="demo-profile-card"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${isCurrent ? OK : RULE}`,
                    borderRadius: 4,
                    padding: 14,
                    boxShadow: isCurrent
                      ? "0 2px 4px rgba(27, 94, 60, 0.1)"
                      : "0 1px 2px rgba(22, 32, 50, 0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{demo.avatar}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: INK }}>
                          {demo.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          {demo.location}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        background: demo.badgeColor || SEAL,
                        color: "#FFFFFF",
                        padding: "2px 6px",
                        borderRadius: 3,
                        fontWeight: 600,
                      }}
                    >
                      {demo.categoryBadge}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: "#475569", margin: "6px 0" }}>
                    {demo.role}
                  </div>

                  {/* Pre-saved metadata tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 10px 0" }}>
                    <span style={{ fontSize: 10.5, background: "#F8F6F0", border: `1px solid ${RULE}`, padding: "1px 6px", borderRadius: 3, color: INK }}>
                      Age: {demo.profileData.age}y
                    </span>
                    <span style={{ fontSize: 10.5, background: "#F8F6F0", border: `1px solid ${RULE}`, padding: "1px 6px", borderRadius: 3, color: INK }}>
                      Income: ₹{demo.profileData.income.toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontSize: 10.5, background: "#F8F6F0", border: `1px solid ${RULE}`, padding: "1px 6px", borderRadius: 3, color: INK }}>
                      Need: ₹{demo.profileData.financialRequirement.toLocaleString("en-IN")}
                    </span>
                    <span style={{ fontSize: 10.5, background: "#F0FDF4", color: OK, padding: "1px 6px", borderRadius: 3, fontWeight: 600, border: "1px solid #BBF7D0" }}>
                      ✓ {demo.documents.length} Docs Pre-saved
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectDemo(demo)}
                    style={{
                      width: "100%",
                      padding: "7px 12px",
                      background: isCurrent ? OK : "#162032",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span>{isCurrent ? "✓ Active Persona (Reload)" : `Load Persona: ${demo.name}`}</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
