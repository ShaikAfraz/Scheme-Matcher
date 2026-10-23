/**
 * SQL DATABASE ENGINE (SQLite via better-sqlite3)
 * Persistent relational database with cryptographic security,
 * safe migrations, session management, and role-based access control.
 */

import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  sanitizeUser,
} from "./security.js";
import { runMigrations } from "./migrations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "../database.sqlite");

// Initialize SQLite connection
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log(`[Database] SQLite connected successfully at: ${DB_PATH}`);

// Initialize Base SQL Tables
export function initDatabase() {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      mobile TEXT,
      password TEXT,
      avatar TEXT,
      role TEXT,
      system_role TEXT DEFAULT 'citizen',
      category_badge TEXT,
      badge_color TEXT,
      is_demo INTEGER DEFAULT 0,
      profile_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Applications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      scheme_id TEXT,
      scheme_name TEXT NOT NULL,
      ministry TEXT,
      user_id TEXT NOT NULL,
      applicant_name TEXT NOT NULL,
      applicant_phone TEXT,
      state TEXT,
      district TEXT,
      category TEXT,
      business_type TEXT,
      requested_amount REAL,
      sanctioned_amount REAL,
      subsidy_amount REAL,
      bank_name TEXT,
      bank_branch TEXT,
      applied_date TEXT,
      estimated_disbursement TEXT,
      current_stage INTEGER DEFAULT 1,
      status TEXT,
      status_type TEXT,
      nodal_officer TEXT,
      officer_phone TEXT,
      timeline TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Documents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      size TEXT,
      type TEXT,
      type_id TEXT,
      uploaded_at TEXT,
      status TEXT DEFAULT 'Verified',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Schemes Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schemes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ministry TEXT,
      description TEXT,
      categories TEXT,
      min_age INTEGER,
      max_age INTEGER,
      income_limit REAL,
      states TEXT,
      business_status TEXT,
      business_types TEXT,
      min_req REAL,
      max_req REAL,
      benefits TEXT,
      documents TEXT,
      application_steps TEXT,
      portal_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Run migrations (idempotent, preserves all existing tables and rows)
  runMigrations(db);

  console.log("[Database] All SQL tables and security migrations initialized.");
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
export function getAllUsers(sanitized = true) {
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
  const rows = stmt.all();
  if (sanitized) {
    return rows.map((r) => sanitizeUser(r));
  }
  return rows.map((r) => formatUserRow(r));
}

export function getUserById(id, sanitized = true) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return null;
  return sanitized ? sanitizeUser(r) : formatUserRow(r);
}

export function getUserByEmailOrMobile(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  const normalizedPhone = identifier.replace(/[\s+-]/g, "");

  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE LOWER(email) = ? OR mobile = ? OR REPLACE(REPLACE(mobile, ' ', ''), '-', '') = ?
    LIMIT 1
  `);
  const r = stmt.get(clean, identifier.trim(), normalizedPhone);
  return r ? formatUserRow(r) : null;
}

export function saveUser(user) {
  // If password is not already an scrypt hash, hash it securely
  let finalPassword = user.password || "pass123";
  if (!finalPassword.startsWith("scrypt:")) {
    finalPassword = hashPassword(finalPassword);
  }

  const stmt = db.prepare(`
    INSERT INTO users (
      id, name, email, mobile, password, avatar, role, system_role,
      category_badge, badge_color, is_demo, profile_data
    ) VALUES (
      @id, @name, @email, @mobile, @password, @avatar, @role, @system_role,
      @category_badge, @badge_color, @is_demo, @profile_data
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      mobile = excluded.mobile,
      password = excluded.password,
      avatar = excluded.avatar,
      role = excluded.role,
      system_role = excluded.system_role,
      category_badge = excluded.category_badge,
      badge_color = excluded.badge_color,
      is_demo = excluded.is_demo,
      profile_data = excluded.profile_data
  `);

  stmt.run({
    id: user.id || `usr_${Date.now()}`,
    name: user.name,
    email: user.email || `${user.mobile || Date.now()}@citizen.in`,
    mobile: user.mobile || "",
    password: finalPassword,
    avatar: user.avatar || "👤",
    role: user.role || "Citizen Entrepreneur",
    system_role: user.systemRole || user.system_role || "citizen",
    category_badge: user.categoryBadge || "Citizen",
    badge_color: user.badgeColor || "#B5651D",
    is_demo: user.isDemo ? 1 : 0,
    profile_data: user.profileData ? JSON.stringify(user.profileData) : null,
  });

  return getUserById(user.id || `usr_${Date.now()}`);
}

export function authenticateUser(identifier, password) {
  const user = getUserByEmailOrMobile(identifier);
  if (!user) return null;

  const { valid, needsUpgrade } = verifyPassword(password, user.password);
  if (!valid) return null;

  // Progressive security upgrade: if user had legacy plaintext, re-hash with scrypt
  if (needsUpgrade) {
    const newHash = hashPassword(password);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newHash, user.id);
  }

  return sanitizeUser(user);
}

// -------------------------------------------------------------
// SESSION OPERATIONS
// -------------------------------------------------------------
export function createSession(userId, daysValid = 7) {
  const token = generateSessionToken();
  const id = `sess_${Date.now()}_${token.slice(0, 8)}`;
  const expiresAt = new Date(Date.now() + daysValid * 86400000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(id, userId, token, expiresAt);

  return { sessionId: id, userId, token, expiresAt };
}


export function getSessionUser(token) {
  if (!token) return null;

  const stmt = db.prepare(`
    SELECT u.*, s.expires_at as session_expires_at, s.id as session_id
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
    LIMIT 1
  `);
  const r = stmt.get(token);
  if (!r) return null;

  return sanitizeUser(r);
}

export function deleteSession(token) {
  if (!token) return false;
  const stmt = db.prepare("DELETE FROM sessions WHERE token = ?");
  const res = stmt.run(token);
  return res.changes > 0;
}

export function deleteUserSessions(userId) {
  if (!userId) return false;
  const stmt = db.prepare("DELETE FROM sessions WHERE user_id = ?");
  const res = stmt.run(userId);
  return res.changes > 0;
}

// -------------------------------------------------------------
// APPLICATION OPERATIONS (WITH STRICT OWNERSHIP ENFORCEMENT)
// -------------------------------------------------------------
export function getApplications({ userId = null, role = "citizen" } = {}) {
  // Administrators can view all applications; citizens can ONLY view their own
  if (role === "admin" && !userId) {
    const stmt = db.prepare("SELECT * FROM applications ORDER BY created_at DESC");
    return stmt.all().map(formatAppRow);
  }

  if (!userId) {
    return [];
  }

  const stmt = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC");
  return stmt.all(userId).map(formatAppRow);
}

export function getApplicationById(id, { userId = null, role = "citizen" } = {}) {
  const stmt = db.prepare("SELECT * FROM applications WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return null;

  const app = formatAppRow(r);

  // Strict ownership: citizen can only read their own application
  if (role !== "admin" && userId && app.userId !== userId) {
    return null;
  }

  return app;
}

export function saveApplication(app, { userId = null, role = "citizen" } = {}) {
  // If application already exists, enforce ownership
  if (app.id) {
    const existing = db.prepare("SELECT user_id FROM applications WHERE id = ?").get(app.id);
    if (existing && role !== "admin" && userId && existing.user_id !== userId) {
      throw new Error("Access denied: You can only modify your own applications.");
    }
  }

  // Force authenticated user ID ownership
  const targetUserId = role === "admin" ? (app.userId || userId || "admin") : userId;
  if (!targetUserId) {
    throw new Error("Authentication required to submit an application.");
  }

  const stmt = db.prepare(`
    INSERT INTO applications (
      id, scheme_id, scheme_name, ministry, user_id, applicant_name, applicant_phone,
      state, district, category, business_type, requested_amount, sanctioned_amount,
      subsidy_amount, bank_name, bank_branch, applied_date, estimated_disbursement,
      current_stage, status, status_type, nodal_officer, officer_phone, timeline
    ) VALUES (
      @id, @scheme_id, @scheme_name, @ministry, @user_id, @applicant_name, @applicant_phone,
      @state, @district, @category, @business_type, @requested_amount, @sanctioned_amount,
      @subsidy_amount, @bank_name, @bank_branch, @applied_date, @estimated_disbursement,
      @current_stage, @status, @status_type, @nodal_officer, @officer_phone, @timeline
    )
    ON CONFLICT(id) DO UPDATE SET
      current_stage = excluded.current_stage,
      status = excluded.status,
      status_type = excluded.status_type,
      sanctioned_amount = excluded.sanctioned_amount,
      subsidy_amount = excluded.subsidy_amount,
      timeline = excluded.timeline
  `);

  stmt.run({
    id: app.id,
    scheme_id: app.schemeId || app.scheme_id,
    scheme_name: app.schemeName || app.scheme_name,
    ministry: app.ministry || "",
    user_id: targetUserId,
    applicant_name: app.applicantName || app.applicant_name,
    applicant_phone: app.applicantPhone || app.applicant_phone || "",
    state: app.state || "",
    district: app.district || "",
    category: app.category || "",
    business_type: app.businessType || app.business_type || "",
    requested_amount: Number(app.requestedAmount || app.requested_amount || 0),
    sanctioned_amount: Number(app.sanctionedAmount || app.sanctioned_amount || 0),
    subsidy_amount: Number(app.subsidyAmount || app.subsidy_amount || 0),
    bank_name: app.bankName || app.bank_name || "",
    bank_branch: app.bankBranch || app.bank_branch || "",
    applied_date: app.appliedDate || app.applied_date || "",
    estimated_disbursement: app.estimatedDisbursement || app.estimated_disbursement || "",
    current_stage: Number(app.currentStage || app.current_stage || 1),
    status: app.status || "Submitted",
    status_type: app.statusType || app.status_type || "pending",
    nodal_officer: app.nodalOfficer || app.nodal_officer || "",
    officer_phone: app.officerPhone || app.officer_phone || "",
    timeline: app.timeline ? JSON.stringify(app.timeline) : null,
  });

  return getApplicationById(app.id, { userId: targetUserId, role });
}

export function deleteApplication(id, { userId = null, role = "citizen" } = {}) {
  const existing = db.prepare("SELECT user_id FROM applications WHERE id = ?").get(id);
  if (!existing) return false;

  // Strict ownership check
  if (role !== "admin" && userId && existing.user_id !== userId) {
    throw new Error("Access denied: You can only delete your own applications.");
  }

  const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
  return stmt.run(id).changes > 0;
}

/**
 * Public status lookup: only returns non-sensitive status & workflow fields
 */
export function lookupPublicApplication(query) {
  if (!query || typeof query !== "string") return null;
  const cleanQ = query.trim().toUpperCase().replace(/\s+/g, "");

  const stmt = db.prepare(`
    SELECT * FROM applications
    WHERE UPPER(REPLACE(id, ' ', '')) = ?
       OR REPLACE(REPLACE(REPLACE(applicant_phone, ' ', ''), '+', ''), '-', '') = ?
    LIMIT 1
  `);
  const r = stmt.get(cleanQ, cleanQ.replace(/[+-]/g, ""));
  if (!r) return null;

  const app = formatAppRow(r);
  // Return sanitized public tracking object (no user_id exposure)
  return {
    id: app.id,
    schemeId: app.schemeId,
    schemeName: app.schemeName,
    ministry: app.ministry,
    state: app.state,
    district: app.district,
    appliedDate: app.appliedDate,
    estimatedDisbursement: app.estimatedDisbursement,
    currentStage: app.currentStage,
    status: app.status,
    statusType: app.statusType,
    nodalOfficer: app.nodalOfficer,
    officerPhone: app.officerPhone,
    timeline: app.timeline,
  };
}

// -------------------------------------------------------------
// DOCUMENT OPERATIONS
// -------------------------------------------------------------
export function getAllDocuments(userId = null, role = "citizen") {
  if (role === "admin" && !userId) {
    const stmt = db.prepare("SELECT * FROM documents ORDER BY created_at DESC");
    return stmt.all();
  }
  if (!userId) return [];
  const stmt = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC");
  return stmt.all(userId);
}

export function saveDocument(doc, userId) {
  if (!userId) throw new Error("Authentication required to save documents");

  const stmt = db.prepare(`
    INSERT INTO documents (id, user_id, name, size, type, type_id, uploaded_at, status)
    VALUES (@id, @user_id, @name, @size, @type, @type_id, @uploaded_at, @status)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status
  `);

  return stmt.run({
    id: doc.id || `doc_${Date.now()}`,
    user_id: userId,
    name: doc.name,
    size: doc.size || "",
    type: doc.type || "",
    type_id: doc.typeId || doc.type_id || "other",
    uploaded_at: doc.uploadedAt || doc.uploaded_at || "Today",
    status: doc.status || "Verified",
  });
}

// -------------------------------------------------------------
// HELPER FORMATTERS
// -------------------------------------------------------------
function formatUserRow(r) {
  return {
    ...r,
    isDemo: Boolean(r.is_demo),
    categoryBadge: r.category_badge,
    badgeColor: r.badge_color,
    systemRole: r.system_role || "citizen",
    profileData: r.profile_data ? JSON.parse(r.profile_data) : null,
  };
}

function formatAppRow(r) {
  return {
    id: r.id,
    schemeId: r.scheme_id,
    schemeName: r.scheme_name,
    ministry: r.ministry,
    userId: r.user_id,
    applicantName: r.applicant_name,
    applicantPhone: r.applicant_phone,
    state: r.state,
    district: r.district,
    category: r.category,
    businessType: r.business_type,
    requestedAmount: r.requested_amount,
    sanctionedAmount: r.sanctioned_amount,
    subsidyAmount: r.subsidy_amount,
    bankName: r.bank_name,
    bankBranch: r.bank_branch,
    appliedDate: r.applied_date,
    estimatedDisbursement: r.estimated_disbursement,
    currentStage: r.current_stage,
    status: r.status,
    statusType: r.status_type,
    nodalOfficer: r.nodal_officer,
    officerPhone: r.officer_phone,
    timeline: r.timeline ? JSON.parse(r.timeline) : [],
    createdAt: r.created_at,
  };
}

// Initialize tables and migrations on load
initDatabase();
