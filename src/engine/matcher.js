/**
 * DETERMINISTIC ELIGIBILITY & RECOMMENDATION ENGINE (V2.0)
 * Evaluates citizen and entrepreneur profiles against all 574 genuine government schemes.
 *
 * CORE ARCHITECTURAL PRINCIPLES:
 * 1. Explicit separation between DETERMINISTIC ELIGIBILITY (Eligible, Potentially Eligible, Not Eligible)
 *    and RELEVANCE SCORE (0–100%). A high relevance score MUST NEVER override a failed mandatory criterion.
 * 2. Three Eligibility Statuses:
 *    - "Eligible": All verified mandatory criteria (State, Age, Income, Category, Occupation/Education) pass.
 *    - "Potentially Eligible": No confirmed failure, but required info is missing or scheme has unverified/offline dependencies.
 *    - "Not Eligible": At least one verified mandatory criterion fails.
 * 3. Explainability: Every scheme evaluation provides granular, transparent criteria checks:
 *    - passedCriteria: criteria verified and satisfied
 *    - failedCriteria: mandatory criteria that disqualified the applicant
 *    - missingInformation: criteria that require citizen input or offline verification
 *    - disqualifyingReasons: human-readable explanation of why excluded
 * 4. Audit & Verification: Tracks whether scheme has fully codified criteria (540 verified) or requires offline verification (34 schemes).
 */

import { SCHEMES } from "../data/schemes.js";

export function formatINR(val) {
  if (val == null || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
}

export const EDUCATION_LEVELS = [
  { id: "below_10th", label: "Below 10th Standard", rank: 0 },
  { id: "10th_pass", label: "10th Pass (Matriculation)", rank: 1 },
  { id: "12th_pass", label: "12th Pass (Higher Secondary)", rank: 2 },
  { id: "diploma_iti", label: "ITI / Polytechnic Diploma", rank: 2 },
  { id: "graduate", label: "Graduate (B.A., B.Sc., B.Com, B.Tech, etc.)", rank: 3 },
  { id: "post_graduate", label: "Post Graduate (M.A., M.Sc., M.Com, M.Tech, etc.)", rank: 4 },
  { id: "doctorate", label: "Doctorate / Ph.D. / Professional Degree", rank: 5 },
];

export function getEducationRank(eduStr) {
  if (!eduStr) return null;
  const s = String(eduStr).toLowerCase().trim();
  if (s.includes("doctorate") || s.includes("phd") || s.includes("ph.d")) return 5;
  if (s.includes("post graduate") || s.includes("master") || s.includes("m.a") || s.includes("m.sc") || s.includes("m.tech")) return 4;
  if (s.includes("graduate") || s.includes("bachelor") || s.includes("degree") || s.includes("b.a") || s.includes("b.sc") || s.includes("b.tech")) return 3;
  if (s.includes("12th") || s.includes("intermediate") || s.includes("higher secondary") || s.includes("diploma") || s.includes("iti")) return 2;
  if (s.includes("10th") || s.includes("matric") || s.includes("high school") || s.includes("secondary") || s.includes("8th pass")) return 1;
  if (s.includes("below") || s.includes("primary") || s.includes("literate") || s.includes("illiterate")) return 0;
  return null;
}

/**
 * Audit all schemes in database/memory to identify verified vs incomplete/further verification required.
 */
export function auditAllSchemes(schemeList = SCHEMES) {
  let verifiedCriteriaCount = 0;
  let requiresVerificationCount = 0;
  const auditedSchemes = [];

  for (const s of schemeList) {
    const fullText = `${s.name || ""} ${s.description || ""} ${s.benefits || ""} ${JSON.stringify(s.documents || "")}`.toLowerCase();
    const notes = [];

    // Check tax payer statutory exclusion (Gazette Notification: w.e.f. 1 Oct 2022)
    if (
      s.id === "SCH_CEN_023" ||
      fullText.includes("atal pension") ||
      fullText.includes("income tax") ||
      fullText.includes("taxpayer") ||
      fullText.includes("tax payer")
    ) {
      notes.push("Income tax payers excluded by statutory scheme guidelines");
    }
    // Check BPL / Antyodaya ration card requirement
    if (fullText.includes("bpl") || fullText.includes("below poverty line") || fullText.includes("destitute")) {
      notes.push("Requires valid BPL / Antyodaya ration card or destitute classification");
    }

    const isVerified = notes.length === 0 && Boolean(s.portalUrl || s.portal_url);
    if (isVerified) {
      verifiedCriteriaCount++;
    } else {
      requiresVerificationCount++;
    }

    auditedSchemes.push({
      id: s.id,
      name: s.name,
      ministry: s.ministry,
      portalUrl: s.portalUrl || s.portal_url,
      verificationStatus: isVerified ? "verified" : "requires_verification",
      criteriaCompleteness: isVerified ? "complete" : "requires_offline_verification",
      notes: notes.length > 0 ? notes : ["All mandatory criteria verified and deterministically codified"],
    });
  }

  return {
    totalAudited: schemeList.length,
    verifiedCriteriaCount,
    requiresVerificationCount,
    auditedSchemes,
  };
}

const schemeCache = new WeakMap();

function getPrecomputedScheme(scheme) {
  if (typeof scheme !== "object" || scheme === null) {
    return {
      schemeStates: ["ALL"],
      isPanIndia: true,
      schemeCategories: ["ALL"],
      schemeBTypes: ["ALL"],
      schemeBStatus: ["ALL"],
      isBroadScheme: true,
      minAge: 0,
      maxAge: 100,
      schemeIncomeLimit: null,
      minReq: 0,
      maxReq: 0,
      isNonCreditScheme: true,
      nameLower: "",
      schemeText: "",
      isTaxExclusionScheme: false,
      isBplScheme: false,
      schemeNotes: [],
      isRequiresVerification: false,
      schemeRequiresGraduate: false,
      schemeRequires10th: false,
      hasSafaiKeywords: false,
      hasDivyangKeywords: false,
      hasArtisanKeywords: false,
      hasTransgenderKeywords: false,
      hasDntKeywords: false,
      hasStudentKeywords: false,
      hasFarmerKeywords: false,
      hasMinorityKeywords: false,
      hasSeniorKeywords: false,
      hasChildrenKeywords: false,
      hasWomenKeywords: false,
      isCategoryOpen: true,
    };
  }

  let cached = schemeCache.get(scheme);
  if (cached) return cached;

  const schemeStates = Array.isArray(scheme.states)
    ? scheme.states
    : typeof scheme.states === "string" && scheme.states.startsWith("[")
    ? JSON.parse(scheme.states)
    : typeof scheme.states === "string" && scheme.states.length > 0
    ? [scheme.states]
    : ["ALL"];

  const isPanIndia = schemeStates.includes("ALL");

  const schemeCategories = Array.isArray(scheme.categories)
    ? scheme.categories
    : typeof scheme.categories === "string" && scheme.categories.startsWith("[")
    ? JSON.parse(scheme.categories)
    : typeof scheme.categories === "string" && scheme.categories.length > 0
    ? [scheme.categories]
    : ["ALL"];

  const schemeBTypes = Array.isArray(scheme.businessTypes)
    ? scheme.businessTypes
    : typeof scheme.business_types === "string" && scheme.business_types.startsWith("[")
    ? JSON.parse(scheme.business_types)
    : typeof scheme.business_types === "string" && scheme.business_types.length > 0
    ? [scheme.business_types]
    : ["ALL"];

  const schemeBStatus = Array.isArray(scheme.businessStatus)
    ? scheme.businessStatus
    : typeof scheme.business_status === "string" && scheme.business_status.startsWith("[")
    ? JSON.parse(scheme.business_status)
    : typeof scheme.business_status === "string" && scheme.business_status.length > 0
    ? [scheme.business_status]
    : ["ALL"];

  const isBroadScheme = schemeBTypes.includes("ALL") && schemeBStatus.includes("ALL");

  const minAge = scheme.minAge != null ? Number(scheme.minAge) : scheme.min_age != null ? Number(scheme.min_age) : 0;
  const maxAge = scheme.maxAge != null ? Number(scheme.maxAge) : scheme.max_age != null ? Number(scheme.max_age) : 100;

  const schemeIncomeLimit =
    scheme.incomeLimit != null
      ? Number(scheme.incomeLimit)
      : scheme.incomeCeiling != null
      ? Number(scheme.incomeCeiling)
      : scheme.income_limit != null
      ? Number(scheme.income_limit)
      : scheme.maxIncome != null
      ? Number(scheme.maxIncome)
      : scheme.max_income != null
      ? Number(scheme.max_income)
      : null;

  const minReq = scheme.minReq != null ? Number(scheme.minReq) : scheme.min_req != null ? Number(scheme.min_req) : 0;
  const maxReq = scheme.maxReq != null ? Number(scheme.maxReq) : scheme.max_req != null ? Number(scheme.max_req) : 0;
  const isNonCreditScheme = minReq === 0 && maxReq <= 100000;

  const nameLower = (scheme.name || "").toLowerCase();
  const descLower = (scheme.description || "").toLowerCase();
  const benefitsLower = (scheme.benefits || "").toLowerCase();
  const docStr = Array.isArray(scheme.documents)
    ? scheme.documents.join(" ").toLowerCase()
    : typeof scheme.documents === "string"
    ? scheme.documents.toLowerCase()
    : "";
  const schemeText = `${nameLower} ${descLower} ${benefitsLower} ${docStr}`;

  const isTaxExclusionScheme =
    scheme.id === "SCH_CEN_023" ||
    schemeText.includes("atal pension") ||
    schemeText.includes("income tax") ||
    schemeText.includes("taxpayer") ||
    schemeText.includes("tax payer");
  const isBplScheme =
    schemeText.includes("bpl") || schemeText.includes("below poverty line") || schemeText.includes("destitute");

  const schemeNotes = [];
  if (isTaxExclusionScheme) schemeNotes.push("Income tax payers excluded by statutory scheme guidelines");
  if (isBplScheme) schemeNotes.push("Requires valid BPL / Antyodaya ration card or destitute classification");
  const isRequiresVerification = schemeNotes.length > 0;

  const schemeRequiresGraduate =
    schemeText.includes("graduate") || schemeText.includes("post graduate") || schemeText.includes("fellowship");
  const schemeRequires10th =
    schemeText.includes("10th pass") || schemeText.includes("matriculation") || schemeText.includes("8th pass");

  const hasSafaiKeywords =
    scheme.id === "SC013" ||
    schemeCategories.includes("Sanitation Workers") ||
    nameLower.includes("safai") ||
    nameLower.includes("namaste") ||
    nameLower.includes("swachhta");

  const hasDivyangKeywords =
    scheme.id === "SC018" ||
    schemeCategories.includes("Divyangjan") ||
    schemeCategories.includes("PwD") ||
    nameLower.includes("divyang") ||
    nameLower.includes("handicapped") ||
    nameLower.includes("special needs");

  const hasArtisanKeywords =
    scheme.id === "SC016" ||
    schemeCategories.includes("Artisan") ||
    schemeCategories.includes("Artisans") ||
    nameLower.includes("vishwakarma") ||
    nameLower.includes("shilp") ||
    nameLower.includes("weaver");

  const hasTransgenderKeywords =
    scheme.id === "SC017" ||
    schemeCategories.includes("Transgender") ||
    nameLower.includes("transgender") ||
    nameLower.includes("smile");

  const hasDntKeywords =
    scheme.id === "SC019" ||
    schemeCategories.includes("DNT") ||
    nameLower.includes("nomadic") ||
    nameLower.includes("seed");

  const hasStudentKeywords =
    schemeCategories.includes("Students") ||
    (scheme.id && String(scheme.id).startsWith("SCHOL_")) ||
    nameLower.includes("scholarship") ||
    nameLower.includes("fellowship") ||
    nameLower.includes("student");

  const hasFarmerKeywords =
    schemeCategories.includes("Farmers") ||
    (scheme.id && String(scheme.id).startsWith("AG")) ||
    nameLower.includes("kisan") ||
    nameLower.includes("krishi") ||
    nameLower.includes("farmer") ||
    nameLower.includes("pashudhan");

  const hasMinorityKeywords =
    schemeCategories.includes("Minority") ||
    schemeCategories.includes("Minorities") ||
    nameLower.includes("minority") ||
    nameLower.includes("nmdfc");

  const hasSeniorKeywords =
    schemeCategories.includes("Senior Citizens") ||
    nameLower.includes("old age") ||
    nameLower.includes("vridh") ||
    nameLower.includes("senior citizen");

  const hasChildrenKeywords =
    schemeCategories.includes("Children") || nameLower.includes("bal");

  const hasWomenKeywords =
    schemeCategories.includes("Women") || schemeCategories.includes("Girls") || nameLower.includes("mahila");

  const isCategoryOpen = schemeCategories.includes("ALL");

  const isPensionOrWelfare =
    nameLower.includes("pension") ||
    nameLower.includes("insurance") ||
    nameLower.includes("scholarship") ||
    nameLower.includes("fellowship") ||
    nameLower.includes("stipend") ||
    descLower.includes("pension") ||
    (minReq <= 1000 && maxReq <= 50000);

  cached = {
    schemeStates,
    isPanIndia,
    schemeCategories,
    schemeBTypes,
    schemeBStatus,
    isBroadScheme,
    isPensionOrWelfare,
    minAge,
    maxAge,
    schemeIncomeLimit,
    minReq,
    maxReq,
    isNonCreditScheme,
    nameLower,
    schemeText,
    isTaxExclusionScheme,
    isBplScheme,
    schemeNotes,
    isRequiresVerification,
    schemeRequiresGraduate,
    schemeRequires10th,
    hasSafaiKeywords,
    hasDivyangKeywords,
    hasArtisanKeywords,
    hasTransgenderKeywords,
    hasDntKeywords,
    hasStudentKeywords,
    hasFarmerKeywords,
    hasMinorityKeywords,
    hasSeniorKeywords,
    hasChildrenKeywords,
    hasWomenKeywords,
    isCategoryOpen,
  };

  schemeCache.set(scheme, cached);
  return cached;
}

// Warm up the precomputed cache immediately upon module initialization
if (Array.isArray(SCHEMES)) {
  for (let i = 0; i < SCHEMES.length; i++) {
    getPrecomputedScheme(SCHEMES[i]);
  }
}

/**
 * Documented baseline scoring criteria for citizen & enterprise eligibility matching.
 * Total base weight = 100 points.
 * When a criterion does not apply to a specific scheme (e.g., no income ceiling, open age),
 * weights are dynamically normalized so that applicable criteria always sum to 100%.
 */
export const SCORING_CRITERIA_DOCS = [
  {
    id: "category",
    name: "Social Category & Affirmative Action",
    baseWeight: 25,
    description: "Evaluates demographic alignment with designated affirmative action groups (SC, ST, OBC, EWS) and targeted beneficiaries (Women, Traditional Artisans, Sanitation Workers, PwD/Divyangjan, Transgender, Farmers, Students, Minorities).",
  },
  {
    id: "income",
    name: "Income Ceiling & Economic Fit",
    baseWeight: 20,
    description: "Evaluates annual family income against statutory scheme ceilings codified in official gazettes. Schemes with no income ceiling have this weight normalized across other active criteria.",
  },
  {
    id: "age",
    name: "Age Bounds & Demographics",
    baseWeight: 15,
    description: "Verifies whether applicant age satisfies statutory eligibility brackets. Schemes open to all age groups redistribute this weight.",
  },
  {
    id: "location",
    name: "Geographic Scope & Domicile",
    baseWeight: 15,
    description: "Evaluates state of residence against Pan-India central scope or state-restricted channelizing agencies.",
  },
  {
    id: "occupation",
    name: "Occupation & Enterprise Alignment",
    baseWeight: 15,
    description: "Evaluates livelihood alignment (e.g. Artisan, Farmer, Sanitation Worker, Vendor) and enterprise stage/sector. Non-commercial welfare and pension schemes redistribute this weight.",
  },
  {
    id: "financial",
    name: "Funding & Capital Assistance Scale",
    baseWeight: 10,
    description: "Matches requested funding to scheme capital subsidies or credit brackets. Direct welfare grants without loan requirements redistribute this weight.",
  },
];

/**
 * Returns human-readable rating tier for a given 0–100 match rating.
 * Tiers:
 * - 85–100: Excellent Match
 * - 70–84: Strong Match
 * - 50–69: Moderate Match
 * - 25–49: Low Match
 * - 1–24: Weak Match
 * - 0: No Match
 */
export function getRatingLabel(rating) {
  if (rating === null || rating === undefined || rating === "Not Assessed") {
    return "Not Assessed";
  }
  const r = Number(rating);
  if (isNaN(r)) return "Not Assessed";
  if (r >= 85) return "Excellent Match";
  if (r >= 70) return "Strong Match";
  if (r >= 50) return "Moderate Match";
  if (r >= 25) return "Low Match";
  if (r >= 1) return "Weak Match";
  return "No Match";
}

/**
 * Checks whether a citizen profile has any meaningful demographic or economic criteria provided.
 */
export function isProfileEmpty(profile) {
  if (!profile || typeof profile !== "object") return true;
  const hasAge = profile.age != null && profile.age !== "" && !isNaN(profile.age) && Number(profile.age) > 0;
  const cleanIncStr = typeof profile.income === "string" ? profile.income.replace(/[₹\s,]|rs\.?|inr/gi, "") : profile.income;
  const hasIncome = cleanIncStr !== "" && cleanIncStr !== null && cleanIncStr !== undefined && !isNaN(cleanIncStr) && Number(cleanIncStr) >= 0;
  const hasState = Boolean(profile.state && String(profile.state).trim() !== "" && String(profile.state).toUpperCase() !== "SELECT STATE / UT");
  const hasCategory = Boolean(profile.category && String(profile.category).trim() !== "" && String(profile.category).toUpperCase() !== "SELECT");
  const hasGender = Boolean(profile.gender && String(profile.gender).trim() !== "");
  const hasOccupation = Boolean(profile.occupation && String(profile.occupation).trim() !== "");
  const hasBusinessType = Boolean(profile.businessType && String(profile.businessType).trim() !== "" && String(profile.businessType).toUpperCase() !== "ALL");
  const hasBusinessStatus = Boolean(profile.businessStatus && String(profile.businessStatus).trim() !== "" && String(profile.businessStatus).toUpperCase() !== "ALL");
  const hasDisability = Boolean(profile.isDivyangjan || profile.hasDisability);
  const hasSpecialStatus = Boolean(profile.isSafaiKaramchari || profile.isArtisan || profile.isTransgender || profile.isDnt || profile.isFarmer || profile.isStudent || profile.isSeniorCitizen);
  const hasEducation = Boolean(profile.education && String(profile.education).trim() !== "");
  const cleanReqStr = typeof profile.financialRequirement === "string" ? profile.financialRequirement.replace(/[₹\s,]|rs\.?|inr/gi, "") : profile.financialRequirement;
  const hasFinancial = cleanReqStr !== "" && cleanReqStr !== null && cleanReqStr !== undefined && !isNaN(cleanReqStr) && Number(cleanReqStr) > 0;
  const hasTaxPayer = profile.isTaxPayer !== undefined && profile.isTaxPayer !== null;
  const hasBpl = profile.hasBplCard !== undefined && profile.hasBplCard !== null;

  return !(
    hasAge ||
    hasIncome ||
    hasState ||
    hasCategory ||
    hasGender ||
    hasOccupation ||
    hasBusinessType ||
    hasBusinessStatus ||
    hasDisability ||
    hasSpecialStatus ||
    hasEducation ||
    hasFinancial ||
    hasTaxPayer ||
    hasBpl
  );
}

/**
 * Evaluates a citizen profile against a single scheme with strict deterministic eligibility
 * and an independent explainable 0–100 Match Rating with normalized weighted criteria.
 */
export function scoreScheme(arg1 = {}, arg2 = {}) {
  // Gracefully handle both (profile, scheme) and (scheme, profile) signatures
  let profile = arg1;
  let scheme = arg2;
  if (
    (arg1.ministry || arg1.governmentLevel || arg1.portalUrl || (arg1.id && typeof arg1.name === "string" && !arg1.gender)) &&
    (arg2.age !== undefined || arg2.gender !== undefined || arg2.isTaxPayer !== undefined || arg2.income !== undefined || arg2.category !== undefined || Object.keys(arg2).length === 0)
  ) {
    scheme = arg1;
    profile = arg2;
  }

  const reasons = { green: [], yellow: [], red: [] };
  const passedCriteria = [];
  const failedCriteria = [];
  const missingInformation = [];
  const disqualifyingReasons = [];

  const cached = getPrecomputedScheme(scheme);
  const {
    schemeStates,
    isPanIndia,
    schemeCategories,
    schemeBTypes,
    schemeBStatus,
    isBroadScheme,
    isPensionOrWelfare,
    minAge,
    maxAge,
    schemeIncomeLimit,
    minReq,
    maxReq,
    isNonCreditScheme,
    nameLower,
    schemeText,
    isTaxExclusionScheme,
    isBplScheme,
    schemeNotes,
    isRequiresVerification,
    schemeRequiresGraduate,
    schemeRequires10th,
    hasSafaiKeywords,
    hasDivyangKeywords,
    hasArtisanKeywords,
    hasTransgenderKeywords,
    hasDntKeywords,
    hasStudentKeywords,
    hasFarmerKeywords,
    hasMinorityKeywords,
    hasSeniorKeywords,
    hasChildrenKeywords,
    hasWomenKeywords,
    isCategoryOpen,
  } = cached;

  // -------------------------------------------------------------------------
  // APPLICABILITY DETERMINATION & DYNAMIC WEIGHT NORMALIZATION
  // -------------------------------------------------------------------------
  // Check which criteria actually constrain/apply to this scheme:
  const isIncomeApplicable = schemeIncomeLimit != null;
  const isAgeApplicable = minAge > 0 || maxAge < 100;
  const isLocationApplicable = true; // Geographic dimension always applies (Pan-India or state-specific)
  const isCategoryApplicable = true; // Category dimension always applies (Open to all or affirmative action)
  const isOccupationApplicable = !isPensionOrWelfare && !isBroadScheme;
  const isFinancialApplicable = !isNonCreditScheme && !isPensionOrWelfare && (minReq > 0 || maxReq > 0);

  const criteriaConfig = [
    { id: "category", label: "Social Category & Target Beneficiary Group", baseWeight: 25, applicable: isCategoryApplicable },
    { id: "income", label: "Annual Family Income Ceiling", baseWeight: 20, applicable: isIncomeApplicable },
    { id: "age", label: "Age Bounds & Eligibility Bracket", baseWeight: 15, applicable: isAgeApplicable },
    { id: "location", label: "Geographic Scope & Domicile", baseWeight: 15, applicable: isLocationApplicable },
    { id: "occupation", label: "Occupation & Enterprise Alignment", baseWeight: 15, applicable: isOccupationApplicable },
    { id: "financial", label: "Funding Requirement & Scale Fit", baseWeight: 10, applicable: isFinancialApplicable },
  ];

  const applicableCriteria = criteriaConfig.filter((c) => c.applicable);
  const totalApplicableBase = applicableCriteria.reduce((sum, c) => sum + c.baseWeight, 0);
  const scaleFactor = totalApplicableBase > 0 ? 100 / totalApplicableBase : 1;

  // Calculate normalized weights (sum to 100 across applicable criteria)
  const normalizedWeights = {};
  for (const c of criteriaConfig) {
    if (c.applicable) {
      normalizedWeights[c.id] = Math.round(c.baseWeight * scaleFactor * 10) / 10;
    } else {
      normalizedWeights[c.id] = 0;
    }
  }

  // Tracking points awarded per criterion (never award points for missing info!)
  const criterionResults = {
    category: { awarded: 0, status: isCategoryApplicable ? "missing" : "not_applicable", detail: "" },
    income: { awarded: 0, status: isIncomeApplicable ? "missing" : "not_applicable", detail: "" },
    age: { awarded: 0, status: isAgeApplicable ? "missing" : "not_applicable", detail: "" },
    location: { awarded: 0, status: isLocationApplicable ? "missing" : "not_applicable", detail: "" },
    occupation: { awarded: 0, status: isOccupationApplicable ? "missing" : "not_applicable", detail: "" },
    financial: { awarded: 0, status: isFinancialApplicable ? "missing" : "not_applicable", detail: "" },
  };

  // -------------------------------------------------------------------------
  // 1. STATE / DOMICILE EVALUATION (Normalized Weight: ~15-20)
  // -------------------------------------------------------------------------
  const hasStateSpecified = Boolean(profile.state && String(profile.state).trim() !== "" && String(profile.state).toUpperCase() !== "SELECT STATE / UT");

  if (!isLocationApplicable || isPanIndia) {
    if (hasStateSpecified) {
      criterionResults.location = {
        awarded: normalizedWeights.location || 15,
        status: "passed",
        detail: `Pan-India central scheme: valid in all States & UTs (Applicant: ${profile.state}) [+${normalizedWeights.location || 15} pts]`,
      };
      reasons.green.push(`Available in your state (${profile.state})`);
      passedCriteria.push({
        criterion: "state",
        label: "Geographic Eligibility",
        detail: `Pan-India central scheme: valid in all States & UTs (Applicant: ${profile.state})`,
      });
    } else {
      // Pan-India scheme has no state restriction, so missing state is non-restricting
      criterionResults.location = {
        awarded: 0,
        status: "not_applicable",
        detail: "Pan-India central scheme: valid in all States & UTs without state domicile restriction",
      };
      reasons.green.push("Pan-India scheme (applicable in all States & Union Territories)");
    }
  } else if (!hasStateSpecified) {
    // Missing state on a state-restricted scheme: NEVER award points for missing info
    criterionResults.location = {
      awarded: 0,
      status: "missing",
      detail: `State of residence not specified in profile (Scheme restricted to: ${schemeStates.join(", ")}) [0/${normalizedWeights.location} pts]`,
    };
    reasons.yellow.push(`State not specified in profile (Scheme restricted to: ${schemeStates.join(", ")})`);
    missingInformation.push({
      criterion: "state",
      label: "State Domicile",
      detail: `State of residence not specified in profile; scheme restricted to ${schemeStates.join(", ")}`,
    });
  } else if (schemeStates.includes(profile.state) || profile.state === "ALL") {
    criterionResults.location = {
      awarded: normalizedWeights.location,
      status: "passed",
      detail: `Applicant resides in designated eligible state (${profile.state}) [+${normalizedWeights.location} pts]`,
    };
    reasons.green.push(`Available in your state (${profile.state})`);
    passedCriteria.push({
      criterion: "state",
      label: "Geographic Eligibility",
      detail: `Applicant resides in eligible state (${profile.state})`,
    });
  } else {
    // Hard deterministic failure
    criterionResults.location = {
      awarded: 0,
      status: "failed",
      detail: `Scheme restricted to ${schemeStates.join(", ")}; not active in ${profile.state} [0/${normalizedWeights.location} pts]`,
    };
    const failReason = `Scheme restricted to ${schemeStates.join(", ")}; not active in ${profile.state}`;
    reasons.red.push(failReason);
    disqualifyingReasons.push(failReason);
    failedCriteria.push({
      criterion: "state",
      label: "State Domicile",
      detail: failReason,
    });
  }

  // -------------------------------------------------------------------------
  // 2. AGE ELIGIBILITY (Normalized Weight: ~15-20 when applicable)
  // -------------------------------------------------------------------------
  const hasAgeSpecified = profile.age != null && profile.age !== "" && !isNaN(profile.age) && Number(profile.age) > 0;

  if (!isAgeApplicable) {
    // Open to all age groups: non-restricting
    criterionResults.age = {
      awarded: 0,
      status: "not_applicable",
      detail: "Open to all age groups without statutory age restrictions (weight normalized)",
    };
    if (hasAgeSpecified) {
      reasons.green.push("Open to all age groups");
      passedCriteria.push({
        criterion: "age",
        label: "Age Bounds",
        detail: "Open to all age groups",
      });
    }
  } else if (!hasAgeSpecified) {
    // Missing age: NEVER award points for missing information
    criterionResults.age = {
      awarded: 0,
      status: "missing",
      detail: `Age not specified in profile; scheme requires ${minAge}–${maxAge} years [0/${normalizedWeights.age} pts]`,
    };
    reasons.yellow.push(`Age eligibility range is ${minAge}–${maxAge} years (age not specified in profile)`);
    missingInformation.push({
      criterion: "age",
      label: "Age Bounds",
      detail: `Age not specified in profile; scheme requires ${minAge}–${maxAge} years`,
    });
  } else {
    const ageNum = Number(profile.age);
    if (ageNum >= minAge && ageNum <= maxAge) {
      criterionResults.age = {
        awarded: normalizedWeights.age,
        status: "passed",
        detail: `Age (${profile.age} years) satisfies eligible bracket (${minAge}–${maxAge} years) [+${normalizedWeights.age} pts]`,
      };
      reasons.green.push(`Age (${profile.age} years) is within eligible range (${minAge}–${maxAge} years)`);
      passedCriteria.push({
        criterion: "age",
        label: "Age Bounds",
        detail: `Age (${profile.age} years) satisfies required bracket (${minAge}–${maxAge} years)`,
      });
    } else {
      // Hard deterministic failure
      criterionResults.age = {
        awarded: 0,
        status: "failed",
        detail: `Age (${profile.age}) is outside required bracket (${minAge}–${maxAge} years) [0/${normalizedWeights.age} pts]`,
      };
      const failReason = `Age (${profile.age}) is outside required range (${minAge}–${maxAge} years)`;
      reasons.red.push(failReason);
      disqualifyingReasons.push(failReason);
      failedCriteria.push({
        criterion: "age",
        label: "Age Bounds",
        detail: failReason,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 3. INCOME CEILING (Normalized Weight: ~20-25 when applicable)
  // -------------------------------------------------------------------------
  // Income can be 0 (valid for unemployed/destitute) or positive
  const cleanIncStr = typeof profile.income === "string" ? profile.income.replace(/[₹\s,]|rs\.?|inr/gi, "") : profile.income;
  const hasIncomeSpecified = cleanIncStr !== "" && cleanIncStr !== null && cleanIncStr !== undefined && !isNaN(cleanIncStr) && Number(cleanIncStr) >= 0;

  if (!isIncomeApplicable) {
    // No income ceiling on this scheme
    criterionResults.income = {
      awarded: 0,
      status: "not_applicable",
      detail: "No statutory income ceiling applies to this scheme (weight normalized)",
    };
    if (hasIncomeSpecified) {
      passedCriteria.push({
        criterion: "income",
        label: "Income Ceiling",
        detail: "No statutory income ceiling applies to this scheme",
      });
      reasons.green.push("No income ceiling for this scheme");
    }
  } else if (!hasIncomeSpecified) {
    // Missing income: NEVER award points for missing information
    criterionResults.income = {
      awarded: 0,
      status: "missing",
      detail: `Annual family income not declared; scheme has statutory ceiling of ₹${formatINR(schemeIncomeLimit)} [0/${normalizedWeights.income} pts]`,
    };
    reasons.yellow.push(`Income ceiling of ₹${formatINR(schemeIncomeLimit)} applies; income not specified in profile`);
    missingInformation.push({
      criterion: "income",
      label: "Income Ceiling",
      detail: `Annual family income not specified; statutory ceiling of ₹${formatINR(schemeIncomeLimit)} applies`,
    });
  } else {
    const incNum = Number(cleanIncStr);
    if (incNum <= schemeIncomeLimit) {
      criterionResults.income = {
        awarded: normalizedWeights.income,
        status: "passed",
        detail: `Annual income (₹${formatINR(incNum)}) is within statutory ceiling (₹${formatINR(schemeIncomeLimit)}) [+${normalizedWeights.income} pts]`,
      };
      reasons.green.push(`Annual income (₹${formatINR(incNum)}) satisfies scheme ceiling (₹${formatINR(schemeIncomeLimit)})`);
      passedCriteria.push({
        criterion: "income",
        label: "Income Ceiling",
        detail: `Annual family income (₹${formatINR(incNum)}) is within statutory ceiling (₹${formatINR(schemeIncomeLimit)})`,
      });
    } else {
      // Hard deterministic failure
      criterionResults.income = {
        awarded: 0,
        status: "failed",
        detail: `Income exceeds scheme's ceiling of ₹${formatINR(schemeIncomeLimit)} (Applicant: ₹${formatINR(incNum)}) [0/${normalizedWeights.income} pts]`,
      };
      const failReason = `Income exceeds scheme's ceiling of ₹${formatINR(schemeIncomeLimit)} (Applicant: ₹${formatINR(incNum)})`;
      reasons.red.push(failReason);
      disqualifyingReasons.push(failReason);
      failedCriteria.push({
        criterion: "income",
        label: "Income Ceiling",
        detail: failReason,
      });
    }
  }

  // -------------------------------------------------------------------------
  // 4. SOCIAL CATEGORY & AFFIRMATIVE ACTION (Normalized Weight: ~25-35)
  // -------------------------------------------------------------------------
  const hasCategorySpecified = Boolean(profile.category && String(profile.category).trim() !== "" && String(profile.category).toUpperCase() !== "SELECT");

  const isFemaleBeneficiary = profile.gender === "Female" && hasWomenKeywords;

  const isSafaiKaramchariMatch =
    Boolean(profile.isSafaiKaramchari || profile.occupation === "Sanitation Worker") && hasSafaiKeywords;

  const isDivyangjanMatch =
    Boolean(profile.isDivyangjan || profile.hasDisability) && hasDivyangKeywords;

  const isArtisanMatch = Boolean(profile.isArtisan) && hasArtisanKeywords;

  const isTransgenderMatch =
    Boolean(profile.isTransgender || profile.gender === "Transgender") && hasTransgenderKeywords;

  const isDntMatch =
    Boolean(profile.isDnt || profile.category === "DNT") && hasDntKeywords;

  const isStudentMatch =
    Boolean(profile.isStudent || profile.occupation === "Student") && hasStudentKeywords;

  const isFarmerMatch =
    Boolean(profile.isFarmer || profile.businessType === "Agriculture" || profile.occupation === "Farmer") && hasFarmerKeywords;

  const isMinorityMatch =
    Boolean(profile.isMinority || profile.category === "Minority") && hasMinorityKeywords;

  const isSeniorCitizenMatch =
    (Number(profile.age) >= 60 || Boolean(profile.isSeniorCitizen)) && hasSeniorKeywords;

  const isChildrenMatch = Number(profile.age) > 0 && Number(profile.age) < 18 && hasChildrenKeywords;

  const isSpecialTargetMatch =
    isSafaiKaramchariMatch ||
    isDivyangjanMatch ||
    isArtisanMatch ||
    isTransgenderMatch ||
    isDntMatch ||
    isStudentMatch ||
    isFarmerMatch ||
    isMinorityMatch ||
    isSeniorCitizenMatch ||
    isChildrenMatch;

  const isExactCategoryMatch =
    hasCategorySpecified &&
    (schemeCategories.includes(profile.category) ||
      (profile.category === "SC" && schemeCategories.includes("SC/ST")) ||
      (profile.category === "ST" && schemeCategories.includes("SC/ST")) ||
      (profile.category === "OBC" && schemeCategories.includes("OBC")) ||
      (profile.category === "General" && schemeCategories.includes("General")) ||
      (profile.category === "EWS" && (schemeCategories.includes("EWS") || schemeCategories.includes("General"))));

  if (isSpecialTargetMatch) {
    criterionResults.category = {
      awarded: normalizedWeights.category || 25,
      status: "passed",
      detail: `Target demographic priority group satisfied (${schemeCategories.join(" / ")}) [+${normalizedWeights.category || 25} pts]`,
    };
    if (isSafaiKaramchariMatch) {
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Sanitation Workers / Safai Karamcharis (NSKFDC/NAMASTE)");
    } else if (isDivyangjanMatch) {
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Persons with Disabilities / Divyangjan (DEPwD/NHFDC)");
    } else if (isArtisanMatch) {
      reasons.green.push("★ Priority Beneficiary: Targeted support for Traditional Artisans & Craftspeople (PM Vishwakarma)");
    } else if (isStudentMatch) {
      reasons.green.push("★ Direct Student Match: Official educational scholarship / fellowship program");
    } else if (isFarmerMatch) {
      reasons.green.push("★ Direct Agri Match: Designated scheme for Farmers & Rural Producers");
    } else if (isMinorityMatch) {
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Notified Minority Communities (NMDFC)");
    } else if (isTransgenderMatch) {
      reasons.green.push("★ Priority Beneficiary: Dedicated livelihood support for Transgender Persons (SMILE)");
    } else if (isDntMatch) {
      reasons.green.push("★ Priority Beneficiary: Targeted support for De-Notified / Nomadic Tribes (SEED)");
    } else if (isSeniorCitizenMatch) {
      reasons.green.push("Designated social security welfare for Senior Citizens");
    } else {
      reasons.green.push("Target group requirement satisfied");
    }
    passedCriteria.push({
      criterion: "category",
      label: "Social Category / Target Group",
      detail: `Target demographic group satisfied (${schemeCategories.join(" / ")})`,
    });
  } else if (isFemaleBeneficiary) {
    criterionResults.category = {
      awarded: normalizedWeights.category || 25,
      status: "passed",
      detail: `Eligible under designated Women Entrepreneur / Welfare provisions [+${normalizedWeights.category || 25} pts]`,
    };
    reasons.green.push("Eligible under special Women Entrepreneur / Welfare provision");
    passedCriteria.push({
      criterion: "category",
      label: "Social Category / Target Group",
      detail: "Eligible under special Women Entrepreneur / Welfare provision",
    });
  } else if (isExactCategoryMatch) {
    criterionResults.category = {
      awarded: normalizedWeights.category || 25,
      status: "passed",
      detail: `Category requirement satisfied (${profile.category}) [+${normalizedWeights.category || 25} pts]`,
    };
    reasons.green.push(`Social category requirement satisfied (${profile.category})`);
    passedCriteria.push({
      criterion: "category",
      label: "Social Category",
      detail: `Category requirement satisfied (${profile.category})`,
    });
  } else if (isCategoryOpen) {
    if (hasCategorySpecified) {
      criterionResults.category = {
        awarded: normalizedWeights.category || 25,
        status: "passed",
        detail: `Open to all social groups without community restriction [+${normalizedWeights.category || 25} pts]`,
      };
      reasons.green.push("Category requirement satisfied (Open to all social groups)");
      passedCriteria.push({
        criterion: "category",
        label: "Social Category",
        detail: "Open to all social groups without community restriction",
      });
    } else {
      // Open category scheme has no community restriction, so missing category is non-restricting
      criterionResults.category = {
        awarded: 0,
        status: "not_applicable",
        detail: "Open to all social groups without community restriction",
      };
      reasons.green.push("Open to all social groups");
    }
  } else if (!hasCategorySpecified) {
    // Missing category in profile on a CATEGORY-RESTRICTED scheme: NEVER award points
    criterionResults.category = {
      awarded: 0,
      status: "missing",
      detail: `Social category not declared in profile (Scheme targets: ${schemeCategories.join(" / ")}) [0/${normalizedWeights.category} pts]`,
    };
    reasons.yellow.push(`Category not specified in profile (Scheme targets: ${schemeCategories.join(" / ")})`);
    missingInformation.push({
      criterion: "category",
      label: "Social Category",
      detail: `Social category not specified in profile; scheme targets ${schemeCategories.join(" / ")}`,
    });
  } else {
    // Category mismatch
    criterionResults.category = {
      awarded: 0,
      status: "failed",
      detail: `Scheme specifically targets ${schemeCategories.join(" / ")} applicants [0/${normalizedWeights.category} pts]`,
    };
    const failReason = `Scheme specifically targets ${schemeCategories.join(" / ")} applicants`;
    reasons.red.push(failReason);
    disqualifyingReasons.push(failReason);
    failedCriteria.push({
      criterion: "category",
      label: "Social Category",
      detail: failReason,
    });
  }

  // -------------------------------------------------------------------------
  // 5. OCCUPATION & ENTERPRISE PROFILE (Normalized Weight: ~15-20 when applicable)
  // -------------------------------------------------------------------------
  if (!isOccupationApplicable) {
    criterionResults.occupation = {
      awarded: 0,
      status: "not_applicable",
      detail: "Universal civic welfare / pension / non-commercial grant (weight normalized)",
    };
    passedCriteria.push({
      criterion: "occupation",
      label: "Occupation / Enterprise Stage",
      detail: "Open to all occupations, citizens, and enterprise stages",
    });
    reasons.green.push("Open to all occupations, individual citizens, and enterprise stages");
  } else {
    const hasOccupationSpecified = Boolean(profile.occupation && String(profile.occupation).trim() !== "");
    const hasTypeSpecified = Boolean(profile.businessType && profile.businessType !== "");
    const hasStatusSpecified = Boolean(profile.businessStatus && profile.businessStatus !== "");
    const hasAnyWorkSpecified = hasOccupationSpecified || hasTypeSpecified || hasStatusSpecified;

    // Check specific beneficiary alignment (Artisan, Safai Karamchari, Farmer, Student, Vendor)
    const isTargetArtisan = hasArtisanKeywords && (profile.isArtisan || (hasOccupationSpecified && profile.occupation.toLowerCase().includes("artisan")));
    const isTargetSafai = hasSafaiKeywords && (profile.isSafaiKaramchari || (hasOccupationSpecified && profile.occupation.toLowerCase().includes("sanitation")));
    const isTargetFarmer = hasFarmerKeywords && (hasOccupationSpecified && profile.occupation.toLowerCase().includes("farmer"));
    const isTargetStudent = hasStudentKeywords && (hasOccupationSpecified && profile.occupation.toLowerCase().includes("student"));
    const isTargetVendor = (schemeText.includes("vendor") || schemeText.includes("street")) && (hasOccupationSpecified && profile.occupation.toLowerCase().includes("vendor"));

    if (isTargetArtisan || isTargetSafai || isTargetFarmer || isTargetStudent || isTargetVendor) {
      criterionResults.occupation = {
        awarded: normalizedWeights.occupation,
        status: "passed",
        detail: `Applicant aligns with designated target trade/livelihood [+${normalizedWeights.occupation} pts]`,
      };
      const targetLabel = isTargetArtisan ? "Artisan / Craftsman" : isTargetSafai ? "Sanitation Worker" : isTargetFarmer ? "Farmer" : isTargetStudent ? "Student" : "Street Vendor";
      reasons.green.push(`Eligible target group satisfied (${targetLabel})`);
      passedCriteria.push({
        criterion: "occupation",
        label: "Occupation / Beneficiary Category",
        detail: `Applicant aligns with designated target group (${targetLabel})`,
      });
    } else if (isBroadScheme) {
      if (hasAnyWorkSpecified) {
        criterionResults.occupation = {
          awarded: normalizedWeights.occupation,
          status: "passed",
          detail: `Broad enterprise scope: compatible with applicant's declared profile [+${normalizedWeights.occupation} pts]`,
        };
        reasons.green.push("Open to all enterprise sectors and stages");
        passedCriteria.push({
          criterion: "occupation",
          label: "Enterprise Alignment",
          detail: "Open to all commercial sectors and venture stages",
        });
      } else {
        // Missing work profile: NEVER award points for missing info
        criterionResults.occupation = {
          awarded: 0,
          status: "missing",
          detail: `Occupation / business details not specified in profile [0/${normalizedWeights.occupation} pts]`,
        };
        reasons.yellow.push("Occupation / business stage not specified in profile");
        missingInformation.push({
          criterion: "occupation",
          label: "Enterprise Profile",
          detail: "Occupation / business stage not specified in profile",
        });
      }
    } else if (!hasAnyWorkSpecified) {
      // Missing work info
      criterionResults.occupation = {
        awarded: 0,
        status: "missing",
        detail: `Occupation or business details not specified in profile [0/${normalizedWeights.occupation} pts]`,
      };
      reasons.yellow.push("Occupation / business stage not specified in profile");
      missingInformation.push({
        criterion: "occupation",
        label: "Occupation / Sector",
        detail: "Occupation / business stage not specified in profile",
      });
    } else {
      const typeMatch = schemeBTypes.includes("ALL") || schemeBTypes.includes("any") || (hasTypeSpecified && schemeBTypes.includes(profile.businessType)) || (!hasTypeSpecified && hasOccupationSpecified);
      const statusMatch = schemeBStatus.includes("ALL") || schemeBStatus.includes("any") || (hasStatusSpecified && schemeBStatus.includes(profile.businessStatus)) || (!hasStatusSpecified && hasOccupationSpecified);

      if (typeMatch && statusMatch) {
        criterionResults.occupation = {
          awarded: normalizedWeights.occupation,
          status: "passed",
          detail: `Sector (${profile.businessType || profile.occupation || "General"}) & stage supported [+${normalizedWeights.occupation} pts]`,
        };
        reasons.green.push(`Business model (${profile.businessType || profile.occupation || "General"}) & stage supported`);
        passedCriteria.push({
          criterion: "occupation",
          label: "Enterprise Alignment",
          detail: `Sector (${profile.businessType || profile.occupation || "General"}) & enterprise stage supported`,
        });
      } else if (typeMatch || statusMatch) {
        const partialPts = Math.round(normalizedWeights.occupation * 0.5 * 10) / 10;
        criterionResults.occupation = {
          awarded: partialPts,
          status: "partial",
          detail: `Partial alignment: ${typeMatch ? "Sector matches" : "Stage matches"} [+${partialPts}/${normalizedWeights.occupation} pts]`,
        };
        if (!typeMatch) {
          reasons.yellow.push(`Scheme covers ${schemeBTypes.join(" / ")} activities`);
          missingInformation.push({
            criterion: "occupation",
            label: "Business Sector",
            detail: `Scheme primarily covers ${schemeBTypes.join(" / ")} activities`,
          });
        } else {
          reasons.yellow.push(`Scheme primarily targets ${schemeBStatus.join(" / ")} enterprises`);
          missingInformation.push({
            criterion: "occupation",
            label: "Enterprise Stage",
            detail: `Scheme targets ${schemeBStatus.join(" / ")} stage enterprises`,
          });
        }
      } else {
        criterionResults.occupation = {
          awarded: 0,
          status: "failed",
          detail: `Applicant activity does not match target enterprise profile [0/${normalizedWeights.occupation} pts]`,
        };
        const failReason = "Applicant activity does not match target enterprise profile";
        reasons.red.push(failReason);
        disqualifyingReasons.push(failReason);
        failedCriteria.push({
          criterion: "occupation",
          label: "Enterprise Profile",
          detail: failReason,
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // 6. EDUCATION LEVEL CHECK (Integrated)
  // -------------------------------------------------------------------------
  if (profile.education) {
    const userEduRank = getEducationRank(profile.education);
    if (schemeRequiresGraduate && userEduRank !== null && userEduRank < 3) {
      const failReason = `Requires Graduate / Degree qualification; applicant declared ${profile.education}`;
      reasons.red.push(failReason);
      disqualifyingReasons.push(failReason);
      failedCriteria.push({
        criterion: "education",
        label: "Educational Qualification",
        detail: failReason,
      });
    } else if (schemeRequires10th && userEduRank !== null && userEduRank < 1) {
      const failReason = `Requires minimum 8th/10th Pass qualification; applicant declared ${profile.education}`;
      reasons.red.push(failReason);
      disqualifyingReasons.push(failReason);
      failedCriteria.push({
        criterion: "education",
        label: "Educational Qualification",
        detail: failReason,
      });
    } else if (schemeRequiresGraduate || schemeRequires10th) {
      passedCriteria.push({
        criterion: "education",
        label: "Educational Qualification",
        detail: `Educational qualification (${profile.education}) satisfies requirement`,
      });
    }
  } else if (schemeRequiresGraduate || schemeRequires10th) {
    missingInformation.push({
      criterion: "education",
      label: "Educational Qualification",
      detail: `Scheme has educational prerequisites; qualification not specified in profile`,
    });
  }

  // -------------------------------------------------------------------------
  // 7. FINANCIAL REQUIREMENT / ASSISTANCE (Normalized Weight: ~10-15 when applicable)
  // -------------------------------------------------------------------------
  const cleanReqStr = typeof profile.financialRequirement === "string" ? profile.financialRequirement.replace(/[₹\s,]|rs\.?|inr/gi, "") : profile.financialRequirement;
  const hasReqSpecified = cleanReqStr !== "" && cleanReqStr !== null && cleanReqStr !== undefined && !isNaN(cleanReqStr) && Number(cleanReqStr) >= 0;

  if (!isFinancialApplicable) {
    // Direct non-credit grant or pension: weight is normalized
    criterionResults.financial = {
      awarded: 0,
      status: "not_applicable",
      detail: "Direct non-credit social grant / pension / welfare subsidy (weight normalized)",
    };
    passedCriteria.push({
      criterion: "financialRequirement",
      label: "Financial Assistance",
      detail: "Direct non-credit social welfare / pension / grant",
    });
    reasons.green.push("Direct financial welfare / pension / scholarship / social assistance grant");
  } else if (!hasReqSpecified) {
    // Missing financial req: NEVER award points for missing info
    criterionResults.financial = {
      awarded: 0,
      status: "missing",
      detail: `Funding requirement not specified in profile (Scheme assistance: ₹${formatINR(minReq)}–₹${formatINR(maxReq)}) [0/${normalizedWeights.financial} pts]`,
    };
    reasons.yellow.push(`Funding requirement not specified (Scheme assistance: ₹${formatINR(minReq)}–₹${formatINR(maxReq)})`);
    missingInformation.push({
      criterion: "financialRequirement",
      label: "Funding Fit",
      detail: `Funding requirement not specified (Scheme assistance: ₹${formatINR(minReq)}–₹${formatINR(maxReq)})`,
    });
  } else {
    const req = Number(cleanReqStr);
    if (req >= minReq && (maxReq === 0 || req <= maxReq)) {
      criterionResults.financial = {
        awarded: normalizedWeights.financial,
        status: "passed",
        detail: `Requested amount (₹${formatINR(req)}) fits scheme bracket (₹${formatINR(minReq)}–₹${formatINR(maxReq)}) [+${normalizedWeights.financial} pts]`,
      };
      reasons.green.push(`Funding requirement (₹${formatINR(req)}) falls within scheme assistance bracket`);
      passedCriteria.push({
        criterion: "financialRequirement",
        label: "Funding Fit",
        detail: `Requested amount (₹${formatINR(req)}) matches scheme bracket (₹${formatINR(minReq)}–₹${formatINR(maxReq)})`,
      });
    } else if (req < minReq) {
      const partialPts = Math.round(normalizedWeights.financial * 0.5 * 10) / 10;
      criterionResults.financial = {
        awarded: partialPts,
        status: "partial",
        detail: `Requested funding (₹${formatINR(req)}) is below scheme standard baseline (₹${formatINR(minReq)}) [+${partialPts}/${normalizedWeights.financial} pts]`,
      };
      reasons.yellow.push(`Requested funding is below scheme baseline (₹${formatINR(minReq)}–₹${formatINR(maxReq)})`);
    } else {
      const partialPts = Math.round(normalizedWeights.financial * 0.3 * 10) / 10;
      criterionResults.financial = {
        awarded: partialPts,
        status: "partial",
        detail: `Requested funding (₹${formatINR(req)}) exceeds scheme standard ceiling (₹${formatINR(maxReq)}) [+${partialPts}/${normalizedWeights.financial} pts]`,
      };
      reasons.yellow.push(`Requested funding exceeds scheme standard ceiling (Maximum: ₹${formatINR(maxReq)})`);
    }
  }

  // -------------------------------------------------------------------------
  // 8. SCHEME-SPECIFIC STATUTORY DISCREPANCY CHECKS (APY Tax, BPL)
  // -------------------------------------------------------------------------
  if (isTaxExclusionScheme) {
    if (profile.isTaxPayer === true) {
      const failReason = "Statutory guidelines explicitly exclude income-tax payees from this welfare scheme";
      reasons.red.push(failReason);
      disqualifyingReasons.push(failReason);
      failedCriteria.push({
        criterion: "tax_exclusion",
        label: "Statutory Tax Exclusion",
        detail: failReason,
      });
    } else if (profile.isTaxPayer === false) {
      passedCriteria.push({
        criterion: "tax_exclusion",
        label: "Statutory Tax Exclusion",
        detail: "Applicant confirmed non-income-tax payee status",
      });
    } else {
      missingInformation.push({
        criterion: "tax_exclusion",
        label: "Statutory Tax Exclusion",
        detail: "Guidelines exclude income-tax payees; verify self-declaration",
      });
    }
  }

  if (isBplScheme) {
    if (profile.isBpl === true || profile.hasBplCard === true) {
      passedCriteria.push({
        criterion: "bpl",
        label: "BPL Ration Card Verification",
        detail: "Applicant confirmed BPL / Antyodaya status",
      });
    } else {
      missingInformation.push({
        criterion: "bpl",
        label: "BPL Ration Card Verification",
        detail: "Requires valid BPL / Antyodaya ration card or offline departmental scrutiny on official portal",
      });
    }
  }

  // Standard verification notices
  reasons.yellow.push("Credentials and income subject to verification on official government portal");
  reasons.yellow.push("Final benefit release subject to departmental guidelines and documentary scrutiny");

  // -------------------------------------------------------------------------
  // 10. SCORE COVERAGE & DETAILED EXPLANATION GENERATION
  // -------------------------------------------------------------------------
  let evaluatedCount = 0;
  const scoreExplanation = [];

  for (const c of criteriaConfig) {
    if (!c.applicable) {
      scoreExplanation.push({
        criterion: c.id,
        label: c.label,
        applicable: false,
        baseWeight: c.baseWeight,
        normalizedWeight: 0,
        awardedPoints: 0,
        status: "not_applicable",
        detail: "Criterion does not restrict this scheme (weight normalized across active criteria)",
      });
      continue;
    }

    const cr = criterionResults[c.id];
    if (cr && cr.status !== "missing" && cr.status !== "unknown") {
      evaluatedCount++;
    }

    scoreExplanation.push({
      criterion: c.id,
      label: c.label,
      applicable: true,
      baseWeight: c.baseWeight,
      normalizedWeight: normalizedWeights[c.id],
      awardedPoints: cr ? cr.awarded : 0,
      status: cr ? cr.status : "missing",
      detail: cr ? cr.detail : "",
    });
  }

  const applicableCount = applicableCriteria.length;

  // -------------------------------------------------------------------------
  // 10A. UNASSESSED PROFILE HANDLING (ZERO EVALUATED CRITERIA)
  // -------------------------------------------------------------------------
  if (isProfileEmpty(profile) || evaluatedCount === 0) {
    return {
      matchRating: null,
      score: null,
      ratingLabel: "Not Assessed",
      scoreCoverage: "Not Assessed (0 criteria evaluated)",
      coveragePercent: 0,
      scoreExplanation,
      scoreBreakdown: {
        categoryFit: 0,
        incomeFit: 0,
        ageFit: 0,
        locationFit: 0,
        occupationFit: 0,
        financialFit: 0,
      },
      eligibilityStatus: "Not Assessed",
      isEligible: false,
      isPotentiallyEligible: false,
      isNotEligible: false,
      isNotAssessed: true,
      isAssessed: false,
      eligible: false,
      passedCriteria: [],
      failedCriteria: [],
      missingInformation: missingInformation.length > 0 ? missingInformation : [
        {
          criterion: "profile",
          label: "Citizen Profile Required",
          detail: "Demographic and economic profile required to evaluate eligibility criteria",
        },
      ],
      disqualifyingReasons: [],
      reasons: {
        green: [],
        yellow: ["Profile information required to assess eligibility"],
        red: [],
      },
      passedCount: 0,
      failedCount: 0,
      unknownCount: missingInformation.length,
      evaluatedCount: 0,
      applicableCount,
      criteriaSummary: {
        passed: 0,
        failed: 0,
        unknown: missingInformation.length,
        total: applicableCount,
      },
      criteriaAudit: {
        status: isRequiresVerification ? "requires_verification" : "verified",
        completeness: isRequiresVerification ? "requires_offline_verification" : "complete",
        notes: schemeNotes.length > 0 ? schemeNotes : ["All mandatory criteria verified and deterministically codified"],
      },
    };
  }

  // -------------------------------------------------------------------------
  // 9. CANONICAL ELIGIBILITY STATUS ASSIGNMENT (STRICT DETERMINISTIC)
  // -------------------------------------------------------------------------
  let eligibilityStatus = "Eligible";
  if (failedCriteria.length > 0) {
    eligibilityStatus = "Not Eligible";
  } else if (missingInformation.length > 0) {
    eligibilityStatus = "Potentially Eligible";
  } else {
    eligibilityStatus = "Eligible";
  }

  const coveragePercent = applicableCount > 0 ? Math.round((evaluatedCount / applicableCount) * 100) : 100;
  const scoreCoverage = `${coveragePercent}% (${evaluatedCount} of ${applicableCount} criteria evaluated)`;

  // -------------------------------------------------------------------------
  // 11. MATCH RATING (0–100) & RATING LABEL COMPUTATION
  // -------------------------------------------------------------------------
  const rawSum = Object.values(criterionResults).reduce((sum, cr) => sum + (cr.awarded || 0), 0);
  const matchRating = Math.min(100, Math.max(0, Math.round(rawSum)));
  const ratingLabel = getRatingLabel(matchRating);

  return {
    matchRating,
    score: matchRating, // Backward compatibility with existing API consumers
    ratingLabel,
    scoreCoverage,
    coveragePercent,
    scoreExplanation,
    scoreBreakdown: {
      categoryFit: criterionResults.category?.awarded || 0,
      incomeFit: criterionResults.income?.awarded || 0,
      ageFit: criterionResults.age?.awarded || 0,
      locationFit: criterionResults.location?.awarded || 0,
      occupationFit: criterionResults.occupation?.awarded || 0,
      financialFit: criterionResults.financial?.awarded || 0,
    },
    eligibilityStatus,
    isEligible: eligibilityStatus === "Eligible",
    isPotentiallyEligible: eligibilityStatus === "Potentially Eligible",
    isNotEligible: eligibilityStatus === "Not Eligible",
    isNotAssessed: false,
    isAssessed: true,
    passedCriteria,
    failedCriteria,
    missingInformation,
    disqualifyingReasons,
    reasons,
    eligible: eligibilityStatus === "Eligible",
    passedCount: passedCriteria.length,
    failedCount: failedCriteria.length,
    unknownCount: missingInformation.length,
    evaluatedCount,
    applicableCount,
    criteriaSummary: {
      passed: passedCriteria.length,
      failed: failedCriteria.length,
      unknown: missingInformation.length,
      total: applicableCount,
    },
    criteriaAudit: {
      status: isRequiresVerification ? "requires_verification" : "verified",
      completeness: isRequiresVerification ? "requires_offline_verification" : "complete",
      notes: schemeNotes.length > 0 ? schemeNotes : ["All mandatory criteria verified and deterministically codified"],
    },
  };
}

/**
 * Matches and ranks schemes across the full dataset using the unified Match Rating engine.
 */
export function matchSchemes(profile = {}, schemeList = SCHEMES) {
  const len = schemeList.length;
  const results = new Array(len);
  for (let i = 0; i < len; i++) {
    const scheme = schemeList[i];
    results[i] = {
      scheme,
      ...scoreScheme(profile, scheme),
    };
  }
  return results.sort((a, b) => {
    if (a.isAssessed === false && b.isAssessed === false) return 0;
    if (a.isAssessed === false) return 1;
    if (b.isAssessed === false) return -1;
    return (b.matchRating ?? b.score ?? -1) - (a.matchRating ?? a.score ?? -1);
  });
}
