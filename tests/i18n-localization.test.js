import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TRANSLATIONS, getTranslation } from "../src/theme/i18n.js";

describe("i18n Multilingual Localization Suite", () => {
  const supportedLanguages = ["en", "hi", "ta", "te", "kn"];

  it("should support all 5 official platform languages (English, Hindi, Tamil, Telugu, Kannada)", () => {
    for (const lang of supportedLanguages) {
      assert.ok(TRANSLATIONS[lang], `TRANSLATIONS must have entry for language code '${lang}'`);
      assert.ok(TRANSLATIONS[lang].langName, `'${lang}' must have a native langName`);
      assert.ok(TRANSLATIONS[lang].appName, `'${lang}' must have localized appName`);
      assert.ok(TRANSLATIONS[lang].appSubtitle, `'${lang}' must have localized appSubtitle`);
    }
  });

  it("should have complete navigation tokens for all screens across all 5 languages", () => {
    const requiredNavKeys = [
      "navHome",
      "navProfile",
      "navResults",
      "navTracker",
      "navDocuments",
      "navAssistant",
      "navDashboard",
    ];

    for (const lang of supportedLanguages) {
      for (const key of requiredNavKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' navigation translations`
        );
        assert.ok(
          TRANSLATIONS[lang][key].trim().length > 0,
          `'${key}' in '${lang}' should not be empty`
        );
      }
    }
  });

  it("should have complete profile form tokens across all 5 languages", () => {
    const profileKeys = [
      "profileTitle",
      "profileSubtitle",
      "ageLabel",
      "genderLabel",
      "stateLabel",
      "categoryLabel",
      "incomeLabel",
      "fundingLabel",
      "matchBtn",
    ];

    for (const lang of supportedLanguages) {
      for (const key of profileKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' profile translations`
        );
      }
    }
  });

  it("should have complete scheme directory and filter tokens across all 5 languages", () => {
    const resultsKeys = [
      "resultsTitle",
      "resultsSubtitle",
      "searchPlaceholder",
      "allSchemes",
      "centralGov",
      "stateGov",
      "filterEligible",
      "filterPotential",
      "filterNotEligible",
      "filterTierAll",
      "filterExcellent",
      "filterStrong",
      "filterModerate",
      "filterLow",
      "filterWeak",
      "bookmarkedOnly",
      "noSchemesFound",
      "resetFilters",
      "detailsAndApply",
      "officialPortal",
    ];

    for (const lang of supportedLanguages) {
      for (const key of resultsKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' results translations`
        );
      }
    }
  });

  it("should have complete application tracker tokens across all 5 languages", () => {
    const trackerKeys = [
      "trackerTitle",
      "trackerSubtitle",
      "activeApplications",
      "sanctionedDisbursed",
      "totalCapitalApplied",
      "estimatedGovtSubsidy",
      "searchApplications",
      "tabAllApps",
      "tabInReview",
      "tabSanctioned",
      "tabDisbursed",
      "tabWithdrawn",
      "noAppsSubmitted",
      "browseMatchedSchemes",
      "publicInquiryTitle",
      "trackAppBtn",
    ];

    for (const lang of supportedLanguages) {
      for (const key of trackerKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' tracker translations`
        );
      }
    }
  });

  it("should have complete document vault and assistant tokens across all 5 languages", () => {
    const docAndAiKeys = [
      "documentsMainTitle",
      "documentsMainSubtitle",
      "generateDossierBtn",
      "uploadCertificates",
      "dragDropNotice",
      "supportedFormats",
      "assistantTitle",
      "assistantSubtitle",
      "proxyActive",
      "askPlaceholder",
      "send",
    ];

    for (const lang of supportedLanguages) {
      for (const key of docAndAiKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' document/assistant translations`
        );
      }
    }
  });

  it("should have complete footer tokens across all 5 languages", () => {
    const footerKeys = [
      "footerMission",
      "footerAcademic",
      "footerPortals",
      "footerHelpline",
      "footerCopyright",
    ];

    for (const lang of supportedLanguages) {
      for (const key of footerKeys) {
        assert.ok(
          TRANSLATIONS[lang][key],
          `Missing '${key}' in '${lang}' footer translations`
        );
      }
    }
  });

  it("should correctly fallback when using getTranslation()", () => {
    // Exact key in Hindi
    assert.strictEqual(getTranslation("hi", "appName"), "योजना साथी");
    // Fallback to English if key missing in language
    assert.strictEqual(getTranslation("hi", "englishOnlyKeyNonExistent", "FallbackVal"), "FallbackVal");
    // Default to English if language unsupported
    assert.strictEqual(getTranslation("fr", "appName"), "Scheme Matcher");
  });
});
