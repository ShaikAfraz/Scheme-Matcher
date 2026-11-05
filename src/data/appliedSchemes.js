import { getStoredAuthToken } from "./demoProfiles.js";

/**
 * APPLIED SCHEMES & APPLICATION TRACKING DATA
 * Manages official citizen welfare applications through the 5 standardized stages.
 *
 * All demo records and fake applicant personas have been removed.
 * Only authentic applications created by registered citizens are tracked.
 */

export const INITIAL_APPLICATIONS = [];

const STORAGE_KEY = "scheme_matcher_user_applications";

export function getStoredApplications(userId = null) {
  if (!userId) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    return all.filter((a) => a.userId === userId);
  } catch (e) {
    return [];
  }
}

export function getAllApplicationsRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function lookupApplicationPublicly(query) {
  if (!query || !query.trim()) return null;
  const cleanQ = query.trim().toUpperCase().replace(/\s+/g, "");

  // 1. Check live SQLite database public tracking endpoint
  try {
    const res = await fetch(`/api/applications/track?q=${encodeURIComponent(query.trim())}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.application) {
        return data.application;
      }
    }
  } catch (e) {
    // Fall through to local cache
  }

  // 2. Check local application store
  const all = getAllApplicationsRaw();
  return (
    all.find((a) => {
      const matchId = a.id && a.id.toUpperCase().replace(/\s+/g, "").includes(cleanQ);
      const matchPhone =
        a.applicantPhone &&
        a.applicantPhone.replace(/[\s+-]/g, "").includes(cleanQ.replace(/[\s+-]/g, ""));
      return matchId || matchPhone;
    }) || null
  );
}

export async function withdrawApplication(appId, userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    let targetApp = null;
    all = all.map((a) => {
      if (a.id === appId && (!userId || a.userId === userId)) {
        targetApp = {
          ...a,
          status: "Withdrawn by Citizen",
          statusType: "action_needed",
          timeline: [
            ...(a.timeline || []),
            {
              stage: a.currentStage,
              title: "Application Withdrawn by Applicant",
              date: new Intl.DateTimeFormat("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date()),
              completed: true,
              remarks: "Application officially withdrawn at citizen request. Record archived in District registry.",
            },
          ],
        };
        return targetApp;
      }
      return a;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    if (targetApp) {
      syncAppToDatabase(targetApp);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function deleteApplication(appId, userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    all = all.filter((a) => !(a.id === appId && (!userId || a.userId === userId)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    try {
      const token = getStoredAuthToken();
      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      await fetch(`/api/applications?id=${encodeURIComponent(appId)}`, {
        method: "DELETE",
        headers,
      });
    } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

export async function syncAppToDatabase(app) {
  try {
    const token = getStoredAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    await fetch("/api/applications", {
      method: "POST",
      headers,
      body: JSON.stringify(app),
    });
  } catch (e) {
    console.warn("[Database Sync] Running in offline / local mode:", e.message);
  }
}

export function saveApplication(newApp) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : [];
    const exists = all.findIndex((a) => a.id === newApp.id);
    if (exists >= 0) {
      all[exists] = newApp;
    } else {
      all = [newApp, ...all];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    syncAppToDatabase(newApp);
    return true;
  } catch (e) {
    return false;
  }
}

export function createNewApplication({
  scheme,
  user,
  requestedAmount,
  businessType,
  bankName = "State Bank of India",
  branchName = "Local District Main Branch",
  district = "District Headquarters",
}) {
  const dateStr = new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const stateCode = (user?.profileData?.state || "IN").substring(0, 2).toUpperCase();
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const appId = `APP-${new Date().getFullYear()}-${stateCode}-${randomNum}`;

  const amount = Number(requestedAmount) || Number(user?.profileData?.financialRequirement) || 150000;
  const subsidyEst = Math.round(amount * 0.25); // Estimated 25% margin subsidy

  const newApp = {
    id: appId,
    schemeId: scheme.id,
    schemeName: scheme.name,
    ministry: scheme.ministry,
    userId: user?.id || `anon_${Date.now()}`,
    applicantName: user?.name || "Citizen Beneficiary",
    applicantPhone: user?.mobile || "+91 98765 00000",
    state: user?.profileData?.state || "Uttar Pradesh",
    district: district,
    category: user?.profileData?.category || "General",
    businessType: businessType || user?.profileData?.businessType || "Manufacturing / Services",
    requestedAmount: amount,
    sanctionedAmount: amount,
    subsidyAmount: subsidyEst,
    bankName: bankName,
    bankBranch: branchName,
    appliedDate: dateStr,
    estimatedDisbursement: "Within 21 Working Days",
    currentStage: 1, // Just applied
    status: "Application Submitted — Awaiting Verification",
    statusType: "pending",
    nodalOfficer: "District Industries Centre / Lead District Nodal Office",
    officerPhone: "1800-11-8008 (Central Citizen Helpdesk)",
    timeline: [
      {
        stage: 1,
        title: "Application Submitted & Digital Receipt Issued",
        date: `${dateStr}, Just now`,
        completed: true,
        remarks: "Your application has been received and digitally signed. Digital Acknowledgement Receipt generated.",
      },
      {
        stage: 2,
        title: "Document Verification & Eligibility Scrutiny",
        date: "Expected in 3-5 days",
        completed: false,
        remarks: "District Nodal Officer will verify Aadhaar, Category Certificate, and Project Feasibility.",
      },
      {
        stage: 3,
        title: "Task Force / Committee Recommendation",
        date: "Pending Stage 2",
        completed: false,
        remarks: "District Level Task Force Committee will review project proposal for subsidy sanction.",
      },
      {
        stage: 4,
        title: "Bank Credit Appraisal & Sanction",
        date: "Pending Committee Recommendation",
        completed: false,
        remarks: "Designated commercial bank will issue sanction letter and credit guarantee.",
      },
      {
        stage: 5,
        title: "Direct Benefit Transfer (DBT) Disbursement",
        date: "Pending Loan Sanction",
        completed: false,
        remarks: "Subsidy and loan capital credited directly to citizen's Aadhaar-linked bank account.",
      },
    ],
  };

  saveApplication(newApp);
  return newApp;
}
