import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { initDatabase, db, getSystemStats } from "../server/db.js";
import { SCHEMES, BASELINE_SCHEMES } from "../src/data/schemes.js";
import { scoreScheme, matchSchemes } from "../src/engine/matcher.js";
import { validateScheme } from "../server/pipeline/validator.js";

describe("Scheme Database Expansion & Quality Assurance Suite", () => {
  // Ensure DB is initialized
  initDatabase();

  it("should contain 500+ verified schemes in SQLite database and in-memory export", () => {
    const dbCountRow = db.prepare("SELECT COUNT(*) AS total FROM schemes").get();
    assert.ok(
      dbCountRow.total >= 500,
      `SQLite database must contain >= 500 schemes, currently has ${dbCountRow.total}`
    );
    assert.equal(dbCountRow.total, 574, "Expected exactly 574 schemes in SQLite database");

    assert.ok(
      SCHEMES.length >= 500,
      `In-memory SCHEMES export must contain >= 500 schemes, currently has ${SCHEMES.length}`
    );
    assert.equal(SCHEMES.length, 574, "Expected exactly 574 schemes in in-memory export");
  });

  it("should maintain authentic distribution between Central and State schemes", () => {
    const centralRow = db
      .prepare("SELECT COUNT(*) AS total FROM schemes WHERE government_level = 'central'")
      .get();
    const stateRow = db
      .prepare("SELECT COUNT(*) AS total FROM schemes WHERE government_level = 'state'")
      .get();

    assert.ok(
      centralRow.total >= 150,
      `Central schemes must be >= 150, got ${centralRow.total}`
    );
    assert.ok(
      stateRow.total >= 250,
      `State schemes must be >= 250, got ${stateRow.total}`
    );
    assert.equal(centralRow.total + stateRow.total, 574, "Central + State schemes must sum to 574");
  });

  it("should guarantee zero duplicate scheme IDs and zero duplicate scheme names", () => {
    const idSet = new Set();
    const nameSet = new Set();
    const duplicateIds = [];
    const duplicateNames = [];

    for (const scheme of SCHEMES) {
      if (idSet.has(scheme.id)) {
        duplicateIds.push(scheme.id);
      }
      idSet.add(scheme.id);

      const normName = scheme.name.trim().toLowerCase();
      if (nameSet.has(normName)) {
        duplicateNames.push(scheme.name);
      }
      nameSet.add(normName);
    }

    assert.deepEqual(
      duplicateIds,
      [],
      `Duplicate scheme IDs detected: ${duplicateIds.join(", ")}`
    );
    assert.deepEqual(
      duplicateNames,
      [],
      `Duplicate scheme names detected: ${duplicateNames.join(", ")}`
    );
  });

  it("should ensure 100% of schemes have valid official URLs and source citations", () => {
    let invalidUrls = 0;
    let invalidSources = 0;

    for (const scheme of SCHEMES) {
      const url = scheme.portalUrl || scheme.source_url || scheme.portal_url;
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
        invalidUrls++;
      }

      const source = scheme.source;
      if (!source || typeof source !== "string" || source.trim().length < 3) {
        invalidSources++;
      }
    }

    assert.equal(invalidUrls, 0, "All 574 schemes must have valid http(s) portal URLs");
    assert.equal(invalidSources, 0, "All 574 schemes must have official source citations");

    // Also assert SQLite columns
    const unverifiedRow = db
      .prepare(
        "SELECT COUNT(*) AS total FROM schemes WHERE verification_status != 'verified' OR portal_url IS NULL"
      )
      .get();
    assert.equal(
      unverifiedRow.total,
      0,
      "Every scheme in SQLite must have verification_status = 'verified' and non-null portal_url"
    );
  });

  it("should preserve all 19 baseline schemes (SC001 to SC019) with original IDs intact", () => {
    assert.equal(BASELINE_SCHEMES.length, 19, "Baseline schemes count must be exactly 19");

    for (let i = 1; i <= 19; i++) {
      const id = `SC${String(i).padStart(3, "0")}`;
      const memoryScheme = SCHEMES.find((s) => s.id === id);
      assert.ok(memoryScheme, `Baseline scheme ${id} must exist in SCHEMES export`);

      const dbScheme = db.prepare("SELECT * FROM schemes WHERE id = ?").get(id);
      assert.ok(dbScheme, `Baseline scheme ${id} must exist in SQLite database`);
    }

    // Check specific baseline names
    const pmegp = SCHEMES.find((s) => s.id === "SC001");
    assert.ok(pmegp.name.includes("PMEGP"), "SC001 must be PMEGP");

    const standup = SCHEMES.find((s) => s.id === "SC002");
    assert.ok(standup.name.includes("Stand-Up India"), "SC002 must be Stand-Up India");

    const vishwakarma = SCHEMES.find((s) => s.id === "SC016");
    assert.ok(vishwakarma.name.includes("Vishwakarma"), "SC016 must be PM Vishwakarma");
  });

  it("should evaluate 574 schemes in under 15ms without memory leaks or errors", () => {
    const testProfile = {
      age: 26,
      gender: "Female",
      state: "Karnataka",
      category: "OBC",
      income: 180000,
      financialRequirement: 100000,
      businessStatus: "new",
      businessType: "Services",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };

    // JIT warm-up pass
    matchSchemes(testProfile);

    const startTime = performance.now();
    const matches = matchSchemes(testProfile);
    const duration = performance.now() - startTime;

    assert.equal(matches.length, 574, "Matching engine must evaluate all 574 schemes");
    assert.ok(
      duration < 15,
      `Engine evaluated 574 schemes in ${duration.toFixed(2)}ms (target: < 15ms)`
    );

    // Verify sorted descending by compatibility score
    for (let i = 0; i < matches.length - 1; i++) {
      assert.ok(
        matches[i].score >= matches[i + 1].score,
        `Matches must be sorted descending: index ${i} score ${matches[i].score} < index ${i + 1} score ${matches[i + 1].score}`
      );
    }
  });

  it("should handle missing profile criteria gracefully with informative yellow reasons", () => {
    // Citizen with completely empty criteria (unspecified income, age, state)
    const incompleteProfile = {
      age: "",
      gender: "",
      state: "",
      category: "",
      income: "",
      financialRequirement: "",
      businessStatus: "",
      businessType: "",
    };

    const matches = matchSchemes(incompleteProfile);
    assert.equal(matches.length, 574, "Should evaluate all 574 schemes even with blank profile");

    // Must not crash and should produce informative neutral yellow explanation reasons
    let yellowReasonCount = 0;
    for (const m of matches) {
      if (m.reasons.yellow && m.reasons.yellow.length > 0) {
        yellowReasonCount++;
      }
    }
    assert.ok(
      yellowReasonCount > 0,
      "Incomplete profile must produce informative neutral explanation reasons"
    );
  });

  it("should validate all 574 schemes successfully against validation pipeline rules", () => {
    for (const scheme of SCHEMES) {
      const { valid, errors } = validateScheme(scheme);
      assert.deepEqual(
        errors,
        [],
        `Scheme ${scheme.id} (${scheme.name}) failed validation: ${errors.join("; ")}`
      );
      assert.equal(valid, true, `Scheme ${scheme.id} must be valid`);
    }
  });
});
