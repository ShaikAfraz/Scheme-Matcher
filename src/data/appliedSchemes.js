/**
 * APPLIED SCHEMES & TRACKING DATA
 * Tracks government scheme applications across the 5 standardized stages of approval.
 */

export const INITIAL_APPLICATIONS = [
  {
    id: "APP-2026-UP-849201",
    schemeId: "SC008",
    schemeName: "PM Vishwakarma Scheme",
    ministry: "Ministry of MSME & Ministry of Skill Development",
    userId: "ramesh-artisan",
    applicantName: "Ramesh Kumar",
    applicantPhone: "+91 98765 43210",
    state: "Uttar Pradesh",
    district: "Varanasi",
    category: "SC",
    businessType: "Manufacturing (Leather Footwear & Goods)",
    requestedAmount: 300000,
    sanctionedAmount: 100000, // Tranche 1
    subsidyAmount: 15000, // Modern Tool-kit incentive + 8% Interest subvention
    bankName: "State Bank of India",
    bankBranch: "Sigra Branch, Varanasi",
    appliedDate: "28 Sep 2026",
    estimatedDisbursement: "08 Oct 2026",
    currentStage: 4, // 1 to 5
    status: "Sanctioned — Disbursement Scheduled",
    statusType: "success", // "pending" | "in_progress" | "success" | "action_needed"
    nodalOfficer: "Shri V. K. Tripathi (District Industries Centre, Varanasi)",
    officerPhone: "+91 542 222 4190",
    timeline: [
      {
        stage: 1,
        title: "Application Submitted & Aadhaar e-KYC",
        date: "28 Sep 2026, 11:20 AM",
        completed: true,
        remarks: "Online application registered with biometric Aadhaar e-KYC. Reference ID generated.",
      },
      {
        stage: 2,
        title: "Panchayat / Urban Local Body (ULB) Verification",
        date: "30 Sep 2026, 03:45 PM",
        completed: true,
        remarks: "Ward Councillor & Nagar Nigam field officer physically verified leather workshop & trade lineage.",
      },
      {
        stage: 3,
        title: "District Implementation Committee (DIC) Screening",
        date: "02 Oct 2026, 02:15 PM",
        completed: true,
        remarks: "Screening committee approved basic 5-day skill training exemption due to 15+ years master craftsman experience.",
      },
      {
        stage: 4,
        title: "Bank Credit Sanction & CGTMSE Guarantee",
        date: "04 Oct 2026, 04:30 PM",
        completed: true,
        remarks: "State Bank of India approved Collateral-Free Tranche-1 Loan of ₹1,00,000 at concessional 5% interest rate. Sanction Letter No: SBI/VAR/2026/910.",
      },
      {
        stage: 5,
        title: "DBT Direct Disbursement & Toolkit Grant",
        date: "Expected by 08 Oct 2026",
        completed: false,
        remarks: "Mandate scheduled with RBI e-Kuber portal for ₹15,000 tool-kit voucher + ₹1,00,000 working capital credit to bank account.",
      },
    ],
  },
  {
    id: "APP-2026-UP-339102",
    schemeId: "SC001",
    schemeName: "PMEGP — Prime Minister's Employment Generation Programme",
    ministry: "Ministry of MSME (KVIC)",
    userId: "ramesh-artisan",
    applicantName: "Ramesh Kumar",
    applicantPhone: "+91 98765 43210",
    state: "Uttar Pradesh",
    district: "Varanasi",
    category: "SC",
    businessType: "Manufacturing (Workshop Modernization)",
    requestedAmount: 500000,
    sanctionedAmount: 500000,
    subsidyAmount: 175000, // 35% margin money
    bankName: "Punjab National Bank",
    bankBranch: "Cantonment, Varanasi",
    appliedDate: "01 Oct 2026",
    estimatedDisbursement: "18 Oct 2026",
    currentStage: 3,
    status: "Under DLTFC Committee Review",
    statusType: "in_progress",
    nodalOfficer: "Smt. Manju Sinha (KVIC Varanasi Division)",
    officerPhone: "+91 542 250 8123",
    timeline: [
      {
        stage: 1,
        title: "Application & DPR Upload",
        date: "01 Oct 2026, 10:14 AM",
        completed: true,
        remarks: "Detailed Project Report for modern footwear machinery submitted online.",
      },
      {
        stage: 2,
        title: "Agency Preliminary Scrutiny",
        date: "03 Oct 2026, 12:30 PM",
        completed: true,
        remarks: "KVIC District Officer scrutinized SC caste certificate and DPR quotations. Marked eligible for 35% rural margin subsidy.",
      },
      {
        stage: 3,
        title: "DLTFC Task Force Committee Interview",
        date: "Scheduled for 07 Oct 2026, 11:00 AM",
        completed: false,
        remarks: "Applicant invited for District Level Task Force Committee interview at DM Office, Varanasi.",
      },
      {
        stage: 4,
        title: "Bank Credit Appraisal & Sanction",
        date: "Pending committee clearance",
        completed: false,
        remarks: "Will be routed to Punjab National Bank upon DLTFC recommendation.",
      },
      {
        stage: 5,
        title: "Margin Money Subsidy Lock-in (DBT)",
        date: "Pending loan disbursement",
        completed: false,
        remarks: "Subsidy of ₹1,75,000 will be held in TDR for 3 years, then adjusted towards principal.",
      },
    ],
  },
  {
    id: "APP-2026-BR-450912",
    schemeId: "SC002",
    schemeName: "Stand-Up India Scheme",
    ministry: "Department of Financial Services, Ministry of Finance",
    userId: "sunita-shg",
    applicantName: "Sunita Devi",
    applicantPhone: "+91 98111 22334",
    state: "Bihar",
    district: "Gaya",
    category: "OBC / Women",
    businessType: "Manufacturing (Bio-Flour & Spice Processing Unit)",
    requestedAmount: 1000000,
    sanctionedAmount: 1000000,
    subsidyAmount: 150000,
    bankName: "Bank of India",
    bankBranch: "Gaya Main Branch",
    appliedDate: "20 Sep 2026",
    estimatedDisbursement: "12 Oct 2026",
    currentStage: 4,
    status: "Bank Credit Assessment Complete",
    statusType: "in_progress",
    nodalOfficer: "Lead District Manager (LDM) Gaya",
    officerPhone: "+91 631 222 1890",
    timeline: [
      {
        stage: 1,
        title: "Application on Stand-Up Mitra Portal",
        date: "20 Sep 2026, 02:40 PM",
        completed: true,
        remarks: "SHG Enterprise greenfield application submitted with 10 women members details.",
      },
      {
        stage: 2,
        title: "Handholding Support Agency Screening",
        date: "23 Sep 2026, 11:15 AM",
        completed: true,
        remarks: "NABARD Gaya verified SHG track record and credit rating.",
      },
      {
        stage: 3,
        title: "District Committee Clearance",
        date: "27 Sep 2026, 04:00 PM",
        completed: true,
        remarks: "Verified greenfield manufacturing status with zero prior bank default.",
      },
      {
        stage: 4,
        title: "Bank Loan Sanction & CGSSI Guarantee",
        date: "03 Oct 2026, 01:20 PM",
        completed: true,
        remarks: "Bank of India issued In-Principle Sanction Letter for ₹10 Lakh Composite Loan.",
      },
      {
        stage: 5,
        title: "Account Credit & Machinery Inspection",
        date: "Scheduled for 12 Oct 2026",
        completed: false,
        remarks: "First tranche of ₹6.5 Lakh for machinery vendor payment scheduled after hypothecation.",
      },
    ],
  },
  {
    id: "APP-2026-MH-338192",
    schemeId: "SC004",
    schemeName: "NSKFDC General Term Loan Scheme",
    ministry: "National Safai Karamcharis Finance & Development Corporation",
    userId: "aakash-safai",
    applicantName: "Aakash Verma",
    applicantPhone: "+91 97654 32109",
    state: "Maharashtra",
    district: "Nagpur",
    category: "SC / Safai Karamchari Ward",
    businessType: "Services (Mechanized Sanitization & Sewer Desilting)",
    requestedAmount: 200000,
    sanctionedAmount: 200000,
    subsidyAmount: 50000,
    bankName: "Maharashtra State Cooperative Bank",
    bankBranch: "Sitabuldi, Nagpur",
    appliedDate: "02 Oct 2026",
    estimatedDisbursement: "22 Oct 2026",
    currentStage: 2,
    status: "Safai Karamchari Ward Verification Active",
    statusType: "in_progress",
    nodalOfficer: "State Channelizing Agency (SCA) Officer, Nagpur",
    officerPhone: "+91 712 254 7800",
    timeline: [
      {
        stage: 1,
        title: "Application & Dependent Certificate Upload",
        date: "02 Oct 2026, 09:30 AM",
        completed: true,
        remarks: "NSKFDC application submitted with municipal dependent certificate.",
      },
      {
        stage: 2,
        title: "State Channelizing Agency (SCA) Verification",
        date: "Active (Initiated 04 Oct 2026)",
        completed: false,
        remarks: "Nagpur Municipal Corporation validating service book records.",
      },
      {
        stage: 3,
        title: "NSKFDC Central Sanction",
        date: "Pending SCA clearance",
        completed: false,
        remarks: "Concessional 5% interest rate loan subsidy allocation.",
      },
      {
        stage: 4,
        title: "Bank Agreement Execution",
        date: "Pending sanction",
        completed: false,
        remarks: "Hypothecation of mechanized cleaning equipment.",
      },
      {
        stage: 5,
        title: "Direct Benefit Transfer (DBT)",
        date: "Expected by late October 2026",
        completed: false,
        remarks: "Direct disbursement to vendor and beneficiary loan account.",
      },
    ],
  },
  {
    id: "APP-2026-RJ-992301",
    schemeId: "SC007",
    schemeName: "NHFDC Divyangjan Swavalamban Scheme",
    ministry: "National Handicapped Finance and Development Corporation",
    userId: "priya-divyang",
    applicantName: "Priya Sharma",
    applicantPhone: "+91 96543 21098",
    state: "Rajasthan",
    district: "Jaipur",
    category: "General / Divyangjan (50% Locomotor)",
    businessType: "Services (Digital Kiosk & Graphic Design Hub)",
    requestedAmount: 500000,
    sanctionedAmount: 500000,
    subsidyAmount: 50000,
    bankName: "Baroda Rajasthan Kshetriya Gramin Bank",
    bankBranch: "Mansarovar, Jaipur",
    appliedDate: "10 Sep 2026",
    estimatedDisbursement: "Completed",
    currentStage: 5,
    status: "Loan Disbursed & Active (DBT Complete)",
    statusType: "success",
    nodalOfficer: "Rajasthan SCA Nodal Director, Jaipur",
    officerPhone: "+91 141 274 3300",
    timeline: [
      {
        stage: 1,
        title: "Online Registration with UDID Card",
        date: "10 Sep 2026, 10:15 AM",
        completed: true,
        remarks: "UDID digital verification passed for 50% locomotor disability.",
      },
      {
        stage: 2,
        title: "District Social Welfare Office Verification",
        date: "14 Sep 2026, 03:00 PM",
        completed: true,
        remarks: "Field inspector verified current CSC shop and business feasibility.",
      },
      {
        stage: 3,
        title: "NHFDC Central Headquarter Sanction",
        date: "19 Sep 2026, 01:45 PM",
        completed: true,
        remarks: "Sanctioned at 5% interest rate with 1% additional rebate for women with disability.",
      },
      {
        stage: 4,
        title: "Bank Documentation & Insurance",
        date: "24 Sep 2026, 12:20 PM",
        completed: true,
        remarks: "Credit guarantee executed with Baroda Rajasthan Kshetriya Gramin Bank.",
      },
      {
        stage: 5,
        title: "DBT Loan & Rebate Disbursed",
        date: "29 Sep 2026, 05:10 PM",
        completed: true,
        remarks: "₹5,00,000 credited to A/C No. ending in 4109. Government subsidy ledger updated.",
      },
    ],
  },
];

const STORAGE_KEY = "scheme_matcher_user_applications";

export function getStoredApplications(userId = null) {
  // CRITICAL: When not logged in (userId is null or undefined), NEVER return demo applications!
  if (!userId) {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : INITIAL_APPLICATIONS;
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPLICATIONS));
    }
    return all.filter((a) => a.userId === userId);
  } catch (e) {
    return [];
  }
}

export function getAllApplicationsRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_APPLICATIONS;
  } catch (e) {
    return INITIAL_APPLICATIONS;
  }
}

export async function lookupApplicationPublicly(query) {
  if (!query || !query.trim()) return null;
  const cleanQ = query.trim().toUpperCase().replace(/\s+/g, "");

  // 1. Check live SQLite database
  try {
    const res = await fetch(`/api/applications?q=${encodeURIComponent(query.trim())}`);
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
    let all = raw ? JSON.parse(raw) : INITIAL_APPLICATIONS;
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
    let all = raw ? JSON.parse(raw) : INITIAL_APPLICATIONS;
    all = all.filter((a) => !(a.id === appId && (!userId || a.userId === userId)));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    try {
      await fetch(`/api/applications?id=${encodeURIComponent(appId)}`, { method: "DELETE" });
    } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

export async function syncAppToDatabase(app) {
  try {
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(app),
    });
  } catch (e) {
    console.warn("[Database Sync] Running in offline / local mode:", e.message);
  }
}

export function saveApplication(newApp) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let all = raw ? JSON.parse(raw) : INITIAL_APPLICATIONS;
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
