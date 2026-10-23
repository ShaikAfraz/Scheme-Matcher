import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { initDatabase, db, saveAssessment, getUserAssessments, getAssessmentById } from "../server/db.js";
import { SCHEMES } from "../src/data/schemes.js";
import { scoreScheme, matchSchemes, auditAllSchemes } from "../src/engine/matcher.js";

describe("Eligibility & Recommendation Engine Upgrade (574 Schemes)", () => {
  initDatabase();

  // -------------------------------------------------------------
  // 1. Audit & Classification of all 574 Schemes
  // -------------------------------------------------------------
  it("audits all 574 schemes stored in the database with verified classification", () => {
    const totalCount = db.prepare("SELECT COUNT(*) AS total FROM schemes").get().total;
    assert.equal(totalCount, 574, "Total schemes in database must be exactly 574");
    assert.equal(SCHEMES.length, 574, "In-memory SCHEMES export must be exactly 574");

    const completeCount = db.prepare(
      "SELECT COUNT(*) AS total FROM schemes WHERE criteria_completeness = 'verified'"
    ).get().total;

    const offlineCount = db.prepare(
      "SELECT COUNT(*) AS total FROM schemes WHERE criteria_completeness = 'requires_verification'"
    ).get().total;

    assert.equal(completeCount, 525, "Expected exactly 525 schemes with verified deterministic criteria");
    assert.equal(offlineCount, 49, "Expected exactly 49 schemes requiring offline/statutory verification");
    assert.equal(completeCount + offlineCount, 574, "Complete + offline verification schemes must sum to 574");

    // Engine audit function test
    const audit = auditAllSchemes(SCHEMES);
    assert.equal(audit.totalAudited, 574);
    assert.equal(audit.verifiedCriteriaCount, 525);
    assert.equal(audit.requiresVerificationCount, 49);

    // Every scheme must have non-empty ID, name, ministry, and portal link
    for (const scheme of SCHEMES) {
      assert.ok(scheme.id, "Scheme must have an id");
      assert.ok(scheme.name, `Scheme ${scheme.id} must have a name`);
      assert.ok(scheme.ministry, `Scheme ${scheme.id} must have a ministry`);
      assert.ok(scheme.portalLink || scheme.link || scheme.sourceUrl || scheme.portalUrl, `Scheme ${scheme.id} must have an official portal link`);
      assert.ok(scheme.governmentLevel === "central" || scheme.governmentLevel === "state", `Scheme ${scheme.id} must have valid level`);
    }
  });

  // -------------------------------------------------------------
  // 2. Three Eligibility Statuses: Eligible, Potentially Eligible, Not Eligible
  // -------------------------------------------------------------
  it("determines 'Eligible' status when all verified mandatory criteria pass", () => {
    // Karnataka OBC Female Artisan under ₹3L
    const artisanProfile = {
      age: 32,
      gender: "Female",
      state: "Karnataka",
      category: "OBC",
      income: 180000,
      financialRequirement: 150000,
      occupation: "Artisan",
      isArtisan: true,
      hasBplCard: false,
      isTaxPayer: false,
    };

    const vishwakarma = SCHEMES.find((s) => s.id === "SC016"); // PM Vishwakarma Scheme
    assert.ok(vishwakarma, "PM Vishwakarma scheme must exist");

    const result = scoreScheme(vishwakarma, artisanProfile);
    assert.equal(result.eligibilityStatus, "Eligible", "Artisan profile must be strictly Eligible for PM Vishwakarma");
    assert.equal(result.failedCriteria.length, 0, "Eligible scheme must have zero failed criteria");
    assert.ok(result.passedCriteria.length > 0, "Eligible scheme must record passed criteria");
  });

  it("determines 'Not Eligible' status when at least one mandatory criterion fails", () => {
    // Ineligible profile: Age 17 (minor), applying for Stand-Up India (SC002, min age 18)
    const minorProfile = {
      age: 17,
      gender: "Female",
      state: "Karnataka",
      category: "SC",
      income: 150000,
      occupation: "Student",
      isTaxPayer: false,
    };

    const standUpIndia = SCHEMES.find((s) => s.id === "SC002"); // Stand-Up India
    assert.ok(standUpIndia, "Stand-Up India must exist");

    const result = scoreScheme(standUpIndia, minorProfile);
    assert.equal(result.eligibilityStatus, "Not Eligible", "Age 17 must be Not Eligible for Stand-Up India (min age 18)");
    assert.ok(result.failedCriteria.length > 0, "Must have at least one failed criterion");
    assert.ok(result.disqualifyingReasons.some((r) => r.toLowerCase().includes("17")), "Disqualifying reason must mention age 17");
  });

  it("determines 'Potentially Eligible' when criteria cannot be ruled out due to missing inputs or offline scrutiny", () => {
    // Profile with unstated state and unspecified tax/ration information
    const uncertainProfile = {
      age: 35,
      gender: "Male",
      category: "General",
      income: 200000,
      state: "", // unstated state
      isTaxPayer: null,
      hasBplCard: null,
    };

    const apy = SCHEMES.find((s) => s.name.includes("Atal Pension") || s.id === "SCH_CEN_023"); // Atal Pension Yojana
    assert.ok(apy, "Atal Pension Yojana must exist");

    const result = scoreScheme(apy, uncertainProfile);
    assert.equal(result.eligibilityStatus, "Potentially Eligible", "Unstated tax payer status on APY must be Potentially Eligible");
    assert.ok(result.missingInformation.length > 0, "Must list missing taxpayer declaration");
    assert.ok(result.missingInformation.some((m) => m.label.includes("Tax") || m.detail.includes("tax")), "Must explain missing tax payee declaration");
  });

  // -------------------------------------------------------------
  // 3. Boundary Condition Tests
  // -------------------------------------------------------------
  it("accurately handles age boundary conditions [18, 50]", () => {
    // Scheme with age range 18-50
    const scheme = {
      id: "TEST_AGE_SCHEME",
      name: "Age Test Scheme",
      ministry: "Ministry of Skill Development",
      minAge: 18,
      maxAge: 50,
      state: "All India",
    };

    // Age 17: boundary under
    const r17 = scoreScheme(scheme, { age: 17 });
    assert.equal(r17.eligibilityStatus, "Not Eligible", "Age 17 must be Not Eligible for 18-50 range");
    assert.ok(r17.failedCriteria.some((f) => f.label === "Age Bounds"));

    // Age 18: exact lower boundary
    const r18 = scoreScheme(scheme, { age: 18 });
    assert.equal(r18.eligibilityStatus, "Eligible", "Age 18 must be Eligible for 18-50 range");

    // Age 50: exact upper boundary
    const r50 = scoreScheme(scheme, { age: 50 });
    assert.equal(r50.eligibilityStatus, "Eligible", "Age 50 must be Eligible for 18-50 range");

    // Age 51: boundary over
    const r51 = scoreScheme(scheme, { age: 51 });
    assert.equal(r51.eligibilityStatus, "Not Eligible", "Age 51 must be Not Eligible for 18-50 range");
    assert.ok(r51.failedCriteria.some((f) => f.label === "Age Bounds"));
  });

  it("accurately handles income boundary conditions [cap: ₹3,00,000]", () => {
    const scheme = {
      id: "TEST_INCOME_SCHEME",
      name: "Income Cap Test Scheme",
      ministry: "Ministry of Social Justice",
      maxIncome: 300000,
      state: "All India",
    };

    // Exactly at ceiling: ₹3,00,000
    const rAtCap = scoreScheme(scheme, { age: 30, income: 300000 });
    assert.equal(rAtCap.eligibilityStatus, "Eligible", "Income at exactly ₹3,00,000 must pass");

    // Boundary ₹1 over ceiling: ₹3,00,001
    const rOverCap = scoreScheme(scheme, { age: 30, income: 300001 });
    assert.equal(rOverCap.eligibilityStatus, "Not Eligible", "Income ₹3,00,001 must fail ₹3,00,000 cap");
    assert.ok(rOverCap.failedCriteria.some((f) => f.label === "Income Ceiling"));
    assert.ok(rOverCap.disqualifyingReasons.some((r) => r.includes("3,00,001")));
  });

  it("strictly enforces statutory exclusion for Income Tax Payees under APY", () => {
    const apy = SCHEMES.find((s) => s.name.includes("Atal Pension") || s.id === "SCH_CEN_023");
    assert.ok(apy);

    // Profile: Age 28, but taxpayer
    const taxPayerProfile = {
      age: 28,
      state: "Maharashtra",
      category: "General",
      income: 600000,
      isTaxPayer: true,
    };

    const result = scoreScheme(apy, taxPayerProfile);
    assert.equal(result.eligibilityStatus, "Not Eligible", "Income Tax Payee must be disqualified from APY");
    assert.ok(result.disqualifyingReasons.some((r) => r.toLowerCase().includes("tax")), "Disqualifying reason must mention tax payee");

    // Profile: Age 28, non-taxpayer
    const nonTaxProfile = {
      age: 28,
      state: "Maharashtra",
      category: "General",
      income: 200000,
      isTaxPayer: false,
    };

    const nonTaxResult = scoreScheme(apy, nonTaxProfile);
    assert.equal(nonTaxResult.eligibilityStatus, "Eligible", "Non-taxpayer within age 18-40 must be Eligible for APY");
  });

  // -------------------------------------------------------------
  // 4. Score vs Status Independence (Relevance Score Never Overrides Status)
  // -------------------------------------------------------------
  it("guarantees a high match score NEVER overrides failed mandatory criteria", () => {
    // High-scoring profile on location, financial need, enterprise type, but failing gender/category
    // Stand-Up India (SC002) is exclusively for SC, ST, or Women
    const maleGeneralProfile = {
      age: 35,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "General",
      income: 500000,
      financialRequirement: 2500000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isArtisan: false,
      isSafaiKaramchari: false,
      isDivyangjan: false,
    };

    const standUpIndia = SCHEMES.find((s) => s.id === "SC002");
    const scored = scoreScheme(standUpIndia, maleGeneralProfile);

    // Stand-Up India might get points for new manufacturing project, financial amount, etc.
    assert.ok(scored.score > 0, "Score calculation can yield non-zero relevance score");
    assert.equal(
      scored.eligibilityStatus,
      "Not Eligible",
      "High score must never override failed mandatory social category/gender requirement"
    );
    assert.ok(scored.failedCriteria.some((f) => f.label === "Social Category"));
  });

  // -------------------------------------------------------------
  // 5. matchSchemes Evaluates all 574 Schemes Deterministically
  // -------------------------------------------------------------
  it("matchSchemes evaluates all 574 schemes and returns partitioned results and status counts", () => {
    const profile = {
      age: 29,
      gender: "Female",
      state: "Uttar Pradesh",
      category: "SC",
      income: 180000,
      financialRequirement: 300000,
      education: "Graduate",
      occupation: "Self-Employed",
      hasBplCard: false,
      isTaxPayer: false,
    };

    const startTime = performance.now();
    const matches = matchSchemes(profile, SCHEMES);
    const duration = performance.now() - startTime;

    assert.equal(matches.length, 574, "matchSchemes must evaluate and return all 574 schemes");
    assert.ok(duration < 25, `Evaluation of 574 schemes took ${duration.toFixed(2)}ms, must be < 25ms`);

    let eligibleCount = 0;
    let potentialCount = 0;
    let notEligibleCount = 0;

    for (const m of matches) {
      assert.ok(["Eligible", "Potentially Eligible", "Not Eligible"].includes(m.eligibilityStatus));
      assert.ok(typeof m.score === "number" && m.score >= 0 && m.score <= 100);
      assert.ok(Array.isArray(m.passedCriteria));
      assert.ok(Array.isArray(m.failedCriteria));
      assert.ok(Array.isArray(m.missingInformation));
      assert.ok(Array.isArray(m.disqualifyingReasons));

      if (m.eligibilityStatus === "Eligible") eligibleCount++;
      else if (m.eligibilityStatus === "Potentially Eligible") potentialCount++;
      else notEligibleCount++;
    }

    assert.ok(eligibleCount > 0, "Must have eligible schemes for this profile");
    assert.ok(notEligibleCount > 0, "Must have not eligible schemes for this profile");
    assert.equal(eligibleCount + potentialCount + notEligibleCount, 574);
  });

  // -------------------------------------------------------------
  // 6. Database Persistence of Assessments
  // -------------------------------------------------------------
  it("persists assessment with rule_version, total_evaluated, and 3-status breakdown in SQLite", () => {
    const testUserId = "usr_test_audit_574";
    db.prepare("INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)").run(
      testUserId,
      "Audit Test Citizen",
      "audit574@citizen.gov.in",
      "citizen"
    );

    const saved = saveAssessment({
      userId: testUserId,
      profileSnapshot: { age: 30, state: "Bihar", income: 150000 },
      matchedSchemesCount: 42,
      topSchemeId: "SC001",
      topSchemeName: "PMEGP Prime Minister Employment Generation Programme",
      topScore: 92,
      resultsSummary: [{ schemeId: "SC001", score: 92, status: "Eligible" }],
      ruleVersion: "v2.0-deterministic-574",
      totalEvaluated: 574,
      eligibleCount: 42,
      potentiallyEligibleCount: 15,
      notEligibleCount: 517,
      criterionResults: { passed: 5, failed: 0, missing: 0 },
    });

    assert.ok(saved.id, "Assessment must have an ID");
    assert.equal(saved.ruleVersion, "v2.0-deterministic-574", "Rule version must be preserved");
    assert.equal(saved.totalEvaluated, 574, "Total evaluated must be 574");
    assert.equal(saved.eligibleCount, 42, "Eligible count must be 42");
    assert.equal(saved.potentiallyEligibleCount, 15, "Potentially eligible count must be 15");
    assert.equal(saved.notEligibleCount, 517, "Not eligible count must be 517");

    // Fetch user assessments
    const userAssessments = getUserAssessments(testUserId);
    assert.ok(userAssessments.length >= 1, "User assessments must retrieve saved assessment");
    const retrieved = userAssessments[0];
    assert.equal(retrieved.ruleVersion, "v2.0-deterministic-574");
    assert.equal(retrieved.totalEvaluated, 574);
  });

  // -------------------------------------------------------------
  // 7. Authorization & Data Isolation
  // -------------------------------------------------------------
  it("enforces tenant isolation so users cannot view other citizens' assessments", () => {
    const ownerUserId = "usr_owner_secure_1";
    const otherUserId = "usr_intruder_2";

    db.prepare("INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)").run(
      ownerUserId,
      "Owner Citizen",
      "owner@test.in",
      "citizen"
    );
    db.prepare("INSERT OR IGNORE INTO users (id, name, email, role) VALUES (?, ?, ?, ?)").run(
      otherUserId,
      "Intruder Citizen",
      "intruder@test.in",
      "citizen"
    );

    const assessment = saveAssessment({
      userId: ownerUserId,
      profileSnapshot: { age: 40, income: 200000 },
      matchedSchemesCount: 20,
      topSchemeId: "SC002",
      topSchemeName: "Stand-Up India Scheme",
      topScore: 88,
      ruleVersion: "v2.0-deterministic-574",
    });

    // Owner retrieval
    const ownerFetch = getAssessmentById(assessment.id, { userId: ownerUserId, role: "citizen" });
    assert.ok(ownerFetch, "Owner must be able to fetch their own assessment");
    assert.equal(ownerFetch.id, assessment.id);

    // Intruder retrieval
    const intruderFetch = getAssessmentById(assessment.id, { userId: otherUserId, role: "citizen" });
    assert.equal(intruderFetch, null, "Other citizen must receive null / access denied for foreign assessment");

    // Admin retrieval
    const adminFetch = getAssessmentById(assessment.id, { userId: "admin_user", role: "admin" });
    assert.ok(adminFetch, "Admin must be able to inspect any assessment for audit");
  });
});
