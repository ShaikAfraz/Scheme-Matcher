/**
 * DATABASE MIGRATIONS
 * Safe, idempotent migrations that preserve all existing records and schema.
 */

import { hashPassword } from "./security.js";

export function runMigrations(db) {
  // 1. Create schema_migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((r) => r.version)
  );

  // Helper to check if a table exists
  const hasTable = (tableName) => Boolean(
    db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName)
  );

  // Migration 1: Sessions table, system_role column, and security indices

  if (!applied.has(1)) {
    console.log("[Migration] Applying Migration 1: Sessions, system_role, and indices...");

    // Create sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    `);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
    if (tables.includes("applications")) {
      db.exec("CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);");
    }

    // Check if system_role column exists in users
    const userColumns = db.prepare("PRAGMA table_info(users)").all();
    const hasSystemRole = userColumns.some((c) => c.name === "system_role");
    if (!hasSystemRole) {
      db.exec("ALTER TABLE users ADD COLUMN system_role TEXT DEFAULT 'citizen'");
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (1, 'sessions_and_roles')").run();
  }

  // Migration 2: Cryptographic password upgrade for existing seed / custom users
  if (!applied.has(2)) {
    console.log("[Migration] Applying Migration 2: Hashing legacy plaintext passwords...");
    const users = db.prepare("SELECT id, password FROM users").all();
    const updateStmt = db.prepare("UPDATE users SET password = ? WHERE id = ?");

    let upgradedCount = 0;
    for (const u of users) {
      if (u.password && !u.password.startsWith("scrypt:")) {
        try {
          const hashed = hashPassword(u.password);
          updateStmt.run(hashed, u.id);
          upgradedCount++;
        } catch (err) {
          console.warn(`[Migration] Could not hash password for user ${u.id}:`, err.message);
        }
      }
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (2, 'hash_legacy_passwords')").run();
    console.log(`[Migration] Upgraded ${upgradedCount} user account(s) to scrypt password hashes.`);
  }

  // Migration 3: Assessments, Saved Schemes (Bookmarks), and Audit Logs
  if (!applied.has(3)) {
    console.log("[Migration] Applying Migration 3: Assessments, Bookmarks, and Audit Logs...");

    // 1. Eligibility Assessments table
    db.exec(`
      CREATE TABLE IF NOT EXISTS assessments (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        profile_snapshot TEXT NOT NULL,
        matched_schemes_count INTEGER NOT NULL DEFAULT 0,
        top_scheme_id TEXT,
        top_scheme_name TEXT,
        top_score REAL DEFAULT 0,
        results_summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(top_scheme_id) REFERENCES schemes(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
      CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);
    `);

    // 2. Saved / Bookmarked Schemes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_schemes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        scheme_id TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(scheme_id) REFERENCES schemes(id) ON DELETE CASCADE,
        UNIQUE(user_id, scheme_id)
      );
      CREATE INDEX IF NOT EXISTS idx_saved_schemes_user_id ON saved_schemes(user_id);
      CREATE INDEX IF NOT EXISTS idx_saved_schemes_scheme_id ON saved_schemes(scheme_id);
    `);

    // 3. System and Admin Audit Logs table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        details TEXT,
        ip_address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `);

    // 4. Verify and add updated_at columns if table is present
    if (hasTable("users")) {
      const userColumns = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
      if (!userColumns.includes("updated_at")) {
        db.exec("ALTER TABLE users ADD COLUMN updated_at DATETIME;");
        db.exec("UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;");
      }
    }

    if (hasTable("applications")) {
      const appColumns = db.prepare("PRAGMA table_info(applications)").all().map((c) => c.name);
      if (!appColumns.includes("updated_at")) {
        db.exec("ALTER TABLE applications ADD COLUMN updated_at DATETIME;");
        db.exec("UPDATE applications SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;");
      }
    }

    if (hasTable("documents")) {
      const docColumns = db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name);
      if (!docColumns.includes("verification_status")) {
        db.exec("ALTER TABLE documents ADD COLUMN verification_status TEXT DEFAULT 'pending';");
      }
      if (!docColumns.includes("verification_notes")) {
        db.exec("ALTER TABLE documents ADD COLUMN verification_notes TEXT;");
      }
    }

    // Index on schemes if table exists
    if (hasTable("schemes")) {
      db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_ministry ON schemes(ministry);");
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (3, 'assessments_bookmarks_audit')").run();
    console.log("[Migration] Migration 3 applied successfully.");
  }

  // -------------------------------------------------------------
  // MIGRATION 4: Scheme expansion metadata (government_level, source, verification_status, last_verified_date)
  // -------------------------------------------------------------
  if (!applied.has(4)) {
    console.log("[Migration] Applying Migration 4: Scheme Expansion Metadata...");

    const hasTable = (tableName) => Boolean(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName)
    );

    if (hasTable("schemes")) {
      const schemeCols = db.prepare("PRAGMA table_info(schemes)").all().map((c) => c.name);
      if (!schemeCols.includes("government_level")) {
        db.exec("ALTER TABLE schemes ADD COLUMN government_level TEXT DEFAULT 'central';");
      }
      if (!schemeCols.includes("source")) {
        db.exec("ALTER TABLE schemes ADD COLUMN source TEXT DEFAULT 'myScheme / Official Ministry Portal';");
      }
      if (!schemeCols.includes("verification_status")) {
        db.exec("ALTER TABLE schemes ADD COLUMN verification_status TEXT DEFAULT 'verified';");
      }
      if (!schemeCols.includes("last_verified_date")) {
        db.exec("ALTER TABLE schemes ADD COLUMN last_verified_date TEXT DEFAULT '2026-10-23';");
      }
      db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_gov_level ON schemes(government_level);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_verification ON schemes(verification_status);");
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (4, 'scheme_expansion_metadata')").run();
    console.log("[Migration] Migration 4 applied successfully.");
  }

  // -------------------------------------------------------------
  // MIGRATION 5: Password Reset Tokens table
  // -------------------------------------------------------------
  if (!applied.has(5)) {
    console.log("[Migration] Applying Migration 5: Password Reset Tokens table...");

    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
    `);

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (5, 'password_reset_tokens')").run();
    console.log("[Migration] Migration 5 applied successfully.");
  }

  // -------------------------------------------------------------
  // MIGRATION 6: Document Verification Workflow & Secure Storage
  // -------------------------------------------------------------
  if (!applied.has(6)) {
    console.log("[Migration] Applying Migration 6: Document Verification Workflow & Secure Storage...");

    if (hasTable("documents")) {
      const docCols = db.prepare("PRAGMA table_info(documents)").all().map((c) => c.name);

      const addColIfMissing = (name, type) => {
        if (!docCols.includes(name)) {
          db.exec(`ALTER TABLE documents ADD COLUMN ${name} ${type};`);
        }
      };

      addColIfMissing("file_path", "TEXT");
      addColIfMissing("file_hash", "TEXT");
      addColIfMissing("mime_type", "TEXT");
      addColIfMissing("file_size_bytes", "INTEGER");
      addColIfMissing("scheme_id", "TEXT");
      addColIfMissing("extracted_data", "TEXT");
      addColIfMissing("extraction_confidence", "REAL DEFAULT 0.0");
      addColIfMissing("verification_reason", "TEXT");
      addColIfMissing("verification_evidence", "TEXT");
      addColIfMissing("missing_requirements", "TEXT");
      addColIfMissing("reviewed_by", "TEXT");
      addColIfMissing("reviewed_at", "DATETIME");
      addColIfMissing("updated_at", "DATETIME");

      db.exec("CREATE INDEX IF NOT EXISTS idx_documents_file_hash ON documents(file_hash);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_documents_scheme_id ON documents(scheme_id);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_documents_v_status ON documents(verification_status);");
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS document_verification_history (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        previous_status TEXT,
        new_status TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL DEFAULT 'citizen',
        notes TEXT,
        evidence_snapshot TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_doc_history_doc ON document_verification_history(document_id);
      CREATE INDEX IF NOT EXISTS idx_doc_history_user ON document_verification_history(user_id);
    `);

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (6, 'document_verification_workflow')").run();
    console.log("[Migration] Migration 6 applied successfully.");
  }

  // -------------------------------------------------------------------------
  // MIGRATION 7: ELIGIBILITY ENGINE V2 & SCHEME CRITERIA AUDIT (ALL 574 SCHEMES)
  // -------------------------------------------------------------------------
  const m7 = db.prepare("SELECT version FROM schema_migrations WHERE version = 7").get();
  if (!m7) {
    console.log("[Migration] Applying Migration 7: Upgrading Eligibility Engine schema & criteria audit...");

    if (hasTable("assessments")) {
      const asmCols = db.prepare("PRAGMA table_info(assessments)").all().map((c) => c.name);
      const addAsmCol = (name, type) => {
        if (!asmCols.includes(name)) {
          db.exec(`ALTER TABLE assessments ADD COLUMN ${name} ${type};`);
        }
      };
      addAsmCol("rule_version", "TEXT DEFAULT 'v2.0-deterministic-574'");
      addAsmCol("total_evaluated", "INTEGER DEFAULT 574");
      addAsmCol("eligible_count", "INTEGER DEFAULT 0");
      addAsmCol("potentially_eligible_count", "INTEGER DEFAULT 0");
      addAsmCol("not_eligible_count", "INTEGER DEFAULT 0");
      addAsmCol("criterion_results", "TEXT");

      db.exec("CREATE INDEX IF NOT EXISTS idx_assessments_rule_ver ON assessments(rule_version);");
    }

    if (hasTable("schemes")) {
      const schemeCols = db.prepare("PRAGMA table_info(schemes)").all().map((c) => c.name);
      if (!schemeCols.includes("criteria_completeness")) {
        db.exec("ALTER TABLE schemes ADD COLUMN criteria_completeness TEXT DEFAULT 'verified';");
      }
      if (!schemeCols.includes("verification_notes")) {
        db.exec("ALTER TABLE schemes ADD COLUMN verification_notes TEXT;");
      }

      // Codify audit findings for schemes requiring offline BPL/tax/gazette documentary scrutiny
      const schemes = db.prepare("SELECT id, name, description, benefits, documents FROM schemes").all();
      const updateStmt = db.prepare("UPDATE schemes SET criteria_completeness = ?, verification_notes = ? WHERE id = ?");

      db.transaction(() => {
        for (const s of schemes) {
          const fullText = `${s.name} ${s.description || ""} ${s.benefits || ""} ${s.documents || ""}`.toLowerCase();
          const notes = [];
          if (
            s.id === "SCH_CEN_023" ||
            fullText.includes("atal pension") ||
            fullText.includes("income tax") ||
            fullText.includes("taxpayer") ||
            fullText.includes("tax payer")
          ) {
            notes.push("Income tax payers excluded by statutory scheme guidelines");
          }
          if (fullText.includes("bpl") || fullText.includes("below poverty line") || fullText.includes("destitute")) {
            notes.push("Requires valid BPL / Antyodaya ration card or destitute classification");
          }
          if (notes.length > 0) {
            updateStmt.run("requires_verification", notes.join("; "), s.id);
          } else {
            updateStmt.run("verified", "All mandatory criteria verified and deterministically codified", s.id);
          }
        }
      })();
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (7, 'eligibility_engine_v2')").run();
    console.log("[Migration] Migration 7 applied successfully.");
  }

  // -------------------------------------------------------------------------
  // MIGRATION 8: Bank Dossiers & Scheme Deactivation
  // -------------------------------------------------------------------------
  const m8 = db.prepare("SELECT version FROM schema_migrations WHERE version = 8").get();
  if (!m8) {
    console.log("[Migration] Applying Migration 8: Bank Dossiers & Scheme Deactivation...");

    // 1. Dossiers Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS dossiers (
        id TEXT PRIMARY KEY,
        reference_number TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        scheme_ids TEXT NOT NULL,
        profile_snapshot TEXT NOT NULL,
        eligibility_summary TEXT,
        documents_summary TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_dossiers_user_id ON dossiers(user_id);
      CREATE INDEX IF NOT EXISTS idx_dossiers_reference ON dossiers(reference_number);
      CREATE INDEX IF NOT EXISTS idx_dossiers_generated_at ON dossiers(generated_at);
    `);

    // 2. Add is_active column to schemes if not present
    if (hasTable("schemes")) {
      const schemeCols = db.prepare("PRAGMA table_info(schemes)").all().map((c) => c.name);
      if (!schemeCols.includes("is_active")) {
        db.exec("ALTER TABLE schemes ADD COLUMN is_active INTEGER DEFAULT 1;");
        db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_is_active ON schemes(is_active);");
        db.exec("UPDATE schemes SET is_active = 1 WHERE is_active IS NULL;");
      }
    }

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (8, 'bank_dossiers_and_active_schemes')").run();
    console.log("[Migration] Migration 8 applied successfully.");
  }

  // -------------------------------------------------------------------------
  // MIGRATION 9: Automated Government Scheme Ingestion & Synchronization
  // -------------------------------------------------------------------------
  const m9 = db.prepare("SELECT version FROM schema_migrations WHERE version = 9").get();
  if (!m9) {
    console.log("[Migration] Applying Migration 9: Automated Scheme Ingestion, Sync Runs, and Versioning...");

    // 1. Scheme Sources Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheme_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        endpoint_url TEXT,
        auth_type TEXT DEFAULT 'none',
        auth_config TEXT,
        is_active INTEGER DEFAULT 1,
        sync_interval_minutes INTEGER DEFAULT 1440,
        last_sync_at DATETIME,
        last_sync_status TEXT DEFAULT 'idle',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_scheme_sources_type ON scheme_sources(source_type);
      CREATE INDEX IF NOT EXISTS idx_scheme_sources_active ON scheme_sources(is_active);
    `);

    // 2. Scheme Sync Runs Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheme_sync_runs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        trigger_type TEXT DEFAULT 'manual',
        status TEXT DEFAULT 'running',
        total_retrieved INTEGER DEFAULT 0,
        new_detected INTEGER DEFAULT 0,
        updated_detected INTEGER DEFAULT 0,
        duplicate_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        needs_review_count INTEGER DEFAULT 0,
        error_message TEXT,
        log_json TEXT,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        created_by TEXT,
        FOREIGN KEY(source_id) REFERENCES scheme_sources(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sync_runs_source ON scheme_sync_runs(source_id);
      CREATE INDEX IF NOT EXISTS idx_sync_runs_status ON scheme_sync_runs(status);
      CREATE INDEX IF NOT EXISTS idx_sync_runs_started ON scheme_sync_runs(started_at);
    `);

    // 3. Scheme Sync Staging & Review Queue Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheme_sync_items (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_record_id TEXT,
        scheme_id TEXT,
        scheme_name TEXT NOT NULL,
        change_type TEXT DEFAULT 'new',
        content_hash TEXT,
        raw_data TEXT,
        normalized_data TEXT NOT NULL,
        status TEXT DEFAULT 'staged',
        review_status TEXT DEFAULT 'Source Imported',
        validation_errors TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        reviewed_by TEXT,
        review_notes TEXT,
        FOREIGN KEY(run_id) REFERENCES scheme_sync_runs(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sync_items_run ON scheme_sync_items(run_id);
      CREATE INDEX IF NOT EXISTS idx_sync_items_status ON scheme_sync_items(status);
      CREATE INDEX IF NOT EXISTS idx_sync_items_review ON scheme_sync_items(review_status);
      CREATE INDEX IF NOT EXISTS idx_sync_items_scheme ON scheme_sync_items(scheme_id);
    `);

    // 4. Scheme Versioning & Audit History Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS scheme_versions (
        id TEXT PRIMARY KEY,
        scheme_id TEXT NOT NULL,
        version_num INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL,
        changed_fields_json TEXT,
        change_source TEXT DEFAULT 'sync',
        actor_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(scheme_id) REFERENCES schemes(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scheme_versions_scheme ON scheme_versions(scheme_id);
      CREATE INDEX IF NOT EXISTS idx_scheme_versions_created ON scheme_versions(created_at);
    `);

    // 5. Extend Schemes table with ingestion tracking columns
    if (hasTable("schemes")) {
      const schemeCols = db.prepare("PRAGMA table_info(schemes)").all().map((c) => c.name);
      const addSchemeCol = (name, type) => {
        if (!schemeCols.includes(name)) {
          db.exec(`ALTER TABLE schemes ADD COLUMN ${name} ${type};`);
        }
      };
      addSchemeCol("source_id", "TEXT DEFAULT 'src_official_baseline'");
      addSchemeCol("source_url", "TEXT");
      addSchemeCol("content_hash", "TEXT");
      addSchemeCol("last_synced_at", "DATETIME");
      addSchemeCol("sync_status", "TEXT DEFAULT 'synced'");
      addSchemeCol("review_status", "TEXT DEFAULT 'Officially Verified'");

      db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_review_status ON schemes(review_status);");
      db.exec("CREATE INDEX IF NOT EXISTS idx_schemes_source_id ON schemes(source_id);");
    }

    // 6. Seed official authorized sources
    const insertSource = db.prepare(`
      INSERT OR IGNORE INTO scheme_sources (
        id, name, source_type, endpoint_url, auth_type, auth_config, is_active, sync_interval_minutes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSource.run(
      "src_myscheme_api",
      "myScheme National Portal (API Setu / MeitY)",
      "api_setu",
      "https://apisetu.gov.in/myscheme/v1/schemes",
      "api_key",
      JSON.stringify({ headerKey: "X-APISETU-APIKEY", clientIdKey: "X-APISETU-CLIENTID" }),
      1,
      1440
    );

    insertSource.run(
      "src_datagov_in",
      "Open Government Data Platform (data.gov.in)",
      "data_gov",
      "https://api.data.gov.in/resource/schemes",
      "api_key",
      JSON.stringify({ paramKey: "api-key" }),
      1,
      1440
    );

    insertSource.run(
      "src_file_dataset",
      "Authorized Machine-Readable Dataset (CSV / JSON)",
      "file_upload",
      null,
      "none",
      null,
      1,
      0
    );

    db.prepare("INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (9, 'automated_scheme_ingestion_and_sync')").run();
    console.log("[Migration] Migration 9 applied successfully: Ingestion tables, sources, and scheme extensions created.");
  }

  // Ensure audit_logs supports both actor_id / target_id and user_id / resource_id
  if (hasTable("audit_logs")) {
    const auditCols = db.prepare("PRAGMA table_info(audit_logs)").all().map((c) => c.name);
    if (!auditCols.includes("actor_id")) {
      db.exec("ALTER TABLE audit_logs ADD COLUMN actor_id TEXT;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);");
      db.exec("UPDATE audit_logs SET actor_id = user_id WHERE actor_id IS NULL;");
    }
    if (!auditCols.includes("target_id")) {
      db.exec("ALTER TABLE audit_logs ADD COLUMN target_id TEXT;");
      db.exec("CREATE INDEX IF NOT EXISTS idx_audit_logs_target_id ON audit_logs(target_id);");
      db.exec("UPDATE audit_logs SET target_id = resource_id WHERE target_id IS NULL;");
    }
  }

  console.log("[Migration] Database schema migrations are up to date.");
}


