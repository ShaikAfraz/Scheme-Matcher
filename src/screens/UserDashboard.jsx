import React, { useState, useEffect } from "react";
import {
  UserCheck,
  FileCheck2,
  Bookmark,
  Clock,
  SlidersHorizontal,
  Edit3,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  ChevronRight,
  ArrowRight,
  LogOut,
  FolderUp,
  ShieldCheck,
  Building2,
  IndianRupee,
  MapPin,
  Calendar,
  Sparkles,
} from "lucide-react";
import { INK, PAPER, CARD, SEAL, OK, VERIFY, NO, RULE, inputStyle, serif, sans } from "../theme/tokens.js";
import { getStoredAuthToken, setStoredActiveUser } from "../data/demoProfiles.js";
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

export default function UserDashboard({
  currentUser,
  onLogout,
  setScreen,
  onOpenDetails,
  lang = "en",
}) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "assessments" | "bookmarks" | "applications"
  const [profileForm, setProfileForm] = useState(() => ({
    age: currentUser?.profileData?.age || 28,
    gender: currentUser?.profileData?.gender || "Female",
    state: currentUser?.profileData?.state || "Uttar Pradesh",
    category: currentUser?.profileData?.category || "SC",
    income: currentUser?.profileData?.income || 150000,
    financialRequirement: currentUser?.profileData?.financialRequirement || 250000,
    businessStatus: currentUser?.profileData?.businessStatus || "new",
    businessType: currentUser?.profileData?.businessType || "Manufacturing",
    education: currentUser?.profileData?.education || "Graduate",
    occupation: currentUser?.profileData?.occupation || "Other",
    hasBplCard: !!currentUser?.profileData?.hasBplCard,
    isTaxPayer: !!currentUser?.profileData?.isTaxPayer,
    isSafaiKaramchari: !!currentUser?.profileData?.isSafaiKaramchari,
    isDivyangjan: !!currentUser?.profileData?.isDivyangjan,
    isArtisan: !!currentUser?.profileData?.isArtisan,
    isTransgender: !!currentUser?.profileData?.isTransgender,
    isDnt: !!currentUser?.profileData?.isDnt,
  }));

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveErrorMsg, setSaveErrorMsg] = useState("");

  const [assessments, setAssessments] = useState([]);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const [savedSchemes, setSavedSchemes] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const [userApplications, setUserApplications] = useState([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [vaultDocs, setVaultDocs] = useState([]);
  const [loadingVault, setLoadingVault] = useState(false);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser?.profileData) {
      setProfileForm({
        age: currentUser.profileData.age || 28,
        gender: currentUser.profileData.gender || "Female",
        state: currentUser.profileData.state || "Uttar Pradesh",
        category: currentUser.profileData.category || "SC",
        income: currentUser.profileData.income || 150000,
        financialRequirement: currentUser.profileData.financialRequirement || 250000,
        businessStatus: currentUser.profileData.businessStatus || "new",
        businessType: currentUser.profileData.businessType || "Manufacturing",
        education: currentUser.profileData.education || "Graduate",
        occupation: currentUser.profileData.occupation || "Other",
        hasBplCard: !!currentUser.profileData.hasBplCard,
        isTaxPayer: !!currentUser.profileData.isTaxPayer,
        isSafaiKaramchari: !!currentUser.profileData.isSafaiKaramchari,
        isDivyangjan: !!currentUser.profileData.isDivyangjan,
        isArtisan: !!currentUser.profileData.isArtisan,
        isTransgender: !!currentUser.profileData.isTransgender,
        isDnt: !!currentUser.profileData.isDnt,
      });
    }
  }, [currentUser]);

  // Load data for active tab
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) return;

    if (activeTab === "vault") {
      setLoadingVault(true);
      fetch("/api/documents", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.documents)) {
            setVaultDocs(data.documents);
          }
        })
        .catch((err) => console.warn("Failed to load documents:", err))
        .finally(() => setLoadingVault(false));
    } else if (activeTab === "assessments") {
      setLoadingAssessments(true);
      fetch("/api/assessments", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.assessments)) {
            setAssessments(data.assessments);
          }
        })
        .catch((err) => console.warn("Failed to load assessments:", err))
        .finally(() => setLoadingAssessments(false));
    } else if (activeTab === "bookmarks") {
      setLoadingSaved(true);
      fetch("/api/bookmarks", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.bookmarks)) {
            setSavedSchemes(data.bookmarks);
          }
        })
        .catch((err) => console.warn("Failed to load bookmarks:", err))
        .finally(() => setLoadingSaved(false));
    } else if (activeTab === "applications") {
      setLoadingApps(true);
      fetch(`/api/applications?userId=${encodeURIComponent(currentUser?.id || "")}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.applications)) {
            setUserApplications(data.applications);
          }
        })
        .catch((err) => console.warn("Failed to load applications:", err))
        .finally(() => setLoadingApps(false));
    }
  }, [activeTab, currentUser?.id]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccessMsg("");
    setSaveErrorMsg("");

    const token = getStoredAuthToken();
    if (!token) {
      setSaveErrorMsg("Authentication session expired. Please log in again.");
      setSavingProfile(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...profileForm,
          age: Number(profileForm.age),
          income: Number(profileForm.income),
          financialRequirement: Number(profileForm.financialRequirement),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setStoredActiveUser(data.user);
        setSaveSuccessMsg("Citizen profile parameters successfully updated in database!");
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        setSaveErrorMsg(data.error || "Failed to update profile.");
      }
    } catch (err) {
      setSaveErrorMsg("Network error saving profile to server: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  // Remove bookmark
  const handleRemoveBookmark = async (schemeId) => {
    const token = getStoredAuthToken();
    if (!token) return;

    try {
      const res = await fetch(`/api/bookmarks?schemeId=${encodeURIComponent(schemeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedSchemes((prev) => prev.filter((b) => (b.scheme?.id || b.schemeId) !== schemeId));
      }
    } catch (err) {
      console.warn("Failed to remove bookmark:", err);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", padding: 30 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: serif, fontSize: 24, color: INK, margin: "0 0 10px 0" }}>
          Citizen Session Required
        </h2>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 20 }}>
          Please sign in to view your citizen dashboard, manage your saved schemes, track your applications, and edit your profile.
        </p>
        <button
          onClick={() => setScreen("login")}
          style={{
            padding: "10px 20px",
            background: SEAL,
            color: "#FFFFFF",
            border: "none",
            borderRadius: 4,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Go to Citizen Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      {/* Top Banner / Citizen Identity Card */}
      <div
        style={{
          background: "#FFFFFF",
          border: `1px solid ${RULE}`,
          borderRadius: 4,
          padding: "20px 24px",
          marginBottom: 24,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#F8F6F0",
              border: `2px solid ${SEAL}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            {currentUser.avatar || "👤"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontFamily: serif, color: INK, fontWeight: 700 }}>
                {currentUser.name}
              </h2>
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
                {currentUser.categoryBadge || "Verified Citizen"}
              </span>
              <span
                style={{
                  fontSize: 11,
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  color: OK,
                  padding: "2px 8px",
                  borderRadius: 3,
                  fontWeight: 600,
                }}
              >
                ✓ Profile Active
              </span>
            </div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
              {currentUser.email || currentUser.mobile} · {currentUser.state || "All India"} · {currentUser.category || "General"} Category
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Sparkles size={14} />
            <span>Discover Schemes</span>
          </button>
          <button
            onClick={() => setScreen("documents")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#FFFFFF",
              border: `1px solid ${RULE}`,
              color: INK,
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <FolderUp size={14} />
            <span>Vault</span>
          </button>
          <button
            onClick={onLogout}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#FFF1F2",
              border: "1px solid #FECDD3",
              color: "#BE123C",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Log out of citizen portal"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: "flex",
          borderBottom: `2px solid ${RULE}`,
          marginBottom: 24,
          gap: 4,
          overflowX: "auto",
        }}
      >
        {[
          { id: "profile", label: "Edit Citizen Profile", icon: SlidersHorizontal },
          { id: "vault", label: "Document Vault & Status", icon: ShieldCheck },
          { id: "assessments", label: "Previous Assessments", icon: FileCheck2 },
          { id: "bookmarks", label: "Saved Schemes", icon: Bookmark },
          { id: "applications", label: "Track Applications", icon: Clock },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? `3px solid ${SEAL}` : "3px solid transparent",
                color: isActive ? INK : "#64748B",
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
                cursor: "pointer",
                marginBottom: -2,
                transition: "all 0.15s ease",
              }}
            >
              <TabIcon size={16} color={isActive ? SEAL : "#94A3B8"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Profile Editor */}
      {activeTab === "profile" && (
        <div
          style={{
            background: "#FFFFFF",
            border: `1px solid ${RULE}`,
            borderRadius: 4,
            padding: 24,
            boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: "0 0 6px 0", fontFamily: serif, fontSize: 18, color: INK }}>
              Citizen Demographic &amp; Enterprise Profile
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              These parameters feed directly into the eligibility matcher algorithm to evaluate guidelines across central ministries and state schemes.
            </p>
          </div>

          {saveSuccessMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                color: OK,
                padding: "10px 14px",
                borderRadius: 4,
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <CheckCircle2 size={16} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {saveErrorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                color: "#B91C1C",
                padding: "10px 14px",
                borderRadius: 4,
                marginBottom: 16,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <AlertCircle size={16} />
              <span>{saveErrorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Age in Years
                </label>
                <input
                  type="number"
                  min="14"
                  max="100"
                  value={profileForm.age}
                  onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Gender
                </label>
                <select
                  value={profileForm.gender}
                  onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Transgender">Transgender</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Social Category
                </label>
                <select
                  value={profileForm.category}
                  onChange={(e) => setProfileForm({ ...profileForm, category: e.target.value })}
                  style={inputStyle}
                >
                  <option value="SC">Scheduled Caste (SC)</option>
                  <option value="ST">Scheduled Tribe (ST)</option>
                  <option value="OBC">Other Backward Class (OBC)</option>
                  <option value="DNT">De-notified, Nomadic &amp; Semi-Nomadic (DNT)</option>
                  <option value="General">General / Open</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  State of Residence / Operations
                </label>
                <select
                  value={profileForm.state}
                  onChange={(e) => setProfileForm({ ...profileForm, state: e.target.value })}
                  style={inputStyle}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Educational Qualification
                </label>
                <select
                  value={profileForm.education || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, education: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select Qualification (Optional)</option>
                  <option value="Below 10th">Below 10th Standard</option>
                  <option value="10th Pass">10th Pass (Matriculation)</option>
                  <option value="12th Pass">12th Pass (Higher Secondary)</option>
                  <option value="ITI / Diploma">ITI / Polytechnic Diploma</option>
                  <option value="Graduate">Graduate (B.A., B.Sc., B.Com, B.Tech)</option>
                  <option value="Post Graduate">Post Graduate (M.A., M.Sc., M.Tech, etc.)</option>
                  <option value="Doctorate">Doctorate / Ph.D. / Professional Degree</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Primary Occupation / Status
                </label>
                <select
                  value={profileForm.occupation || ""}
                  onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })}
                  style={inputStyle}
                >
                  <option value="">Select Occupation (Optional)</option>
                  <option value="Student">Student (Scholarships / Fellowships)</option>
                  <option value="Farmer">Farmer / Cultivator / Dairy Producer</option>
                  <option value="Artisan">Traditional Artisan / Handloom Weaver</option>
                  <option value="Sanitation Worker">Sanitation Worker / Safai Karamchari</option>
                  <option value="Street Vendor">Street Vendor / Urban Micro-hawker</option>
                  <option value="Self-Employed">Self-Employed / Shop Owner</option>
                  <option value="Unemployed">Unemployed / Job Seeker</option>
                  <option value="Salaried">Salaried Employee (Public/Private)</option>
                  <option value="Other">Other Livelihood</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Annual Family Income (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={profileForm.income}
                  onChange={(e) => setProfileForm({ ...profileForm, income: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Project Cost / Financial Requirement (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="10000"
                  value={profileForm.financialRequirement}
                  onChange={(e) => setProfileForm({ ...profileForm, financialRequirement: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Business Venture Stage
                </label>
                <select
                  value={profileForm.businessStatus}
                  onChange={(e) => setProfileForm({ ...profileForm, businessStatus: e.target.value })}
                  style={inputStyle}
                >
                  <option value="new">New Enterprise (Greenfield)</option>
                  <option value="existing">Existing Enterprise (Expansion / Modernization)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 5 }}>
                  Business Sector
                </label>
                <select
                  value={profileForm.businessType}
                  onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                  style={inputStyle}
                >
                  <option value="Manufacturing">Manufacturing &amp; Production</option>
                  <option value="Services">Service Enterprise</option>
                  <option value="Trading">Trading &amp; Retail</option>
                </select>
              </div>
            </div>

            {/* Affirmative Action Checkboxes */}
            <div style={{ background: "#F8F6F0", border: `1px solid ${RULE}`, borderRadius: 4, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: INK, marginBottom: 10 }}>
                Special Beneficiary Affirmations (Unlocks Subsidized Interest &amp; Targeted Quotas)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {[
                  { key: "isSafaiKaramchari", label: "Sanitation Worker / Safai Karamchari dependent" },
                  { key: "isDivyangjan", label: "Person with Disability (Divyangjan - 40%+)" },
                  { key: "isArtisan", label: "Traditional Artisan / Craftsman (PM Vishwakarma)" },
                  { key: "isTransgender", label: "Transgender Community Member (SMILE scheme)" },
                  { key: "isDnt", label: "De-notified or Nomadic Tribe (SEED scheme)" },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: INK, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={profileForm[key]}
                      onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.checked })}
                      style={{ marginTop: 2 }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Statutory Exclusions & Welfare Ration Cards */}
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 4, padding: 14, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#92400E", marginBottom: 10 }}>
                Statutory Exclusions &amp; Ration Cards (Required for Pension / Destitute Welfare Schemes)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: INK, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={profileForm.hasBplCard}
                    onChange={(e) => setProfileForm({ ...profileForm, hasBplCard: e.target.checked })}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <strong>Hold valid BPL / Antyodaya Ration Card</strong>
                    <div style={{ fontSize: 11.5, color: "#78350F" }}>
                      Satisfies National Social Assistance &amp; subsidized food grain criteria.
                    </div>
                  </div>
                </label>

                <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12.5, color: INK, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={profileForm.isTaxPayer}
                    onChange={(e) => setProfileForm({ ...profileForm, isTaxPayer: e.target.checked })}
                    style={{ marginTop: 2 }}
                  />
                  <div>
                    <strong>Income Tax Payee (File ITR under Income Tax Act)</strong>
                    <div style={{ fontSize: 11.5, color: "#78350F" }}>
                      Statutory exclusion for Atal Pension Yojana &amp; non-contributory pensions.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: SEAL,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 4,
                fontSize: 13.5,
                fontWeight: 600,
                cursor: savingProfile ? "wait" : "pointer",
              }}
            >
              <Save size={15} />
              <span>{savingProfile ? "Saving to Database..." : "Save Profile & Refresh Matches"}</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab: Document Vault & Verification Records */}
      {activeTab === "vault" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 18, color: INK }}>
                Citizen Document Vault &amp; Verification Records
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                Encrypted, private object-stored credentials verified with deterministic eligibility rules.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setScreen("documents")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <FolderUp size={15} />
                <span>Open Full Vault &amp; Upload</span>
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 500, marginBottom: 4 }}>
                Total Vault Files
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: INK, fontFamily: serif }}>
                {vaultDocs.length}
              </div>
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>Encrypted in private storage</div>
            </div>

            <div
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: "#166534", fontWeight: 600, marginBottom: 4 }}>
                Verified Against Criteria
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: OK, fontFamily: serif }}>
                {vaultDocs.filter((d) => d.verificationStatus === "Verified Against Provided Criteria" || d.status === "Verified").length}
              </div>
              <div style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>Ready for Bank Dossier</div>
            </div>

            <div
              style={{
                background: "#FFFBEB",
                border: "1px solid #FDE68A",
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: "#92400E", fontWeight: 600, marginBottom: 4 }}>
                Needs Review / Officer
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#B45309", fontFamily: serif }}>
                {vaultDocs.filter((d) => d.verificationStatus === "Needs Review" || d.status === "Under Review").length}
              </div>
              <div style={{ fontSize: 11, color: "#92400E", marginTop: 2 }}>Routed to Admin Desk</div>
            </div>

            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECDD3",
                borderRadius: 4,
                padding: "14px 18px",
              }}
            >
              <div style={{ fontSize: 12, color: "#991B1B", fontWeight: 600, marginBottom: 4 }}>
                Pending / Discrepancy
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#DC2626", fontFamily: serif }}>
                {vaultDocs.filter((d) => d.verificationStatus === "Rejected With Reason" || d.status === "Rejected" || d.verificationStatus === "Pending").length}
              </div>
              <div style={{ fontSize: 11, color: "#991B1B", marginTop: 2 }}>Requires replacement</div>
            </div>
          </div>

          {loadingVault ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              Loading document credentials from secure vault...
            </div>
          ) : vaultDocs.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: 36,
                textAlign: "center",
              }}
            >
              <ShieldCheck size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>
                No Documents in Private Vault
              </div>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0", maxWidth: 500, marginInline: "auto" }}>
                Upload your Aadhaar card, Income Certificate, Caste Certificate, or Udyam MSME registration to verify eligibility against government scheme guidelines.
              </p>
              <button
                onClick={() => setScreen("documents")}
                style={{
                  padding: "8px 18px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Go to Document Upload &amp; Verification
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {vaultDocs.map((doc) => {
                const isVerified = doc.verificationStatus === "Verified Against Provided Criteria" || doc.status === "Verified";
                const isReview = doc.verificationStatus === "Needs Review" || doc.status === "Under Review";
                const isRejected = doc.verificationStatus === "Rejected With Reason" || doc.status === "Rejected";

                const badgeBg = isVerified ? "#F0FDF4" : isReview ? "#FFFBEB" : isRejected ? "#FEF2F2" : "#F1F5F9";
                const badgeColor = isVerified ? OK : isReview ? "#92400E" : isRejected ? "#991B1B" : "#475569";
                const badgeBorder = isVerified ? "#BBF7D0" : isReview ? "#FDE68A" : isRejected ? "#FECDD3" : "#CBD5E1";

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      borderRadius: 4,
                      padding: "16px 20px",
                      boxShadow: "0 1px 3px rgba(22, 32, 50, 0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 15, color: INK }}>
                            {doc.name || doc.docName}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              background: "#F1F5F9",
                              color: "#334155",
                              padding: "2px 8px",
                              borderRadius: 3,
                              fontWeight: 600,
                            }}
                          >
                            {doc.type || doc.docType || "Certificate"}
                          </span>
                          {doc.schemeId && (
                            <span
                              style={{
                                fontSize: 11,
                                background: "#EFF6FF",
                                color: "#1E40AF",
                                border: "1px solid #BFDBFE",
                                padding: "2px 8px",
                                borderRadius: 3,
                                fontWeight: 500,
                              }}
                            >
                              Scheme: {doc.schemeId}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                          Uploaded {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : "Recently"} · Size: {doc.size || doc.docSize || "Encrypted"}
                          {doc.extractionConfidence ? ` · OCR Confidence: ${(doc.extractionConfidence * 100).toFixed(0)}%` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 12,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`,
                            padding: "4px 10px",
                            borderRadius: 3,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          {isVerified && "✓"} {doc.verificationStatus || doc.status}
                        </span>
                      </div>
                    </div>

                    {/* Extracted Fields Grid */}
                    {doc.extractedData && (
                      <div
                        style={{
                          background: "#F8FAFC",
                          border: `1px solid ${RULE}`,
                          borderRadius: 4,
                          padding: "10px 14px",
                          marginTop: 10,
                          fontSize: 12,
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: 10,
                        }}
                      >
                        {doc.extractedData.applicantName && (
                          <div>
                            <span style={{ color: "#64748B" }}>Extracted Name: </span>
                            <strong style={{ color: INK }}>{doc.extractedData.applicantName}</strong>
                          </div>
                        )}
                        {doc.extractedData.annualFamilyIncome != null && (
                          <div>
                            <span style={{ color: "#64748B" }}>Extracted Income: </span>
                            <strong style={{ color: OK }}>
                              ₹{Number(doc.extractedData.annualFamilyIncome).toLocaleString("en-IN")} / yr
                            </strong>
                          </div>
                        )}
                        {doc.extractedData.certificateNumber && (
                          <div>
                            <span style={{ color: "#64748B" }}>Certificate No: </span>
                            <strong style={{ color: INK, fontFamily: "monospace" }}>
                              {doc.extractedData.certificateNumber}
                            </strong>
                          </div>
                        )}
                        {doc.extractedData.issuingAuthority && (
                          <div>
                            <span style={{ color: "#64748B" }}>Authority: </span>
                            <strong style={{ color: INK }}>{doc.extractedData.issuingAuthority}</strong>
                          </div>
                        )}
                        {doc.extractedData.issueDate && (
                          <div>
                            <span style={{ color: "#64748B" }}>Issued: </span>
                            <strong style={{ color: INK }}>{doc.extractedData.issueDate}</strong>
                          </div>
                        )}
                        {doc.extractedData.expiryDate && (
                          <div>
                            <span style={{ color: "#64748B" }}>Expiry: </span>
                            <strong style={{ color: INK }}>{doc.extractedData.expiryDate}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verification Reason / Evidence */}
                    {doc.verificationReason && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: isVerified ? OK : isReview ? "#92400E" : "#991B1B",
                          fontStyle: "italic",
                        }}
                      >
                        Evidence: {doc.verificationReason}
                      </div>
                    )}

                    {/* Action links */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 12,
                        paddingTop: 8,
                        borderTop: `1px solid ${RULE}`,
                      }}
                    >
                      <button
                        onClick={() => setScreen("documents")}
                        style={{
                          background: "none",
                          border: "none",
                          color: SEAL,
                          fontWeight: 600,
                          fontSize: 12,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>Manage in Full Vault</span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Previous Assessments */}
      {activeTab === "assessments" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 18, color: INK }}>
              Eligibility Assessment Audit Records
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Every time you evaluate schemes, an immutable assessment snapshot is saved to your account.
            </p>
          </div>

          {loadingAssessments ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              Loading assessment records from server...
            </div>
          ) : assessments.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: 36,
                textAlign: "center",
              }}
            >
              <FileCheck2 size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>
                No Assessments Recorded Yet
              </div>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>
                Run the eligibility questionnaire to generate your first audit record and tailored scheme recommendations.
              </p>
              <button
                onClick={() => setScreen("profile")}
                style={{
                  padding: "8px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Start Eligibility Questionnaire
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {assessments.map((a) => (
                <div
                  key={a.id}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    boxShadow: "0 1px 2px rgba(22, 32, 50, 0.03)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, background: "#F1F5F9", color: "#475569", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>
                        {new Date(a.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <strong style={{ fontSize: 14.5, color: INK }}>
                        {a.topSchemeName || "Eligibility Evaluation"}
                      </strong>
                      <span style={{ fontSize: 10.5, background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF", padding: "2px 6px", borderRadius: 3, fontWeight: 600 }}>
                        Engine: {a.ruleVersion || "v2.0-deterministic-574"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12, marginTop: 4 }}>
                      <span style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: OK, padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>
                        ✓ {a.eligibleCount != null ? a.eligibleCount : a.matchedSchemesCount} Eligible
                      </span>
                      <span style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#B45309", padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>
                        ⚠️ {a.potentiallyEligibleCount != null ? a.potentiallyEligibleCount : 0} Potentially Eligible
                      </span>
                      {a.notEligibleCount != null && (
                        <span style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: "2px 8px", borderRadius: 3, fontWeight: 600 }}>
                          ✕ {a.notEligibleCount} Excluded
                        </span>
                      )}
                      <span style={{ color: "#64748B" }}>
                        · Total Evaluated: <strong>{a.totalEvaluated || 574}</strong> · Top Score: <strong style={{ color: OK }}>{a.topScore}%</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setScreen("results")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      background: "#FFFFFF",
                      border: `1px solid ${SEAL}`,
                      color: SEAL,
                      borderRadius: 4,
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <span>View Results</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Saved Schemes */}
      {activeTab === "bookmarks" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 18, color: INK }}>
              Saved &amp; Bookmarked Schemes ({savedSchemes.length})
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Schemes you have flagged for further review or future loan applications.
            </p>
          </div>

          {loadingSaved ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              Loading saved schemes...
            </div>
          ) : savedSchemes.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: 36,
                textAlign: "center",
              }}
            >
              <Bookmark size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>
                No Saved Schemes Yet
              </div>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>
                Browse the Scheme Directory and click the bookmark icon to save schemes for quick access.
              </p>
              <button
                onClick={() => setScreen("results")}
                style={{
                  padding: "8px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Browse Scheme Directory
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
              {savedSchemes.map((b) => {
                const s = b.scheme;
                const schemeId = s?.id || b.schemeId;
                const name = s?.name || schemeId;
                const ministry = s?.ministry || "Government of India";
                const level = s?.level || "Central";
                return (
                  <div
                    key={b.id || schemeId}
                    style={{
                      background: "#FFFFFF",
                      border: `1px solid ${RULE}`,
                      borderRadius: 4,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "0 1px 2px rgba(22, 32, 50, 0.03)",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            background: level === "Central" ? "#EFF6FF" : "#F0FDF4",
                            color: level === "Central" ? "#1E40AF" : "#166534",
                            padding: "2px 6px",
                            borderRadius: 3,
                            fontWeight: 600,
                          }}
                        >
                          {level} Scheme
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBookmark(schemeId)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#94A3B8",
                            cursor: "pointer",
                            padding: 2,
                          }}
                          title="Remove bookmark"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: INK, marginBottom: 4 }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 10 }}>
                        {ministry}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => {
                          if (onOpenDetails) onOpenDetails(schemeId);
                          else setScreen("details", schemeId);
                        }}
                        style={{
                          flex: 1,
                          padding: "6px 12px",
                          background: SEAL,
                          color: "#FFFFFF",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                        }}
                      >
                        <span>View Details</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Track Applications */}
      {activeTab === "applications" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px 0", fontFamily: serif, fontSize: 18, color: INK }}>
              Active Welfare &amp; Credit Applications ({userApplications.length})
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
              Track the live processing status of your submitted grant and credit applications.
            </p>
          </div>

          {loadingApps ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>
              Loading applications...
            </div>
          ) : userApplications.length === 0 ? (
            <div
              style={{
                background: "#FFFFFF",
                border: `1px solid ${RULE}`,
                borderRadius: 4,
                padding: 36,
                textAlign: "center",
              }}
            >
              <Clock size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>
                No Active Applications
              </div>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px 0" }}>
                Select a matched scheme from the directory and start your application process to track it here.
              </p>
              <button
                onClick={() => setScreen("results")}
                style={{
                  padding: "8px 16px",
                  background: SEAL,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 4,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Explore Eligible Schemes
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {userApplications.map((app) => (
                <div
                  key={app.id}
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${RULE}`,
                    borderRadius: 4,
                    padding: 18,
                    boxShadow: "0 1px 3px rgba(22, 32, 50, 0.03)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <strong style={{ fontSize: 15, color: INK }}>{app.schemeName}</strong>
                        <span
                          style={{
                            fontSize: 11,
                            background:
                              app.status === "Sanctioned" || app.status === "Approved"
                                ? "#F0FDF4"
                                : app.status === "Under Review"
                                ? "#FFFBEB"
                                : "#EFF6FF",
                            color:
                              app.status === "Sanctioned" || app.status === "Approved"
                                ? "#166534"
                                : app.status === "Under Review"
                                ? "#92400E"
                                : "#1E40AF",
                            border: "1px solid currentColor",
                            padding: "2px 8px",
                            borderRadius: 3,
                            fontWeight: 600,
                          }}
                        >
                          {app.status || "Submitted"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>
                        Application Ref: <code>{app.applicationNumber || app.id}</code> · Submitted: {app.submittedAt || "Recently"}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#64748B" }}>Requested Amount</div>
                      <strong style={{ fontSize: 14, color: INK }}>
                        ₹{Number(app.loanAmount || 100000).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  </div>

                  {/* Progress Stage */}
                  <div style={{ background: "#F8F6F0", border: `1px solid ${RULE}`, borderRadius: 4, padding: "10px 14px", fontSize: 12, color: INK, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>Current Stage:</strong> {app.currentStage || "DLTFC Verification & Document Review"}
                    </div>
                    <button
                      onClick={() => setScreen("tracker")}
                      style={{
                        background: "none",
                        border: "none",
                        color: SEAL,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: 12,
                        padding: 0,
                      }}
                    >
                      Open Full Timeline →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
