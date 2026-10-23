/**
 * REPEATABLE SCHEME DATA IMPORT PIPELINE
 * Validates, deduplicates, and upserts genuine government schemes and scholarships
 * into SQLite database with full audit trail.
 */

import { db, recordAuditLog } from "../db.js";
import { validateScheme } from "./validator.js";

export function upsertScheme(scheme) {
  const validation = validateScheme(scheme);
  if (!validation.valid) {
    throw new Error(`Scheme validation failed for '${scheme.id}': ${validation.errors.join("; ")}`);
  }

  const stmt = db.prepare(`
    INSERT INTO schemes (
      id, name, ministry, government_level, description, categories,
      min_age, max_age, income_limit, states, business_status, business_types,
      min_req, max_req, benefits, documents, application_steps,
      portal_url, source, verification_status, last_verified_date
    ) VALUES (
      @id, @name, @ministry, @government_level, @description, @categories,
      @min_age, @max_age, @income_limit, @states, @business_status, @business_types,
      @min_req, @max_req, @benefits, @documents, @application_steps,
      @portal_url, @source, @verification_status, @last_verified_date
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      ministry = excluded.ministry,
      government_level = excluded.government_level,
      description = excluded.description,
      categories = excluded.categories,
      min_age = excluded.min_age,
      max_age = excluded.max_age,
      income_limit = excluded.income_limit,
      states = excluded.states,
      business_status = excluded.business_status,
      business_types = excluded.business_types,
      min_req = excluded.min_req,
      max_req = excluded.max_req,
      benefits = excluded.benefits,
      documents = excluded.documents,
      application_steps = excluded.application_steps,
      portal_url = excluded.portal_url,
      source = excluded.source,
      verification_status = excluded.verification_status,
      last_verified_date = excluded.last_verified_date
  `);

  const params = {
    id: scheme.id,
    name: scheme.name,
    ministry: scheme.ministry || "Government of India",
    government_level: scheme.governmentLevel || scheme.government_level || "central",
    description: scheme.description || scheme.benefits,
    categories: JSON.stringify(scheme.categories || ["ALL"]),
    min_age: scheme.minAge != null ? Number(scheme.minAge) : null,
    max_age: scheme.maxAge != null ? Number(scheme.maxAge) : null,
    income_limit: scheme.incomeLimit != null ? Number(scheme.incomeLimit) : null,
    states: JSON.stringify(scheme.states || ["ALL"]),
    business_status: JSON.stringify(scheme.businessStatus || ["ALL"]),
    business_types: JSON.stringify(scheme.businessTypes || ["ALL"]),
    min_req: scheme.minReq != null ? Number(scheme.minReq) : 0,
    max_req: scheme.maxReq != null ? Number(scheme.maxReq) : 0,
    benefits: scheme.benefits,
    documents: JSON.stringify(scheme.documents || ["Aadhaar Card", "Bank Account Details"]),
    application_steps: JSON.stringify(scheme.applicationSteps || ["Online registration on official portal", "Verification of credentials", "Sanction and direct benefit transfer"]),
    portal_url: scheme.portalUrl || scheme.portal_url || "https://myscheme.gov.in",
    source: scheme.source || "myScheme.gov.in / Official Ministry Portal",
    verification_status: scheme.verificationStatus || scheme.verification_status || "verified",
    last_verified_date: scheme.lastVerifiedDate || scheme.last_verified_date || "2026-10-23",
  };

  stmt.run(params);
  return scheme.id;
}

export function importSchemeBatch(schemes, { batchName = "Scheme Batch", actorId = "system_pipeline" } = {}) {
  let imported = 0;
  let skipped = 0;
  const errors = [];

  const importTx = db.transaction((items) => {
    for (const scheme of items) {
      try {
        upsertScheme(scheme);
        imported++;
      } catch (err) {
        skipped++;
        errors.push({ id: scheme?.id, error: err.message });
      }
    }
  });

  importTx(schemes);

  recordAuditLog({
    userId: actorId,
    action: "SCHEMES_BATCH_IMPORT",
    resourceType: "schemes",
    resourceId: batchName,
    details: {
      total: schemes.length,
      imported,
      skipped,
      errors: errors.slice(0, 10),
    },
  });

  return {
    batchName,
    total: schemes.length,
    imported,
    skipped,
    errors,
  };
}
