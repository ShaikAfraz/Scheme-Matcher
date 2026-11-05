/**
 * COMPREHENSIVE TEST SUITE: MATCH RATING SYSTEM & FINANCIAL INPUT VALIDATION
 * Covers:
 * 1. Financial input parsing and validation (INR, commas, currency symbols, zero, decimals, boundaries, invalid text rejection)
 * 2. Dynamic Match Rating calculation (0-100, dynamic weight normalization, 5 tiers, score coverage, score explanation)
 * 3. Strict rule: Missing profile information receives 0 points and is never awarded points as passed
 * 4. Strict separation: High match rating never overrides failed mandatory criteria
 * 5. SQLite database persistence of citizen profile income and retrieval into matcher
 * 6. Audit of all 574 schemes for consistent scoring engine output
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseFinancialAmount,
  sanitizeNumericString,
  formatINR,
  formatINRLakhs,
} from "../src/utils/financialInput.js";
import {
  scoreScheme,
  matchSchemes,
  getRatingLabel,
  SCORING_CRITERIA_DOCS,
} from "../src/engine/matcher.js";
import { SCHEMES } from "../src/data/schemes.js";
import {
  db,
  saveUser,
  getUserById,
  updateUserProfile,
  getAdminSchemes,
} from "../server/db.js";

describe("1. Financial Input Parsing & Validation", () => {
  it("should accept valid standard numeric amounts without errors", () => {
    const inc1 = parseFinancialAmount(150000);
    assert.equal(inc1.valid, true);
    assert.equal(inc1.numeric, 150000);

    const inc2 = parseFinancialAmount(250000);
    assert.equal(inc2.valid, true);
    assert.equal(inc2.numeric, 250000);
  });

  it("should parse amounts with Indian comma separators (1,50,000 and 2,50,000)", () => {
    const res1 = parseFinancialAmount("1,50,000");
    assert.equal(res1.valid, true);
    assert.equal(res1.numeric, 150000);

    const res2 = parseFinancialAmount("2,50,000");
    assert.equal(res2.valid, true);
    assert.equal(res2.numeric, 250000);
  });

  it("should parse amounts with Indian currency prefixes (₹, Rs, Rs., INR)", () => {
    assert.equal(parseFinancialAmount("₹150000").numeric, 150000);
    assert.equal(parseFinancialAmount("₹ 2,50,000").numeric, 250000);
    assert.equal(parseFinancialAmount("Rs. 150000").numeric, 150000);
    assert.equal(parseFinancialAmount("Rs 250000").numeric, 250000);
    assert.equal(parseFinancialAmount("INR 300000").numeric, 300000);
    assert.equal(parseFinancialAmount("inr 50,000").numeric, 50000);
  });

  it("should accept valid zero income amounts for destitute/unemployed/students", () => {
    const zeroNum = parseFinancialAmount(0, { allowZero: true });
    assert.equal(zeroNum.valid, true);
    assert.equal(zeroNum.numeric, 0);

    const zeroStr = parseFinancialAmount("0", { allowZero: true });
    assert.equal(zeroStr.valid, true);
    assert.equal(zeroStr.numeric, 0);

    const zeroRupee = parseFinancialAmount("₹0", { allowZero: true });
    assert.equal(zeroRupee.valid, true);
    assert.equal(zeroRupee.numeric, 0);
  });

  it("should accept valid decimal values in INR", () => {
    const dec = parseFinancialAmount("150000.75");
    assert.equal(dec.valid, true);
    assert.equal(dec.numeric, 150000.75);
  });

  it("should accept large valid amounts up to 100 Crore without artificial restriction", () => {
    const oneCrore = parseFinancialAmount("10000000"); // 1 Crore
    assert.equal(oneCrore.valid, true);
    assert.equal(oneCrore.numeric, 10000000);

    const tenCrore = parseFinancialAmount("₹ 10,00,00,000");
    assert.equal(tenCrore.valid, true);
    assert.equal(tenCrore.numeric, 100000000);
  });

  it("should reject negative amounts with clear error message", () => {
    const neg = parseFinancialAmount("-5000");
    assert.equal(neg.valid, false);
    assert.ok(neg.error.includes("valid numeric amount"));
  });

  it("should reject invalid alphabetic text and corrupted inputs without silent fallback", () => {
    const letters = parseFinancialAmount("abc");
    assert.equal(letters.valid, false);
    assert.equal(letters.numeric, null);
    assert.ok(letters.error.includes("valid numeric amount"));

    const mixed = parseFinancialAmount("150000xyz");
    assert.equal(mixed.valid, false);

    const multiDec = parseFinancialAmount("1.2.3");
    assert.equal(multiDec.valid, false);
  });

  it("should handle empty fields gracefully as empty without crashing", () => {
    const emptyNull = parseFinancialAmount(null);
    assert.equal(emptyNull.valid, true);
    assert.equal(emptyNull.isEmpty, true);
    assert.equal(emptyNull.numeric, null);

    const emptyStr = parseFinancialAmount("");
    assert.equal(emptyStr.valid, true);
    assert.equal(emptyStr.isEmpty, true);
  });

  it("should format INR properly in Lakhs and Crores", () => {
    assert.equal(formatINRLakhs(150000), "₹1,50,000 (1.50 Lakh)");
    assert.equal(formatINRLakhs(250000), "₹2,50,000 (2.50 Lakh)");
    assert.equal(formatINRLakhs(10000000), "₹1,00,00,000 (1 Crore)");
    assert.equal(formatINRLakhs(0), "₹0 (Zero Income / Unemployed)");
  });
});

describe("2. Match Rating System (0-100, Normalization, and Tiers)", () => {
  it("should classify scores into the 5 documented rating tiers", () => {
    // 85–100: Excellent Match
    assert.equal(getRatingLabel(100), "Excellent Match");
    assert.equal(getRatingLabel(90), "Excellent Match");
    assert.equal(getRatingLabel(85), "Excellent Match");

    // 70–84: Strong Match
    assert.equal(getRatingLabel(84), "Strong Match");
    assert.equal(getRatingLabel(75), "Strong Match");
    assert.equal(getRatingLabel(70), "Strong Match");

    // 50–69: Moderate Match
    assert.equal(getRatingLabel(69), "Moderate Match");
    assert.equal(getRatingLabel(60), "Moderate Match");
    assert.equal(getRatingLabel(50), "Moderate Match");

    // 25–49: Low Match
    assert.equal(getRatingLabel(49), "Low Match");
    assert.equal(getRatingLabel(35), "Low Match");
    assert.equal(getRatingLabel(25), "Low Match");

    // 1–24: Weak Match
    assert.equal(getRatingLabel(24), "Weak Match");
    assert.equal(getRatingLabel(10), "Weak Match");
    assert.equal(getRatingLabel(1), "Weak Match");

    // 0: No Match
    assert.equal(getRatingLabel(0), "No Match");
  });

  it("should provide documented criteria breakdown in matcher output", () => {
    const profile = {
      age: 28,
      gender: "Female",
      state: "Uttar Pradesh",
      category: "SC",
      income: 150000,
      financialRequirement: 250000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };

    const scheme = SCHEMES[0];
    const scored = scoreScheme(profile, scheme);

    assert.ok(typeof scored.matchRating === "number", "Must return numeric matchRating");
    assert.ok(scored.matchRating >= 0 && scored.matchRating <= 100, "Rating must be between 0 and 100");
    assert.ok(scored.ratingLabel, "Must return ratingLabel");
    assert.ok(scored.scoreCoverage, "Must return scoreCoverage");
    assert.ok(Array.isArray(scored.scoreExplanation), "Must return scoreExplanation array");
    assert.ok(scored.scoreBreakdown, "Must return scoreBreakdown object");
  });

  it("should normalize weights dynamically when criteria do not apply", () => {
    // Universal Pan-India scheme with no income ceiling and no age restriction
    const universalScheme = {
      id: "TEST_UNIV",
      name: "Universal Open Development Scheme",
      categories: ["ALL"],
      states: ["ALL"],
      minAge: null,
      maxAge: null,
      incomeLimit: null,
      maxReq: null,
      targetGroup: "All Citizens",
      ministry: "Ministry of Social Justice and Empowerment",
      description: "Universal scheme for all citizens without income or age bar.",
    };

    const citizenProfile = {
      category: "General",
      state: "Delhi",
    };

    const scored = scoreScheme(citizenProfile, universalScheme);
    // Since category and state match universal, and others have no ceiling, active criteria should normalize to 100
    assert.ok(scored.matchRating >= 85, `Universal match should score in Excellent tier, got ${scored.matchRating}`);
    assert.ok(
      scored.scoreExplanation.some(
        (e) => (e.detail && e.detail.includes("normalized")) || e.status === "not_applicable"
      ),
      "Must explain dynamic normalization"
    );
  });

  it("should NEVER award points for missing profile information", () => {
    // Scheme with explicit criteria on category, income, age, state
    const specificScheme = {
      id: "TEST_SPECIFIC",
      name: "Targeted SC Youth Scheme",
      categories: ["SC"],
      states: ["Uttar Pradesh"],
      minAge: 18,
      maxAge: 35,
      incomeLimit: 250000,
      maxReq: 500000,
      targetGroup: "SC Youth",
      ministry: "Ministry of Social Justice and Empowerment",
    };

    // Incomplete profile with NO age, NO income, NO category
    const incompleteProfile = {
      age: undefined,
      income: undefined,
      category: undefined,
      state: undefined,
    };

    const scored = scoreScheme(incompleteProfile, specificScheme);
    assert.equal(scored.scoreBreakdown.categoryFit, 0, "Missing category must receive 0 points");
    assert.equal(scored.scoreBreakdown.incomeFit, 0, "Missing income must receive 0 points");
    assert.equal(scored.scoreBreakdown.ageFit, 0, "Missing age must receive 0 points");
    assert.equal(scored.scoreBreakdown.locationFit, 0, "Missing location must receive 0 points");
    assert.ok(scored.matchRating === 0 || scored.matchRating === null, "Completely empty profile on specific scheme must score 0 or null (Not Assessed)");
    assert.ok(scored.ratingLabel === "No Match" || scored.ratingLabel === "Not Assessed");
  });

  it("should strictly keep match rating separate from eligibility status (high score never overrides failed mandatory criteria)", () => {
    // Profile matches category (SC), state (UP), age (30), business type, BUT income exceeds statutory cap
    const highIncomeSC = {
      age: 30,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "SC",
      income: 1200000, // 12 Lakhs (violates ₹3 Lakh ceiling)
      financialRequirement: 200000,
      businessStatus: "new",
      businessType: "Manufacturing",
    };

    const nsfdcScheme = SCHEMES.find((s) => s.id === "SC006" || s.incomeLimit === 300000);
    assert.ok(nsfdcScheme, "NSFDC scheme must exist");

    const result = scoreScheme(highIncomeSC, nsfdcScheme);

    // Status MUST be strictly Not Eligible
    assert.equal(result.eligibilityStatus, "Not Eligible", "Status must be Not Eligible due to income ceiling breach");
    assert.equal(result.isEligible, false);
    assert.equal(result.isNotEligible, true);

    // High points on other criteria (Category + Location + Age) MUST NOT override the disqualification
    assert.ok(
      result.disqualifyingReasons.some((r) => r.includes("Income exceeds") || r.includes("exceeds")),
      "Must have explicit disqualifying reason for income breach"
    );
  });
});

describe("3. SQLite Persistence & Profile Income Round-Trip", () => {
  it("should persist formatted income (e.g. ₹150,000) into SQLite database as a clean numeric value", () => {
    const testUserId = `test_usr_${Date.now()}`;
    const rawIncomeInput = "₹1,50,000";
    const rawReqInput = "₹ 2,50,000";

    const parsedInc = parseFinancialAmount(rawIncomeInput);
    const parsedReq = parseFinancialAmount(rawReqInput);

    assert.equal(parsedInc.valid, true);
    assert.equal(parsedReq.valid, true);

    // Save user to SQLite
    const user = saveUser({
      id: testUserId,
      name: "Verification Citizen",
      email: `${testUserId}@example.com`,
      mobile: "9876543210",
      password: "password123",
      role: "SC Entrepreneur",
      systemRole: "citizen",
      isDemo: false,
      profileData: {
        age: 28,
        gender: "Female",
        state: "Uttar Pradesh",
        category: "SC",
        income: parsedInc.numeric,
        financialRequirement: parsedReq.numeric,
        businessStatus: "new",
        businessType: "Manufacturing",
      },
    });

    assert.ok(user, "User saved successfully");

    // Fetch user back from SQLite
    const retrieved = getUserById(testUserId);
    assert.ok(retrieved, "User retrieved from database");

    const profile = typeof retrieved.profile_data === "string"
      ? JSON.parse(retrieved.profile_data)
      : retrieved.profile_data;

    assert.equal(profile.income, 150000, "Persisted income must be pure numeric 150000");
    assert.equal(profile.financialRequirement, 250000, "Persisted requirement must be pure numeric 250000");

    // Update profile with zero income (e.g. citizen became unemployed)
    const zeroInc = parseFinancialAmount("0");
    const updated = updateUserProfile(testUserId, {
      ...profile,
      income: zeroInc.numeric,
    });

    const updatedProfile = typeof updated.profile_data === "string"
      ? JSON.parse(updated.profile_data)
      : updated.profile_data;

    assert.equal(updatedProfile.income, 0, "Updated income 0 must persist without being replaced by defaults");
  });

  it("should feed persisted database profile into matching engine accurately", () => {
    const profileFromDb = {
      age: 28,
      gender: "Female",
      state: "Uttar Pradesh",
      category: "SC",
      income: 150000,
      financialRequirement: 250000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };

    const results = matchSchemes(profileFromDb);
    assert.ok(results.length >= 500, `Must evaluate 500+ schemes, got ${results.length}`);

    const top = results[0];
    assert.ok(top.matchRating > 0, "Top scheme must have positive match rating");
    assert.ok(top.ratingLabel, "Top scheme must have rating label");
    assert.ok(top.scoreCoverage, "Top scheme must have score coverage");
  });
});

describe("4. 574 Schemes Consistency & Quality Audit", () => {
  it("should evaluate all schemes in database with zero NaN scores and valid rating labels", () => {
    const testProfile = {
      age: 32,
      gender: "Female",
      state: "Maharashtra",
      category: "OBC",
      income: 200000,
      financialRequirement: 300000,
      businessStatus: "existing",
      businessType: "Services",
    };

    const results = matchSchemes(testProfile);
    assert.equal(results.length, 574, `Must evaluate exactly 574 schemes, got ${results.length}`);

    let nanCount = 0;
    let validTiers = 0;
    const knownLabels = new Set([
      "Excellent Match",
      "Strong Match",
      "Moderate Match",
      "Low Match",
      "Weak Match",
      "No Match",
    ]);

    for (const r of results) {
      if (isNaN(r.matchRating)) nanCount++;
      if (knownLabels.has(r.ratingLabel)) validTiers++;
    }

    assert.equal(nanCount, 0, "Zero schemes should produce NaN matchRating");
    assert.equal(validTiers, 574, "All 574 schemes must map to a recognized rating tier");
  });
});
