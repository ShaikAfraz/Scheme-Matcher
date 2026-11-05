/**
 * INGESTION DATA VALIDATOR & INTEGRITY ENGINE
 * Strict validation preventing corrupted data, invalid URLs, and script injections.
 */

export function validateIngestedScheme(scheme) {
  const errors = [];

  // 1. Identifier Validation
  if (!scheme.id || typeof scheme.id !== "string" || !scheme.id.trim()) {
    errors.push("Scheme ID is required");
  } else if (!/^[A-Za-z0-9_-]{3,80}$/.test(scheme.id.trim())) {
    errors.push(`Invalid scheme ID '${scheme.id}' (must be 3-80 alphanumeric characters, dashes, or underscores)`);
  }

  // 2. Name Validation
  if (!scheme.name || typeof scheme.name !== "string" || scheme.name.trim().length < 4) {
    errors.push("Scheme name must be at least 4 characters long");
  }

  // 3. Ministry / Implementing Department
  if (!scheme.ministry || typeof scheme.ministry !== "string" || !scheme.ministry.trim()) {
    errors.push("Ministry / Implementing agency is required");
  }

  // 4. Script & Injection Protection
  const checkInjection = (fieldVal, fieldName) => {
    if (typeof fieldVal === "string") {
      if (/<script|javascript:|data:text\/html|onload=|onerror=/i.test(fieldVal)) {
        errors.push(`Dangerous HTML or script tag detected in ${fieldName}: Potential script injection or malicious content`);
      }
    }
  };

  checkInjection(scheme.name, "name");
  checkInjection(scheme.description, "description");
  checkInjection(scheme.benefits, "benefits");
  checkInjection(scheme.portalUrl || scheme.portal_url || scheme.official_source_url, "portalUrl");

  // 5. URL Validation
  const url = scheme.portalUrl || scheme.portal_url || scheme.official_source_url;
  if (url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push(`Invalid portal URL: URL must use http or https protocol (got '${parsed.protocol}')`);
      }
    } catch {
      errors.push(`Malformed portal URL: URL must use http or https protocol (malformed '${url}')`);
    }
  }

  // 6. Age Boundaries
  const minAge = scheme.minAge != null ? scheme.minAge : scheme.min_age;
  const maxAge = scheme.maxAge != null ? scheme.maxAge : scheme.max_age;

  if (minAge != null && maxAge != null) {
    if (Number(minAge) > Number(maxAge)) {
      errors.push(`min_age (${minAge}) cannot exceed max_age (${maxAge})`);
    }
    if (Number(minAge) < 0 || Number(maxAge) > 120) {
      errors.push("Age requirements must be within realistic bounds (0-120)");
    }
  }

  // 7. Financial Requirement Boundaries
  if (scheme.minReq != null && scheme.maxReq != null) {
    if (Number(scheme.minReq) > Number(scheme.maxReq)) {
      errors.push(`Minimum financial requirement (${scheme.minReq}) cannot exceed maximum requirement (${scheme.maxReq})`);
    }
    if (Number(scheme.minReq) < 0 || Number(scheme.maxReq) < 0) {
      errors.push("Financial assistance amounts cannot be negative");
    }
  }

  // 8. Income Limits
  const incomeLimit = scheme.incomeLimit != null ? scheme.incomeLimit : scheme.income_limit;
  if (incomeLimit != null && Number(incomeLimit) < 0) {
    errors.push("Income ceiling cannot be negative");
  }

  // 9. Government Level
  const level = (scheme.governmentLevel || scheme.government_level || scheme.level || "central").toLowerCase();
  if (!["central", "state"].includes(level)) {
    errors.push(`Invalid government level: '${level}' (must be 'central' or 'state')`);
  }

  const isValid = errors.length === 0;
  return {
    valid: isValid,
    isValid,
    errors,
  };
}
