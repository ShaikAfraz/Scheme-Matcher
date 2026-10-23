/**
 * DEMO CITIZEN PROFILES & PRESET DATA
 * Real-world personas representing marginalized & vulnerable beneficiaries
 * under the Ministry of Social Justice & Empowerment (SIH26092).
 */

export const DEMO_PROFILES = [
  {
    id: "ramesh-artisan",
    name: "Ramesh Kumar",
    avatar: "👨🏽‍🔧",
    role: "SC Traditional Artisan & Leather Craftsman",
    location: "Varanasi, Uttar Pradesh",
    categoryBadge: "SC Community · Traditional Artisan",
    badgeColor: "#8A5A17",
    email: "ramesh.artisan@demo.gov.in",
    mobile: "+91 98765 43210",
    password: "demo123",
    story:
      "4th-generation master leather craftsman looking to modernize his home workshop with heavy-duty motorized stitching machines and expand into export-grade ethnic footwear.",
    targetSchemes: ["PM Vishwakarma", "NSFDC Term Loan", "PMEGP"],
    estimatedSubsidy: "Up to 35% Margin Subsidy (₹1.05 Lakh)",
    profileData: {
      age: 38,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "SC",
      income: 180000,
      financialRequirement: 300000,
      businessStatus: "existing",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: true,
      isTransgender: false,
      isDnt: false,
    },
    documents: [
      {
        id: "doc_rk_01",
        name: "Aadhaar_Card_Verified.pdf",
        size: "1.2 MB",
        type: "Aadhaar Card (Identity & Age Proof)",
        typeId: "aadhaar",
        uploadedAt: "Today, 09:15 AM",
        status: "Verified",
      },
      {
        id: "doc_rk_02",
        name: "SC_Caste_Certificate_UP.pdf",
        size: "820 KB",
        type: "Caste / Category Certificate (SC/ST/OBC)",
        typeId: "caste",
        uploadedAt: "Today, 09:18 AM",
        status: "Verified",
      },
      {
        id: "doc_rk_03",
        name: "PM_Vishwakarma_Artisan_ID.pdf",
        size: "1.5 MB",
        type: "Other Supporting Documents / Certificates",
        typeId: "other",
        uploadedAt: "Today, 09:20 AM",
        status: "Verified",
      },
      {
        id: "doc_rk_04",
        name: "Workshop_Machinery_DPR.pdf",
        size: "2.4 MB",
        type: "Project Report (DPR) / Machinery Quotations",
        typeId: "dpr",
        uploadedAt: "Today, 09:22 AM",
        status: "Verified",
      },
    ],
  },
  {
    id: "sunita-shg",
    name: "Sunita Devi",
    avatar: "👩🏽‍🌾",
    role: "Rural Women Self-Help Group (SHG) Leader",
    location: "Gaya, Bihar",
    categoryBadge: "OBC Community · Women Entrepreneur",
    badgeColor: "#2F5D50",
    email: "sunita.shg@demo.gov.in",
    mobile: "+91 98111 22334",
    password: "demo123",
    story:
      "Leads a 10-woman collective running a micro spice-grinding and bio-flour packaging unit. Seeking capital for automatic pulverizer machine and FSSAI packaging line.",
    targetSchemes: ["NBCFDC Mahila Samriddhi", "Stand-Up India", "PMEGP (Rural Women)"],
    estimatedSubsidy: "Up to 35% Capital Subsidy + Concessional 4% Interest",
    profileData: {
      age: 34,
      gender: "Female",
      state: "Bihar",
      category: "OBC",
      income: 120000,
      financialRequirement: 500000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    },
    documents: [
      {
        id: "doc_sd_01",
        name: "Aadhaar_Card_SunitaDevi.pdf",
        size: "1.1 MB",
        type: "Aadhaar Card (Identity & Age Proof)",
        typeId: "aadhaar",
        uploadedAt: "Today, 10:02 AM",
        status: "Verified",
      },
      {
        id: "doc_sd_02",
        name: "OBC_NonCreamyLayer_Bihar.pdf",
        size: "940 KB",
        type: "Caste / Category Certificate (SC/ST/OBC)",
        typeId: "caste",
        uploadedAt: "Today, 10:05 AM",
        status: "Verified",
      },
      {
        id: "doc_sd_03",
        name: "SHG_Jeevika_Affiliation_Letter.pdf",
        size: "1.8 MB",
        type: "Other Supporting Documents / Certificates",
        typeId: "other",
        uploadedAt: "Today, 10:08 AM",
        status: "Verified",
      },
      {
        id: "doc_sd_04",
        name: "Bank_Passbook_PNB_12Months.pdf",
        size: "3.1 MB",
        type: "Bank Passbook / Statements (12 Months)",
        typeId: "bank",
        uploadedAt: "Today, 10:10 AM",
        status: "Verified",
      },
    ],
  },
  {
    id: "aakash-safai",
    name: "Aakash Verma",
    avatar: "👨🏽‍💼",
    role: "Sanitation Worker Dependent / Mechanized Cleaning",
    location: "Nagpur, Maharashtra",
    categoryBadge: "SC Community · Safai Karamchari Ward",
    badgeColor: "#B5651D",
    email: "aakash.safai@demo.gov.in",
    mobile: "+91 97654 32109",
    password: "demo123",
    story:
      "Son of a retired municipal sanitation worker, launching a mechanized sewer desilting and automated pressure-washing micro-enterprise to eliminate manual hazard.",
    targetSchemes: ["NSKFDC General Term Loan", "PM-DAKSH", "PM SVANidhi"],
    estimatedSubsidy: "Up to ₹50,000 Subsidy + 5% Concessional Term Loan",
    profileData: {
      age: 26,
      gender: "Male",
      state: "Maharashtra",
      category: "SC",
      income: 95000,
      financialRequirement: 200000,
      businessStatus: "new",
      businessType: "Services",
      isSafaiKaramchari: true,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    },
    documents: [
      {
        id: "doc_av_01",
        name: "Aadhaar_Card_Aakash.pdf",
        size: "1.3 MB",
        type: "Aadhaar Card (Identity & Age Proof)",
        typeId: "aadhaar",
        uploadedAt: "Yesterday, 04:30 PM",
        status: "Verified",
      },
      {
        id: "doc_av_02",
        name: "SafaiKaramchari_Dependent_Cert.pdf",
        size: "1.1 MB",
        type: "Other Supporting Documents / Certificates",
        typeId: "other",
        uploadedAt: "Yesterday, 04:32 PM",
        status: "Verified",
      },
      {
        id: "doc_av_03",
        name: "SC_Certificate_Maharashtra.pdf",
        size: "780 KB",
        type: "Caste / Category Certificate (SC/ST/OBC)",
        typeId: "caste",
        uploadedAt: "Yesterday, 04:35 PM",
        status: "Verified",
      },
    ],
  },
  {
    id: "priya-divyang",
    name: "Priya Sharma",
    avatar: "👩🏻‍🦽",
    role: "Divyangjan (PwD) Common Service Center & Tech Hub",
    location: "Jaipur, Rajasthan",
    categoryBadge: "General · Divyangjan / PwD (50% Locomotor)",
    badgeColor: "#23324A",
    email: "priya.divyang@demo.gov.in",
    mobile: "+91 96543 21098",
    password: "demo123",
    story:
      "Locomotor disability (50%). Currently runs a village digital kiosk (CSC). Wants to scale into a full digital graphics, laser engraving, and e-governance service centre.",
    targetSchemes: ["NHFDC Divyangjan Term Loan", "Stand-Up India", "PMEGP"],
    estimatedSubsidy: "Up to ₹1.5 Lakh Margin Subsidy + 5% Interest Rebate",
    profileData: {
      age: 29,
      gender: "Female",
      state: "Rajasthan",
      category: "General",
      income: 240000,
      financialRequirement: 750000,
      businessStatus: "existing",
      businessType: "Services",
      isSafaiKaramchari: false,
      isDivyangjan: true,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    },
    documents: [
      {
        id: "doc_ps_01",
        name: "Aadhaar_Card_Priya.pdf",
        size: "1.0 MB",
        type: "Aadhaar Card (Identity & Age Proof)",
        typeId: "aadhaar",
        uploadedAt: "Today, 11:20 AM",
        status: "Verified",
      },
      {
        id: "doc_ps_02",
        name: "UDID_Disability_Card_50Percent.pdf",
        size: "2.0 MB",
        type: "Other Supporting Documents / Certificates",
        typeId: "other",
        uploadedAt: "Today, 11:22 AM",
        status: "Verified",
      },
      {
        id: "doc_ps_03",
        name: "Udyam_Registration_Certificate.pdf",
        size: "1.4 MB",
        type: "Udyam MSME Registration Certificate",
        typeId: "udyam",
        uploadedAt: "Today, 11:25 AM",
        status: "Verified",
      },
      {
        id: "doc_ps_04",
        name: "Digital_Studio_Expansion_DPR.pdf",
        size: "2.8 MB",
        type: "Project Report (DPR) / Machinery Quotations",
        typeId: "dpr",
        uploadedAt: "Today, 11:28 AM",
        status: "Verified",
      },
    ],
  },
  {
    id: "kavita-dnt",
    name: "Kavita Bai",
    avatar: "🧕🏽",
    role: "De-Notified / Nomadic Tribe (DNT) Textile Artisan",
    location: "Ujjain, Madhya Pradesh",
    categoryBadge: "DNT Tribe · Traditional Embroidery",
    badgeColor: "#9A3B32",
    email: "kavita.dnt@demo.gov.in",
    mobile: "+91 95432 10987",
    password: "demo123",
    story:
      "Nomadic artisan crafting traditional mirror-work garments and accessories. Sells in weekly haats and fairs; seeking zero-interest working capital for bulk raw cloth.",
    targetSchemes: ["SEED Scheme for DNTs", "PM SVANidhi", "MUDRA Shishu"],
    estimatedSubsidy: "Zero collateral micro-loan + 7% Interest Subsidy",
    profileData: {
      age: 42,
      gender: "Female",
      state: "Madhya Pradesh",
      category: "DNT",
      income: 80000,
      financialRequirement: 50000,
      businessStatus: "existing",
      businessType: "Trading",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: true,
      isTransgender: false,
      isDnt: true,
    },
    documents: [
      {
        id: "doc_kb_01",
        name: "Aadhaar_Card_Kavita.pdf",
        size: "1.1 MB",
        type: "Aadhaar Card (Identity & Age Proof)",
        typeId: "aadhaar",
        uploadedAt: "Yesterday, 02:10 PM",
        status: "Verified",
      },
      {
        id: "doc_kb_02",
        name: "DNT_Community_Certificate_MP.pdf",
        size: "920 KB",
        type: "Caste / Category Certificate (SC/ST/OBC)",
        typeId: "caste",
        uploadedAt: "Yesterday, 02:14 PM",
        status: "Verified",
      },
      {
        id: "doc_kb_03",
        name: "PM_SVANidhi_Vending_ID.pdf",
        size: "1.3 MB",
        type: "Other Supporting Documents / Certificates",
        typeId: "other",
        uploadedAt: "Yesterday, 02:18 PM",
        status: "Verified",
      },
    ],
  },
];

/**
 * Storage helpers for custom signed-up accounts
 */
const STORAGE_KEY = "scheme_matcher_custom_users";
const CURRENT_USER_KEY = "scheme_matcher_active_user";

export function getCustomUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export async function syncUserToDatabase(user) {
  try {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
  } catch (e) {
    console.warn("[Database Sync] Running in offline / local mode:", e.message);
  }
}

export function saveCustomUser(user) {
  try {
    const users = getCustomUsers();
    const updated = [user, ...users.filter((u) => u.email !== user.email)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    syncUserToDatabase(user);
    return true;
  } catch (e) {
    return false;
  }
}

export function getStoredActiveUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredActiveUser(user) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {}
}
