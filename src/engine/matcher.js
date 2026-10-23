/**
 * DETERMINISTIC RULE-BASED MATCHING ENGINE
 * Weights adhere strictly to SIH26092 PRD specification:
 *   - Category: 20%
 *   - Income: 20%
 *   - Age: 15%
 *   - Location/State: 15%
 *   - Business Type & Status: 15%
 *   - Financial Requirement: 15%
 * Total: 100%
 */

import { SCHEMES } from "../data/schemes.js";

export function formatINR(val) {
  if (val == null || isNaN(val)) return "0";
  return Number(val).toLocaleString("en-IN");
}

export function scoreScheme(profile, scheme) {
  const reasons = { green: [], yellow: [], red: [] };
  let score = 0;

  // 1. Category & Marginalized Group Match (Weight: 20)
  const isFemaleBeneficiary =
    profile.gender === "Female" && scheme.categories.includes("Women");
  
  const isSafaiKaramchariMatch =
    profile.isSafaiKaramchari && (scheme.id === "SC013" || scheme.name.includes("Safai Karamcharis"));

  const isDivyangjanMatch =
    profile.isDivyangjan && (scheme.id === "SC018" || scheme.categories.includes("Divyangjan"));

  const isArtisanMatch =
    profile.isArtisan && (scheme.id === "SC016" || scheme.categories.includes("Artisan"));

  const isTransgenderMatch =
    profile.isTransgender && (scheme.id === "SC017" || scheme.categories.includes("Transgender"));

  const isDntMatch =
    (profile.isDnt || profile.category === "DNT") && (scheme.id === "SC019" || scheme.categories.includes("DNT"));

  const isSpecialTargetMatch =
    isSafaiKaramchariMatch || isDivyangjanMatch || isArtisanMatch || isTransgenderMatch || isDntMatch;

  const isCategoryMatch =
    scheme.categories.includes("ALL") ||
    scheme.categories.includes(profile.category) ||
    isFemaleBeneficiary ||
    isSpecialTargetMatch;

  if (isCategoryMatch) {
    score += 20;
    if (isSafaiKaramchariMatch) {
      score += 5; // priority bonus for dedicated MoSJE scheme
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Safai Karamcharis / Sanitation workers (NSKFDC)");
    } else if (isDivyangjanMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Designated scheme for Persons with Disabilities / Divyangjan (NHFDC)");
    } else if (isArtisanMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Direct match for Traditional Artisans & Craftspeople (PM Vishwakarma)");
    } else if (isTransgenderMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Dedicated MoSJE livelihood support for Transgender Persons (SMILE)");
    } else if (isDntMatch) {
      score += 5;
      reasons.green.push("★ Priority Beneficiary: Targeted support for De-Notified / Nomadic Tribe (DNT / SEED)");
    } else if (isFemaleBeneficiary && !scheme.categories.includes(profile.category)) {
      reasons.green.push("Eligible under special Women Entrepreneur provision");
    } else if (scheme.categories.includes(profile.category)) {
      reasons.green.push(`Category requirement satisfied (${profile.category})`);
    } else {
      reasons.green.push("Category requirement satisfied (Open to all)");
    }
  } else {
    reasons.red.push(`Scheme targets ${scheme.categories.join(" / ")} applicants`);
  }


  // 2. Income (Weight: 20)
  if (scheme.incomeLimit == null) {
    score += 20;
    reasons.green.push("No income ceiling for this scheme");
  } else if (profile.income <= scheme.incomeLimit) {
    score += 20;
    reasons.green.push(`Income (₹${formatINR(profile.income)}) is within scheme's ₹${formatINR(scheme.incomeLimit)} ceiling`);
  } else {
    reasons.red.push(`Income exceeds scheme's ceiling of ₹${formatINR(scheme.incomeLimit)}`);
  }

  // 3. Age (Weight: 15)
  if (profile.age >= scheme.minAge && profile.age <= scheme.maxAge) {
    score += 15;
    reasons.green.push(`Age (${profile.age} years) satisfies eligibility range (${scheme.minAge}–${scheme.maxAge})`);
  } else {
    reasons.red.push(`Age (${profile.age}) is outside ${scheme.minAge}–${scheme.maxAge} range`);
  }

  // 4. Location / State (Weight: 15)
  if (scheme.states.includes("ALL") || scheme.states.includes(profile.state)) {
    score += 15;
    reasons.green.push("Available in your state");
  } else {
    reasons.red.push(`Not currently listed for ${profile.state || "your state"}`);
  }

  // 5. Business Type & Status (Weight: 15)
  const typeOk =
    scheme.businessTypes.includes("ALL") ||
    scheme.businessTypes.includes(profile.businessType);
  const statusOk =
    scheme.businessStatus.includes("ALL") ||
    scheme.businessStatus.includes(profile.businessStatus);

  if (typeOk && statusOk) {
    score += 15;
    reasons.green.push(`Business type (${profile.businessType}) & stage (${profile.businessStatus === "new" ? "New venture" : "Existing"}) supported`);
  } else if (typeOk || statusOk) {
    score += 8;
    if (!statusOk) {
      reasons.yellow.push(
        `Scheme primarily targets ${scheme.businessStatus.map(s => s === "new" ? "new ventures" : "existing units").join(" / ")}`
      );
    } else {
      reasons.yellow.push(
        `Scheme covers ${scheme.businessTypes.join(" / ")} business models`
      );
    }
  } else {
    reasons.red.push("Business type and stage not supported by this scheme");
  }

  // 6. Financial Requirement (Weight: 15)
  if (
    profile.financialRequirement >= scheme.minReq &&
    profile.financialRequirement <= scheme.maxReq
  ) {
    score += 15;
    reasons.green.push(`Requested funding (₹${formatINR(profile.financialRequirement)}) falls within scheme assistance range`);
  } else if (profile.financialRequirement < scheme.minReq) {
    score += 5;
    reasons.yellow.push(
      `Requested funding is below scheme minimum (₹${formatINR(scheme.minReq)}–₹${formatINR(scheme.maxReq)})`
    );
  } else {
    score += 4;
    reasons.yellow.push(
      `Funding requirement exceeds standard threshold (Scheme maximum: ₹${formatINR(scheme.maxReq)})`
    );
  }

  // Standard official verification notices
  reasons.yellow.push("Caste / Income certificate subject to verification by implementing authority");
  reasons.yellow.push("Final sanction dependent on bank / agency due diligence and viable DPR");

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    score: finalScore,
    reasons,
    eligible: finalScore >= 60,
  };
}

export function matchSchemes(profile, schemeList = SCHEMES) {
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
