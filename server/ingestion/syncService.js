/**
 * SCHEME SYNCHRONIZATION SERVICE
 * Orchestrates fetch, normalization, validation, change detection, staging review,
 * atomic database upserts, versioning, and sync run auditing.
 */

import { db, recordAuditLog } from "../db.js";
import { normalizeSchemeRecord, parseCsvToObjects, computeSchemeHash } from "./normalizer.js";
import { validateIngestedScheme } from "./validator.js";
import { MySchemeApiAdapter, DataGovInAdapter } from "./fetcher.js";

// Global in-memory lock to prevent concurrent overlapping synchronization jobs
let isSyncActive = false;
let activeRunId = null;

export function isSyncRunning() {
  return isSyncActive;
}

// Rate limiting state for manual sync
let lastManualSyncTime = 0;
const MANUAL_SYNC_COOLDOWN_MS = 5000; // 5-second minimum cooldown between manual syncs

function resolveValidUserId(actorId) {
  if (!actorId) return null;
  try {
    const user = db.prepare("SELECT id FROM users WHERE id = ? OR email = ?").get(actorId, actorId);
    return user ? user.id : null;
  } catch {
    return null;
  }
}

/**
 * Returns current sync status and system health
 */
export function getSyncStatus() {
  const lastRun = db
    .prepare("SELECT * FROM scheme_sync_runs ORDER BY started_at DESC LIMIT 1")
    .get();

  const sources = db.prepare("SELECT * FROM scheme_sources WHERE is_active = 1").all();
  const pendingReviewCount = db
    .prepare("SELECT count(*) as count FROM scheme_sync_items WHERE status = 'staged'")
    .get().count;

  return {
    isRunning: isSyncActive,
    activeRunId,
    lastRun: lastRun
      ? {
          id: lastRun.id,
          sourceId: lastRun.source_id,
          triggerType: lastRun.trigger_type,
          status: lastRun.status,
          totalRetrieved: lastRun.total_retrieved,
          newDetected: lastRun.new_detected,
          updatedDetected: lastRun.updated_detected,
          duplicateCount: lastRun.duplicate_count,
          failedCount: lastRun.failed_count,
          needsReviewCount: lastRun.needs_review_count,
          startedAt: lastRun.started_at,
          completedAt: lastRun.completed_at,
        }
      : null,
    pendingReviewCount,
    sourcesCount: sources.length,
  };
}

/**
 * Fetches paginated history of synchronization runs
 */
export function getSyncRuns({ limit = 15, offset = 0 } = {}) {
  const runs = db
    .prepare(
      `SELECT r.*, s.name as source_name 
       FROM scheme_sync_runs r 
       LEFT JOIN scheme_sources s ON r.source_id = s.id 
       ORDER BY r.started_at DESC LIMIT ? OFFSET ?`
    )
    .all(limit, offset);

  const total = db.prepare("SELECT count(*) as count FROM scheme_sync_runs").get().count;
  return { runs, total, limit, offset };
}

/**
 * Fetches details of a specific sync run including staged items and logs
 */
export function getSyncRunDetails(runId) {
  const run = db
    .prepare(
      `SELECT r.*, s.name as source_name 
       FROM scheme_sync_runs r 
       LEFT JOIN scheme_sources s ON r.source_id = s.id 
       WHERE r.id = ?`
    )
    .get(runId);

  if (!run) return null;

  const items = db
    .prepare("SELECT * FROM scheme_sync_items WHERE run_id = ? ORDER BY created_at ASC")
    .all(runId);

  let logs = [];
  try {
    logs = run.log_json ? JSON.parse(run.log_json) : [];
  } catch {}

  return {
    ...run,
    logs,
    items: items.map((it) => {
      let normalized = {};
      try {
        normalized = JSON.parse(it.normalized_data);
      } catch {}
      return {
        ...it,
        normalized,
      };
    }),
  };
}

/**
 * Fetches staged items in the review queue
 */
export function getReviewQueue({
  status = "staged",
  reviewStatus = "all",
  changeType = "all",
  runId = null,
  search = "",
  limit = 50,
  offset = 0,
} = {}) {
  let query = "SELECT * FROM scheme_sync_items WHERE 1=1";
  const params = [];

  if (status !== "all") {
    query += " AND status = ?";
    params.push(status);
  }

  if (reviewStatus !== "all") {
    query += " AND review_status = ?";
    params.push(reviewStatus);
  }

  if (changeType !== "all") {
    query += " AND change_type = ?";
    params.push(changeType);
  }

  if (runId) {
    query += " AND run_id = ?";
    params.push(runId);
  }

  if (search && search.trim()) {
    query += " AND (scheme_id LIKE ? OR scheme_name LIKE ?)";
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const items = db.prepare(query).all(...params);

  let countQuery = "SELECT count(*) as count FROM scheme_sync_items WHERE 1=1";
  const countParams = [];
  if (status !== "all") {
    countQuery += " AND status = ?";
    countParams.push(status);
  }
  if (reviewStatus !== "all") {
    countQuery += " AND review_status = ?";
    countParams.push(reviewStatus);
  }
  if (changeType !== "all") {
    countQuery += " AND change_type = ?";
    countParams.push(changeType);
  }
  if (runId) {
    countQuery += " AND run_id = ?";
    countParams.push(runId);
  }
  if (search && search.trim()) {
    countQuery += " AND (scheme_id LIKE ? OR scheme_name LIKE ?)";
    countParams.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  const total = db.prepare(countQuery).get(...countParams).count;

  return {
    items: items.map((it) => {
      let normalized = {};
      let raw = null;
      let errors = [];
      try {
        normalized = JSON.parse(it.normalized_data);
      } catch {}
      try {
        raw = it.raw_data ? JSON.parse(it.raw_data) : null;
      } catch {}
      try {
        errors = it.validation_errors ? JSON.parse(it.validation_errors) : [];
      } catch {}
      return {
        ...it,
        normalized,
        raw,
        validationErrors: errors,
      };
    }),
    total,
    limit,
    offset,
  };
}

/**
 * Executes a synchronization run
 */
export async function runSync({
  sourceId = "src_myscheme_api",
  triggerType = "manual",
  actorId = "system_scheduler",
  rawFileContent = null,
  fileFormat = "json",
  fileType = "json",
  fileName = null,
  options = {},
  autoApproveVerified = false,
} = {}) {
  // Prevent overlapping sync executions
  if (isSyncActive) {
    throw new Error("A synchronization task is already in progress. Please wait for it to complete.");
  }

  // Rate limiting for manual triggers
  if (triggerType === "manual" && !options?.bypassCooldown) {
    const now = Date.now();
    if (now - lastManualSyncTime < MANUAL_SYNC_COOLDOWN_MS) {
      throw new Error(`Sync rate limit: Please wait ${Math.ceil((MANUAL_SYNC_COOLDOWN_MS - (now - lastManualSyncTime)) / 1000)}s before triggering another sync.`);
    }
    lastManualSyncTime = now;
  }

  isSyncActive = true;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  activeRunId = runId;

  const logs = [];
  const log = (msg, level = "info") => {
    logs.push({ timestamp: new Date().toISOString(), level, message: msg });
  };

  log(`Starting synchronization run ${runId} (Source: ${sourceId}, Trigger: ${triggerType})`);

  // Ensure source exists in DB
  const source = db.prepare("SELECT * FROM scheme_sources WHERE id = ?").get(sourceId);
  if (!source && sourceId !== "src_file_dataset") {
    isSyncActive = false;
    activeRunId = null;
    throw new Error(`Configured data source '${sourceId}' not found in registry.`);
  }

  // Create sync run record
  db.prepare(`
    INSERT INTO scheme_sync_runs (
      id, source_id, trigger_type, status, started_at, created_by, log_json
    ) VALUES (?, ?, ?, 'running', CURRENT_TIMESTAMP, ?, ?)
  `).run(runId, sourceId, triggerType, actorId, JSON.stringify(logs));

  let totalRetrieved = 0;
  let newDetected = 0;
  let updatedDetected = 0;
  let duplicateCount = 0;
  let failedCount = 0;
  let needsReviewCount = 0;

  try {
    let rawRecords = [];

    // 1. Fetch data based on source type
    if (rawFileContent) {
      log(`Parsing uploaded machine-readable dataset (${fileType.toUpperCase()})`);
      if (fileType === "csv") {
        rawRecords = parseCsvToObjects(rawFileContent);
      } else {
        const parsed = JSON.parse(rawFileContent);
        rawRecords = Array.isArray(parsed) ? parsed : Array.isArray(parsed.schemes) ? parsed.schemes : Array.isArray(parsed.data) ? parsed.data : [parsed];
      }
      log(`Extracted ${rawRecords.length} records from uploaded file`);
    } else if (source?.source_type === "api_setu") {
      log("Connecting to myScheme API via API Setu adapter...");
      const adapter = new MySchemeApiAdapter({ endpointUrl: source.endpoint_url });
      const result = await adapter.fetchSchemes({ limit: 50 });
      rawRecords = result.records;
      log(`Retrieved ${rawRecords.length} schemes from API Setu endpoint`);
    } else if (source?.source_type === "data_gov") {
      log("Connecting to Open Government Data platform (data.gov.in)...");
      const adapter = new DataGovInAdapter({ endpointUrl: source.endpoint_url });
      const result = await adapter.fetchSchemes({ limit: 50 });
      rawRecords = result.records;
      log(`Retrieved ${rawRecords.length} records from data.gov.in`);
    } else {
      throw new Error(`Unsupported source type or missing dataset for '${sourceId}'`);
    }

    totalRetrieved = rawRecords.length;

    // 2. Process each raw record within staging transaction
    const stageItemsTx = db.transaction((records) => {
      const insertItemStmt = db.prepare(`
        INSERT INTO scheme_sync_items (
          id, run_id, source_id, source_record_id, scheme_id, scheme_name,
          change_type, content_hash, raw_data, normalized_data, status,
          review_status, validation_errors
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?
        )
      `);

      for (let i = 0; i < records.length; i++) {
        const raw = records[i];
        const itemId = `item_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

        try {
          // Normalize
          const normalized = normalizeSchemeRecord(raw, {
            sourceId,
            sourceName: source?.name || "Dataset File Import",
            sourceType: source?.source_type || "file_upload",
          });

          // Validate
          const validation = validateIngestedScheme(normalized);
          if (!validation.valid) {
            failedCount++;
            insertItemStmt.run(
              itemId,
              runId,
              sourceId,
              raw.id || raw.code || null,
              normalized.id,
              normalized.name || "Untitled Scheme",
              "invalid",
              normalized.contentHash,
              JSON.stringify(raw),
              JSON.stringify(normalized),
              "failed",
              "Needs Review",
              JSON.stringify(validation.errors)
            );
            log(`Validation error for record '${normalized.id}': ${validation.errors.join("; ")}`, "warn");
            continue;
          }

          // Change & Duplicate Detection against existing DB
          const existingScheme = db
            .prepare("SELECT * FROM schemes WHERE id = ?")
            .get(normalized.id);

          let changeType = "new";
          if (existingScheme) {
            const existingHash = existingScheme.content_hash || computeSchemeHash({
              ...existingScheme,
              categories: JSON.parse(existingScheme.categories || "[]"),
              states: JSON.parse(existingScheme.states || "[]"),
              businessStatus: JSON.parse(existingScheme.business_status || "[]"),
              businessTypes: JSON.parse(existingScheme.business_types || "[]"),
            });

            if (existingHash === normalized.contentHash) {
              changeType = "unchanged";
              duplicateCount++;
            } else {
              changeType = "update";
              updatedDetected++;
            }
          } else {
            newDetected++;
          }

          if (normalized.reviewStatus === "Needs Review") {
            needsReviewCount++;
          }

          let itemStatus = "staged";
          if (changeType === "unchanged") {
            itemStatus = "duplicate";
          } else if (autoApproveVerified && changeType !== "invalid") {
            itemStatus = "applied";
          }

          // Stage item in review queue
          insertItemStmt.run(
            itemId,
            runId,
            sourceId,
            raw.id || raw.code || null,
            normalized.id,
            normalized.name,
            changeType,
            normalized.contentHash,
            JSON.stringify(raw),
            JSON.stringify(normalized),
            itemStatus,
            normalized.reviewStatus,
            JSON.stringify(validation.errors)
          );

          // If autoApproveVerified is set (e.g. for high-trust verified pipeline batches)
          if (autoApproveVerified && (changeType === "new" || changeType === "update")) {
            applyNormalizedSchemeToDatabase(normalized, actorId);
          }
        } catch (itemErr) {
          failedCount++;
          log(`Failed to process item index ${i}: ${itemErr.message}`, "error");
        }
      }
    });

    stageItemsTx(rawRecords);
    log(`Staging complete: ${newDetected} new, ${updatedDetected} updated, ${duplicateCount} unchanged, ${failedCount} failed, ${needsReviewCount} needing review`);

    // Complete sync run record
    db.prepare(`
      UPDATE scheme_sync_runs SET
        status = ?,
        total_retrieved = ?,
        new_detected = ?,
        updated_detected = ?,
        duplicate_count = ?,
        failed_count = ?,
        needs_review_count = ?,
        log_json = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      failedCount > 0 && newDetected + updatedDetected === 0 ? "failed" : failedCount > 0 ? "partial" : "completed",
      totalRetrieved,
      newDetected,
      updatedDetected,
      duplicateCount,
      failedCount,
      needsReviewCount,
      JSON.stringify(logs),
      runId
    );

    // Update source status
    if (source) {
      db.prepare(`
        UPDATE scheme_sources SET
          last_sync_at = CURRENT_TIMESTAMP,
          last_sync_status = 'success'
        WHERE id = ?
      `).run(sourceId);
    }

    recordAuditLog({
      userId: resolveValidUserId(actorId),
      action: "SCHEME_SYNC_COMPLETED",
      resourceType: "scheme_sync_runs",
      resourceId: runId,
      details: {
        actorId,
        message: `Sync run ${runId} processed ${totalRetrieved} records (${newDetected} new, ${updatedDetected} updated).`,
      },
    });

    const summary = {
      totalRetrieved,
      newDetected,
      updatedDetected,
      duplicateCount,
      failedCount,
      needsReviewCount,
    };

    return {
      runId,
      status: failedCount > 0 && newDetected + updatedDetected === 0 ? "failed" : "completed",
      totalRetrieved,
      newDetected,
      updatedDetected,
      duplicateCount,
      failedCount,
      needsReviewCount,
      logs,
      summary,
    };
  } catch (err) {
    log(`Sync run failed catastrophically: ${err.message}`, "error");
    db.prepare(`
      UPDATE scheme_sync_runs SET
        status = 'failed',
        error_message = ?,
        log_json = ?,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(err.message, JSON.stringify(logs), runId);

    if (source) {
      db.prepare(`
        UPDATE scheme_sources SET
          last_sync_at = CURRENT_TIMESTAMP,
          last_sync_status = 'failed'
        WHERE id = ?
      `).run(sourceId);
    }

    throw err;
  } finally {
    isSyncActive = false;
    activeRunId = null;
  }
}

/**
 * Applies a verified/approved normalized scheme directly into the schemes table
 * using an atomic transaction and records version history.
 */
export function applyNormalizedSchemeToDatabase(scheme, actorId = "admin") {
  if (!scheme || !scheme.id) {
    throw new Error("Scheme ID is required for database upsert");
  }
  const upsertTx = db.transaction(() => {
    // 1. Snapshot existing record if updating for version history
    const existing = db.prepare("SELECT * FROM schemes WHERE id = ?").get(scheme.id);
    let versionNum = 1;

    if (existing) {
      const prevVersion = db
        .prepare("SELECT max(version_num) as max_v FROM scheme_versions WHERE scheme_id = ?")
        .get(scheme.id);
      versionNum = (prevVersion?.max_v || 1) + 1;

      // Save previous version snapshot
      db.prepare(`
        INSERT INTO scheme_versions (
          id, scheme_id, version_num, snapshot_json, change_source, actor_id
        ) VALUES (?, ?, ?, ?, 'sync_update', ?)
      `).run(
        `ver_${scheme.id}_${versionNum}`,
        scheme.id,
        versionNum,
        JSON.stringify(existing),
        actorId
      );
    }

    // 2. Upsert into schemes table
    const stmt = db.prepare(`
      INSERT INTO schemes (
        id, name, ministry, government_level, description, categories,
        min_age, max_age, income_limit, states, business_status, business_types,
        min_req, max_req, benefits, documents, application_steps,
        portal_url, source, source_id, source_url, content_hash,
        last_synced_at, sync_status, review_status, criteria_completeness,
        verification_notes, verification_status, is_active
      ) VALUES (
        @id, @name, @ministry, @governmentLevel, @description, @categories,
        @minAge, @maxAge, @incomeLimit, @states, @businessStatus, @businessTypes,
        @minReq, @maxReq, @benefits, @documents, @applicationSteps,
        @portalUrl, @source, @sourceId, @sourceUrl, @contentHash,
        CURRENT_TIMESTAMP, 'synced', @reviewStatus, @criteriaCompleteness,
        @verificationNotes, @verificationStatus, @isActive
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
        source_id = excluded.source_id,
        source_url = excluded.source_url,
        content_hash = excluded.content_hash,
        last_synced_at = CURRENT_TIMESTAMP,
        sync_status = 'synced',
        review_status = excluded.review_status,
        criteria_completeness = excluded.criteria_completeness,
        verification_notes = excluded.verification_notes,
        verification_status = excluded.verification_status,
        is_active = excluded.is_active
    `);

    stmt.run({
      id: scheme.id,
      name: scheme.name,
      ministry: scheme.ministry,
      governmentLevel: scheme.governmentLevel || "central",
      description: scheme.description,
      categories: JSON.stringify(scheme.categories || ["ALL"]),
      minAge: scheme.minAge,
      maxAge: scheme.maxAge,
      incomeLimit: scheme.incomeLimit,
      states: JSON.stringify(scheme.states || ["ALL"]),
      businessStatus: JSON.stringify(scheme.businessStatus || ["ALL"]),
      businessTypes: JSON.stringify(scheme.businessTypes || ["ALL"]),
      minReq: scheme.minReq || 0,
      maxReq: scheme.maxReq || 0,
      benefits: scheme.benefits,
      documents: JSON.stringify(scheme.documents || ["Aadhaar Card"]),
      applicationSteps: JSON.stringify(scheme.applicationSteps || ["Online Registration"]),
      portalUrl: scheme.portalUrl || "https://myscheme.gov.in",
      source: scheme.source || "Official Ministry Ingestion Pipeline",
      sourceId: scheme.sourceId || "src_sync",
      sourceUrl: scheme.sourceUrl || scheme.portalUrl || "",
      contentHash: scheme.contentHash || computeSchemeHash(scheme),
      reviewStatus: scheme.reviewStatus || "Officially Verified",
      criteriaCompleteness: scheme.criteriaCompleteness || "verified",
      verificationNotes: scheme.verificationNotes || null,
      verificationStatus: scheme.verificationStatus || "verified",
      isActive: scheme.isActive !== undefined ? scheme.isActive : 1,
    });
  });

  upsertTx();
  return true;
}

/**
 * Approves a staged item from the review queue and applies it to the active registry
 */
export function approveReviewItem(itemId, actorId = "admin", reviewNotes = "") {
  const item = db.prepare("SELECT * FROM scheme_sync_items WHERE id = ?").get(itemId);
  if (!item) throw new Error("Staged sync item not found.");
  if (item.status === "applied") throw new Error("Item has already been applied.");

  const normalized = JSON.parse(item.normalized_data);
  normalized.reviewStatus = "Criteria Reviewed";

  // Apply to database
  applyNormalizedSchemeToDatabase(normalized, actorId);

  // Update item status
  db.prepare(`
    UPDATE scheme_sync_items SET
      status = 'applied',
      review_status = 'Criteria Reviewed',
      reviewed_at = CURRENT_TIMESTAMP,
      reviewed_by = ?,
      review_notes = ?
    WHERE id = ?
  `).run(actorId, reviewNotes, itemId);

  recordAuditLog({
    userId: resolveValidUserId(actorId),
    action: "SCHEME_SYNC_ITEM_APPROVED",
    resourceType: "schemes",
    resourceId: normalized.id,
    details: {
      actorId,
      message: `Admin approved synced scheme '${normalized.name}' (${normalized.id}).`,
    },
  });

  return { success: true, schemeId: normalized.id };
}

/**
 * Rejects a staged item from the review queue
 */
export function rejectReviewItem(itemId, actorId = "admin", reviewNotes = "") {
  const item = db.prepare("SELECT * FROM scheme_sync_items WHERE id = ?").get(itemId);
  if (!item) throw new Error("Staged sync item not found.");

  db.prepare(`
    UPDATE scheme_sync_items SET
      status = 'rejected',
      reviewed_at = CURRENT_TIMESTAMP,
      reviewed_by = ?,
      review_notes = ?
    WHERE id = ?
  `).run(actorId, reviewNotes, itemId);

  recordAuditLog({
    userId: resolveValidUserId(actorId),
    action: "SCHEME_SYNC_ITEM_REJECTED",
    resourceType: "scheme_sync_items",
    resourceId: itemId,
    details: {
      actorId,
      message: `Admin rejected synced item '${item.scheme_name}' (${item.scheme_id}). Notes: ${reviewNotes}`,
    },
  });

  return { success: true };
}

/**
 * Batch approve multiple staged review items
 */
export function batchApproveReviewItems(itemIds, actorId = "admin", reviewNotes = "") {
  if (!Array.isArray(itemIds) || itemIds.length === 0) {
    throw new Error("No item IDs provided for batch approval.");
  }

  let approved = 0;
  const errors = [];

  for (const id of itemIds) {
    try {
      approveReviewItem(id, actorId, reviewNotes);
      approved++;
    } catch (err) {
      errors.push({ id, error: err.message });
    }
  }

  return { success: true, approved, errors };
}

/**
 * Retries a failed sync run
 */
export async function retryFailedRun(runId, actorId = "admin") {
  const run = db.prepare("SELECT * FROM scheme_sync_runs WHERE id = ?").get(runId);
  if (!run) throw new Error("Sync run not found.");

  return await runSync({
    sourceId: run.source_id,
    triggerType: "manual",
    actorId,
  });
}

/**
 * Lists all registered data sources
 */
export function getSources() {
  return db.prepare("SELECT * FROM scheme_sources ORDER BY created_at ASC").all();
}

/**
 * Updates a data source's configuration
 */
export function updateSource(sourceId, updates = {}) {
  const allowed = ["name", "endpoint_url", "is_active", "sync_interval_minutes", "auth_type", "auth_config"];
  const sets = [];
  const params = [];

  for (const [key, val] of Object.entries(updates)) {
    if (allowed.includes(key)) {
      sets.push(`${key} = ?`);
      params.push(val);
    }
  }

  if (sets.length === 0) return false;
  params.push(sourceId);

  db.prepare(`UPDATE scheme_sources SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  return true;
}
