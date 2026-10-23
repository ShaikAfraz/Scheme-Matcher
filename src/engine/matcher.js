/**
 * DETERMINISTIC RULE-BASED MATCHING ENGINE
 * Evaluates citizen/entrepreneur profiles against 500+ genuine government schemes and scholarships.
 * Weights adhere strictly to SIH26092 PRD specification:
 *   - Category & Target Group: 20%
 *   - Income Ceiling: 20%
 *   - Age Eligibility: 15%
 *   - Location / State: 15%
 *   - Occupation / Business Type & Stage: 15%
 *   - Financial Requirement / Benefit Range: 15%
 * Total: 100%
 *
 * Missing criteria are treated as unknown rather than assumed eligible.
 */

import { SCHEMES } from "../data/schemes.js";

export function formatINR(val) {
  if (val == null || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
}

export function scoreScheme(profile = {}, scheme = {}) {
  const reasons = { green: [], yellow: [], red: [] };
  let score = 0;

  // -------------------------------------------------------------------------
  // 1. CATEGORY & MARGINALIZED GROUP MATCH (Weight: 20)
  // -------------------------------------------------------------------------
  const schemeCategories = Array.isArray(scheme.categories)
    ? scheme.categories
    : typeof scheme.categories === "string"
    ? JSON.parse(scheme.categories || '["ALL"]')
    : ["ALL"];

  const hasCategorySpecified = Boolean(profile.category && profile.category !== "");

  const isFemaleBeneficiary =
    profile.gender === "Female" &&
    (schemeCategories.includes("Women") || schemeCategories.includes("Girls") || scheme.name?.toLowerCase().includes("mahila"));

  const isSafaiKaramchariMatch =
    Boolean(profile.isSafaiKaramchari || profile.occupation === "Sanitation Worker") &&
    (scheme.id === "SC013" ||
      schemeCategories.includes("Sanitation Workers") ||
      scheme.name?.toLowerCase().includes("safai") ||
      scheme.name?.toLowerCase().includes("namaste") ||
      scheme.name?.toLowerCase().includes("swachhta"));

  const isDivyangjanMatch =
    Boolean(profile.isDivyangjan || profile.hasDisability) &&
    (scheme.id === "SC018" ||
      schemeCategories.includes("Divyangjan") ||
      schemeCategories.includes("PwD") ||
      scheme.name?.toLowerCase().includes("divyang") ||
      scheme.name?.toLowerCase().includes("handicapped") ||
      scheme.name?.toLowerCase().includes("special needs"));

  const isArtisanMatch =
    Boolean(profile.isArtisan) &&
    (scheme.id === "SC016" ||
      schemeCategories.includes("Artisan") ||
      schemeCategories.includes("Artisans") ||
      scheme.name?.toLowerCase().includes("vishwakarma") ||
      scheme.name?.toLowerCase().includes("shilp") ||
      scheme.name?.toLowerCase().includes("weaver"));

  const isTransgenderMatch =
    Boolean(profile.isTransgender || profile.gender === "Transgender") &&
    (scheme.id === "SC017" ||
      schemeCategories.includes("Transgender") ||
      scheme.name?.toLowerCase().includes("transgender") ||
      scheme.name?.toLowerCase().includes("smile"));

  const isDntMatch =
    Boolean(profile.isDnt || profile.category === "DNT") &&
    (scheme.id === "SC019" ||
      schemeCategories.includes("DNT") ||
      scheme.name?.toLowerCase().includes("nomadic") ||
      scheme.name?.toLowerCase().includes("seed"));

  const isStudentMatch =
    Boolean(profile.isStudent || profile.occupation === "Student") &&
    (schemeCategories.includes("Students") ||
      scheme.id?.startsWith("SCHOL_") ||
      scheme.name?.toLowerCase().includes("scholarship") ||
      scheme.name?.toLowerCase().includes("fellowship") ||
      scheme.name?.toLowerCase().includes("student"));

  const isFarmerMatch =
    Boolean(profile.isFarmer || profile.businessType === "Agriculture" || profile.occupation === "Farmer") &&
    (schemeCategories.includes("Farmers") ||
      scheme.id?.startsWith("AG") ||
      scheme.name?.toLowerCase().includes("kisan") ||
      scheme.name?.toLowerCase().includes("krishi") ||
      scheme.name?.toLowerCase().includes("farmer") ||
      scheme.name?.toLowerCase().includes("pashudhan"));

  const isSeniorCitizenMatch =
    (Number(profile.age) >= 60 || Boolean(profile.isSeniorCitizen)) &&
    (schemeCategories.includes("Senior Citizens") ||
      scheme.name?.toLowerCase().includes("old age") ||
      scheme.name?.toLowerCase().includes("vridh") ||
      scheme.name?.toLowerCase().includes("senior citizen"));

  const isChildrenMatch =
    Number(profile.age) < 18 &&
    (schemeCategories.includes("Children") || scheme.name?.toLowerCase().includes("bal"));

  const isSpecialTargetMatch =
    isSafaiKaramchariMatch ||
    isDivyangjanMatch ||
    isArtisanMatch ||
    isTransgenderMatch ||
    isDntMatch ||
    isStudentMatch ||
    isFarmerMatch ||
    isSeniorCitizenMatch ||
    isChildrenMatch;

  const isExactCategoryMatch =
    hasCategorySpecified &&
    (schemeCategories.includes(profile.category) ||
      (profile.category === "SC" && schemeCategories.includes("SC/ST")) ||
      (profile.category === "ST" && schemeCategories.includes("SC/ST")) ||
      (profile.category === "OBC" && schemeCategories.includes("OBC")) ||
      (profile.category === "General" && schemeCategories.includes("General")));

  const isCategoryOpen = schemeCategories.includes("ALL");

  if (isSpecialTargetMatch) {
    score += 20;
    if (isSafaiKaramchariMatch) {
      score += 5; // priority bonus
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Sanitation Workers / Safai Karamcharis (NSKFDC/NAMASTE)");
    } else if (isDivyangjanMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Persons with Disabilities / Divyangjan (DEPwD/NHFDC)");
    } else if (isArtisanMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Targeted support for Traditional Artisans & Craftspeople (PM Vishwakarma)");
    } else if (isStudentMatch) {
      score += 4;
      reasons.green.push("★ Direct Student Match: Official educational scholarship / fellowship program");
    } else if (isFarmerMatch) {
      score += 4;
      reasons.green.push("★ Direct Agri Match: Designated scheme for Farmers & Rural Producers");
    } else if (isTransgenderMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Dedicated livelihood support for Transgender Persons (SMILE)");
    } else if (isDntMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Targeted support for De-Notified / Nomadic Tribes (SEED)");
    } else if (isSeniorCitizenMatch) {
      reasons.green.push("Designated social security welfare for Senior Citizens");
    } else {
      reasons.green.push("Target group requirement satisfied");
    }
  } else if (isFemaleBeneficiary) {
    score += 20;
    reasons.green.push("Eligible under special Women Entrepreneur / Welfare provision");
  } else if (isExactCategoryMatch) {
    score += 20;
    reasons.green.push(`Social category requirement satisfied (${profile.category})`);
  } else if (isCategoryOpen) {
    score += 20;
    reasons.green.push("Category requirement satisfied (Open to all social groups)");
  } else if (!hasCategorySpecified) {
    // Treat missing criteria as unknown
    score += 10;
    reasons.yellow.push(`Category not specified in profile (Scheme targets: ${schemeCategories.join(" / ")})`);
  } else {
    reasons.red.push(`Scheme specifically targets ${schemeCategories.join(" / ")} applicants`);
  }

  // -------------------------------------------------------------------------
  // 2. INCOME CEILING (Weight: 20)
  // -------------------------------------------------------------------------
  const schemeIncomeLimit =
    scheme.incomeLimit != null
      ? Number(scheme.incomeLimit)
      : scheme.incomeCeiling != null
      ? Number(scheme.incomeCeiling)
      : scheme.income_limit != null
      ? Number(scheme.income_limit)
      : null;

  const hasIncomeSpecified = profile.income != null && profile.income !== "" && !isNaN(profile.income);

  if (schemeIncomeLimit == null) {
    score += 20;
    reasons.green.push("No income ceiling for this scheme");
  } else if (!hasIncomeSpecified) {
    // Treat missing criteria as unknown rather than assuming eligibility
    score += 10;
    reasons.yellow.push(`Income ceiling of ₹${formatINR(schemeIncomeLimit)} applies; income not specified in profile`);
  } else if (Number(profile.income) <= schemeIncomeLimit) {
    score += 20;
    reasons.green.push(`Annual income (₹${formatINR(profile.income)}) satisfies scheme ceiling (₹${formatINR(schemeIncomeLimit)})`);
  } else {
    reasons.red.push(`Income exceeds scheme's ceiling of ₹${formatINR(schemeIncomeLimit)} (Applicant: ₹${formatINR(profile.income)})`);
  }

  // -------------------------------------------------------------------------
  // 3. AGE ELIGIBILITY (Weight: 15)
  // -------------------------------------------------------------------------
  const minAge = scheme.minAge != null ? Number(scheme.minAge) : scheme.min_age != null ? Number(scheme.min_age) : 0;
  const maxAge = scheme.maxAge != null ? Number(scheme.maxAge) : scheme.max_age != null ? Number(scheme.max_age) : 100;
  const hasAgeSpecified = profile.age != null && profile.age !== "" && !isNaN(profile.age);

  if (!hasAgeSpecified) {
    // Treat missing criteria as unknown
    score += 7;
    reasons.yellow.push(`Age eligibility range is ${minAge}–${maxAge} years (age not specified in profile)`);
  } else if (Number(profile.age) >= minAge && Number(profile.age) <= maxAge) {
    score += 15;
    reasons.green.push(`Age (${profile.age} years) is within eligible range (${minAge}–${maxAge} years)`);
  } else {
    reasons.red.push(`Age (${profile.age}) is outside required range (${minAge}–${maxAge} years)`);
  }

  // -------------------------------------------------------------------------
  // 4. LOCATION / STATE RESTRICTION (Weight: 15)
  // -------------------------------------------------------------------------
  const schemeStates = Array.isArray(scheme.states)
    ? scheme.states
    : typeof scheme.states === "string"
    ? JSON.parse(scheme.states || '["ALL"]')
    : ["ALL"];

  const isPanIndia = schemeStates.includes("ALL");
  const hasStateSpecified = Boolean(profile.state && profile.state !== "");

  if (isPanIndia) {
    score += 15;
    reasons.green.push("Pan-India scheme (applicable in all States & Union Territories)");
  } else if (!hasStateSpecified) {
    // Treat missing criteria as unknown
    score += 7;
    reasons.yellow.push(`State not specified in profile (Scheme restricted to: ${schemeStates.join(", ")})`);
  } else if (schemeStates.includes(profile.state)) {
    score += 15;
    reasons.green.push(`Available in your state (${profile.state})`);
  } else {
    reasons.red.push(`Scheme restricted to ${schemeStates.join(", ")}; not active in ${profile.state}`);
  }

  // -------------------------------------------------------------------------
  // 5. OCCUPATION / BUSINESS TYPE & STATUS (Weight: 15)
  // -------------------------------------------------------------------------
  const schemeBTypes = Array.isArray(scheme.businessTypes)
    ? scheme.businessTypes
    : typeof scheme.business_types === "string"
    ? JSON.parse(scheme.business_types || '["ALL"]')
    : ["ALL"];

  const schemeBStatus = Array.isArray(scheme.businessStatus)
    ? scheme.businessStatus
    : typeof scheme.business_status === "string"
    ? JSON.parse(scheme.business_status || '["ALL"]')
    : ["ALL"];

  const isBroadScheme = schemeBTypes.includes("ALL") && schemeBStatus.includes("ALL");

  if (isBroadScheme) {
    score += 15;
    reasons.green.push("Open to all occupations, individual citizens, and enterprise stages");
  } else {
    const hasTypeSpecified = Boolean(profile.businessType && profile.businessType !== "");
    const hasStatusSpecified = Boolean(profile.businessStatus && profile.businessStatus !== "");

    const typeMatch = schemeBTypes.includes("ALL") || (hasTypeSpecified && schemeBTypes.includes(profile.businessType));
    const statusMatch = schemeBStatus.includes("ALL") || (hasStatusSpecified && schemeBStatus.includes(profile.businessStatus));

    if (typeMatch && statusMatch) {
      score += 15;
      reasons.green.push(`Business model (${profile.businessType || "General"}) & stage supported`);
    } else if (typeMatch || statusMatch) {
      score += 8;
      if (!typeMatch) {
        reasons.yellow.push(`Scheme covers ${schemeBTypes.join(" / ")} activities`);
      } else {
        reasons.yellow.push(`Scheme primarily targets ${schemeBStatus.join(" / ")} enterprises`);
      }
    } else if (!hasTypeSpecified && !hasStatusSpecified) {
      score += 7;
      reasons.yellow.push(`Occupation / business stage not specified in profile`);
    } else {
      reasons.red.push("Applicant activity does not match target enterprise profile");
    }
  }

  // -------------------------------------------------------------------------
  // 6. FINANCIAL REQUIREMENT / ASSISTANCE (Weight: 15)
  // -------------------------------------------------------------------------
  const minReq = scheme.minReq != null ? Number(scheme.minReq) : scheme.min_req != null ? Number(scheme.min_req) : 0;
  const maxReq = scheme.maxReq != null ? Number(scheme.maxReq) : scheme.max_req != null ? Number(scheme.max_req) : 0;

  const isNonCreditScheme = minReq === 0 && maxReq <= 100000;
  const hasReqSpecified =
    profile.financialRequirement != null &&
    profile.financialRequirement !== "" &&
    !isNaN(profile.financialRequirement);

  if (isNonCreditScheme) {
    score += 15;
    reasons.green.push("Direct financial welfare / scholarship / social assistance grant");
  } else if (!hasReqSpecified) {
    // Treat missing criteria as unknown
    score += 7;
    reasons.yellow.push(`Funding requirement not specified (Scheme assistance: ₹${formatINR(minReq)}–₹${formatINR(maxReq)})`);
  } else {
    const req = Number(profile.financialRequirement);
    if (req >= minReq && (maxReq === 0 || req <= maxReq)) {
      score += 15;
      reasons.green.push(`Funding requirement (₹${formatINR(req)}) falls within scheme assistance bracket`);
    } else if (req < minReq) {
      score += 6;
      reasons.yellow.push(`Requested funding is below scheme baseline (₹${formatINR(minReq)}–₹${formatINR(maxReq)})`);
    } else {
      score += 4;
      reasons.yellow.push(`Requested funding exceeds scheme standard ceiling (Maximum: ₹${formatINR(maxReq)})`);
    }
  }

  // Standard official verification notices
  reasons.yellow.push("Credentials and income subject to verification on official government portal");
  reasons.yellow.push("Final benefit release subject to departmental guidelines and documentary scrutiny");

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    score: finalScore,
    reasons,
    eligible: finalScore >= 60,
  };
}

export function matchSchemes(profile = {}, schemeList = SCHEMES) {
  return schemeList
    .map((scheme) => {
      const result = scoreScheme(profile, scheme);
      return {
        scheme,
        ...result,
      };
    })
    .sort((a, b) => b.score - a.score);
}
