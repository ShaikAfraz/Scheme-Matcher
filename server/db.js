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

  const systemRole = user.systemRole || user.system_role || "citizen";

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
    system_role: systemRole,
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
// -------------------------------------------------------------
// DOCUMENT OPERATIONS (VERIFIED STORAGE & AUDIT PIPELINE)
// -------------------------------------------------------------
export function formatDocumentRow(d) {
  if (!d) return null;
  let extracted = null;
  let evidence = null;
  let missing = [];

  try {
    extracted = typeof d.extracted_data === "string" ? JSON.parse(d.extracted_data) : d.extracted_data || null;
  } catch {}
  try {
    evidence = typeof d.verification_evidence === "string" ? JSON.parse(d.verification_evidence) : d.verification_evidence || null;
  } catch {}
  try {
    missing = typeof d.missing_requirements === "string" ? JSON.parse(d.missing_requirements) : d.missing_requirements || [];
  } catch {}

  const vStatus = d.verification_status || "Pending";
  const isVerified =
    vStatus === "Verified Against Provided Criteria" ||
    vStatus === "verified" ||
    vStatus === "Verified" ||
    d.status === "Verified";
  const needsReview =
    vStatus === "Needs Review" ||
    vStatus === "needs_review" ||
    d.status === "Under Review";
  const isRejected =
    vStatus === "Rejected With Reason" ||
    vStatus === "rejected" ||
    d.status === "Rejected";

  return {
    id: d.id,
    userId: d.user_id,
    name: d.name,
    size: d.size,
    type: d.type,
    typeId: d.type_id,
    uploadedAt: d.uploaded_at,
    status: d.status || "Pending",
    verificationStatus: vStatus,
    verificationReason: d.verification_reason,
    verificationNotes: d.verification_notes,
    filePath: d.file_path,
    fileHash: d.file_hash,
    mimeType: d.mime_type,
    sizeBytes: d.file_size_bytes,
    schemeId: d.scheme_id,
    extractedData: extracted,
    extractionConfidence: d.extraction_confidence || 0.0,
    evidence,
    missingRequirements: missing,
    reviewedBy: d.reviewed_by,
    reviewedAt: d.reviewed_at,
    createdAt: d.created_at,
    docName: d.name,
    docType: d.type,
    docSize: d.size,
    userName: d.applicant_name || d.user_name || "Applicant",
    userEmail: d.applicant_email,
    userMobile: d.applicant_mobile,
    isVerified,
    needsReview,
    isRejected,
  };
}

export function getAllDocuments(userId = null, role = "citizen") {
  if (role === "admin" && !userId) {
    const stmt = db.prepare("SELECT * FROM documents ORDER BY created_at DESC");
    return stmt.all().map(formatDocumentRow);
  }
  if (!userId) return [];
  const stmt = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC");
  return stmt.all(userId).map(formatDocumentRow);
}

export function getDocumentById(docId, userId = null, role = "citizen") {
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);
  if (!row) return null;
  if (role !== "admin" && row.user_id !== userId) {
    return null; // Strict per-user access isolation
  }
  return formatDocumentRow(row);
}

export function findConflictingDocument({ fileHash, certificateNumber, excludeUserId }) {
  let duplicateHashFound = false;
  let duplicateCertFound = false;

  if (fileHash) {
    const hashRow = db.prepare(`
      SELECT id, user_id FROM documents
      WHERE file_hash = ? AND user_id != ?
      LIMIT 1
    `).get(fileHash, excludeUserId || "");
    if (hashRow) duplicateHashFound = true;
  }

  if (certificateNumber && certificateNumber.length >= 6) {
    const certRow = db.prepare(`
      SELECT id, user_id FROM documents
      WHERE user_id != ? AND extracted_data LIKE ?
      LIMIT 1
    `).get(excludeUserId || "", `%"${certificateNumber}"%`);
    if (certRow) duplicateCertFound = true;
  }

  return { duplicateHashFound, duplicateCertFound };
}

export function saveVerifiedDocument(docData, userId) {
  if (!userId) throw new Error("Authentication required to save documents");

  const docId = docData.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const previous = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);

  const stmt = db.prepare(`
    INSERT INTO documents (
      id, user_id, name, size, type, type_id, uploaded_at, status,
      file_path, file_hash, mime_type, file_size_bytes, scheme_id,
      extracted_data, extraction_confidence, verification_status,
      verification_reason, verification_evidence, missing_requirements,
      updated_at
    )
    VALUES (
      @id, @user_id, @name, @size, @type, @type_id, @uploaded_at, @status,
      @file_path, @file_hash, @mime_type, @file_size_bytes, @scheme_id,
      @extracted_data, @extraction_confidence, @verification_status,
      @verification_reason, @verification_evidence, @missing_requirements,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      size = excluded.size,
      type = excluded.type,
      type_id = excluded.type_id,
      status = excluded.status,
      file_path = excluded.file_path,
      file_hash = excluded.file_hash,
      mime_type = excluded.mime_type,
      file_size_bytes = excluded.file_size_bytes,
      scheme_id = excluded.scheme_id,
      extracted_data = excluded.extracted_data,
      extraction_confidence = excluded.extraction_confidence,
      verification_status = excluded.verification_status,
      verification_reason = excluded.verification_reason,
      verification_evidence = excluded.verification_evidence,
      missing_requirements = excluded.missing_requirements,
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({
    id: docId,
    user_id: userId,
    name: docData.name,
    size: docData.size || "",
    type: docData.type || "",
    type_id: docData.typeId || docData.type_id || "other",
    uploaded_at: docData.uploadedAt || docData.uploaded_at || "Today",
    status: docData.status || docData.verificationStatus || "Pending",
    file_path: docData.filePath || null,
    file_hash: docData.fileHash || null,
    mime_type: docData.mimeType || null,
    file_size_bytes: docData.sizeBytes || null,
    scheme_id: docData.schemeId || null,
    extracted_data:
      typeof docData.extractedData === "object"
        ? JSON.stringify(docData.extractedData)
        : docData.extractedData || null,
    extraction_confidence: docData.extractionConfidence || 0.0,
    verification_status: docData.verificationStatus || "Pending",
    verification_reason: docData.verificationReason || null,
    verification_evidence:
      typeof docData.verificationEvidence === "object"
        ? JSON.stringify(docData.verificationEvidence)
        : docData.verificationEvidence || null,
    missing_requirements:
      typeof docData.missingRequirements === "object"
        ? JSON.stringify(docData.missingRequirements)
        : docData.missingRequirements || null,
  });

  // Record audit and history log
  logDocumentHistory({
    documentId: docId,
    userId,
    previousStatus: previous ? previous.verification_status : null,
    newStatus: docData.verificationStatus || "Pending",
    action: previous ? "DOCUMENT_REPLACED" : "UPLOADED",
    actorId: userId,
    actorRole: "citizen",
    notes: docData.verificationReason || "Document uploaded and evaluated by deterministic verification engine.",
    evidenceSnapshot: docData.verificationEvidence,
  });

  recordAuditLog({
    userId,
    action: previous ? "DOCUMENT_REPLACE" : "DOCUMENT_UPLOAD",
    resourceType: "document",
    resourceId: docId,
    details: {
      name: docData.name,
      type: docData.type,
      verificationStatus: docData.verificationStatus,
    },
  });

  return getDocumentById(docId, userId);
}

export function saveDocument(doc, userId) {
  return saveVerifiedDocument(doc, userId);
}

export function deleteDocument(docId, userId, role = "citizen") {
  const existing = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);
  if (!existing) return null;
  if (role !== "admin" && existing.user_id !== userId) {
    throw new Error("Access denied: You do not own this document.");
  }

  db.prepare("DELETE FROM document_verification_history WHERE document_id = ?").run(docId);
  db.prepare("DELETE FROM documents WHERE id = ?").run(docId);

  recordAuditLog({
    userId,
    action: "DOCUMENT_DELETE",
    resourceType: "document",
    resourceId: docId,
    details: { name: existing.name, type: existing.type },
  });

  return existing;
}

export function logDocumentHistory({
  documentId,
  userId,
  previousStatus,
  newStatus,
  action,
  actorId,
  actorRole = "citizen",
  notes = null,
  evidenceSnapshot = null,
}) {
  const histId = `dhist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO document_verification_history (
      id, document_id, user_id, previous_status, new_status,
      action, actor_id, actor_role, notes, evidence_snapshot
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    histId,
    documentId,
    userId,
    previousStatus || null,
    newStatus,
    action,
    actorId,
    actorRole,
    notes || null,
    typeof evidenceSnapshot === "object" ? JSON.stringify(evidenceSnapshot) : evidenceSnapshot || null
  );
  return histId;
}

export function getDocumentHistory(docId, userId = null, role = "citizen") {
  const doc = db.prepare("SELECT user_id FROM documents WHERE id = ?").get(docId);
  if (!doc) return [];
  if (role !== "admin" && doc.user_id !== userId) {
    return [];
  }
  const rows = db.prepare(`
    SELECT h.*, u.name as actor_name
    FROM document_verification_history h
    LEFT JOIN users u ON h.actor_id = u.id
    WHERE h.document_id = ?
    ORDER BY h.created_at ASC
  `).all(docId);

  return rows.map((r) => {
    let snapshot = null;
    try {
      snapshot = r.evidence_snapshot ? JSON.parse(r.evidence_snapshot) : null;
    } catch {}
    return {
      id: r.id,
      documentId: r.document_id,
      userId: r.user_id,
      previousStatus: r.previous_status,
      newStatus: r.new_status,
      action: r.action,
      actorId: r.actor_id,
      actorRole: r.actor_role,
      actorName: r.actor_name,
      notes: r.notes,
      evidenceSnapshot: snapshot,
      createdAt: r.created_at,
    };
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
  ruleVersion = "v2.0-deterministic-574",
  totalEvaluated = 574,
  eligibleCount = 0,
  potentiallyEligibleCount = 0,
  notEligibleCount = 0,
  criterionResults = null,
}) {
  const assessmentId = id || `asm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const stmt = db.prepare(`
    INSERT INTO assessments (
      id, user_id, profile_snapshot, matched_schemes_count,
      top_scheme_id, top_scheme_name, top_score, results_summary,
      rule_version, total_evaluated, eligible_count,
      potentially_eligible_count, not_eligible_count, criterion_results
    ) VALUES (
      @id, @user_id, @profile_snapshot, @matched_schemes_count,
      @top_scheme_id, @top_scheme_name, @top_score, @results_summary,
      @rule_version, @total_evaluated, @eligible_count,
      @potentially_eligible_count, @not_eligible_count, @criterion_results
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
    rule_version: ruleVersion,
    total_evaluated: Number(totalEvaluated) || 574,
    eligible_count: Number(eligibleCount) || 0,
    potentially_eligible_count: Number(potentiallyEligibleCount) || 0,
    not_eligible_count: Number(notEligibleCount) || 0,
    criterion_results: criterionResults ? (typeof criterionResults === "string" ? criterionResults : JSON.stringify(criterionResults)) : null,
  });

  if (userId) {
    recordAuditLog({
      userId,
      action: "ASSESSMENT_RUN",
      resourceType: "assessment",
      resourceId: assessmentId,
      details: { topSchemeId, topScore, matchedCount: matchedSchemesCount, eligibleCount, ruleVersion },
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
      INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, actor_id, target_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      userId,
      action,
      resourceType,
      resourceId,
      details ? JSON.stringify(details) : null,
      ipAddress,
      userId,
      resourceId
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
  let criterionResults = null;
  try {
    criterionResults = r.criterion_results ? JSON.parse(r.criterion_results) : null;
  } catch {}
  return {
    id: r.id,
    userId: r.user_id,
    profileSnapshot: r.profile_snapshot ? JSON.parse(r.profile_snapshot) : {},
    matchedSchemesCount: r.matched_schemes_count,
    topSchemeId: r.top_scheme_id,
    topSchemeName: r.top_scheme_name,
    topScore: r.top_score,
    resultsSummary: r.results_summary ? JSON.parse(r.results_summary) : [],
    ruleVersion: r.rule_version || "v2.0-deterministic-574",
    totalEvaluated: r.total_evaluated || 574,
    eligibleCount: r.eligible_count || 0,
    potentiallyEligibleCount: r.potentially_eligible_count || 0,
    notEligibleCount: r.not_eligible_count || 0,
    criterionResults,
    createdAt: r.created_at,
  };
}

export function formatSchemeRow(s) {
  if (!s) return null;
  const levelNormalized = s.government_level
    ? (s.government_level.charAt(0).toUpperCase() + s.government_level.slice(1).toLowerCase())
    : "Central";

  return {
    id: s.id,
    code: s.code || s.id,
    name: s.name,
    ministry: s.ministry,
    level: levelNormalized,
    governmentLevel: s.government_level || "central",
    government_level: s.government_level || "central",
    description: s.description,
    categories: s.categories ? JSON.parse(s.categories) : [],
    minAge: s.min_age,
    maxAge: s.max_age,
    incomeLimit: s.income_limit,
    states: s.states ? JSON.parse(s.states) : [],
    businessStatus: s.business_status ? JSON.parse(s.business_status) : [],
    businessTypes: s.business_types ? JSON.parse(s.business_types) : [],
    minReq: s.min_req,
    maxReq: s.max_req,
    criteriaCompleteness: s.criteria_completeness || "verified",
    criteria_completeness: s.criteria_completeness || "verified",
    verificationNotes: s.verification_notes || "",
    verification_notes: s.verification_notes || "",
    benefits: s.benefits,
    documents: s.documents ? JSON.parse(s.documents) : [],
    applicationSteps: s.application_steps ? JSON.parse(s.application_steps) : [],
    portalUrl: s.portal_url,
    portal_url: s.portal_url,
    source: s.source,
    verificationStatus: s.verification_status,
    verification_status: s.verification_status,
    isVerified: s.verification_status === "verified" && s.criteria_completeness === "verified",
    isActive: s.is_active === undefined || s.is_active === null ? true : Boolean(s.is_active),
    is_active: s.is_active === undefined || s.is_active === null ? 1 : Number(s.is_active),
    lastVerifiedDate: s.last_verified_date,
    last_verified_date: s.last_verified_date,
    createdAt: s.created_at,
  };
}

// -------------------------------------------------------------
// SECURE ADMINISTRATOR PROVISIONING & OPERATIONS
// -------------------------------------------------------------
export function createOrUpdateAdminAccount({ email, password, name, role = "Administrator", avatar = "🏛️" }) {
  if (!email || !password) throw new Error("Email and password are required for admin account");
  const existing = getUserByEmailOrMobile(email);
  const id = existing ? existing.id : `adm_${Date.now()}`;
  const finalPassword = password.startsWith("scrypt:") ? password : hashPassword(password);

  const stmt = db.prepare(`
    INSERT INTO users (
      id, name, email, mobile, password, avatar, role, system_role,
      category_badge, badge_color, is_demo, profile_data
    ) VALUES (
      @id, @name, @email, @mobile, @password, @avatar, @role, 'admin',
      'Administrator', '#1E3A8A', 0, NULL
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      password = excluded.password,
      avatar = excluded.avatar,
      role = excluded.role,
      system_role = 'admin',
      updated_at = CURRENT_TIMESTAMP
  `);

  stmt.run({
    id,
    name: name || "System Administrator",
    email: email.toLowerCase().trim(),
    mobile: "011-23384501",
    password: finalPassword,
    avatar,
    role,
  });

  recordAuditLog({
    userId: id,
    action: "ADMIN_PROVISIONED",
    resourceType: "user",
    resourceId: id,
    details: { email },
  });

  return getUserById(id);
}

// -------------------------------------------------------------
// PASSWORD RECOVERY & RESET OPERATIONS
// -------------------------------------------------------------
export function createPasswordResetToken(identifier) {
  const user = getUserByEmailOrMobile(identifier);
  if (!user) return null;

  const token = generateSessionToken();
  const id = `prt_${Date.now()}_${token.slice(0, 8)}`;
  // 1-hour expiry window
  const expiresAt = new Date(Date.now() + 3600000).toISOString();

  // Invalidate any previously active unused tokens for this user
  db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0").run(user.id);

  db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used)
    VALUES (?, ?, ?, ?, 0)
  `).run(id, user.id, token, expiresAt);

  recordAuditLog({
    userId: user.id,
    action: "PASSWORD_RESET_REQUESTED",
    resourceType: "user",
    resourceId: user.id,
    details: { email: user.email },
  });

  return { token, email: user.email, expiresAt };
}

export function resetPasswordWithToken(token, newPassword) {
  if (!token || typeof token !== "string") {
    return { success: false, error: "Reset token is required." };
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 4) {
    return { success: false, error: "Password must be at least 4 characters long." };
  }

  const tokenRow = db.prepare(`
    SELECT * FROM password_reset_tokens
    WHERE token = ? AND used = 0 AND datetime(expires_at) > datetime('now')
    LIMIT 1
  `).get(token.trim());

  if (!tokenRow) {
    return { success: false, error: "Invalid or expired password reset token." };
  }

  const newHash = hashPassword(newPassword);

  db.transaction(() => {
    // 1. Update password
    db.prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(newHash, tokenRow.user_id);
    // 2. Mark token used
    db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(tokenRow.id);
    // 3. Terminate all active sessions for security
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(tokenRow.user_id);
    // 4. Audit log
    recordAuditLog({
      userId: tokenRow.user_id,
      action: "PASSWORD_RESET_COMPLETED",
      resourceType: "user",
      resourceId: tokenRow.user_id,
      details: { tokenId: tokenRow.id },
    });
  })();

  return { success: true, message: "Password reset successfully. Please sign in with your new credentials." };
}

// -------------------------------------------------------------
// ADMIN SCHEME MANAGEMENT & VALIDATION OPERATIONS
// -------------------------------------------------------------

/**
 * Validates scheme input fields according to national portal publishing rules.
 */
export function validateSchemeInput(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.name !== undefined) {
    if (!data.name || typeof data.name !== "string" || data.name.trim().length < 5) {
      errors.push("Scheme name must be at least 5 characters long.");
    }
  }

  if (!isUpdate || data.ministry !== undefined) {
    if (!data.ministry || typeof data.ministry !== "string" || data.ministry.trim().length < 3) {
      errors.push("Ministry / Department name is required (at least 3 characters).");
    }
  }

  const url = data.portalUrl ?? data.portal_url ?? data.officialUrl ?? data.official_url;
  if (url !== undefined) {
    if (!url || typeof url !== "string" || !/^https?:\/\/.+/i.test(url.trim())) {
      errors.push("Application Portal URL must be a valid HTTP or HTTPS web address.");
    }
  }

  const source = data.source ?? data.sourceUrl ?? data.source_url;
  if (source !== undefined && source !== null && source !== "") {
    if (typeof source !== "string" || source.trim().length < 3) {
      errors.push("Scheme source attribution must be at least 3 characters long.");
    }
  }

  if (data.minAge !== undefined && data.minAge !== null && data.minAge !== "") {
    const min = Number(data.minAge);
    if (isNaN(min) || min < 0) {
      errors.push("Minimum age must be a non-negative number.");
    }
  }

  if (data.maxAge !== undefined && data.maxAge !== null && data.maxAge !== "") {
    const max = Number(data.maxAge);
    if (isNaN(max) || max < 0) {
      errors.push("Maximum age must be a non-negative number.");
    }
  }

  if (
    data.minAge !== undefined && data.minAge !== null && data.minAge !== "" &&
    data.maxAge !== undefined && data.maxAge !== null && data.maxAge !== ""
  ) {
    const min = Number(data.minAge);
    const max = Number(data.maxAge);
    if (!isNaN(min) && !isNaN(max) && min > max) {
      errors.push("Minimum age cannot exceed maximum age.");
    }
  }

  if (data.incomeLimit !== undefined && data.incomeLimit !== null && data.incomeLimit !== "") {
    const inc = Number(data.incomeLimit);
    if (isNaN(inc) || inc < 0) {
      errors.push("Income limit must be a non-negative number.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function getAdminSchemes({
  search = "",
  level = "all",
  verificationStatus = "all",
  activeStatus = "all",
  limit = 50,
  offset = 0,
} = {}) {
  let query = "SELECT * FROM schemes WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND (LOWER(name) LIKE ? OR LOWER(ministry) LIKE ? OR id LIKE ?)";
    const term = `%${search.toLowerCase().trim()}%`;
    params.push(term, term, term);
  }

  if (level !== "all") {
    query += " AND LOWER(government_level) = ?";
    params.push(level.toLowerCase());
  }

  if (verificationStatus !== "all") {
    if (verificationStatus === "verified") {
      query += " AND (verification_status = 'verified' AND (criteria_completeness = 'verified' OR criteria_completeness IS NULL))";
    } else if (verificationStatus === "unverified" || verificationStatus === "requires_verification") {
      query += " AND (verification_status != 'verified' OR criteria_completeness = 'requires_verification' OR criteria_completeness = 'incomplete')";
    } else {
      query += " AND (verification_status = ? OR criteria_completeness = ?)";
      params.push(verificationStatus, verificationStatus);
    }
  }

  if (activeStatus !== "all") {
    if (activeStatus === "active" || activeStatus === "1" || activeStatus === true) {
      query += " AND (is_active = 1 OR is_active IS NULL)";
    } else if (activeStatus === "inactive" || activeStatus === "0" || activeStatus === false) {
      query += " AND is_active = 0";
    }
  }

  const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as count");
  const total = db.prepare(countQuery).get(...params).count;

  query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params).map(formatSchemeRow);
  return { total, schemes: rows };
}

export function adminCreateScheme(schemeData, adminUserId) {
  const validation = validateSchemeInput(schemeData, false);
  if (!validation.isValid) {
    const err = new Error(validation.errors.join(" "));
    err.validationErrors = validation.errors;
    err.statusCode = 400;
    throw err;
  }

  const id = schemeData.id || schemeData.code || `SCH_ADM_${Date.now()}`;
  const completeness = schemeData.criteriaCompleteness || schemeData.criteria_completeness ||
    (schemeData.verificationNotes ? "requires_verification" : "verified");
  const verificationStatus = schemeData.verificationStatus || schemeData.verification_status ||
    (completeness === "verified" ? "verified" : "unverified");
  const isActive = schemeData.isActive !== undefined ? (schemeData.isActive ? 1 : 0) : 1;
  const govLevel = (schemeData.level || schemeData.governmentLevel || schemeData.government_level || "central").toLowerCase();
  const rawCategories = schemeData.categories || (schemeData.category ? [schemeData.category] : ["ALL"]);

  const stmt = db.prepare(`
    INSERT INTO schemes (
      id, name, ministry, government_level, description, categories,
      min_age, max_age, income_limit, states, business_status,
      business_types, min_req, max_req, benefits, documents,
      application_steps, portal_url, source, verification_status,
      criteria_completeness, verification_notes, is_active, last_verified_date
    ) VALUES (
      @id, @name, @ministry, @government_level, @description, @categories,
      @min_age, @max_age, @income_limit, @states, @business_status,
      @business_types, @min_req, @max_req, @benefits, @documents,
      @application_steps, @portal_url, @source, @verification_status,
      @criteria_completeness, @verification_notes, @is_active, @last_verified_date
    )
  `);

  stmt.run({
    id,
    name: schemeData.name.trim(),
    ministry: schemeData.ministry.trim(),
    government_level: govLevel,
    description: schemeData.description || "",
    categories: JSON.stringify(Array.isArray(rawCategories) ? rawCategories : [rawCategories]),
    min_age: schemeData.minAge != null ? Number(schemeData.minAge) : null,
    max_age: schemeData.maxAge != null ? Number(schemeData.maxAge) : null,
    income_limit: schemeData.incomeLimit != null ? Number(schemeData.incomeLimit) : null,
    states: JSON.stringify(schemeData.states || ["ALL"]),
    business_status: JSON.stringify(schemeData.businessStatus || ["any"]),
    business_types: JSON.stringify(schemeData.businessTypes || ["Manufacturing", "Services"]),
    min_req: schemeData.minReq != null ? Number(schemeData.minReq) : null,
    max_req: schemeData.maxReq != null ? Number(schemeData.maxReq) : null,
    benefits: schemeData.benefits || schemeData.financialAssistance || "Direct financial assistance",
    documents: JSON.stringify(schemeData.documents || ["Aadhaar Card"]),
    application_steps: JSON.stringify(schemeData.applicationSteps || ["Apply online"]),
    portal_url: (schemeData.portalUrl || schemeData.portal_url || "https://myscheme.gov.in").trim(),
    source: (schemeData.source || "Official Ministry Portal / Gazetted Notification").trim(),
    verification_status: verificationStatus,
    criteria_completeness: completeness,
    verification_notes: schemeData.verificationNotes || schemeData.verification_notes || "",
    is_active: isActive,
    last_verified_date: schemeData.lastVerifiedDate || schemeData.last_verified_date || new Date().toISOString().split("T")[0],
  });

  recordAuditLog({
    userId: adminUserId,
    action: "SCHEME_CREATE",
    resourceType: "scheme",
    resourceId: id,
    details: { name: schemeData.name, completeness, isActive: Boolean(isActive) },
  });

  return formatSchemeRow(db.prepare("SELECT * FROM schemes WHERE id = ?").get(id));
}

export function adminUpdateScheme(id, schemeData, adminUserId) {
  const existing = db.prepare("SELECT * FROM schemes WHERE id = ?").get(id);
  if (!existing) return null;

  const validation = validateSchemeInput(schemeData, true);
  if (!validation.isValid) {
    const err = new Error(validation.errors.join(" "));
    err.validationErrors = validation.errors;
    err.statusCode = 400;
    throw err;
  }

  const stmt = db.prepare(`
    UPDATE schemes SET
      name = coalesce(@name, name),
      ministry = coalesce(@ministry, ministry),
      government_level = coalesce(@government_level, government_level),
      description = coalesce(@description, description),
      categories = coalesce(@categories, categories),
      min_age = coalesce(@min_age, min_age),
      max_age = coalesce(@max_age, max_age),
      income_limit = coalesce(@income_limit, income_limit),
      states = coalesce(@states, states),
      benefits = coalesce(@benefits, benefits),
      portal_url = coalesce(@portal_url, portal_url),
      source = coalesce(@source, source),
      verification_status = coalesce(@verification_status, verification_status),
      criteria_completeness = coalesce(@criteria_completeness, criteria_completeness),
      verification_notes = coalesce(@verification_notes, verification_notes),
      is_active = coalesce(@is_active, is_active),
      last_verified_date = coalesce(@last_verified_date, last_verified_date)
    WHERE id = @id
  `);

  const isActiveParam = schemeData.isActive !== undefined ? (schemeData.isActive ? 1 : 0) :
    (schemeData.is_active !== undefined ? Number(schemeData.is_active) : null);

  stmt.run({
    id,
    name: schemeData.name ? schemeData.name.trim() : null,
    ministry: schemeData.ministry ? schemeData.ministry.trim() : null,
    government_level: schemeData.governmentLevel || schemeData.government_level || null,
    description: schemeData.description || null,
    categories: schemeData.categories ? JSON.stringify(schemeData.categories) : null,
    min_age: schemeData.minAge != null ? Number(schemeData.minAge) : null,
    max_age: schemeData.maxAge != null ? Number(schemeData.maxAge) : null,
    income_limit: schemeData.incomeLimit != null ? Number(schemeData.incomeLimit) : null,
    states: schemeData.states ? JSON.stringify(schemeData.states) : null,
    benefits: schemeData.benefits || null,
    portal_url: (schemeData.portalUrl || schemeData.portal_url) ? (schemeData.portalUrl || schemeData.portal_url).trim() : null,
    source: schemeData.source ? schemeData.source.trim() : null,
    verification_status: schemeData.verificationStatus || schemeData.verification_status || null,
    criteria_completeness: schemeData.criteriaCompleteness || schemeData.criteria_completeness || null,
    verification_notes: schemeData.verificationNotes || schemeData.verification_notes || null,
    is_active: isActiveParam,
    last_verified_date: schemeData.lastVerifiedDate || schemeData.last_verified_date || null,
  });

  recordAuditLog({
    userId: adminUserId,
    action: "SCHEME_UPDATE",
    resourceType: "scheme",
    resourceId: id,
    details: { updatedKeys: Object.keys(schemeData) },
  });

  return formatSchemeRow(db.prepare("SELECT * FROM schemes WHERE id = ?").get(id));
}

export function adminToggleSchemeActive(id, isActive, adminUserId) {
  const existing = db.prepare("SELECT * FROM schemes WHERE id = ?").get(id);
  if (!existing) return null;

  const activeVal = isActive ? 1 : 0;
  db.prepare("UPDATE schemes SET is_active = ? WHERE id = ?").run(activeVal, id);

  recordAuditLog({
    userId: adminUserId,
    action: isActive ? "SCHEME_ACTIVATE" : "SCHEME_DEACTIVATE",
    resourceType: "scheme",
    resourceId: id,
    details: { name: existing.name, isActive: Boolean(activeVal) },
  });

  return formatSchemeRow(db.prepare("SELECT * FROM schemes WHERE id = ?").get(id));
}

export function adminDeleteScheme(id, adminUserId) {
  const existing = db.prepare("SELECT * FROM schemes WHERE id = ?").get(id);
  if (!existing) return false;

  const res = db.prepare("DELETE FROM schemes WHERE id = ?").run(id);

  recordAuditLog({
    userId: adminUserId,
    action: "SCHEME_DELETE",
    resourceType: "scheme",
    resourceId: id,
    details: { name: existing.name },
  });

  return res.changes > 0;
}

// -------------------------------------------------------------
// ADMIN DOCUMENT VERIFICATION OPERATIONS & PAGINATED QUEUE
// -------------------------------------------------------------
export function getAdminDocumentsQueue({ status = null, search = "", limit = 50, offset = 0 } = {}) {
  let query = `
    SELECT d.*, u.name as applicant_name, u.email as applicant_email, u.mobile as applicant_mobile,
           u.role as applicant_role, u.category_badge
    FROM documents d
    LEFT JOIN users u ON d.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (status && status !== "all") {
    if (status === "needs_review" || status === "Needs Review" || status === "pending") {
      query += " AND (d.verification_status = 'Needs Review' OR d.verification_status = 'pending' OR d.status = 'Under Review')";
    } else if (status === "verified" || status === "Verified") {
      query += " AND (d.verification_status = 'Verified Against Provided Criteria' OR d.verification_status = 'verified' OR d.status = 'Verified')";
    } else if (status === "rejected" || status === "Rejected") {
      query += " AND (d.verification_status = 'Rejected With Reason' OR d.verification_status = 'rejected' OR d.status = 'Rejected')";
    } else {
      query += " AND (d.verification_status = ? OR d.status = ?)";
      params.push(status, status);
    }
  }

  if (search) {
    query += " AND (LOWER(d.name) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(d.type) LIKE ?)";
    const term = `%${search.toLowerCase().trim()}%`;
    params.push(term, term, term);
  }

  const countQuery = query.replace(
    /SELECT d\.\*[\s\S]*?FROM documents d/i,
    "SELECT COUNT(*) as count FROM documents d"
  );
  const total = db.prepare(countQuery).get(...params).count;

  query += " ORDER BY d.created_at DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const documents = db.prepare(query).all(...params).map(formatDocumentRow);
  return { total, documents };
}

export function adminReviewDocument(docId, { verificationStatus, verificationNotes, reviewerAdminId }) {
  const prevDoc = db.prepare("SELECT * FROM documents WHERE id = ?").get(docId);
  if (!prevDoc) return false;

  let canonStatus = verificationStatus || "Needs Review";
  let statusDisplay = "Under Review";
  const vLower = (verificationStatus || "").toLowerCase();

  if (vLower === "verified" || vLower.includes("verified against")) {
    canonStatus = "Verified Against Provided Criteria";
    statusDisplay = "Verified";
  } else if (vLower === "rejected" || vLower.includes("rejected with")) {
    canonStatus = "Rejected With Reason";
    statusDisplay = "Rejected";
  } else if (vLower === "needs_review" || vLower.includes("needs review") || vLower === "pending") {
    canonStatus = "Needs Review";
    statusDisplay = "Under Review";
  }

  const stmt = db.prepare(`
    UPDATE documents
    SET verification_status = ?, status = ?, verification_notes = ?,
        reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  const res = stmt.run(canonStatus, statusDisplay, verificationNotes || "", reviewerAdminId || null, docId);

  logDocumentHistory({
    documentId: docId,
    userId: prevDoc.user_id,
    previousStatus: prevDoc.verification_status,
    newStatus: canonStatus,
    action: "MANUAL_REVIEW",
    actorId: reviewerAdminId,
    actorRole: "admin",
    notes: verificationNotes || "Administrative determination recorded at Verification Desk.",
  });

  recordAuditLog({
    userId: reviewerAdminId,
    action: "DOCUMENT_REVIEWED",
    resourceType: "document",
    resourceId: docId,
    details: { previousStatus: prevDoc.verification_status, newStatus: canonStatus, verificationNotes, status: canonStatus },
  });

  return res.changes > 0;
}

// -------------------------------------------------------------
// ADMIN OVERVIEW & REAL SQLITE ANALYTICS
// -------------------------------------------------------------
export function getAdminOverviewStats() {
  const usersCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
  const citizenCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE system_role = 'citizen'").get().c;
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM users WHERE system_role = 'admin'").get().c;
  const appCount = db.prepare("SELECT COUNT(*) as c FROM applications").get().c;

  // Real Scheme Statistics
  const totalSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes").get().c;
  const activeSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE is_active = 1 OR is_active IS NULL").get().c;
  const inactiveSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE is_active = 0").get().c;
  const centralSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE LOWER(government_level) = 'central'").get().c;
  const stateSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE LOWER(government_level) = 'state'").get().c;
  const verifiedCriteriaSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE criteria_completeness = 'verified'").get().c;
  const requiresVerificationSchemes = db.prepare("SELECT COUNT(*) as c FROM schemes WHERE criteria_completeness != 'verified' OR criteria_completeness IS NULL").get().c;

  // Real Document Statistics
  const docStats = db.prepare(`
    SELECT
      COUNT(*) as totalDocs,
      SUM(CASE WHEN verification_status = 'Needs Review' OR verification_status = 'pending' OR status = 'Under Review' THEN 1 ELSE 0 END) as pendingDocs,
      SUM(CASE WHEN verification_status = 'Verified Against Provided Criteria' OR verification_status = 'verified' OR status = 'Verified' THEN 1 ELSE 0 END) as verifiedDocs,
      SUM(CASE WHEN verification_status = 'Rejected With Reason' OR verification_status = 'rejected' OR status = 'Rejected' THEN 1 ELSE 0 END) as rejectedDocs
    FROM documents
  `).get();

  // Real Dossiers Count
  let totalDossiers = 0;
  try {
    totalDossiers = db.prepare("SELECT COUNT(*) as c FROM dossiers").get().c;
  } catch {}

  // Real Financial Aggregates from recorded applications
  const financialStats = db.prepare(`
    SELECT
      COALESCE(SUM(requested_amount), 0) as totalRequested,
      COALESCE(SUM(sanctioned_amount), 0) as totalSanctioned,
      COALESCE(SUM(subsidy_amount), 0) as totalSubsidy
    FROM applications
  `).get();

  // Real Assessments Count
  let totalAssessments = 0;
  try {
    totalAssessments = db.prepare("SELECT COUNT(*) as c FROM assessments").get().c;
  } catch {}

  // Real Audit Logs
  const recentAuditLogs = db.prepare(`
    SELECT a.*, u.name as user_name, u.email as user_email, u.system_role
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 25
  `).all();

  return {
    users: { total: usersCount, citizens: citizenCount, admins: adminCount },
    applications: { total: appCount },
    schemes: {
      total: totalSchemes,
      active: activeSchemes,
      inactive: inactiveSchemes,
      central: centralSchemes,
      state: stateSchemes,
      verifiedCriteria: verifiedCriteriaSchemes,
      requiresVerification: requiresVerificationSchemes,
    },
    documents: {
      total: docStats.totalDocs || 0,
      needsReview: docStats.pendingDocs || 0,
      pending: docStats.pendingDocs || 0,
      verified: docStats.verifiedDocs || 0,
      rejected: docStats.rejectedDocs || 0,
    },
    dossiers: {
      total: totalDossiers,
    },
    assessments: {
      total: totalAssessments,
    },
    financials: {
      totalRequested: financialStats.totalRequested || 0,
      totalSanctioned: financialStats.totalSanctioned || 0,
      totalSubsidy: financialStats.totalSubsidy || 0,
    },
    counts: {
      citizens: citizenCount,
      schemes: totalSchemes,
      activeSchemes,
      inactiveSchemes,
      centralSchemes,
      stateSchemes,
      verifiedCriteriaSchemes,
      requiresVerificationSchemes,
      applications: appCount,
      documentsNeedingReview: docStats.pendingDocs || 0,
      totalDocuments: docStats.totalDocs || 0,
      totalDossiers,
      totalSanctionedAmount: financialStats.totalSanctioned || 0,
    },
    citizensCount: citizenCount,
    activeSchemesCount: activeSchemes,
    totalSchemesCount: totalSchemes,
    inactiveSchemesCount: inactiveSchemes,
    dossiersCount: totalDossiers,
    totalRequestedAmount: financialStats.totalRequested || 0,
    totalSanctionedAmount: financialStats.totalSanctioned || 0,
    documentsNeedingReviewCount: docStats.pendingDocs || 0,
    recentAuditLogs,
    recentLogs: recentAuditLogs,
    timestamp: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// CITIZEN BANK DOSSIER DATABASE OPERATIONS
// -------------------------------------------------------------

export function formatDossierRow(d) {
  if (!d) return null;
  let schemeIds = [];
  let profileSnapshot = {};
  let eligibilitySummary = [];
  let documentsSummary = [];

  try {
    schemeIds = typeof d.scheme_ids === "string" ? JSON.parse(d.scheme_ids) : d.scheme_ids || [];
  } catch {}
  try {
    profileSnapshot = typeof d.profile_snapshot === "string" ? JSON.parse(d.profile_snapshot) : d.profile_snapshot || {};
  } catch {}
  try {
    eligibilitySummary = typeof d.eligibility_summary === "string" ? JSON.parse(d.eligibility_summary) : d.eligibility_summary || [];
  } catch {}
  try {
    documentsSummary = typeof d.documents_summary === "string" ? JSON.parse(d.documents_summary) : d.documents_summary || [];
  } catch {}

  return {
    id: d.id,
    referenceNumber: d.reference_number,
    userId: d.user_id,
    schemeIds,
    profileSnapshot,
    eligibilitySummary,
    documentsSummary,
    generatedAt: d.generated_at,
  };
}

export function createDossier({
  userId,
  schemeIds = [],
  profileSnapshot = {},
  eligibilitySummary = [],
  documentsSummary = [],
}) {
  if (!userId) throw new Error("userId is required to create a dossier.");

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const referenceNumber = `DOS-${dateStr}-${randomSuffix}`;
  const id = `dos_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const stmt = db.prepare(`
    INSERT INTO dossiers (
      id, reference_number, user_id, scheme_ids,
      profile_snapshot, eligibility_summary, documents_summary
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    referenceNumber,
    userId,
    JSON.stringify(schemeIds),
    JSON.stringify(profileSnapshot),
    JSON.stringify(eligibilitySummary),
    JSON.stringify(documentsSummary)
  );

  recordAuditLog({
    userId,
    action: "DOSSIER_GENERATE",
    resourceType: "dossier",
    resourceId: id,
    details: { referenceNumber, schemeCount: schemeIds.length },
  });

  return formatDossierRow(db.prepare("SELECT * FROM dossiers WHERE id = ?").get(id));
}

export function getUserDossiers(userId) {
  if (!userId) return [];
  const rows = db.prepare("SELECT * FROM dossiers WHERE user_id = ? ORDER BY generated_at DESC").all(userId);
  return rows.map(formatDossierRow);
}

export function getDossierById(id) {
  if (!id) return null;
  const row = db.prepare("SELECT * FROM dossiers WHERE id = ?").get(id);
  return formatDossierRow(row);
}

export function updateDossier(id, {
  schemeIds = null,
  profileSnapshot = null,
  eligibilitySummary = null,
  documentsSummary = null,
} = {}) {
  const existing = getDossierById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE dossiers
    SET scheme_ids = COALESCE(?, scheme_ids),
        profile_snapshot = COALESCE(?, profile_snapshot),
        eligibility_summary = COALESCE(?, eligibility_summary),
        documents_summary = COALESCE(?, documents_summary),
        generated_at = ?
    WHERE id = ?
  `).run(
    schemeIds ? JSON.stringify(schemeIds) : null,
    profileSnapshot ? JSON.stringify(profileSnapshot) : null,
    eligibilitySummary ? JSON.stringify(eligibilitySummary) : null,
    documentsSummary ? JSON.stringify(documentsSummary) : null,
    now,
    id
  );
  return getDossierById(id);
}

// Initialize tables and migrations on load
initDatabase();
