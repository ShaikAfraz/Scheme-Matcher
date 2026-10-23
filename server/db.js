/**
 * SQL DATABASE ENGINE (SQLite via better-sqlite3)
 * Persistent relational database for Scheme Matcher citizen accounts,
 * applications, verified documents, and government schemes.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "../database.sqlite");

// Initialize SQLite connection
export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

console.log(`[Database] SQLite connected successfully at: ${DB_PATH}`);

// Initialize SQL Tables
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
      user_id TEXT,
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
      user_id TEXT,
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

  console.log("[Database] All SQL tables (users, applications, documents, schemes) initialized.");
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
export function getAllUsers() {
  const stmt = db.prepare("SELECT * FROM users ORDER BY created_at DESC");
  const rows = stmt.all();
  return rows.map((r) => ({
    ...r,
    isDemo: Boolean(r.is_demo),
    categoryBadge: r.category_badge,
    badgeColor: r.badge_color,
    profileData: r.profile_data ? JSON.parse(r.profile_data) : null,
  }));
}

export function getUserById(id) {
  const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const r = stmt.get(id);
  if (!r) return null;
  return {
    ...r,
    isDemo: Boolean(r.is_demo),
    categoryBadge: r.category_badge,
    badgeColor: r.badge_color,
    profileData: r.profile_data ? JSON.parse(r.profile_data) : null,
  };
}

export function saveUser(user) {
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, mobile, password, avatar, role, category_badge, badge_color, is_demo, profile_data)
    VALUES (@id, @name, @email, @mobile, @password, @avatar, @role, @category_badge, @badge_color, @is_demo, @profile_data)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      email = excluded.email,
      mobile = excluded.mobile,
      password = excluded.password,
      avatar = excluded.avatar,
      role = excluded.role,
      category_badge = excluded.category_badge,
      badge_color = excluded.badge_color,
      is_demo = excluded.is_demo,
      profile_data = excluded.profile_data
  `);

  return stmt.run({
    id: user.id || `usr_${Date.now()}`,
    name: user.name,
    email: user.email || `${user.mobile || Date.now()}@citizen.in`,
    mobile: user.mobile || "",
    password: user.password || "pass123",
    avatar: user.avatar || "👤",
    role: user.role || "Citizen Entrepreneur",
    category_badge: user.categoryBadge || "Citizen",
    badge_color: user.badgeColor || "#B5651D",
    is_demo: user.isDemo ? 1 : 0,
    profile_data: user.profileData ? JSON.stringify(user.profileData) : null,
  });
}

// -------------------------------------------------------------
// APPLICATION OPERATIONS
// -------------------------------------------------------------
export function getAllApplications(userId = null) {
  let stmt;
  if (userId) {
    stmt = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC");
    return stmt.all(userId).map(formatAppRow);
  }
  stmt = db.prepare("SELECT * FROM applications ORDER BY created_at DESC");
  return stmt.all().map(formatAppRow);
}

export function getApplicationById(id) {
  const stmt = db.prepare("SELECT * FROM applications WHERE id = ?");
  const r = stmt.get(id);
  return r ? formatAppRow(r) : null;
}

export function saveApplication(app) {
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

  return stmt.run({
    id: app.id,
    scheme_id: app.schemeId || app.scheme_id,
    scheme_name: app.schemeName || app.scheme_name,
    ministry: app.ministry || "",
    user_id: app.userId || app.user_id || "anon",
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
}

export function deleteApplication(id) {
  const stmt = db.prepare("DELETE FROM applications WHERE id = ?");
  return stmt.run(id);
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

// -------------------------------------------------------------
// DOCUMENT OPERATIONS
// -------------------------------------------------------------
export function getAllDocuments(userId = null) {
  let stmt;
  if (userId) {
    stmt = db.prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC");
    return stmt.all(userId);
  }
  stmt = db.prepare("SELECT * FROM documents ORDER BY created_at DESC");
  return stmt.all();
}

export function saveDocument(doc) {
  const stmt = db.prepare(`
    INSERT INTO documents (id, user_id, name, size, type, type_id, uploaded_at, status)
    VALUES (@id, @user_id, @name, @size, @type, @type_id, @uploaded_at, @status)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status
  `);

  return stmt.run({
    id: doc.id || `doc_${Date.now()}`,
    user_id: doc.userId || doc.user_id || "anon",
    name: doc.name,
    size: doc.size || "",
    type: doc.type || "",
    type_id: doc.typeId || doc.type_id || "other",
    uploaded_at: doc.uploadedAt || doc.uploaded_at || "Today",
    status: doc.status || "Verified",
  });
}

// Initialize tables on load
initDatabase();
