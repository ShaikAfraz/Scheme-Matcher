import React, { useState, useMemo, useEffect } from "react";
import {
  Landmark,
  ChevronLeft,
  UserCheck,
  KeyRound,
  LogOut,
  Sparkles,
  RefreshCw,
  FolderUp,
  FileCheck2,
  MessageCircle,
  Home as HomeIcon,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import AccessibilityBar from "./components/AccessibilityBar.jsx";
import JargonBusterModal from "./components/JargonBuster.jsx";
import CscModeModal from "./components/CscModeModal.jsx";
import Home from "./screens/Home.jsx";
import Login from "./screens/Login.jsx";
import ProfileForm from "./screens/ProfileForm.jsx";
import Results from "./screens/Results.jsx";
import Details from "./screens/Details.jsx";
import Documents from "./screens/Documents.jsx";
import Assistant from "./screens/Assistant.jsx";
import ApplicationTracker from "./screens/ApplicationTracker.jsx";
import { matchSchemes } from "./engine/matcher.js";
import {
  getStoredActiveUser,
  setStoredActiveUser,
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuth,
} from "./data/demoProfiles.js";
import { getStoredApplications } from "./data/appliedSchemes.js";
import { INK, PAPER, CARD, SEAL, OK, RULE, serif, sans } from "./theme/tokens.js";
import { TRANSLATIONS } from "./theme/i18n.js";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [history, setHistory] = useState(["home"]);
  const [transitionDir, setTransitionDir] = useState("slide-forward");
  const [lang, setLang] = useState("en");
  const [isPlainMode, setIsPlainMode] = useState(false);
  const [fontScale, setFontScale] = useState(1.0);
  const [isJargonOpen, setIsJargonOpen] = useState(false);
  const [isCscOpen, setIsCscOpen] = useState(false);
  const [welcomeToast, setWelcomeToast] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);

  // Authenticated citizen user session
  const [currentUser, setCurrentUser] = useState(() => getStoredActiveUser());

  const [profile, setProfile] = useState(() => {
    const saved = getStoredActiveUser();
    if (saved && saved.profileData) {
      return saved.profileData;
    }
    return {
      age: "",
      gender: "",
      state: "",
      category: "",
      income: "",
      financialRequirement: "",
      businessStatus: "",
      businessType: "",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };
  });

  const [matches, setMatches] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [assistantQuery, setAssistantQuery] = useState("");
  const [documents, setDocuments] = useState(() => {
    const saved = getStoredActiveUser();
    return saved && saved.documents ? saved.documents : [];
  });
  const [applications, setApplications] = useState(() => {
    return getStoredApplications(currentUser?.id);
  });

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Validate session token with backend on initial load
  useEffect(() => {
    const token = getStoredAuthToken();
    if (token) {
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.user) {
            setCurrentUser(data.user);
            setStoredActiveUser(data.user);
            if (data.user.profileData) {
              setProfile(data.user.profileData);
            }
          } else {
            // Invalid or expired session
            clearStoredAuth();
            setCurrentUser(null);
          }
        })
        .catch(() => {});
    }
  }, []);

  // On mount, synchronize with active user data & browser URL hash
  useEffect(() => {
    if (currentUser && currentUser.profileData && currentUser.profileData.age) {
      const formatted = {
        ...currentUser.profileData,
        age: Number(currentUser.profileData.age),
        income: Number(currentUser.profileData.income),
        financialRequirement: Number(currentUser.profileData.financialRequirement),
      };
      setMatches(matchSchemes(formatted));
    }

    // URL Hash multi-page routing synchronization
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, "");
      if (!hash) return;
      const [route, queryStr] = hash.split("?");
      const validScreens = ["home", "login", "profile", "results", "details", "documents", "assistant", "tracker"];
      if (validScreens.includes(route)) {
        setScreen(route);
      }
      if (queryStr) {
        const params = new URLSearchParams(queryStr);
        const id = params.get("id");
        if (id) setSelectedId(id);
      }
    };

    window.addEventListener("hashchange", handleHash);
    if (window.location.hash) {
      handleHash();
    }
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Sync applications and check live SQLite database connection status
  useEffect(() => {
    const token = getStoredAuthToken();
    if (currentUser && currentUser.id) {
      const localApps = getStoredApplications(currentUser.id);
      setApplications(localApps);

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      fetch(`/api/applications?userId=${encodeURIComponent(currentUser.id)}`, { headers })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.applications)) {
            setApplications(data.applications);
          }
        })
        .catch(() => {});
    } else {
      setApplications([]);
    }

    fetch("/api/status")
      .then((r) => r.json())
      .then((data) => setDbStatus(data))
      .catch(() => setDbStatus({ status: "local", engine: "Client Storage (Offline)" }));
  }, [currentUser, screen]);


  // Fallback schemes if user visits Results tab directly
  const displayMatches = useMemo(() => {
    if (matches && matches.length > 0) return matches;
    const defaultProfile = {
      age: 28,
      income: 120000,
      financialRequirement: 150000,
      gender: "Male",
      state: "ALL",
      category: "ALL",
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };
    return matchSchemes(defaultProfile);
  }, [matches]);

  // Website navigation with browser history stack & smooth page transitions
  const navigateTo = (targetScreen, dir = "slide-forward", detailId = null) => {
    if (detailId) {
      setSelectedId(detailId);
      window.location.hash = `#/${targetScreen}?id=${detailId}`;
    } else {
      window.location.hash = `#/${targetScreen}`;
    }

    if (targetScreen === screen && !detailId) return;

    setHistory((prev) => [...prev, screen]);
    setTransitionDir(dir);

    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(() => {
        setScreen(targetScreen);
      });
    } else {
      setScreen(targetScreen);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dedicated back button to return to previous page
  const goBack = () => {
    if (history.length > 1) {
      const prevScreen = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setTransitionDir("slide-backward");
      window.location.hash = `#/${prevScreen}`;

      if (typeof document !== "undefined" && document.startViewTransition) {
        document.startViewTransition(() => {
          setScreen(prevScreen);
        });
      } else {
        setScreen(prevScreen);
      }
    } else {
      setHistory(["home"]);
      setTransitionDir("slide-backward");
      window.location.hash = "#/home";
      setScreen("home");
    }
  };

  const runMatch = () => {
    const formattedProfile = {
      ...profile,
      age: Number(profile.age) || 28,
      income: Number(profile.income) || 120000,
      financialRequirement: Number(profile.financialRequirement) || 150000,
    };
    const results = matchSchemes(formattedProfile);
    setMatches(results);
    navigateTo("results");
  };

  const openDetails = (id) => {
    setSelectedId(id);
    navigateTo("details", "slide-forward", id);
  };

  // Handle citizen login / signup - Transfers user directly to the next page!
  const handleUserLogin = (userData, redirectScreen = "results") => {
    setCurrentUser(userData);
    setStoredActiveUser(userData);

    let calculated = null;
    if (userData.profileData) {
      setProfile(userData.profileData);
      const formatted = {
        ...userData.profileData,
        age: Number(userData.profileData.age),
        income: Number(userData.profileData.income),
        financialRequirement: Number(userData.profileData.financialRequirement),
      };
      calculated = matchSchemes(formatted);
      setMatches(calculated);
    }

    if (userData.documents) {
      setDocuments(userData.documents);
    }

    setApplications(getStoredApplications(userData.id));

    // Show celebration notification toast
    setWelcomeToast({
      name: userData.name,
      schemesCount: calculated ? calculated.length : 15,
      isDemo: userData.isDemo,
    });
    setTimeout(() => setWelcomeToast(null), 6000);

    // Transfer the user to the next page!
    if (redirectScreen) {
      navigateTo(redirectScreen);
    }
  };

  const handleUserLogout = () => {
    const token = getStoredAuthToken();
    if (token) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setCurrentUser(null);
    setStoredActiveUser(null);
    clearStoredAuth();
    setApplications([]);
    resetAll();
    navigateTo("login", "slide-backward");
  };


  const selectedMatch = useMemo(() => {
    const pool = matches || displayMatches;
    if (!pool || !selectedId) return pool?.[0] || null;
    return pool.find((m) => m.scheme.id === selectedId) || pool[0] || null;
  }, [matches, displayMatches, selectedId]);

  const topMatch = useMemo(() => {
    const pool = matches || displayMatches;
    if (!pool || pool.length === 0) return null;
    return pool[0];
  }, [matches, displayMatches]);

  const resetAll = () => {
    setProfile({
      age: "",
      gender: "",
      state: "",
      category: "",
      income: "",
      financialRequirement: "",
      businessStatus: "",
      businessType: "",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    });
    setMatches(null);
    setSelectedId(null);
    setAssistantQuery("");
    setDocuments([]);
    setApplications([]);
  };

  const getBreadcrumbTitle = () => {
    switch (screen) {
      case "login":
        return currentUser ? "Citizen Account Dashboard" : "Citizen Login & Registration";
      case "profile":
        return "Scheme Eligibility Questionnaire";
      case "results":
        return "Recommended Government Schemes";
      case "details":
        return selectedMatch ? selectedMatch.scheme.name.split("—")[0].trim() : "Scheme Details & Benefits";
      case "tracker":
        return "Application Progress Tracker";
      case "documents":
        return "Digital Document Vault";
      case "assistant":
        return "Grounded AI Scheme Assistant";
      default:
        return "Home";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: sans,
        boxSizing: "border-box",
        fontSize: `${14 * fontScale}px`,
      }}
    >
      {/* Indian National Tricolor Ribbon at top */}
      <div className="tricolor-ribbon" />

      {/* Top Accessibility & Vernacular Utility Bar */}
      <div style={{ padding: "0 clamp(12px, 3.5vw, 40px)" }}>
        <AccessibilityBar
          lang={lang}
          setLang={setLang}
          isPlainMode={isPlainMode}
          setIsPlainMode={setIsPlainMode}
          fontScale={fontScale}
          setFontScale={setFontScale}
          onOpenJargon={() => setIsJargonOpen(true)}
          onOpenCsc={() => setIsCscOpen(true)}
        />
      </div>

      {/* Editorial Civic Platform Header Masthead */}
      <header
        style={{
          background: "#FFFFFF",
          borderBottom: `1px solid ${RULE}`,
          padding: "12px clamp(16px, 3.5vw, 32px) 0 clamp(16px, 3.5vw, 32px)",
          boxShadow: "0 1px 3px rgba(18, 25, 38, 0.03)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Brand Mark & Title */}
          <div
            onClick={() => navigateTo("home", "slide-backward")}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 4,
                background: "#FDF6EC",
                border: `1px solid ${SEAL}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Compass size={20} color={SEAL} />
            </div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 21, color: INK, fontWeight: 700, lineHeight: 1.2 }}>
                Scheme Matcher
              </div>
              <div style={{ fontFamily: sans, fontSize: 11.5, color: "#64748B", marginTop: 2, fontWeight: 500 }}>
                Civic Welfare &amp; Micro-Enterprise Discovery Engine
              </div>
            </div>
          </div>

          {/* Citizen Account Session & Database Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Live Database Connection Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: dbStatus?.status === "connected" ? "#F0FDF4" : "#FFFBEB",
                border: `1px solid ${dbStatus?.status === "connected" ? "#BBF7D0" : "#FDE68A"}`,
                padding: "3px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                color: dbStatus?.status === "connected" ? "#166534" : "#92400E",
              }}
              title={
                dbStatus?.status === "connected"
                  ? `Persistent SQL Database: ${dbStatus.engine} (${dbStatus.database})`
                  : "Operating in client storage mode"
              }
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: dbStatus?.status === "connected" ? "#16A34A" : "#D97706",
                }}
              />
              <span>{dbStatus?.status === "connected" ? "SQLite Active · 19 Schemes Codified" : "Local Database Active"}</span>
            </div>
            {currentUser ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#FFFFFF",
                  border: `1px solid ${RULE}`,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 4,
                  boxShadow: "0 1px 2px rgba(22, 32, 50, 0.04)",
                }}
              >
                <span style={{ fontSize: 18 }}>{currentUser.avatar || "👤"}</span>
                <button
                  type="button"
                  onClick={() => navigateTo("login")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                  title="View Citizen Profile Details"
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: 10, color: SEAL, fontWeight: 500 }}>
                    {currentUser.categoryBadge ? currentUser.categoryBadge.split("·")[0] : "Verified Citizen"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleUserLogout}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#991B1B",
                    cursor: "pointer",
                    padding: 2,
                    marginLeft: 6,
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Sign out of citizen account"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo("login")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#FFFFFF",
                  border: `1px solid ${SEAL}`,
                  color: SEAL,
                  padding: "6px 12px",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <KeyRound size={13} color={SEAL} />
                <span>Citizen Login / Sign Up</span>
              </button>
            )}

            {matches && (
              <button
                type="button"
                onClick={resetAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "none",
                  border: "none",
                  color: "#64748B",
                  fontFamily: sans,
                  fontSize: 11.5,
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                title="Reset active profile filter"
              >
                <RefreshCw size={11} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* PRIMARY WEBSITE NAVIGATION BAR (REAL MULTI-PAGE TABS) */}
        <div style={{ maxWidth: 1180, margin: "10px auto 0 auto", overflowX: "auto" }}>
          <nav style={{ display: "flex", gap: 4, minWidth: "max-content", paddingBottom: 0 }}>
            {[
              { id: "home", label: "Home", icon: HomeIcon },
              { id: "profile", label: "Check Eligibility", icon: SlidersHorizontal },
              {
                id: "results",
                label: "Scheme Directory",
                icon: FileCheck2,
                badge: (matches || displayMatches).length,
              },
              {
                id: "tracker",
                label: "Application Tracker",
                icon: Clock,
                badge: currentUser && applications.length > 0 ? applications.length : undefined,
                highlight: currentUser && applications.length > 0,
              },
              {
                id: "documents",
                label: "Document Vault",
                icon: FolderUp,
                badge: documents.length > 0 ? documents.length : null,
              },
              { id: "assistant", label: "AI Scheme Sahayak", icon: MessageCircle },
              {
                id: "login",
                label: currentUser ? "My Account" : "Citizen Account",
                icon: KeyRound,
              },
            ].map((tab) => {
              const isActive = screen === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => navigateTo(tab.id)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "9px 13px",
                    background: "transparent",
                    border: "none",
                    borderBottom: isActive ? `3px solid ${SEAL}` : "3px solid transparent",
                    color: isActive ? INK : "#64748B",
                    fontFamily: sans,
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    cursor: "pointer",
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.color = INK;
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.color = "#64748B";
                  }}
                >
                  <TabIcon size={14} color={isActive ? SEAL : "#94A3B8"} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      style={{
                        fontSize: 10,
                        background: tab.highlight ? "#162032" : isActive ? SEAL : "#64748B",
                        color: "#FFFFFF",
                        padding: "1px 6px",
                        borderRadius: 3,
                        fontWeight: 600,
                      }}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Website Body Area */}
      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: screen === "home" ? "100%" : 1180,
          margin: screen === "home" ? "0" : "18px auto 44px auto",
          padding: screen === "home" ? "0" : "0 clamp(16px, 3.5vw, 32px)",
          boxSizing: "border-box",
        }}
      >
        {/* Welcome Celebration Banner when citizen creates account or signs in */}
        {welcomeToast && (
          <div
            style={{
              background: "#E8F5E9",
              border: `1.5px solid ${OK}`,
              borderRadius: 6,
              padding: "12px 18px",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              boxShadow: "0 2px 8px rgba(47, 93, 80, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: OK }}>
              <CheckCircle2 size={20} />
              <div>
                <strong style={{ fontSize: 14 }}>
                  {welcomeToast.isDemo ? "Demo Profile Loaded!" : "Citizen Registration Successful!"}
                </strong>
                <div style={{ fontSize: 12.5, color: "#2E5D4B", marginTop: 2 }}>
                  Welcome, <strong>{welcomeToast.name}</strong>. You have been transferred to your matched schemes dashboard with {welcomeToast.schemesCount} eligible opportunities.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => navigateTo("tracker")}
                style={{
                  padding: "5px 12px",
                  background: OK,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Track Applications
              </button>
              <button
                type="button"
                onClick={() => setWelcomeToast(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#5C6B84",
                  fontSize: 16,
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Inner Page Header with "← Back" Navigation and Breadcrumbs */}
        {screen !== "home" && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              padding: "4px 2px",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            {/* Back Button */}
            <button
              type="button"
              onClick={goBack}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "6px 12px",
                color: INK,
                fontFamily: sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 2px rgba(35, 50, 74, 0.04)",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = "#F4EFE6")}
              onMouseOut={(e) => (e.currentTarget.style.background = "#FFFFFF")}
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            {/* Breadcrumb Path */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280" }}>
              <button
                type="button"
                onClick={() => navigateTo("home", "slide-backward")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: SEAL,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: sans,
                  fontSize: 13,
                }}
              >
                Home
              </button>
              <span>/</span>
              <span style={{ color: INK, fontWeight: 600 }}>{getBreadcrumbTitle()}</span>
            </div>

            {/* Quick Context Shortcuts */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {screen !== "tracker" && (
                <button
                  type="button"
                  onClick={() => navigateTo("tracker")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    padding: "5px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: INK,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <Clock size={13} color="#1E3A8A" />
                  <span>Tracker ({applications.length})</span>
                </button>
              )}

              {screen !== "results" && (
                <button
                  type="button"
                  onClick={() => navigateTo("results")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    padding: "5px 10px",
                    borderRadius: 4,
                    fontSize: 12,
                    color: INK,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  <FileCheck2 size={13} color={SEAL} />
                  <span>Schemes ({(matches || displayMatches).length})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Application View Surface */}
        {screen === "home" ? (
          <div key="home" className={transitionDir}>
            <Home
              setScreen={navigateTo}
              onOpenCsc={() => setIsCscOpen(true)}
              lang={lang}
            />
          </div>
        ) : (
          <div
            style={{
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              borderRadius: 4,
              padding: "clamp(20px, 3.5vw, 36px) clamp(20px, 4vw, 40px)",
              minHeight: 520,
              position: "relative",
              boxShadow: "0 1px 3px rgba(18, 25, 38, 0.03)",
            }}
          >
            <div key={screen} className={transitionDir}>
              {screen === "login" && (
              <Login
                currentUser={currentUser}
                onLogin={handleUserLogin}
                onLogout={handleUserLogout}
                setScreen={navigateTo}
                onBack={goBack}
                lang={lang}
              />
            )}

            {screen === "profile" && (
              <ProfileForm
                profile={profile}
                setProfile={setProfile}
                onSubmit={runMatch}
                onGoToDocuments={() => navigateTo("documents")}
                onBack={goBack}
                lang={lang}
              />
            )}

            {screen === "results" && (
              <Results
                matches={matches || displayMatches}
                openDetails={openDetails}
                onRetakeProfile={() => navigateTo("profile", "slide-backward")}
                onOpenCsc={() => setIsCscOpen(true)}
                lang={lang}
                isPlainMode={isPlainMode}
              />
            )}

            {screen === "details" && (
              <Details
                match={selectedMatch}
                back={goBack}
                documents={documents}
                currentUser={currentUser}
                profile={profile}
                onLoginUser={handleUserLogin}
                onNavigate={navigateTo}
                onNavigateToTracker={(appId) => {
                  if (currentUser?.id) {
                    setApplications(getStoredApplications(currentUser.id));
                  }
                  navigateTo("tracker");
                }}
                onGoToDocuments={() => navigateTo("documents")}
                onOpenCsc={() => setIsCscOpen(true)}
                lang={lang}
                isPlainMode={isPlainMode}
                onAskAssistant={(query) => {
                  setAssistantQuery(query);
                  navigateTo("assistant");
                }}
              />
            )}

            {screen === "tracker" && (
              <ApplicationTracker
                currentUser={currentUser}
                applications={applications}
                setApplications={setApplications}
                onNavigate={navigateTo}
                onOpenDetails={openDetails}
                onLoginUser={handleUserLogin}
                matchedSchemesCount={(matches || displayMatches).length}
                lang={lang}
              />
            )}

            {screen === "documents" && (
              <Documents
                documents={documents}
                setDocuments={setDocuments}
                profile={profile}
                setProfile={setProfile}
                onProceedToMatches={profile.age ? runMatch : () => navigateTo("profile")}
                onBack={goBack}
              />
            )}

            {screen === "assistant" && (
              <Assistant
                profile={profile}
                matches={matches || displayMatches}
                initialQuery={assistantQuery}
                onBack={goBack}
                lang={lang}
              />
            )}
          </div>
        </div>
      )}
      </main>

      {/* Professional Civic Platform Footer */}
      <footer
        style={{
          background: "#121926",
          color: "#E2E8F0",
          borderTop: `3px solid ${SEAL}`,
          padding: "44px clamp(16px, 4vw, 36px) 28px clamp(16px, 4vw, 36px)",
          fontFamily: sans,
          marginTop: "auto",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 36,
              paddingBottom: 28,
              borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            {/* Mission Col */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FFFFFF", marginBottom: 10 }}>
                <Compass size={20} color="#FDE68A" />
                <span style={{ fontWeight: 700, fontSize: 16, fontFamily: serif }}>
                  Scheme Matcher
                </span>
              </div>
              <p style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.6, margin: "0 0 12px 0" }}>
                Independent civic-technology discovery platform matching Indian artisans, micro-entrepreneurs, and citizens to official central and state welfare programs.
              </p>
              <div style={{ fontSize: 11.5, color: "#CBD5E1", background: "rgba(255,255,255,0.06)", padding: "8px 12px", borderRadius: 4, borderLeft: `3px solid ${SEAL}` }}>
                Academic Research &amp; Demonstration Project · Final Year BCA AI/ML
              </div>
            </div>

            {/* Official Portals Col */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.8, marginBottom: 12, textTransform: "uppercase" }}>
                Authentic National Portals
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                <li>
                  <a href="https://www.india.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    National Portal of India (india.gov.in) ↗
                  </a>
                </li>
                <li>
                  <a href="https://www.myscheme.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    myScheme National Portal ↗
                  </a>
                </li>
                <li>
                  <a href="https://dbtbharat.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    Direct Benefit Transfer (DBT Bharat) ↗
                  </a>
                </li>
                <li>
                  <a href="https://udyamregistration.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    Udyam MSME Registration Portal ↗
                  </a>
                </li>
                <li>
                  <a href="https://www.standupmitra.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    Stand-Up Mitra Portal ↗
                  </a>
                </li>
              </ul>
            </div>

            {/* Citizen Helplines Col */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.5, marginBottom: 10 }}>
                CITIZEN HELPDESK &amp; ASSISTANCE
              </div>
              <div style={{ fontSize: 12.5, color: "#CBD5E1", lineHeight: 1.6 }}>
                <div>National Portal Helpline: <strong>1800-11-8008</strong></div>
                <div>MoSJE Central Desk: <strong>011-2338 1001</strong></div>
                <div>Technical Support: <strong>support.schemes@gov.in</strong></div>
                <div style={{ marginTop: 6, color: "#94A3B8", fontSize: 11.5 }}>
                  Working Hours: Mon–Sat, 09:30 AM to 06:00 PM IST
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Copyright & Compliance Strip */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              paddingTop: 18,
              fontSize: 11.5,
              color: "#94A3B8",
            }}
          >
            <div>
              © 2026 Scheme Matcher. Codified from Ministry of Social Justice &amp; Empowerment guidelines.
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {dbStatus?.status === "connected" && (
                <span style={{ color: "#34D399", fontWeight: 600 }}>
                  ● SQLite DB ({dbStatus.counts?.users || 0} Users, {dbStatus.counts?.applications || 0} Applications)
                </span>
              )}
              <span>Terms of Use</span>
              <span>•</span>
              <span>Statutory Advisory</span>
              <span>•</span>
              <span>Last Codified: Oct 2026</span>
            </div>
          </div>

          {/* Prominent Statutory Disclaimer */}
          <div
            style={{
              marginTop: 14,
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              fontSize: 11,
              color: "#64748B",
              lineHeight: 1.5,
            }}
          >
            <strong>Official Advisory:</strong> Scheme Matcher provides algorithmic eligibility discovery based on codified rules published in official scheme guidelines. Match scores and checklists are for informational and preparation purposes only. Final approval, sanction, and disbursement are solely determined by designated government authorities and participating lending institutions following physical due diligence.
          </div>
        </div>
      </footer>

      {/* Jargon Buster Modal */}
      <JargonBusterModal
        isOpen={isJargonOpen}
        onClose={() => setIsJargonOpen(false)}
        lang={lang}
      />

      {/* CSC Sahayak & Helpline Modal */}
      <CscModeModal
        isOpen={isCscOpen}
        onClose={() => setIsCscOpen(false)}
        profile={profile}
        topMatch={topMatch}
        lang={lang}
      />
    </div>
  );
}
