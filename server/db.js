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
      government_level TEXT DEFAULT 'central',
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
      source TEXT DEFAULT 'myScheme / Official Ministry Portal',
      verification_status TEXT DEFAULT 'verified',
      last_verified_date TEXT DEFAULT '2026-10-23',
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
  const userId = user.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

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
    id: userId,
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

  return getUserById(userId);
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
// USER PROFILE UPDATES (PERMANENT PERSISTENCE)
// -------------------------------------------------------------
export function updateUserProfile(userId, profileData) {
  if (!userId) throw new Error("User ID is required to update profile");
  const json = JSON.stringify(profileData);
  const stmt = db.prepare(`
    UPDATE users
    SET profile_data = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(json, userId);

  recordAuditLog({
    userId,
    action: "PROFILE_UPDATE",
    resourceType: "user",
    resourceId: userId,
    details: { updatedKeys: Object.keys(profileData) },
  });

  return getUserById(userId);
}

// -------------------------------------------------------------
// ELIGIBILITY ASSESSMENTS (PERMANENT MATCH AUDIT TRAIL)
// -------------------------------------------------------------
export function saveAssessment({
  id = null,
  userId = null,
  profileSnapshot = {},
  matchedSchemesCount = 0,
  topSchemeId = null,
  topSchemeName = null,
  topScore = 0,
  resultsSummary = [],
}) {
  const assessmentId = id || `asm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const stmt = db.prepare(`
    INSERT INTO assessments (
      id, user_id, profile_snapshot, matched_schemes_count,
      top_scheme_id, top_scheme_name, top_score, results_summary
    ) VALUES (
      @id, @user_id, @profile_snapshot, @matched_schemes_count,
      @top_scheme_id, @top_scheme_name, @top_score, @results_summary
    )
  `);

  stmt.run({
    id: assessmentId,
    user_id: userId,
    profile_snapshot: typeof profileSnapshot === "string" ? profileSnapshot : JSON.stringify(profileSnapshot),
    matched_schemes_count: Number(matchedSchemesCount) || 0,
    top_scheme_id: topSchemeId || null,
    top_scheme_name: topSchemeName || null,
    top_score: Number(topScore) || 0,
    results_summary: typeof resultsSummary === "string" ? resultsSummary : JSON.stringify(resultsSummary),
  });

  if (userId) {
    recordAuditLog({
      userId,
      action: "ASSESSMENT_RUN",
      resourceType: "assessment",
      resourceId: assessmentId,
      details: { topSchemeId, topScore, matchedCount: matchedSchemesCount },
    });
  }

  return getAssessmentById(assessmentId, { userId, role: "admin" });
}

export function getUserAssessments(userId, { limit = 10 } = {}) {
  if (!userId) return [];
  const stmt = db.prepare(`
    SELECT * FROM assessments
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  return stmt.all(userId, limit).map(formatAssessmentRow);
}

export function getAssessmentById(id, { userId = null, role = "citizen" } = {}) {
  const stmt = db.prepare("SELECT * FROM assessments WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return null;
  const assessment = formatAssessmentRow(r);
  if (role !== "admin" && userId && assessment.userId !== userId) {
    return null;
  }
  return assessment;
}

// -------------------------------------------------------------
// SAVED / BOOKMARKED SCHEMES
// -------------------------------------------------------------
export function saveSchemeBookmark(userId, schemeId, notes = "") {
  if (!userId || !schemeId) throw new Error("User ID and Scheme ID are required to bookmark a scheme");
  const id = `bmk_${userId}_${schemeId}`;
  const stmt = db.prepare(`
    INSERT INTO saved_schemes (id, user_id, scheme_id, notes)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, scheme_id) DO UPDATE SET
      notes = excluded.notes
  `);
  stmt.run(id, userId, schemeId, notes);

  recordAuditLog({
    userId,
    action: "SCHEME_BOOKMARK",
    resourceType: "scheme",
    resourceId: schemeId,
    details: { notes },
  });

  return { id, userId, schemeId, notes };
}

export function getUserBookmarks(userId) {
  if (!userId) return [];
  const stmt = db.prepare(`
    SELECT b.id as bookmark_id, b.notes, b.created_at as bookmarked_at,
           s.*
    FROM saved_schemes b
    JOIN schemes s ON b.scheme_id = s.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `);
  return stmt.all(userId).map((r) => ({
    bookmarkId: r.bookmark_id,
    notes: r.notes,
    bookmarkedAt: r.bookmarked_at,
    scheme: {
      id: r.id,
      name: r.name,
      ministry: r.ministry,
      description: r.description,
      categories: JSON.parse(r.categories || "[]"),
      states: JSON.parse(r.states || "[]"),
      businessStatus: JSON.parse(r.business_status || "[]"),
      businessTypes: JSON.parse(r.business_types || "[]"),
      benefits: r.benefits,
      minReq: r.min_req,
      maxReq: r.max_req,
      portalUrl: r.portal_url,
    },
  }));
}

export function removeSchemeBookmark(userId, schemeId) {
  if (!userId || !schemeId) return false;
  const stmt = db.prepare("DELETE FROM saved_schemes WHERE user_id = ? AND scheme_id = ?");
  const res = stmt.run(userId, schemeId);
  return res.changes > 0;
}

// -------------------------------------------------------------
// AUDIT LOGS
// -------------------------------------------------------------
export function recordAuditLog({
  userId = null,
  action,
  resourceType,
  resourceId = null,
  details = null,
  ipAddress = null,
}) {
  try {
    const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      action,
      resourceType,
      resourceId,
      details ? JSON.stringify(details) : null,
      ipAddress
    );
    return id;
  } catch (err) {
    console.warn("[Audit] Failed to record audit log:", err.message);
    return null;
  }
}

export function getAuditLogs({ role = "citizen", limit = 50, action = null } = {}) {
  if (role !== "admin") {
    throw new Error("Access denied: Administrator privileges required to access audit logs.");
  }
  let query = "SELECT * FROM audit_logs";
  const params = [];
  if (action) {
    query += " WHERE action = ?";
    params.push(action);
  }
  query += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);

  return db.prepare(query).all(...params).map((r) => ({
    ...r,
    details: r.details ? JSON.parse(r.details) : null,
  }));
}

// -------------------------------------------------------------
// DYNAMIC DATABASE-BACKED SYSTEM STATISTICS
// -------------------------------------------------------------
export function getSystemStats() {
  const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
  const appCount = db.prepare("SELECT count(*) as count FROM applications").get().count;
  const schemeCount = db.prepare("SELECT count(*) as count FROM schemes").get().count;
  const assessmentCount = db.prepare("SELECT count(*) as count FROM assessments").get().count;
  const docCount = db.prepare("SELECT count(*) as count FROM documents").get().count;
  const bookmarkCount = db.prepare("SELECT count(*) as count FROM saved_schemes").get().count;
  const sessionCount = db.prepare("SELECT count(*) as count FROM sessions WHERE expires_at > datetime('now')").get().count;

  const finStats = db.prepare(`
    SELECT
      COALESCE(SUM(requested_amount), 0) as total_requested,
      COALESCE(SUM(sanctioned_amount), 0) as total_sanctioned,
      COALESCE(SUM(subsidy_amount), 0) as total_subsidy
    FROM applications
  `).get();

  const stageCounts = db.prepare(`
    SELECT current_stage, count(*) as count
    FROM applications
    GROUP BY current_stage
    ORDER BY current_stage ASC
  `).all();

  return {
    users: userCount,
    schemes: schemeCount,
    applications: appCount,
    assessments: assessmentCount,
    documents: docCount,
    bookmarks: bookmarkCount,
    activeSessions: sessionCount,
    financials: {
      totalRequested: finStats.total_requested,
      totalSanctioned: finStats.total_sanctioned,
      totalSubsidy: finStats.total_subsidy,
    },
    stageDistribution: stageCounts,
  };
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

function formatAssessmentRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    profileSnapshot: r.profile_snapshot ? JSON.parse(r.profile_snapshot) : {},
    matchedSchemesCount: r.matched_schemes_count,
    topSchemeId: r.top_scheme_id,
    topSchemeName: r.top_scheme_name,
    topScore: r.top_score,
    resultsSummary: r.results_summary ? JSON.parse(r.results_summary) : [],
    createdAt: r.created_at,
  };
}

// Initialize tables and migrations on load
initDatabase();
