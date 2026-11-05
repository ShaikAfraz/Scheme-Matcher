/**
 * Scheme Ingestion Scheduler
 * 
 * Periodically triggers automated synchronization for active sources with configured sync intervals.
 * Enforces single-run concurrency guard (via syncService.isSyncRunning) and logs scheduled executions.
 */

import { db } from '../db.js';
import { runSync, isSyncRunning } from './syncService.js';
import { MySchemeApiAdapter, DataGovInAdapter } from './fetcher.js';

let schedulerInterval = null;
let lastCheckAt = null;
const consecutiveFailures = new Map();
const MAX_CONSECUTIVE_FAILURES = 3;

let schedulerStatus = {
  isRunning: false,
  checkIntervalMs: 60000,
  lastCheckAt: null,
};

/**
 * Check whether a source has viable credentials configured.
 */
function isSourceConfigured(source) {
  if (source.source_type === 'api_setu') {
    const adapter = new MySchemeApiAdapter({ endpointUrl: source.endpoint_url });
    return adapter.isConfigured();
  }
  if (source.source_type === 'data_gov') {
    const adapter = new DataGovInAdapter({ endpointUrl: source.endpoint_url });
    return adapter.isConfigured();
  }
  // File datasets or custom webhooks are manually staged
  return true;
}

/**
 * Perform one check cycle across all active sources.
 */
export async function checkAndRunScheduledSyncs() {
  lastCheckAt = new Date().toISOString();
  schedulerStatus.lastCheckAt = lastCheckAt;

  if (isSyncRunning()) {
    console.log('[Scheduler] Sync already in progress, skipping scheduled tick.');
    return;
  }

  try {
    const activeSources = db.prepare(`
      SELECT * FROM scheme_sources 
      WHERE is_active = 1 
        AND sync_interval_minutes IS NOT NULL 
        AND sync_interval_minutes > 0
    `).all();

    if (!activeSources || activeSources.length === 0) {
      return;
    }

    const now = Date.now();

    for (const source of activeSources) {
      if (isSyncRunning()) {
        console.log('[Scheduler] Sync locked, postponing next source check.');
        break;
      }

      // Circuit breaker: skip sources with too many consecutive failures
      const failures = consecutiveFailures.get(source.id) || 0;
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`[Scheduler] Source ${source.id} paused by circuit breaker (${failures} consecutive failures). Requires administrative review.`);
        continue;
      }

      // Credential check: do not trigger automated calls for unconfigured remote sources
      if (!isSourceConfigured(source)) {
        // Log once or softly skip to avoid spamming logs on empty env vars
        continue;
      }

      const intervalMs = source.sync_interval_minutes * 60 * 1000;
      const lastSyncTime = source.last_sync_at ? new Date(source.last_sync_at).getTime() : 0;

      if (now - lastSyncTime >= intervalMs) {
        console.log(`[Scheduler] Triggering scheduled sync for source: ${source.id} (${source.name})`);
        try {
          await runSync({
            sourceId: source.id,
            triggerType: 'scheduled',
          });
          consecutiveFailures.delete(source.id);
        } catch (err) {
          const newFailures = (consecutiveFailures.get(source.id) || 0) + 1;
          consecutiveFailures.set(source.id, newFailures);
          console.error(`[Scheduler] Error running scheduled sync for ${source.id} (failure ${newFailures}/${MAX_CONSECUTIVE_FAILURES}):`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] Failed to query active sources:', err);
  }
}

/**
 * Start the ingestion scheduler.
 * @param {number} checkIntervalMs - Frequency to check schedule (defaults to 60s)
 */
export function startScheduler(checkIntervalMs = 60000) {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  schedulerStatus.isRunning = true;
  schedulerStatus.checkIntervalMs = checkIntervalMs;

  console.log(`[Scheduler] Scheme Ingestion Scheduler started (tick interval: ${checkIntervalMs}ms).`);
  
  // Set up repeating tick
  schedulerInterval = setInterval(() => {
    checkAndRunScheduledSyncs().catch(err => {
      console.error('[Scheduler] Unhandled error during scheduled check:', err);
    });
  }, checkIntervalMs);

  // If node process exits, ensure clean clear
  if (schedulerInterval.unref) {
    schedulerInterval.unref();
  }

  return getSchedulerStatus();
}

/**
 * Stop the ingestion scheduler.
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  schedulerStatus.isRunning = false;
  console.log('[Scheduler] Scheme Ingestion Scheduler stopped.');
  return getSchedulerStatus();
}

// Ensure clean scheduler shutdown on process termination
if (typeof process !== 'undefined' && process.on) {
  process.on('SIGINT', () => {
    stopScheduler();
  });
  process.on('SIGTERM', () => {
    stopScheduler();
  });
}

/**
 * Get current scheduler status and active source schedules.
 */
export function getSchedulerStatus() {
  let scheduledSources = [];
  try {
    scheduledSources = db.prepare(`
      SELECT id, name, sync_interval_minutes, last_sync_at, is_active 
      FROM scheme_sources 
      WHERE is_active = 1 AND sync_interval_minutes > 0
    `).all();
  } catch (e) {
    // Table may not be ready in early init
  }

  return {
    ...schedulerStatus,
    activeScheduledSources: scheduledSources,
    isSyncRunning: isSyncRunning(),
  };
}
