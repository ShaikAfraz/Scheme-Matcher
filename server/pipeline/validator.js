/**
 * SCHEME DATA VALIDATION & INTEGRITY MODULE
 * Validates genuine government scheme records against official criteria
 * and prevents duplicates, invalid URLs, and corrupt data.
 */

export function validateScheme(scheme) {
  const errors = [];

  // 1. Identifier Validation
  if (!scheme.id || typeof scheme.id !== "string" || !scheme.id.trim()) {
    errors.push("Missing or invalid scheme ID");
  } else if (!/^[A-Za-z0-9_-]{3,64}$/.test(scheme.id)) {
    errors.push(`Scheme ID '${scheme.id}' contains invalid characters (must be alphanumeric/dashes/underscores)`);
  }

  // 2. Name Validation
  if (!scheme.name || typeof scheme.name !== "string" || scheme.name.trim().length < 5) {
    errors.push("Scheme name must be at least 5 characters long");
  }

  // 3. Ministry / Implementing Authority
  if (!scheme.ministry || typeof scheme.ministry !== "string" || !scheme.ministry.trim()) {
    errors.push("Ministry / Implementing department is required");
  }

  // 4. Government Level
  const level = (scheme.governmentLevel || scheme.government_level || "central").toLowerCase();
  if (!["central", "state"].includes(level)) {
    errors.push(`Invalid government level: '${level}' (must be 'central' or 'state')`);
  }

  // 5. States
  const states = scheme.states || ["ALL"];
  if (!Array.isArray(states) || states.length === 0) {
    errors.push("States must be a non-empty array (e.g. ['ALL'] or specific states)");
  }

  // 6. Target Categories
  const categories = scheme.categories || ["ALL"];
  if (!Array.isArray(categories) || categories.length === 0) {
    errors.push("Categories must be a non-empty array of target groups");
  }

  // 7. Age Boundaries
  if (scheme.minAge != null && scheme.maxAge != null) {
    if (Number(scheme.minAge) > Number(scheme.maxAge)) {
      errors.push(`minAge (${scheme.minAge}) cannot exceed maxAge (${scheme.maxAge})`);
    }
  }

  // 8. Financial Requirement Boundaries
  if (scheme.minReq != null && scheme.maxReq != null) {
    if (Number(scheme.minReq) > Number(scheme.maxReq)) {
      errors.push(`minReq (${scheme.minReq}) cannot exceed maxReq (${scheme.maxReq})`);
    }
  }

  // 9. Benefits Description
  if (!scheme.benefits || typeof scheme.benefits !== "string" || scheme.benefits.trim().length < 10) {
    errors.push("Scheme must provide a clear description of official financial benefits (min 10 chars)");
  }

  // 10. Official Portal URL
  const url = scheme.portalUrl || scheme.portal_url || scheme.source_url;
  if (url) {
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        errors.push(`Invalid URL protocol: '${parsed.protocol}'`);
      }
    } catch {
      errors.push(`Malformed official portal URL: '${url}'`);
    }
  }

  // 11. Verification Status
  const status = scheme.verificationStatus || scheme.verification_status || "verified";
  if (!["verified", "active", "pending_verification", "discontinued"].includes(status)) {
    errors.push(`Invalid verification status: '${status}'`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBatch(schemes) {
  const seenIds = new Set();
  const seenNames = new Set();
  const results = {
    total: schemes.length,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    errors: [],
  };

  for (let i = 0; i < schemes.length; i++) {
    const s = schemes[i];
    const validation = validateScheme(s);

    if (!validation.valid) {
      results.invalid++;
      results.errors.push({ index: i, id: s.id, name: s.name, errors: validation.errors });
      continue;
    }

    // Check ID uniqueness
    if (seenIds.has(s.id)) {
      results.duplicates++;
      results.errors.push({ index: i, id: s.id, name: s.name, errors: [`Duplicate scheme ID: '${s.id}'`] });
      continue;
    }
    seenIds.add(s.id);

    // Check duplicate name
    const cleanName = s.name.trim().toLowerCase();
    if (seenNames.has(cleanName)) {
      results.duplicates++;
      results.errors.push({ index: i, id: s.id, name: s.name, errors: [`Duplicate scheme name: '${s.name}'`] });
      continue;
    }
    seenNames.add(cleanName);

    results.valid++;
  }

  return results;
}
