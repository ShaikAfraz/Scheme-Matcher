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
import { getStoredActiveUser, setStoredActiveUser } from "./data/demoProfiles.js";
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
    if (currentUser && currentUser.id) {
      const localApps = getStoredApplications(currentUser.id);
      setApplications(localApps);

      fetch(`/api/applications?userId=${encodeURIComponent(currentUser.id)}`)
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
    setCurrentUser(null);
    setStoredActiveUser(null);
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

      {/* Main Government Portal Header Masthead */}
      <header
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${RULE}`,
          padding: "10px clamp(12px, 3.5vw, 40px)",
          boxShadow: "0 1px 4px rgba(35, 50, 74, 0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Official Emblem & Portal Title */}
          <div
            onClick={() => navigateTo("home", "slide-backward")}
            style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "#FAF7EE",
                border: `1.5px solid ${SEAL}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Landmark size={22} color={SEAL} />
            </div>
            <div>
              <div style={{ fontFamily: serif, fontSize: 21, color: INK, fontWeight: 700, lineHeight: 1.15 }}>
                {t.appName}
              </div>
              <div style={{ fontFamily: sans, fontSize: 11, color: "#606F7B", marginTop: 2, fontWeight: 500 }}>
                भारत सरकार · Ministry of Social Justice &amp; Empowerment · Government of India
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
                background: dbStatus?.status === "connected" ? "#ECFDF5" : "#FFFBEB",
                border: `1px solid ${dbStatus?.status === "connected" ? "#A7F3D0" : "#FDE68A"}`,
                padding: "3px 9px",
                borderRadius: 14,
                fontSize: 11,
                fontWeight: 600,
                color: dbStatus?.status === "connected" ? "#065F46" : "#92400E",
              }}
              title={
                dbStatus?.status === "connected"
                  ? `Persistent SQL Database: ${dbStatus.engine} (${dbStatus.database})`
                  : "Operating in client storage mode"
              }
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: dbStatus?.status === "connected" ? "#10B981" : "#F59E0B",
                  boxShadow: dbStatus?.status === "connected" ? "0 0 6px #10B981" : "none",
                }}
              />
              <span>{dbStatus?.status === "connected" ? "SQLite DB Connected" : "Local DB Mode"}</span>
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
                  borderRadius: 20,
                  boxShadow: "0 1px 2px rgba(35, 50, 74, 0.05)",
                }}
              >
                <span style={{ fontSize: 20 }}>{currentUser.avatar || "👤"}</span>
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
                  <div style={{ fontSize: 12, fontWeight: 700, color: INK }}>
                    {currentUser.name}
                  </div>
                  <div style={{ fontSize: 10, color: SEAL, fontWeight: 600 }}>
                    {currentUser.categoryBadge ? currentUser.categoryBadge.split("·")[0] : "Verified Citizen"}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleUserLogout}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#9A3B32",
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
                  border: `1.5px solid ${SEAL}`,
                  color: INK,
                  padding: "6px 14px",
                  borderRadius: 20,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
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
                  color: "#6B7280",
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
        <div style={{ maxWidth: 1040, margin: "10px auto 0 auto", overflowX: "auto" }}>
          <nav style={{ display: "flex", gap: 6, minWidth: "max-content", paddingBottom: 2 }}>
            {[
              { id: "home", label: "Home", icon: HomeIcon },
              { id: "profile", label: "Find Schemes", icon: SlidersHorizontal },
              {
                id: "results",
                label: "Eligible Schemes",
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
                label: currentUser ? "My Account" : "Login / Register",
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
                    padding: "7px 12px",
                    background: isActive ? "rgba(181, 101, 29, 0.1)" : "transparent",
                    border: "none",
                    borderBottom: isActive ? `3px solid ${SEAL}` : "3px solid transparent",
                    color: isActive ? INK : "#4A5568",
                    fontFamily: sans,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    borderRadius: "4px 4px 0 0",
                    transition: "all 0.15s ease",
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.background = "rgba(0, 0, 0, 0.04)";
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <TabIcon size={14} color={isActive ? SEAL : "#718096"} />
                  <span>{tab.label}</span>
                  {tab.badge !== null && tab.badge !== undefined && (
                    <span
                      style={{
                        fontSize: 10,
                        background: tab.highlight ? "#1E3A8A" : isActive ? SEAL : "#718096",
                        color: "#FFFFFF",
                        padding: "1px 6px",
                        borderRadius: 10,
                        fontWeight: 700,
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
          maxWidth: 1040,
          width: "100%",
          margin: "18px auto 36px auto",
          padding: "0 clamp(12px, 3.5vw, 40px)",
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

        {/* Elevated Glassmorphic Card Surface for Page Content */}
        <div
          className="portal-card-elevated"
          style={{
            padding: "clamp(20px, 3.5vw, 36px) clamp(20px, 4vw, 40px)",
            minHeight: 520,
            position: "relative",
          }}
        >
          {/* Animated View Container */}
          <div key={screen} className={transitionDir}>
            {screen === "home" && (
              <Home
                setScreen={navigateTo}
                onOpenCsc={() => setIsCscOpen(true)}
                lang={lang}
              />
            )}

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
      </main>

      {/* Official Government of India Portal Footer */}
      <footer
        style={{
          background: "rgba(35, 50, 74, 0.96)",
          color: "#E2E8F0",
          borderTop: `3px solid ${SEAL}`,
          padding: "36px clamp(16px, 4vw, 40px) 24px clamp(16px, 4vw, 40px)",
          fontFamily: sans,
          marginTop: "auto",
        }}
      >
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
              paddingBottom: 24,
              borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Ministry Col */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FFFFFF", marginBottom: 8 }}>
                <Landmark size={20} color="#FBBF24" />
                <span style={{ fontWeight: 700, fontSize: 15, fontFamily: serif }}>
                  AI Scheme Matcher &amp; Tracker
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#94A3B8", lineHeight: 1.6, margin: 0 }}>
                Ministry of Social Justice &amp; Empowerment, Government of India. Dedicated to transparent affirmative action, financial inclusion, and grievance-free welfare disbursement for India's marginalized entrepreneurs.
              </p>
            </div>

            {/* Quick Links Col */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.5, marginBottom: 10 }}>
                NATIONAL GOVERNMENT PORTALS
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 6 }}>
                <li>
                  <a href="https://www.india.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    National Portal of India (india.gov.in) ↗
                  </a>
                </li>
                <li>
                  <a href="https://www.myscheme.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    MyScheme National Platform ↗
                  </a>
                </li>
                <li>
                  <a href="https://dbtbharat.gov.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    Direct Benefit Transfer (DBT Bharat) ↗
                  </a>
                </li>
                <li>
                  <a href="https://www.standupmitra.in" target="_blank" rel="noreferrer" style={{ color: "#CBD5E1", textDecoration: "none" }}>
                    Stand-Up Mitra Financial Portal ↗
                  </a>
                </li>
              </ul>
            </div>

            {/* Citizen Helplines Col */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: 0.5, marginBottom: 10 }}>
                CITIZEN HELPDESK &amp; ASSISTANCE
              </div>
              <div style={{ fontSize: 12.5, color: "#CBD5E1", lineHeight: 1.6 }}>
                <div>Toll Free Helpline: <strong>1800-11-8008</strong></div>
                <div>MoSJE Central Desk: <strong>+91 11 2338 1001</strong></div>
                <div>Email: <strong>support.schemes@gov.in</strong></div>
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
              © 2026 Ministry of Social Justice &amp; Empowerment. Content owned &amp; maintained by Government of India.
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              {dbStatus?.status === "connected" && (
                <span style={{ color: "#34D399", fontWeight: 600 }}>
                  ● Database: SQLite 3 ({dbStatus.counts?.users || 0} Users, {dbStatus.counts?.applications || 0} Applications)
                </span>
              )}
              <span>Accessibility Statement</span>
              <span>•</span>
              <span>Screen Reader Access</span>
              <span>•</span>
              <span>Terms &amp; Conditions</span>
              <span>•</span>
              <span>Last Updated: 05 Oct 2026</span>
            </div>
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
