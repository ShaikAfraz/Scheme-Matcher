/**
 * REGRESSION & VERIFICATION TEST SUITE: ELIGIBILITY MATCHING WITHOUT PROFILE
 * 
 * Verifies that:
 * 1. Empty profile produces "Not Assessed" eligibility status.
 * 2. Empty profile produces zero 100% scores (returns null / Not Assessed).
 * 3. Partial profile leaves unknown criteria strictly as "missing"/unknown (never treated as pass).
 * 4. Missing income does not automatically pass income criteria.
 * 5. Missing age does not automatically pass age criteria.
 * 6. Missing location does not automatically pass location criteria.
 * 7. Mandatory failure results in "Not Eligible".
 * 8. Complete matching profile produces correct actual score and "Eligible" status.
 * 9. Zero evaluated criteria results in "Not Assessed".
 * 10. Existing matching engine integrity is maintained across baseline schemes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  scoreScheme,
  matchSchemes,
  isProfileEmpty,
  getRatingLabel,
} from "../src/engine/matcher.js";
import { SCHEMES } from "../src/data/schemes.js";

describe("Eligibility Matching Without User Profile & Partial Profiles", () => {
  const panIndiaScheme = SCHEMES.find((s) => s.id === "SC001" || s.states.includes("ALL"));
  assert.ok(panIndiaScheme, "PMEGP or Pan-India scheme must exist");

  const stateRestrictedScheme = SCHEMES.find(
    (s) => s.governmentLevel === "state" && !s.states.includes("ALL")
  ) || {
    id: "TEST_STATE_RESTRICTED",
    name: "Karnataka State Special Subsidy Scheme",
    states: ["Karnataka"],
    categories: ["ALL"],
    minAge: 18,
    maxAge: 45,
    incomeLimit: 250000,
    ministry: "Department of Industries & Commerce, Karnataka",
    portalUrl: "https://karnataka.gov.in",
  };

  const incomeRestrictedScheme = {
    id: "TEST_INCOME_RESTRICTED",
    name: "Targeted Low-Income Welfare Scheme",
    states: ["ALL"],
    categories: ["ALL"],
    incomeLimit: 200000, // ₹2 Lakh ceiling
    minAge: 18,
    maxAge: 60,
    ministry: "Ministry of Social Justice and Empowerment",
    portalUrl: "https://socialjustice.gov.in",
  };

  const ageRestrictedScheme = {
    id: "TEST_AGE_RESTRICTED",
    name: "Youth Entrepreneurship Development Scheme",
    states: ["ALL"],
    categories: ["ALL"],
    minAge: 18,
    maxAge: 35, // 18-35 only
    incomeLimit: 500000,
    ministry: "Ministry of Skill Development & Entrepreneurship",
    portalUrl: "https://msde.gov.in",
  };

  // ---------------------------------------------------------------------------
  // 1. Empty profile → Not Assessed
  // ---------------------------------------------------------------------------
  it("1. should classify schemes as 'Not Assessed' when user profile is empty ({})", () => {
    const result1 = scoreScheme({}, panIndiaScheme);
    assert.equal(result1.eligibilityStatus, "Not Assessed");
    assert.equal(result1.isNotAssessed, true);
    assert.equal(result1.isEligible, false);
    assert.equal(result1.isPotentiallyEligible, false);
    assert.equal(result1.isNotEligible, false);
    assert.equal(result1.eligible, false);

    // Initial state with blank strings and false booleans
    const blankInitialProfile = {
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
    assert.equal(isProfileEmpty(blankInitialProfile), true);

    const result2 = scoreScheme(blankInitialProfile, panIndiaScheme);
    assert.equal(result2.eligibilityStatus, "Not Assessed");
    assert.equal(result2.isNotAssessed, true);
  });

  // ---------------------------------------------------------------------------
  // 2. Empty profile → no 100% score (returns null / Not Assessed)
  // ---------------------------------------------------------------------------
  it("2. should NEVER produce a 100% score for an empty profile", () => {
    const allMatches = matchSchemes({});
    assert.equal(allMatches.length, 574);

    let perfectScoreCount = 0;
    let assessedCount = 0;

    for (const m of allMatches) {
      if (m.matchRating === 100 || m.score === 100) {
        perfectScoreCount++;
      }
      if (m.isAssessed !== false && m.matchRating !== null) {
        assessedCount++;
      }
      // Rating label must be "Not Assessed"
      assert.equal(m.ratingLabel, "Not Assessed");
      // Score and matchRating must be null (not 100, not 0)
      assert.equal(m.matchRating, null);
      assert.equal(m.score, null);
      // Status must be Not Assessed
      assert.equal(m.eligibilityStatus, "Not Assessed");
    }

    assert.equal(perfectScoreCount, 0, "No scheme can score 100% on empty profile");
    assert.equal(assessedCount, 0, "Zero schemes can be assessed on empty profile");
  });

  // ---------------------------------------------------------------------------
  // 3. Partial profile → Unknown criteria remain Unknown
  // ---------------------------------------------------------------------------
  it("3. should keep missing criteria as unknown/missing on partial profile", () => {
    // Citizen provided ONLY age, but income, category, and state are not provided
    const partialProfile = {
      age: 28,
    };

    const result = scoreScheme(partialProfile, incomeRestrictedScheme);
    // Age passed
    assert.ok(result.passedCriteria.some((c) => c.criterion === "age"));
    // Income missing
    assert.ok(result.missingInformation.some((c) => c.criterion === "income"));
    // Income MUST NOT be passed
    assert.equal(result.passedCriteria.some((c) => c.criterion === "income"), false);
    // Status must be Potentially Eligible, NOT Eligible
    assert.equal(result.eligibilityStatus, "Potentially Eligible");
    assert.equal(result.isEligible, false);
    assert.ok(result.unknownCount > 0, "Unknown criteria count must be > 0");
  });

  // ---------------------------------------------------------------------------
  // 4. Missing income → income criteria not automatically passed
  // ---------------------------------------------------------------------------
  it("4. should NOT automatically pass income criteria when income is missing", () => {
    const profileNoIncome = {
      age: 30,
      gender: "Male",
      state: "Karnataka",
      category: "General",
      // income is omitted!
    };

    const result = scoreScheme(profileNoIncome, incomeRestrictedScheme);
    // Income criteria must NOT be passed
    const incomePassed = result.passedCriteria.some((c) => c.criterion === "income");
    assert.equal(incomePassed, false, "Missing income must NOT be in passedCriteria");

    // Income criteria must be flagged as missing
    const incomeMissing = result.missingInformation.some((c) => c.criterion === "income");
    assert.equal(incomeMissing, true, "Missing income must be in missingInformation");

    // Points for income must be 0
    assert.equal(result.scoreBreakdown.incomeFit, 0);

    // Cannot be classified as fully Eligible
    assert.notEqual(result.eligibilityStatus, "Eligible");
  });

  // ---------------------------------------------------------------------------
  // 5. Missing age → age criteria not automatically passed
  // ---------------------------------------------------------------------------
  it("5. should NOT automatically pass age criteria when age is missing", () => {
    const profileNoAge = {
      gender: "Female",
      state: "Karnataka",
      category: "General",
      income: 180000,
      // age is omitted!
    };

    const result = scoreScheme(profileNoAge, ageRestrictedScheme);
    // Age criteria must NOT be passed
    const agePassed = result.passedCriteria.some((c) => c.criterion === "age");
    assert.equal(agePassed, false, "Missing age must NOT be in passedCriteria");

    // Age criteria must be flagged as missing
    const ageMissing = result.missingInformation.some((c) => c.criterion === "age");
    assert.equal(ageMissing, true, "Missing age must be in missingInformation");

    // Points for age must be 0
    assert.equal(result.scoreBreakdown.ageFit, 0);

    // Cannot be classified as fully Eligible
    assert.notEqual(result.eligibilityStatus, "Eligible");
  });

  // ---------------------------------------------------------------------------
  // 6. Missing location → location criteria not automatically passed
  // ---------------------------------------------------------------------------
  it("6. should NOT automatically pass location criteria on state-restricted scheme when location is missing", () => {
    const profileNoLocation = {
      age: 28,
      gender: "Male",
      category: "General",
      income: 180000,
      // state is omitted!
    };

    const result = scoreScheme(profileNoLocation, stateRestrictedScheme);
    // Location criteria must NOT be passed
    const locationPassed = result.passedCriteria.some((c) => c.criterion === "state");
    assert.equal(locationPassed, false, "Missing location must NOT be in passedCriteria on state-restricted scheme");

    // Location criteria must be flagged as missing
    const locationMissing = result.missingInformation.some((c) => c.criterion === "state");
    assert.equal(locationMissing, true, "Missing location must be in missingInformation");

    // Points for location must be 0
    assert.equal(result.scoreBreakdown.locationFit, 0);

    // Cannot be classified as fully Eligible
    assert.notEqual(result.eligibilityStatus, "Eligible");
  });

  // ---------------------------------------------------------------------------
  // 7. Mandatory failure → Not Eligible
  // ---------------------------------------------------------------------------
  it("7. should strictly determine 'Not Eligible' when a mandatory criterion fails", () => {
    // Beneficiary age 45 fails youth scheme (18-35)
    const overAgeProfile = {
      age: 45,
      gender: "Male",
      state: "Karnataka",
      category: "General",
      income: 180000,
    };

    const result = scoreScheme(overAgeProfile, ageRestrictedScheme);
    assert.equal(result.eligibilityStatus, "Not Eligible");
    assert.equal(result.isNotEligible, true);
    assert.equal(result.isEligible, false);
    assert.ok(result.failedCriteria.some((f) => f.criterion === "age"));
    assert.ok(result.disqualifyingReasons.some((r) => r.includes("45")));
  });

  // ---------------------------------------------------------------------------
  // 8. Complete matching profile → correct actual score
  // ---------------------------------------------------------------------------
  it("8. should calculate correct actual match score and Eligible status for complete matching profile", () => {
    const eligibleProfile = {
      age: 26,
      gender: "Female",
      state: "Karnataka",
      category: "SC",
      income: 150000,
      financialRequirement: 100000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };

    const result = scoreScheme(eligibleProfile, ageRestrictedScheme);
    assert.equal(result.eligibilityStatus, "Eligible");
    assert.equal(result.isEligible, true);
    assert.equal(result.failedCriteria.length, 0);
    assert.equal(result.missingInformation.length, 0);
    assert.ok(typeof result.matchRating === "number" && result.matchRating >= 85);
    assert.equal(result.ratingLabel, "Excellent Match");
  });

  // ---------------------------------------------------------------------------
  // 9. Zero evaluated criteria → Not Assessed
  // ---------------------------------------------------------------------------
  it("9. should return 'Not Assessed' when zero criteria can be evaluated", () => {
    // Unrelated object with no matching demographic parameters
    const blankObject = { dummyField: "randomValue" };
    const result = scoreScheme(blankObject, panIndiaScheme);

    assert.equal(result.eligibilityStatus, "Not Assessed");
    assert.equal(result.matchRating, null);
    assert.equal(result.score, null);
    assert.equal(result.ratingLabel, "Not Assessed");
    assert.equal(result.evaluatedCount, 0);
    assert.equal(result.passedCriteria.length, 0);
  });

  // ---------------------------------------------------------------------------
  // 10. getRatingLabel returns 'Not Assessed' for null / undefined
  // ---------------------------------------------------------------------------
  it("10. getRatingLabel returns 'Not Assessed' safely for null or undefined", () => {
    assert.equal(getRatingLabel(null), "Not Assessed");
    assert.equal(getRatingLabel(undefined), "Not Assessed");
    assert.equal(getRatingLabel("Not Assessed"), "Not Assessed");
    assert.equal(getRatingLabel(100), "Excellent Match");
    assert.equal(getRatingLabel(75), "Strong Match");
    assert.equal(getRatingLabel(55), "Moderate Match");
    assert.equal(getRatingLabel(30), "Low Match");
    assert.equal(getRatingLabel(10), "Weak Match");
    assert.equal(getRatingLabel(0), "No Match");
  });
});

