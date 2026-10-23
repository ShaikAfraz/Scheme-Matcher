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

  console.log("[Migration] Database schema migrations are up to date.");

}
