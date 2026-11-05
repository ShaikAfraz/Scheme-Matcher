/**
 * SCHEME DATA NORMALIZER
 * Standardizes heterogeneous source datasets into Scheme Matcher's canonical schema.
 *
 * CRITICAL RULE:
 * Never invent or fabricate missing eligibility criteria (age, income, category).
 * If eligibility criteria are unstructured prose, flag for review and preserve verbatim.
 */

import crypto from "crypto";

/**
 * Calculates a deterministic SHA-256 content hash of normalized scheme fields
 * for change detection and versioning.
 */
export function computeSchemeHash(scheme) {
  const minAge = scheme.minAge != null ? Number(scheme.minAge) : (scheme.min_age != null ? Number(scheme.min_age) : null);
  const maxAge = scheme.maxAge != null ? Number(scheme.maxAge) : (scheme.max_age != null ? Number(scheme.max_age) : null);
  const incomeLimit = scheme.incomeLimit != null ? Number(scheme.incomeLimit) : (scheme.income_limit != null ? Number(scheme.income_limit) : null);
  const minReq = scheme.minReq != null ? Number(scheme.minReq) : (scheme.min_req != null ? Number(scheme.min_req) : 0);
  const maxReq = scheme.maxReq != null ? Number(scheme.maxReq) : (scheme.max_req != null ? Number(scheme.max_req) : 0);

  const canonical = {
    name: (scheme.name || "").trim().toLowerCase(),
    ministry: (scheme.ministry || "").trim().toLowerCase(),
    level: (scheme.governmentLevel || scheme.government_level || scheme.level || "central").toLowerCase(),
    description: (scheme.description || "").trim(),
    categories: Array.isArray(scheme.categories) ? [...scheme.categories].sort() : [],
    minAge,
    maxAge,
    incomeLimit,
    states: Array.isArray(scheme.states) ? [...scheme.states].sort() : [],
    businessStatus: Array.isArray(scheme.businessStatus) ? [...scheme.businessStatus].sort() : [],
    businessTypes: Array.isArray(scheme.businessTypes) ? [...scheme.businessTypes].sort() : [],
    minReq,
    maxReq,
    benefits: (scheme.benefits || scheme.financialAssistance || scheme.financial_assistance || "").trim(),
    portalUrl: (scheme.portalUrl || scheme.portal_url || scheme.official_source_url || "").trim(),
  };

  return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/**
 * Normalizes an array or string of states
 */
function normalizeStates(rawStates) {
  if (!rawStates) return ["ALL"];
  if (Array.isArray(rawStates)) {
    const cleaned = rawStates.map((s) => String(s).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : ["ALL"];
  }
  if (typeof rawStates === "string") {
    const trimmed = rawStates.trim();
    if (!trimmed || trimmed.toUpperCase() === "ALL" || trimmed.toUpperCase() === "PAN INDIA" || trimmed.toUpperCase() === "CENTRAL") {
      return ["ALL"];
    }
    const split = trimmed.split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
    return split.length > 0 ? split : ["ALL"];
  }
  return ["ALL"];
}

/**
 * Normalizes categories
 */
function normalizeCategories(rawCategories) {
  if (!rawCategories) return ["ALL"];
  if (Array.isArray(rawCategories)) {
    const cleaned = rawCategories.map((c) => String(c).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : ["ALL"];
  }
  if (typeof rawCategories === "string") {
    const trimmed = rawCategories.trim();
    if (!trimmed || trimmed.toUpperCase() === "ALL") return ["ALL"];
    const split = trimmed.split(/[,;/|]/).map((c) => c.trim()).filter(Boolean);
    return split.length > 0 ? split : ["ALL"];
  }
  return ["ALL"];
}

/**
 * Normalizes business types and statuses
 */
function normalizeArrayField(val, defaultVal = ["ALL"]) {
  if (!val) return defaultVal;
  if (Array.isArray(val)) {
    const cleaned = val.map((x) => String(x).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : defaultVal;
  }
  if (typeof val === "string") {
    const split = val.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
    return split.length > 0 ? split : defaultVal;
  }
  return defaultVal;
}

/**
 * Normalizes an incoming raw scheme record from any authorized source
 */
export function normalizeSchemeRecord(raw, sourceMeta = {}) {
  const sourceId = typeof sourceMeta === "string" ? sourceMeta : (sourceMeta.sourceId || "src_unknown");
  const sourceType = typeof sourceMeta === "object" ? (sourceMeta.sourceType || "custom") : "custom";

  let id = raw.id || raw.code || raw.scheme_id || raw.scheme_code || raw.slug;
  if (!id) {
    // Generate stable ID from name and ministry
    const baseSlug = `${raw.ministry || raw.department || "GOV"}_${raw.name || raw.scheme_name || raw.title || "SCHEME"}`
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .replace(/_+/g, "_")
      .slice(0, 48);
    id = `SCH_SYNC_${baseSlug}`;
  }

  const name = (raw.name || raw.scheme_name || raw.title || raw.schemeName || "").trim();
  const ministry = (raw.ministry || raw.department || raw.implementing_agency || raw.nodalMinistry || "Government of India").trim();
  const description = (raw.description || raw.objective || raw.briefDescription || raw.details || raw.benefits || "").trim();
  const benefits = (raw.benefits || raw.financialAssistance || raw.financial_assistance || raw.assistance || description).trim();
  const portalUrl = (raw.portalUrl || raw.portal_url || raw.official_url || raw.application_url || raw.source_url || raw.url || "https://myscheme.gov.in").trim();
  const sourceUrl = (raw.source_url || raw.sourceUrl || portalUrl).trim();

  // Government level classification
  let governmentLevel = (raw.governmentLevel || raw.government_level || raw.level || "central").toLowerCase();
  if (governmentLevel !== "state" && governmentLevel !== "central") {
    governmentLevel = "central";
  }

  // Parse structured criteria if explicitly present (NEVER invent!)
  let minAge = raw.minAge != null ? Number(raw.minAge) : (raw.min_age != null ? Number(raw.min_age) : null);
  let maxAge = raw.maxAge != null ? Number(raw.maxAge) : (raw.max_age != null ? Number(raw.max_age) : null);
  let incomeLimit = raw.incomeLimit != null ? Number(raw.incomeLimit) : (raw.income_limit != null ? Number(raw.income_limit) : null);
  let minReq = raw.minReq != null ? Number(raw.minReq) : (raw.min_req != null ? Number(raw.min_req) : 0);
  let maxReq = raw.maxReq != null ? Number(raw.maxReq) : (raw.max_req != null ? Number(raw.max_req) : 0);

  if (isNaN(minAge)) minAge = null;
  if (isNaN(maxAge)) maxAge = null;
  if (isNaN(incomeLimit)) incomeLimit = null;
  if (isNaN(minReq)) minReq = 0;
  if (isNaN(maxReq)) maxReq = 0;

  // Detect if criteria are purely textual and unstructured
  const unstructuredNotes = [];
  const rawEligibilityText = (raw.eligibilityCriteria || raw.eligibility || raw.eligibility_text || raw.target_beneficiary || "").trim();

  let reviewStatus = "Source Imported";
  let criteriaCompleteness = "verified";

  if (rawEligibilityText) {
    unstructuredNotes.push(`Raw Eligibility Text: "${rawEligibilityText}"`);
    // If criteria text exists but no structured numbers were parsed, flag for review!
    if (minAge == null && maxAge == null && incomeLimit == null) {
      reviewStatus = "Needs Review";
      criteriaCompleteness = "requires_verification";
      unstructuredNotes.push("Structured age/income criteria require official gazette scrutiny");
    }
  } else if (minAge == null && maxAge == null && incomeLimit == null) {
    reviewStatus = "Needs Review";
    criteriaCompleteness = "requires_verification";
    unstructuredNotes.push("No explicit age or income thresholds defined in source payload");
  }

  const states = normalizeStates(raw.states || raw.applicable_states || raw.state);
  const categories = normalizeCategories(raw.categories || raw.target_categories || raw.caste_category);
  const businessStatus = normalizeArrayField(raw.businessStatus || raw.business_status);
  const businessTypes = normalizeArrayField(raw.businessTypes || raw.business_types || raw.sector);

  // Documents required
  let documents = ["Aadhaar Card", "Bank Account Details"];
  if (raw.documents) {
    if (Array.isArray(raw.documents)) {
      documents = raw.documents.map((d) => String(d).trim()).filter(Boolean);
    } else if (typeof raw.documents === "string") {
      documents = raw.documents.split(/[,;|]/).map((d) => d.trim()).filter(Boolean);
    }
  }

  // Application steps
  let applicationSteps = [
    "Online registration on official portal",
    "Verification of credentials & due diligence",
    "Sanction and direct benefit transfer",
  ];
  if (raw.applicationSteps || raw.application_steps || raw.process) {
    const stepsRaw = raw.applicationSteps || raw.application_steps || raw.process;
    if (Array.isArray(stepsRaw)) {
      applicationSteps = stepsRaw.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof stepsRaw === "string") {
      applicationSteps = stepsRaw.split(/[\n;]/).map((s) => s.trim()).filter(Boolean);
    }
  }

  const normalized = {
    id: String(id).trim(),
    name,
    ministry,
    governmentLevel,
    government_level: governmentLevel,
    description: description || benefits,
    categories,
    minAge,
    min_age: minAge,
    maxAge,
    max_age: maxAge,
    incomeLimit,
    income_limit: incomeLimit,
    states,
    businessStatus,
    businessTypes,
    minReq,
    maxReq,
    benefits: benefits || description,
    documents,
    applicationSteps,
    portalUrl,
    portal_url: portalUrl,
    sourceUrl,
    official_source_url: portalUrl,
    source: raw.source || (typeof sourceMeta === "object" ? sourceMeta.sourceName : null) || "Official Government Ingestion Pipeline",
    sourceId,
    verificationStatus: raw.verificationStatus || "verified",
    reviewStatus,
    review_status: reviewStatus,
    criteriaCompleteness,
    verificationNotes: unstructuredNotes.join(" | ") || (raw.verification_notes || null),
    lastVerifiedDate: new Date().toISOString().split("T")[0],
    isActive: raw.isActive !== undefined ? (raw.isActive ? 1 : 0) : 1,
  };

  // Attach content hash
  normalized.contentHash = computeSchemeHash(normalized);
  normalized.content_hash = normalized.contentHash;
  return normalized;
}

/**
 * Parses CSV text content into an array of objects
 */
export function parseCsvToObjects(csvContent) {
  if (!csvContent || typeof csvContent !== "string") return [];
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCsvLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length === 0) continue;
    const obj = {};
    for (let h = 0; h < headers.length; h++) {
      const key = headers[h].trim();
      obj[key] = values[h] !== undefined ? values[h].trim() : "";
    }
    rows.push(obj);
  }

  return rows;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
