import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { scoreScheme, matchSchemes, formatINR } from "../src/engine/matcher.js";
import { SCHEMES } from "../src/data/schemes.js";

describe("Deterministic Scheme Matching Engine", () => {
  it("should format INR numbers according to Indian numbering standards", () => {
    assert.equal(formatINR(1000), "1,000");
    assert.equal(formatINR(100000), "1,00,000");
    assert.equal(formatINR(10000000), "1,00,00,000");
  });

  it("should award category, income, age, location, business, and financial score for an eligible profile", () => {
    const artisanProfile = {
      age: 38,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "SC",
      income: 180000,
      financialRequirement: 250000,
      businessStatus: "existing",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: true,
      isTransgender: false,
      isDnt: false,
    };

    const vishwakarmaScheme = SCHEMES.find((s) => s.id === "SC016" || s.name.includes("Vishwakarma"));
    assert.ok(vishwakarmaScheme, "Vishwakarma scheme must exist in dataset");


    const result = scoreScheme(artisanProfile, vishwakarmaScheme);
    assert.ok(result.score >= 80, `Artisan should score high on Vishwakarma scheme, got ${result.score}`);
    assert.ok(result.reasons.green.length > 0, "Should have eligibility reasons");
    assert.equal(result.reasons.red.length, 0, "Should have 0 disqualifying reasons");
  });

  it("should penalize schemes where beneficiary exceeds income ceiling", () => {
    const highIncomeProfile = {
      age: 30,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "General",
      income: 1500000, // 15 Lakhs
      financialRequirement: 200000,
      businessStatus: "new",
      businessType: "Services",
    };

    // Scheme with income limit of 300000 (e.g. NSFDC or similar)
    const incomeLimitedScheme = SCHEMES.find((s) => s.incomeLimit && s.incomeLimit < 1000000);
    if (incomeLimitedScheme) {
      const result = scoreScheme(highIncomeProfile, incomeLimitedScheme);
      assert.ok(
        result.reasons.red.some((r) => r.includes("Income exceeds")),
        "Must flag income exceeding ceiling in red reasons"
      );
    }
  });

  it("should penalize schemes where beneficiary age is out of eligibility bounds", () => {
    const underageProfile = {
      age: 15,
      gender: "Male",
      state: "Uttar Pradesh",
      category: "SC",
      income: 100000,
      financialRequirement: 100000,
      businessStatus: "new",
      businessType: "Manufacturing",
    };

    const adultScheme = SCHEMES.find((s) => s.minAge >= 18);
    assert.ok(adultScheme);

    const result = scoreScheme(underageProfile, adultScheme);
    assert.ok(
      result.reasons.red.some((r) => r.includes("Age (15) is outside")),
      "Must flag age outside range"
    );
  });

  it("should return sorted schemes in descending order of match suitability score", () => {
    const profile = {
      age: 28,
      gender: "Female",
      state: "Bihar",
      category: "SC",
      income: 120000,
      financialRequirement: 200000,
      businessStatus: "new",
      businessType: "Manufacturing",
      isSafaiKaramchari: false,
      isDivyangjan: false,
      isArtisan: false,
      isTransgender: false,
      isDnt: false,
    };

    const matches = matchSchemes(profile);
    assert.ok(matches.length > 0, "Must return matched schemes");

    for (let i = 1; i < matches.length; i++) {
      assert.ok(
        matches[i - 1].score >= matches[i].score,
        `Matches must be sorted descending: ${matches[i - 1].score} vs ${matches[i].score}`
      );
    }
  });
});
