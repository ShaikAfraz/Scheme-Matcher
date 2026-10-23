import { describe, it } from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { runMigrations } from "../server/migrations.js";
import { verifyPassword } from "../server/security.js";

describe("Database Migrations Module", () => {
  it("should create schema_migrations table and execute initial migration", () => {
    const db = new Database(":memory:");

    // Setup base unmigrated schema with a legacy user
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT,
        mobile TEXT,
        password TEXT,
        avatar TEXT,
        role TEXT,
        category_badge TEXT,
        badge_color TEXT,
        is_demo INTEGER DEFAULT 0,
        profile_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users (id, name, email, password) VALUES ('legacy_01', 'Test Citizen', 'test@citizen.in', 'legacyPlainPass123');
    `);

    // Verify system_role column and sessions table do not exist yet
    const colsBefore = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    assert.equal(colsBefore.includes("system_role"), false);

    // Run migrations
    runMigrations(db);

    // 1. Verify schema_migrations tracked
    const migrations = db.prepare("SELECT * FROM schema_migrations").all();
    assert.ok(migrations.length >= 1, "At least 1 migration must be recorded");
    assert.equal(migrations[0].version, 1);

    // 2. Verify sessions table and indices exist
    const sessionsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'").get();
    assert.ok(sessionsTable, "Sessions table must be created");

    // 3. Verify users table has system_role column
    const colsAfter = db.prepare("PRAGMA table_info(users)").all().map((c) => c.name);
    assert.equal(colsAfter.includes("system_role"), true);

    // 4. Verify existing legacy passwords were safely upgraded to scrypt
    const user = db.prepare("SELECT * FROM users WHERE id = 'legacy_01'").get();
    assert.ok(user.password.startsWith("scrypt:"), "Legacy password must be converted to scrypt hash");
    assert.equal(verifyPassword("legacyPlainPass123", user.password).valid, true, "Upgraded scrypt hash must verify against original password");
    assert.equal(user.system_role, "citizen", "Default system role must be citizen");


    db.close();
  });

  it("should be idempotent and run safely multiple times without errors", () => {
    const db = new Database(":memory:");
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        name TEXT,
        password TEXT
      );
    `);

    // Run twice
    runMigrations(db);
    runMigrations(db);

    const count = db.prepare("SELECT count(*) as cnt FROM schema_migrations WHERE version = 1").get().cnt;
    assert.equal(count, 1, "Migration 1 should only be recorded once");
    db.close();
  });
});
