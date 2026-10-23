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

    // Helper to check if a table exists
    const hasTable = (tableName) => Boolean(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName)
    );

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

  console.log("[Migration] Database schema migrations are up to date.");
}
