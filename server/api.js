/**
 * REST API ROUTER & SECURITY MIDDLEWARE
 * Provides authenticated endpoints, session lifecycle management,
 * strict ownership enforcement on applications and documents,
 * and a secure server-side AI proxy.
 */

import {
  db,
  getAllUsers,
  getUserById,
  getUserByEmailOrMobile,
  saveUser,
  updateUserProfile,
  authenticateUser,
  createSession,
  getSessionUser,
  deleteSession,
  getApplications,
  getApplicationById,
  saveApplication,
  deleteApplication,
  lookupPublicApplication,
  getAllDocuments,
  getDocumentById,
  saveDocument,
  saveVerifiedDocument,
  deleteDocument,
  getDocumentHistory,
  findConflictingDocument,
  logDocumentHistory,
  saveAssessment,
  getUserAssessments,
  getAssessmentById,
  saveSchemeBookmark,
  getUserBookmarks,
  removeSchemeBookmark,
  recordAuditLog,
  getAuditLogs,
  getSystemStats,
  createPasswordResetToken,
  resetPasswordWithToken,
  changeUserPassword,
  createOrUpdateAdminAccount,
  formatSchemeRow,
  getAdminSchemes,
  adminCreateScheme,
  adminUpdateScheme,
  adminToggleSchemeActive,
  validateSchemeInput,
  adminDeleteScheme,
  getAdminDocumentsQueue,
  adminReviewDocument,
  getAdminOverviewStats,
  createDossier,
  updateDossier,
  getUserDossiers,
  getDossierById,
  formatDossierRow,
} from "./db.js";
import { sanitizeString, validateEmailOrMobile } from "./security.js";
import { parseFinancialAmount } from "../src/utils/financialInput.js";
import {
  validateUploadPayload,
  storeDocumentFile,
  readDocumentFile,
  deleteDocumentFile,
} from "./storage.js";
import { extractStructuredDocument } from "./verification/extractor.js";
import { verifyDocument } from "./verification/engine.js";
import { generateBankDossierPdf } from "./dossierPdf.js";
import {
  getSyncStatus,
  runSync,
  isSyncRunning,
  getSyncRuns,
  getSyncRunDetails,
  getReviewQueue,
  approveReviewItem,
  rejectReviewItem,
  batchApproveReviewItems,
  retryFailedRun,
  getSources,
  updateSource,
} from "./ingestion/syncService.js";
import {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
} from "./ingestion/scheduler.js";
import "./seed.js";
import fs from "node:fs";
import path from "node:path";

// Initialize ingestion background scheduler on module load
let schedulerStarted = false;
function initSchedulerOnce() {
  if (!schedulerStarted) {
    schedulerStarted = true;
    try {
      startScheduler(60000);
    } catch (err) {
      console.warn("[Ingestion Scheduler] Init deferred:", err.message);
    }
  }
}
initSchedulerOnce();

// Helper to parse JSON request bodies safely (supports base64 documents up to 15MB)
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Safeguard: reject payloads larger than 15MB
      if (body.length > 15 * 1024 * 1024) {
        reject(new Error("Payload too large: Exceeds statutory document upload ceiling of 15MB."));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

// Helper to determine allowed origin for CORS
function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return "http://localhost:5173";

  // Allow standard localhost and local network origins for dev/testing
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.startsWith("https://localhost:")
  ) {
    return origin;
  }
  return "http://localhost:5173";
}

function sendJson(res, statusCode, data, req = null) {
  const origin = req ? getAllowedOrigin(req) : "http://localhost:5173";
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });
  res.end(JSON.stringify(data));
}

function sendPdf(res, pdfBuffer, filename = "dossier.pdf", req = null) {
  const origin = req ? getAllowedOrigin(req) : "http://localhost:5173";
  res.writeHead(200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": pdfBuffer.length,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
  });
  res.end(pdfBuffer);
}

// Extract authenticated user from Authorization header
function getAuthUser(req) {
  const authHeader = req.headers.authorization || req.headers["x-session-token"];
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader.trim();

  if (!token) return null;
  return getSessionUser(token);
}

// Read AI API key from environment variables or .env / .env.local
function getAiApiKey() {
  const envCandidates = [
    process.env.OPENROUTER_API_KEY,
    process.env.VITE_OPENROUTER_API_KEY,
    process.env.AI_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
  ];
  for (const c of envCandidates) {
    if (c && typeof c === "string" && c.trim()) return c.trim();
  }

  // Fallback: parse .env.local and .env directly from filesystem
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        const match = content.match(/(?:OPENROUTER_API_KEY|VITE_OPENROUTER_API_KEY|AI_API_KEY|GEMINI_API_KEY|VITE_GEMINI_API_KEY)=([^\r\n]+)/);
        if (match && match[1] && match[1].trim()) {
          return match[1].trim();
        }
      }
    } catch {}
  }
  return null;
}

// Generate grounded fallback response when external AI is unavailable
function generateGroundedFallback({ question = "", profile = {}, matches = [] }) {
  const q = question.toLowerCase();
  const top = matches[0] || null;
  const topName = top ? (top.scheme?.name || top.scheme_name) : "Government Welfare Schemes";
  const topScore = top ? (top.score ?? top.match_score ?? 0) : 0;
  const topStatus = top ? (top.eligibilityStatus || (top.isEligible ? "Eligible" : "Potentially Eligible")) : "Under Review";
  const portalUrl = top?.scheme?.portalUrl || top?.scheme?.portal_url || top?.scheme?.source_url || "https://myscheme.gov.in";

  const statutoryDisclaimer = "\n\n*Statutory Notice: All recommendations are grounded in database parameters. Final approval and benefit sanction belong exclusively to the competent government department or financing bank upon physical document scrutiny.*";

  if (q.includes("document") || q.includes("certificate") || q.includes("paper")) {
    const docs = top?.scheme?.documents || [
      "Aadhaar Card",
      "Caste / Category Certificate",
      "Family Income Certificate",
      "Project Report (DPR)",
    ];
    return `For **${topName}** (Status: **${topStatus}**), the primary required documents are:\n` +
      docs.map((d) => `• ${d}`).join("\n") +
      "\n\nPlease ensure your caste and family income certificates are issued within the last 12 months by an authorized revenue official (Tehsildar / SDM)." +
      `\nOfficial Application Portal: ${portalUrl}` +
      statutoryDisclaimer;
  }

  if (q.includes("subsidy") || q.includes("margin") || q.includes("loan") || q.includes("benefit")) {
    const benefits = top?.scheme?.benefits || "Government financial subsidy and bank credit linkage";
    return `Under **${topName}**, the official benefit structure is:\n${benefits}\n\nNote that government subsidies are back-ended and credited via DBT after bank verification.` +
      `\nOfficial Application Portal: ${portalUrl}` +
      statutoryDisclaimer;
  }

  return `Based on your submitted profile (${profile.age || 28}yo, ${profile.category || "General"} category), your top evaluated program is **${topName}**.\n` +
    `• Eligibility Status: **${topStatus}**\n` +
    `• Relevance Match Score: **${topScore}/100**\n` +
    `• Implementing Authority: **${top?.scheme?.ministry || "Government of India"}**\n` +
    `• Official Application Portal: ${portalUrl}` +
    statutoryDisclaimer;
}

export function createDatabaseApiMiddleware() {
  return async (req, res, next) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
      const origin = getAllowedOrigin(req);
      res.writeHead(200, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      });
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    // Only intercept /api/* routes
    if (!pathname.startsWith("/api/")) {
      return next();
    }

    try {
      // ---------------------------------------------------------
      // HEALTH / SYSTEM STATS (DYNAMIC DATABASE-BACKED)
      // ---------------------------------------------------------
      if ((pathname === "/api/status" || pathname === "/api/stats") && req.method === "GET") {
        const stats = getSystemStats();

        return sendJson(res, 200, {
          status: "connected",
          engine: "SQLite 3 (better-sqlite3) with Relational Storage & Session Engine",
          database: "database.sqlite",
          persisted: true,
          stats,
          counts: {
            users: stats.users,
            applications: stats.applications,
            schemes: stats.schemes,
            assessments: stats.assessments,
            documents: stats.documents,
            bookmarks: stats.bookmarks,
            activeSessions: stats.activeSessions,
          },
          financials: stats.financials,
          stageDistribution: stats.stageDistribution,
          timestamp: new Date().toISOString(),
        }, req);
      }

      // ---------------------------------------------------------
      // AUTHENTICATION & SESSION MANAGEMENT
      // ---------------------------------------------------------
      if (pathname === "/api/auth/register" && req.method === "POST") {
        const data = await parseJsonBody(req);
        const name = sanitizeString(data.name);
        const email = sanitizeString(data.email).toLowerCase();
        const mobile = sanitizeString(data.mobile);
        const password = String(data.password || "");

        if (!name) {
          return sendJson(res, 400, { success: false, error: "Full name is required." }, req);
        }
        if (!email && !mobile) {
          return sendJson(res, 400, { success: false, error: "Email or mobile number is required." }, req);
        }
        if (password.length < 4) {
          return sendJson(res, 400, { success: false, error: "Password must be at least 4 characters long." }, req);
        }

        // Check if user already exists
        const existing = getUserByEmailOrMobile(email || mobile);
        if (existing) {
          return sendJson(res, 409, { success: false, error: "An account with this email or mobile number already exists." }, req);
        }

        let initialProfile = data.profileData || data || {};
        if (typeof initialProfile === "object") {
          initialProfile = { ...initialProfile };
          if (initialProfile.income !== undefined && initialProfile.income !== null && initialProfile.income !== "") {
            const parsedInc = parseFinancialAmount(initialProfile.income, { fieldName: "Annual Family Income" });
            if (parsedInc.valid && parsedInc.numeric != null) {
              initialProfile.income = parsedInc.numeric;
            }
          }
          if (initialProfile.financialRequirement !== undefined && initialProfile.financialRequirement !== null && initialProfile.financialRequirement !== "") {
            const parsedReq = parseFinancialAmount(initialProfile.financialRequirement, { fieldName: "Financial Requirement" });
            if (parsedReq.valid && parsedReq.numeric != null) {
              initialProfile.financialRequirement = parsedReq.numeric;
            }
          }
          if (initialProfile.age !== undefined && initialProfile.age !== null && initialProfile.age !== "") {
            const a = Number(initialProfile.age);
            if (!isNaN(a)) initialProfile.age = a;
          }
        }

        const newUser = saveUser({
          id: `usr_${Date.now()}`,
          name,
          email: email || `${mobile}@citizen.in`,
          mobile,
          password,
          avatar: data.gender === "Female" ? "👩🏽" : "👨🏽",
          role: `${data.category || "Citizen"} Entrepreneur · ${data.businessType || "Micro-business"}`,
          systemRole: "citizen",
          categoryBadge: `${data.category || "Citizen"} · ${data.state || "India"}`,
          badgeColor: "#B5651D",
          isDemo: false,
          profileData: initialProfile,
        });

        // Create session
        const session = createSession(newUser.id);
        return sendJson(res, 201, {
          success: true,
          message: "Registration successful",
          token: session.token,
          user: newUser,
        }, req);
      }

      if (pathname === "/api/auth/login" && req.method === "POST") {
        const data = await parseJsonBody(req);
        const identifier = sanitizeString(data.identifier || data.email || data.mobile);
        const password = String(data.password || "");

        if (!identifier || !password) {
          return sendJson(res, 400, { success: false, error: "Identifier and password are required." }, req);
        }

        const user = authenticateUser(identifier, password);
        if (!user) {
          return sendJson(res, 401, { success: false, error: "Invalid email/mobile or password." }, req);
        }

        const session = createSession(user.id);
        return sendJson(res, 200, {
          success: true,
          message: "Logged in successfully",
          token: session.token,
          user,
        }, req);
      }

      // Dedicated Institutional Administrator Login Endpoint
      if (pathname === "/api/auth/admin/login" && req.method === "POST") {
        const data = await parseJsonBody(req);
        const identifier = sanitizeString(data.identifier || data.email);
        const password = String(data.password || "");

        if (!identifier || !password) {
          return sendJson(res, 400, { success: false, error: "Administrative email/identifier and password are required." }, req);
        }

        const user = authenticateUser(identifier, password);
        if (!user) {
          return sendJson(res, 401, { success: false, error: "Invalid administrative credentials." }, req);
        }

        // Strict server-side verification: user MUST be an admin
        if (user.systemRole !== "admin") {
          recordAuditLog({
            userId: user.id,
            action: "ADMIN_LOGIN_DENIED",
            resourceType: "user",
            resourceId: user.id,
            details: { reason: "Non-admin account attempted admin login" },
          });
          return sendJson(res, 403, {
            success: false,
            error: "Access denied: Account is not an authorized administrator. Please sign in through the Citizen Portal.",
          }, req);
        }

        recordAuditLog({
          userId: user.id,
          action: "ADMIN_LOGIN_SUCCESS",
          resourceType: "user",
          resourceId: user.id,
          details: { email: user.email },
        });

        const session = createSession(user.id);
        return sendJson(res, 200, {
          success: true,
          message: "Administrative authentication successful.",
          token: session.token,
          user,
        }, req);
      }

      // Password Recovery: Request Reset Token
      if (pathname === "/api/auth/forgot-password" && req.method === "POST") {
        const data = await parseJsonBody(req);
        const identifier = sanitizeString(data.identifier || data.email || data.mobile);

        if (!identifier) {
          return sendJson(res, 400, { success: false, error: "Email or mobile number is required to request a password reset." }, req);
        }

        const resetResult = createPasswordResetToken(identifier);
        if (!resetResult) {
          return sendJson(res, 404, { success: false, error: "No citizen or administrator account found with this identifier." }, req);
        }

        return sendJson(res, 200, {
          success: true,
          message: "Password reset token generated successfully. In production, this is dispatched via SMS/email OTP.",
          resetToken: resetResult.token,
          email: resetResult.email,
          expiresAt: resetResult.expiresAt,
        }, req);
      }

      // Password Recovery: Submit New Password
      if (pathname === "/api/auth/reset-password" && req.method === "POST") {
        const data = await parseJsonBody(req);
        const token = sanitizeString(data.token);
        const newPassword = String(data.newPassword || data.password || "");

        if (!token || !newPassword) {
          return sendJson(res, 400, { success: false, error: "Reset token and new password are required." }, req);
        }

        if (newPassword.length < 4) {
          return sendJson(res, 400, { success: false, error: "New password must be at least 4 characters long." }, req);
        }

        const resetStatus = resetPasswordWithToken(token, newPassword);
        if (!resetStatus.success) {
          return sendJson(res, 400, resetStatus, req);
        }

        return sendJson(res, 200, resetStatus, req);
      }

      // Password Rotation (Authenticated User or Administrator)
      if (pathname === "/api/auth/change-password" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to rotate password." }, req);
        }

        const data = await parseJsonBody(req);
        const currentPassword = String(data.currentPassword || data.oldPassword || "");
        const newPassword = String(data.newPassword || "");

        const changeResult = changeUserPassword(authUser.id, currentPassword, newPassword);
        if (!changeResult.success) {
          return sendJson(res, 400, changeResult, req);
        }

        return sendJson(res, 200, changeResult, req);
      }

      if (pathname === "/api/auth/logout" && req.method === "POST") {
        const authHeader = req.headers.authorization || req.headers["x-session-token"];
        if (authHeader) {
          const token = authHeader.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : authHeader.trim();
          deleteSession(token);
        }
        return sendJson(res, 200, { success: true, message: "Logged out successfully." }, req);
      }

      if (pathname === "/api/auth/me" && req.method === "GET") {
        const user = getAuthUser(req);
        if (!user) {
          return sendJson(res, 401, { success: false, error: "Not authenticated or session expired." }, req);
        }
        return sendJson(res, 200, { success: true, user }, req);
      }

      if (pathname === "/api/auth/profile" && req.method === "PUT") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to update profile." }, req);
        }
        const data = await parseJsonBody(req);
        if (!data || typeof data !== "object") {
          return sendJson(res, 400, { success: false, error: "Invalid profile data payload." }, req);
        }

        const cleanData = { ...data };

        // Validate and sanitize Annual Family Income
        if (cleanData.income !== undefined && cleanData.income !== null && cleanData.income !== "") {
          const parsedIncome = parseFinancialAmount(cleanData.income, { fieldName: "Annual Family Income" });
          if (!parsedIncome.valid) {
            return sendJson(res, 400, { success: false, error: parsedIncome.error }, req);
          }
          cleanData.income = parsedIncome.numeric;
        }

        // Validate and sanitize Project Cost / Financial Requirement
        if (cleanData.financialRequirement !== undefined && cleanData.financialRequirement !== null && cleanData.financialRequirement !== "") {
          const parsedReq = parseFinancialAmount(cleanData.financialRequirement, { fieldName: "Financial Requirement" });
          if (!parsedReq.valid) {
            return sendJson(res, 400, { success: false, error: parsedReq.error }, req);
          }
          cleanData.financialRequirement = parsedReq.numeric;
        }

        // Validate age if provided
        if (cleanData.age !== undefined && cleanData.age !== null && cleanData.age !== "") {
          const ageNum = Number(cleanData.age);
          if (isNaN(ageNum) || ageNum < 0 || ageNum > 125) {
            return sendJson(res, 400, { success: false, error: "Please enter a valid age between 0 and 125." }, req);
          }
          cleanData.age = ageNum;
        }

        const updatedUser = updateUserProfile(authUser.id, cleanData);
        return sendJson(res, 200, {
          success: true,
          message: "Profile updated successfully.",
          user: updatedUser,
        }, req);
      }

      // ---------------------------------------------------------
      // CITIZEN USERS ENDPOINT (SECURED: ADMIN ONLY)
      // ---------------------------------------------------------
      if (pathname === "/api/users" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required to list all citizen accounts." }, req);
        }
        const users = getAllUsers(true);
        return sendJson(res, 200, { success: true, count: users.length, users }, req);
      }

      // ---------------------------------------------------------
      // APPLICATION ENDPOINTS (STRICT OWNERSHIP ENFORCEMENT)
      // ---------------------------------------------------------
      // Public reference tracker (no sensitive citizen details leaked)
      if (pathname === "/api/applications/track" && req.method === "GET") {
        const q = url.searchParams.get("q") || url.searchParams.get("id");
        if (!q) {
          return sendJson(res, 400, { success: false, error: "Application Reference ID or Mobile is required." }, req);
        }
        const matched = lookupPublicApplication(q);
        if (!matched) {
          return sendJson(res, 404, { success: false, error: "No matching application found in National Registry." }, req);
        }
        return sendJson(res, 200, { success: true, application: matched }, req);
      }

      if (pathname === "/api/applications" && req.method === "GET") {
        const authUser = getAuthUser(req);
        const requestedId = url.searchParams.get("id");

        // Specific application by ID
        if (requestedId) {
          // If public query requested without session, check if public reference lookup
          if (!authUser) {
            const publicApp = lookupPublicApplication(requestedId);
            if (!publicApp) {
              return sendJson(res, 404, { success: false, error: "Application not found" }, req);
            }
            return sendJson(res, 200, { success: true, application: publicApp }, req);
          }

          const app = getApplicationById(requestedId, {
            userId: authUser.id,
            role: authUser.systemRole,
          });
          if (!app) {
            return sendJson(res, 404, { success: false, error: "Application not found or unauthorized." }, req);
          }
          return sendJson(res, 200, { success: true, application: app }, req);
        }

        // List applications: requires authentication
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view your applications." }, req);
        }

        const apps = getApplications({
          userId: authUser.id,
          role: authUser.systemRole,
        });
        return sendJson(res, 200, { success: true, count: apps.length, applications: apps }, req);
      }

      if (pathname === "/api/applications" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to submit or update an application." }, req);
        }

        const appData = await parseJsonBody(req);
        if (!appData.id || !appData.schemeName) {
          return sendJson(res, 400, { success: false, error: "Application ID and Scheme Name are required." }, req);
        }

        // Force ownership: Citizen cannot spoof another citizen's ID
        try {
          const saved = saveApplication(appData, {
            userId: authUser.id,
            role: authUser.systemRole,
          });
          return sendJson(res, 201, {
            success: true,
            message: "Application saved to database.",
            application: saved,
          }, req);
        } catch (err) {
          return sendJson(res, 403, { success: false, error: err.message }, req);
        }
      }

      if (pathname === "/api/applications" && req.method === "DELETE") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to delete an application." }, req);
        }

        const id = url.searchParams.get("id");
        if (!id) {
          return sendJson(res, 400, { success: false, error: "Application ID is required." }, req);
        }

        try {
          const deleted = deleteApplication(id, {
            userId: authUser.id,
            role: authUser.systemRole,
          });
          if (!deleted) {
            return sendJson(res, 404, { success: false, error: "Application not found or access denied." }, req);
          }
          return sendJson(res, 200, { success: true, message: `Application ${id} deleted successfully.` }, req);
        } catch (err) {
          return sendJson(res, 403, { success: false, error: err.message }, req);
        }
      }

      // ---------------------------------------------------------
      // REAL DOCUMENT UPLOAD, VERIFICATION & STORAGE ENDPOINTS
      // ---------------------------------------------------------

      // 1. List citizen vault documents
      if (pathname === "/api/documents" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view documents." }, req);
        }
        const docs = getAllDocuments(authUser.id, authUser.systemRole);
        return sendJson(res, 200, { success: true, count: docs.length, documents: docs }, req);
      }

      // 2. Real Document Upload & Deterministic Verification Pipeline
      if (pathname === "/api/documents/upload" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to upload documents." }, req);
        }

        try {
          const body = await parseJsonBody(req);
          const { filename, fileType, fileData, typeId, typeLabel, schemeId, notes } = body;

          if (!fileData) {
            return sendJson(res, 400, { success: false, error: "File data (base64) is required." }, req);
          }

          // Decode base64 buffer
          const buffer = Buffer.from(fileData, "base64");

          // Validate file size, extension, magic bytes, and compute SHA-256
          const validated = validateUploadPayload({
            filename: filename || "document.pdf",
            buffer,
            reportedMimeType: fileType,
          });

          // Generate random secure document ID
          const docId = `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

          // Store file in private object storage (non-public directory)
          const storedPath = storeDocumentFile({
            userId: authUser.id,
            docId,
            buffer,
            ext: validated.ext,
          });

          // Step 1: Extract text and structured fields from PDF / Image
          const extraction = await extractStructuredDocument(
            buffer,
            validated.mimeType,
            validated.safeFilename,
            typeId || "other"
          );

          // Step 2: Check registry for duplicate uploads or conflicting certificate numbers
          const duplicateChecks = findConflictingDocument({
            fileHash: validated.fileHash,
            certificateNumber: extraction.certificateNumber,
            excludeUserId: authUser.id,
          });

          // Step 3: Fetch scheme requirements if target scheme specified
          let targetScheme = null;
          if (schemeId) {
            const rawScheme = db.prepare("SELECT * FROM schemes WHERE id = ?").get(schemeId);
            if (rawScheme) {
              targetScheme = formatSchemeRow(rawScheme);
            }
          }

          // Step 4: Fetch user's profile for deterministic comparison
          let userProfile = authUser.profileData || {};
          const dbUser = db.prepare("SELECT profile_data, name FROM users WHERE id = ?").get(authUser.id);
          if (dbUser && dbUser.profile_data) {
            try {
              userProfile = { ...JSON.parse(dbUser.profile_data), name: dbUser.name || authUser.name };
            } catch {}
          } else {
            userProfile.name = authUser.name;
          }

          // Step 5: Execute deterministic verification rules
          const verification = verifyDocument({
            extractedData: {
              ...extraction,
              userSelectedType: typeId || "other",
            },
            userProfile,
            scheme: targetScheme,
            duplicateChecks,
          });

          // Step 6: Persist in SQLite with full verification metadata
          const savedDoc = saveVerifiedDocument(
            {
              id: docId,
              name: validated.safeFilename,
              size: (validated.sizeBytes / 1024).toFixed(1) + " KB",
              type: typeLabel || `${typeId.toUpperCase()} Certificate`,
              typeId: typeId || "other",
              uploadedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              status: verification.status,
              verificationStatus: verification.status,
              verificationReason: verification.summary,
              verificationEvidence: verification.evidence,
              missingRequirements: verification.missingRequirements,
              filePath: storedPath,
              fileHash: validated.fileHash,
              mimeType: validated.mimeType,
              sizeBytes: validated.sizeBytes,
              schemeId: schemeId || null,
              extractedData: extraction,
              extractionConfidence: extraction.confidence || 0.0,
            },
            authUser.id
          );

          return sendJson(
            res,
            201,
            {
              success: true,
              message: "Document uploaded, securely stored, and evaluated against criteria.",
              document: savedDoc,
              verification,
            },
            req
          );
        } catch (err) {
          console.error("[API] Document upload error:", err.message);
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // Backward-compatible POST /api/documents
      if (pathname === "/api/documents" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to upload documents." }, req);
        }
        const docData = await parseJsonBody(req);
        const savedDoc = saveDocument(docData, authUser.id);
        return sendJson(res, 201, { success: true, message: "Document record saved.", document: savedDoc }, req);
      }

      // 3. Document Details & Verification Evidence
      if (pathname.startsWith("/api/documents/") && !pathname.includes("/preview") && !pathname.includes("/download") && !pathname.includes("/history") && !pathname.includes("/reverify") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        const docId = pathname.replace("/api/documents/", "");
        const doc = getDocumentById(docId, authUser.id, authUser.systemRole);
        if (!doc) {
          return sendJson(res, 404, { success: false, error: "Document not found or access denied." }, req);
        }
        return sendJson(res, 200, { success: true, document: doc }, req);
      }

      // 4. Secure Private Storage Download / Preview (Protected by Auth & Access Policy)
      if (pathname.startsWith("/api/documents/") && (pathname.endsWith("/download") || pathname.endsWith("/preview")) && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to access private document." }, req);
        }

        const isDownload = pathname.endsWith("/download");
        const docId = pathname.replace("/api/documents/", "").replace("/download", "").replace("/preview", "");
        const doc = getDocumentById(docId, authUser.id, authUser.systemRole);

        if (!doc || !doc.filePath) {
          return sendJson(res, 404, { success: false, error: "Document file not found or access denied." }, req);
        }

        const buffer = readDocumentFile(doc.filePath);
        if (!buffer) {
          return sendJson(res, 404, { success: false, error: "Underlying file data missing from private storage vault." }, req);
        }

        const disposition = isDownload ? "attachment" : "inline";
        res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");
        res.setHeader("Content-Disposition", `${disposition}; filename="${doc.name}"`);
        res.setHeader("Content-Length", buffer.length);
        res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.writeHead(200);
        res.end(buffer);
        return;
      }

      // 5. Verification Timeline History
      if (pathname.startsWith("/api/documents/") && pathname.endsWith("/history") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        const docId = pathname.replace("/api/documents/", "").replace("/history", "");
        const history = getDocumentHistory(docId, authUser.id, authUser.systemRole);
        return sendJson(res, 200, { success: true, count: history.length, history }, req);
      }

      // 6. Re-Verify Document against Updated Profile / Scheme Criteria
      if (pathname.startsWith("/api/documents/") && pathname.endsWith("/reverify") && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        const docId = pathname.replace("/api/documents/", "").replace("/reverify", "");
        const doc = getDocumentById(docId, authUser.id, authUser.systemRole);
        if (!doc) {
          return sendJson(res, 404, { success: false, error: "Document not found or access denied." }, req);
        }

        const body = await parseJsonBody(req);
        const schemeId = body.schemeId || doc.schemeId;
        let targetScheme = null;
        if (schemeId) {
          const rawScheme = db.prepare("SELECT * FROM schemes WHERE id = ?").get(schemeId);
          if (rawScheme) targetScheme = formatSchemeRow(rawScheme);
        }

        let userProfile = authUser.profileData || {};
        const dbUser = db.prepare("SELECT profile_data, name FROM users WHERE id = ?").get(authUser.id);
        if (dbUser && dbUser.profile_data) {
          try {
            userProfile = { ...JSON.parse(dbUser.profile_data), name: dbUser.name || authUser.name };
          } catch {}
        }

        const duplicateChecks = findConflictingDocument({
          fileHash: doc.fileHash,
          certificateNumber: doc.extractedData?.certificateNumber,
          excludeUserId: authUser.id,
        });

        const verification = verifyDocument({
          extractedData: {
            ...(doc.extractedData || {}),
            userSelectedType: doc.typeId,
          },
          userProfile,
          scheme: targetScheme,
          duplicateChecks,
        });

        const updatedDoc = saveVerifiedDocument(
          {
            ...doc,
            verificationStatus: verification.status,
            verificationReason: verification.summary,
            verificationEvidence: verification.evidence,
            missingRequirements: verification.missingRequirements,
            schemeId: schemeId || null,
          },
          authUser.id
        );

        return sendJson(res, 200, { success: true, message: "Document re-verified successfully.", document: updatedDoc, verification }, req);
      }

      // 7. Delete Document Securely
      if (pathname.startsWith("/api/documents/") && req.method === "DELETE") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        const docId = pathname.replace("/api/documents/", "");
        try {
          const doc = getDocumentById(docId, authUser.id, authUser.systemRole);
          if (!doc) {
            return sendJson(res, 404, { success: false, error: "Document not found or access denied." }, req);
          }

          // Check if document is linked to a sanctioned or submitted application
          const linkedApp = db.prepare(`
            SELECT id, status FROM applications
            WHERE user_id = ? AND (status = 'sanctioned' OR status = 'under_review')
            LIMIT 1
          `).get(authUser.id);

          if (linkedApp && authUser.systemRole !== "admin") {
            return sendJson(
              res,
              400,
              {
                success: false,
                error: `Document cannot be deleted while application ${linkedApp.id} is actively under review or sanctioned.`,
              },
              req
            );
          }

          const deletedDoc = deleteDocument(docId, authUser.id, authUser.systemRole);
          if (deletedDoc && deletedDoc.file_path) {
            deleteDocumentFile(deletedDoc.file_path);
          }

          return sendJson(res, 200, { success: true, message: "Document deleted securely from private vault." }, req);
        } catch (err) {
          return sendJson(res, 403, { success: false, error: err.message }, req);
        }
      }


      // ---------------------------------------------------------
      // ELIGIBILITY ASSESSMENTS (PERSISTED MATCH HISTORY)
      // ---------------------------------------------------------
      if (pathname === "/api/assessments" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view assessment history." }, req);
        }

        const requestedId = url.searchParams.get("id");
        if (requestedId) {
          const assessment = getAssessmentById(requestedId, {
            userId: authUser.id,
            role: authUser.systemRole,
          });
          if (!assessment) {
            return sendJson(res, 404, { success: false, error: "Assessment record not found or access denied." }, req);
          }
          return sendJson(res, 200, { success: true, assessment }, req);
        }

        const targetUserId = (authUser.systemRole === "admin" && url.searchParams.get("userId"))
          ? url.searchParams.get("userId")
          : authUser.id;

        const limit = Math.min(Number(url.searchParams.get("limit") || 10), 100);
        const assessments = getUserAssessments(targetUserId, { limit });
        return sendJson(res, 200, { success: true, count: assessments.length, assessments }, req);
      }

      if (pathname === "/api/assessments" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to save assessment." }, req);
        }

        const body = await parseJsonBody(req);
        const saved = saveAssessment({
          id: body.id,
          userId: authUser.id,
          profileSnapshot: body.profileSnapshot || body.profile || {},
          matchedSchemesCount: body.matchedSchemesCount || body.matchedCount || 0,
          topSchemeId: body.topSchemeId || null,
          topSchemeName: body.topSchemeName || null,
          topScore: body.topScore || 0,
          resultsSummary: body.resultsSummary || body.results || [],
          ruleVersion: body.ruleVersion || body.rule_version || "v2.0-deterministic-574",
          totalEvaluated: body.totalEvaluated || body.total_evaluated || 574,
          eligibleCount: body.eligibleCount || body.eligible_count || 0,
          potentiallyEligibleCount: body.potentiallyEligibleCount || body.potentially_eligible_count || 0,
          notEligibleCount: body.notEligibleCount || body.not_eligible_count || 0,
          criterionResults: body.criterionResults || body.criterion_results || null,
        });

        return sendJson(res, 201, {
          success: true,
          message: "Assessment saved to persistent database.",
          assessment: saved,
        }, req);
      }

      // ---------------------------------------------------------
      // SAVED / BOOKMARKED SCHEMES (SECURED)
      // ---------------------------------------------------------
      if (pathname === "/api/bookmarks" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view saved schemes." }, req);
        }
        const bookmarks = getUserBookmarks(authUser.id);
        return sendJson(res, 200, { success: true, count: bookmarks.length, bookmarks }, req);
      }

      if (pathname === "/api/bookmarks" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to bookmark schemes." }, req);
        }
        const body = await parseJsonBody(req);
        const schemeId = body.schemeId || body.scheme_id;
        if (!schemeId) {
          return sendJson(res, 400, { success: false, error: "Scheme ID is required." }, req);
        }
        const saved = saveSchemeBookmark(authUser.id, schemeId, body.notes || "");
        return sendJson(res, 201, { success: true, message: "Scheme bookmarked successfully.", bookmark: saved }, req);
      }

      if (pathname === "/api/bookmarks" && req.method === "DELETE") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to remove bookmark." }, req);
        }
        const schemeId = url.searchParams.get("schemeId") || url.searchParams.get("scheme_id");
        if (!schemeId) {
          return sendJson(res, 400, { success: false, error: "Scheme ID is required." }, req);
        }
        const removed = removeSchemeBookmark(authUser.id, schemeId);
        if (!removed) {
          return sendJson(res, 404, { success: false, error: "Bookmark not found." }, req);
        }
        return sendJson(res, 200, { success: true, message: "Bookmark removed successfully." }, req);
      }

      // ---------------------------------------------------------
      // AUDIT LOGS (ADMIN ONLY)
      // ---------------------------------------------------------
      if (pathname === "/api/audit-logs" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser || authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required to view audit logs." }, req);
        }
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const action = url.searchParams.get("action");
        const logs = getAuditLogs({ role: authUser.systemRole, limit, action });
        return sendJson(res, 200, { success: true, count: logs.length, logs }, req);
      }

      // ---------------------------------------------------------
      // BANK DOSSIERS (CITIZEN & ADMIN ACCESS)
      // ---------------------------------------------------------

      // 1. Generate & Save New Dossier
      if (pathname === "/api/dossiers" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to generate a dossier." }, req);
        }

        const body = await parseJsonBody(req);
        let schemeIds = body.schemeIds || body.scheme_ids || [];
        let profileSnapshot = body.profileSnapshot || body.profile || null;
        let eligibilitySummary = body.eligibilitySummary || body.eligibility_summary || [];
        let documentsSummary = body.documentsSummary || body.documents_summary || null;

        // Auto-hydrate profile if not passed
        if (!profileSnapshot) {
          const u = getUserById(authUser.id, false);
          profileSnapshot = u ? { ...u, ...(u.profileData || {}) } : { name: authUser.name, email: authUser.email };
        }

        // Auto-hydrate documents if not passed
        if (!documentsSummary) {
          documentsSummary = getAllDocuments(authUser.id);
        }

        // If schemeIds is empty, check if top schemes exist in recent assessments or bookmarks
        if (schemeIds.length === 0) {
          const recentAssessment = db.prepare("SELECT * FROM assessments WHERE user_id = ? ORDER BY created_at DESC LIMIT 1").get(authUser.id);
          if (recentAssessment && recentAssessment.top_scheme_id) {
            schemeIds = [recentAssessment.top_scheme_id];
          }
        }

        // If still empty, grab first active scheme from DB to ensure dossier is always printable
        if (schemeIds.length === 0) {
          const firstScheme = db.prepare("SELECT id FROM schemes WHERE is_active = 1 LIMIT 1").get();
          if (firstScheme) schemeIds = [firstScheme.id];
        }

        // Hydrate eligibility summary if empty
        if (eligibilitySummary.length === 0 && schemeIds.length > 0) {
          const placeholders = schemeIds.map(() => "?").join(",");
          const matchedSchemes = db.prepare(`SELECT * FROM schemes WHERE id IN (${placeholders})`).all(...schemeIds).map(formatSchemeRow);
          eligibilitySummary = matchedSchemes.map((s) => ({
            schemeId: s.id,
            schemeName: s.name,
            ministry: s.ministry,
            benefits: s.benefits,
            portalUrl: s.portalUrl,
            eligibilityStatus: "Eligible",
          }));
        }

        const dossier = createDossier({
          userId: authUser.id,
          schemeIds,
          profileSnapshot,
          eligibilitySummary,
          documentsSummary,
        });

        return sendJson(res, 201, {
          success: true,
          message: "Bank Dossier generated and saved successfully.",
          dossier,
        }, req);
      }

      // 2. List User's Dossiers
      if (pathname === "/api/dossiers" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view dossiers." }, req);
        }

        let targetUserId = authUser.id;
        const requestedUser = url.searchParams.get("userId");
        if (requestedUser && authUser.systemRole === "admin") {
          targetUserId = requestedUser;
        }

        const dossiers = getUserDossiers(targetUserId);
        return sendJson(res, 200, {
          success: true,
          count: dossiers.length,
          dossiers,
        }, req);
      }

      // 3. Download / Stream Dossier PDF (Restricted to Owner and Admin)
      if (pathname.startsWith("/api/dossiers/") && pathname.endsWith("/pdf") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to download dossier PDF." }, req);
        }

        const dossierId = pathname.replace("/api/dossiers/", "").replace("/pdf", "");
        const dossier = getDossierById(dossierId);
        if (!dossier) {
          return sendJson(res, 404, { success: false, error: "Dossier record not found." }, req);
        }

        // Strict authorization check: Owner or Admin only
        if (dossier.userId !== authUser.id && authUser.systemRole !== "admin") {
          return sendJson(res, 403, {
            success: false,
            error: "Access denied: You do not have permission to view or download another citizen's dossier.",
          }, req);
        }

        // Fetch scheme details for the dossier
        let schemes = [];
        if (dossier.schemeIds && dossier.schemeIds.length > 0) {
          const placeholders = dossier.schemeIds.map(() => "?").join(",");
          schemes = db.prepare(`SELECT * FROM schemes WHERE id IN (${placeholders})`).all(...dossier.schemeIds).map(formatSchemeRow);
        }
        if (schemes.length === 0 && Array.isArray(dossier.eligibilitySummary) && dossier.eligibilitySummary.length > 0) {
          schemes = dossier.eligibilitySummary.map((s) => ({
            id: s.schemeId || s.id,
            name: s.schemeName || s.name,
            ministry: s.ministry,
            benefits: s.benefits,
            portalUrl: s.portalUrl || s.portal_url,
            eligibilityStatus: s.eligibilityStatus || "Eligible",
          }));
        }

        let documents = dossier.documentsSummary;
        if (!Array.isArray(documents) || documents.length === 0) {
          documents = getAllDocuments(dossier.userId);
        }

        const shouldRegenerate = url.searchParams.get("regenerate") === "true";
        let profile = dossier.profileSnapshot || {};
        if (shouldRegenerate) {
          const latestUser = getUserById(dossier.userId, false);
          if (latestUser) {
            profile = { ...profile, ...latestUser, ...(latestUser.profileData || {}) };
          }
          documents = getAllDocuments(dossier.userId);
        }

        const pdfBuffer = generateBankDossierPdf({
          referenceNumber: dossier.referenceNumber,
          generatedAt: shouldRegenerate ? new Date().toISOString() : dossier.generatedAt,
          profile,
          schemes,
          documents,
          eligibilityResults: dossier.eligibilitySummary || [],
        });

        recordAuditLog({
          userId: authUser.id,
          action: "DOSSIER_DOWNLOAD_PDF",
          resourceType: "dossier",
          resourceId: dossier.id,
          details: { referenceNumber: dossier.referenceNumber, isRegenerated: shouldRegenerate },
        });

        return sendPdf(res, pdfBuffer, `${dossier.referenceNumber}.pdf`, req);
      }

      // 4. Regenerate Existing Dossier with Current Profile & Documents
      if (pathname.startsWith("/api/dossiers/") && pathname.endsWith("/regenerate") && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to regenerate dossier." }, req);
        }

        const dossierId = pathname.replace("/api/dossiers/", "").replace("/regenerate", "");
        const existing = getDossierById(dossierId);
        if (!existing) {
          return sendJson(res, 404, { success: false, error: "Dossier record not found." }, req);
        }

        // Strict authorization check: Owner or Admin only
        if (existing.userId !== authUser.id && authUser.systemRole !== "admin") {
          return sendJson(res, 403, {
            success: false,
            error: "Access denied: You do not have permission to regenerate this dossier.",
          }, req);
        }

        const latestUser = getUserById(existing.userId, false);
        const profileSnapshot = latestUser ? { ...latestUser, ...(latestUser.profileData || {}) } : existing.profileSnapshot;
        const documentsSummary = getAllDocuments(existing.userId);

        const updatedDossier = updateDossier(existing.id, {
          profileSnapshot,
          documentsSummary,
        });

        recordAuditLog({
          userId: authUser.id,
          action: "DOSSIER_REGENERATE",
          resourceType: "dossier",
          resourceId: existing.id,
          details: { referenceNumber: existing.referenceNumber },
        });

        return sendJson(res, 200, {
          success: true,
          message: "Dossier regenerated successfully with latest verified profile and documents.",
          dossier: updatedDossier,
        }, req);
      }

      // 5. Get Dossier Metadata (Restricted to Owner and Admin)
      if (pathname.startsWith("/api/dossiers/") && !pathname.endsWith("/pdf") && !pathname.endsWith("/regenerate") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view dossier." }, req);
        }

        const dossierId = pathname.replace("/api/dossiers/", "");
        const dossier = getDossierById(dossierId);
        if (!dossier) {
          return sendJson(res, 404, { success: false, error: "Dossier record not found." }, req);
        }

        // Strict authorization check: Owner or Admin only
        if (dossier.userId !== authUser.id && authUser.systemRole !== "admin") {
          return sendJson(res, 403, {
            success: false,
            error: "Access denied: Unauthorized citizen access to record.",
          }, req);
        }

        return sendJson(res, 200, { success: true, dossier }, req);
      }

      // ---------------------------------------------------------
      // ADMIN PROTECTED MANAGEMENT ENDPOINTS
      // ---------------------------------------------------------
      // 1. Admin System & Welfare Overview Analytics (Supports both /api/admin/metrics and /api/admin/stats)
      if ((pathname === "/api/admin/stats" || pathname === "/api/admin/metrics") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const stats = getAdminOverviewStats();
        return sendJson(res, 200, { success: true, stats, metrics: stats }, req);
      }

      // 2. Admin Schemes List with Search, Filters & Pagination
      if (pathname === "/api/admin/schemes" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const search = url.searchParams.get("search") || "";
        const level = url.searchParams.get("level") || "all";
        const status = url.searchParams.get("status") || "all";
        const activeStatus = url.searchParams.get("active") || url.searchParams.get("activeStatus") || "all";
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

        const result = getAdminSchemes({ search, level, verificationStatus: status, activeStatus, limit, offset });
        return sendJson(res, 200, { success: true, total: result.total, schemes: result.schemes }, req);
      }

      // 3. Admin Scheme Creation with Validation
      if (pathname === "/api/admin/schemes" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const data = await parseJsonBody(req);
        try {
          const created = adminCreateScheme(data, authUser.id);
          return sendJson(res, 201, { success: true, message: "Scheme record created successfully.", scheme: created }, req);
        } catch (err) {
          return sendJson(res, err.statusCode || 400, {
            success: false,
            error: err.message,
            errors: err.validationErrors || [err.message],
          }, req);
        }
      }

      // 4. Admin Scheme Active Status Toggle (Deactivation / Activation)
      if (pathname.startsWith("/api/admin/schemes/") && pathname.endsWith("/status") && req.method === "PATCH") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const schemeId = pathname.replace("/api/admin/schemes/", "").replace("/status", "");
        const data = await parseJsonBody(req);
        const isActive = data.isActive !== undefined ? Boolean(data.isActive) : (data.is_active !== undefined ? Boolean(data.is_active) : true);

        const updated = adminToggleSchemeActive(schemeId, isActive, authUser.id);
        if (!updated) {
          return sendJson(res, 404, { success: false, error: "Scheme not found." }, req);
        }
        return sendJson(res, 200, {
          success: true,
          message: isActive ? "Scheme activated successfully." : "Scheme deactivated successfully.",
          scheme: updated,
        }, req);
      }

      // 5. Admin Scheme Verification Status Update
      if (pathname.startsWith("/api/admin/schemes/") && pathname.endsWith("/verify") && req.method === "PATCH") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const schemeId = pathname.replace("/api/admin/schemes/", "").replace("/verify", "");
        const data = await parseJsonBody(req);
        let verificationStatus = data.verificationStatus || data.verification_status;
        if (!verificationStatus && typeof data.isVerified === "boolean") {
          verificationStatus = data.isVerified ? "verified" : "unverified";
        }
        if (!verificationStatus) verificationStatus = "verified";

        const updated = adminUpdateScheme(
          schemeId,
          {
            verificationStatus,
            criteriaCompleteness: verificationStatus === "verified" ? "verified" : "requires_verification",
            lastVerifiedDate: data.lastVerifiedDate || new Date().toISOString().split("T")[0],
          },
          authUser.id
        );
        if (!updated) {
          return sendJson(res, 404, { success: false, error: "Scheme not found." }, req);
        }
        return sendJson(res, 200, { success: true, message: "Scheme verification updated.", scheme: updated }, req);
      }

      // 6. Admin Scheme Update & Delete
      if (pathname.startsWith("/api/admin/schemes/") && !pathname.endsWith("/verify") && !pathname.endsWith("/status")) {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const schemeId = pathname.replace("/api/admin/schemes/", "");

        if (req.method === "PUT") {
          const data = await parseJsonBody(req);
          try {
            const updated = adminUpdateScheme(schemeId, data, authUser.id);
            if (!updated) {
              return sendJson(res, 404, { success: false, error: "Scheme not found." }, req);
            }
            return sendJson(res, 200, { success: true, message: "Scheme record updated.", scheme: updated }, req);
          } catch (err) {
            return sendJson(res, err.statusCode || 400, {
              success: false,
              error: err.message,
              errors: err.validationErrors || [err.message],
            }, req);
          }
        }

        if (req.method === "DELETE") {
          const ok = adminDeleteScheme(schemeId, authUser.id);
          if (!ok) {
            return sendJson(res, 404, { success: false, error: "Scheme not found or could not be deleted." }, req);
          }
          return sendJson(res, 200, { success: true, message: "Scheme deleted successfully." }, req);
        }
      }

      // 7. Admin Document Verification Desk Queue (supports /api/admin/documents and /api/admin/documents/review-queue)
      if ((pathname === "/api/admin/documents" || pathname === "/api/admin/documents/review-queue") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const status = url.searchParams.get("status") || "all";
        const search = url.searchParams.get("search") || "";
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

        const result = getAdminDocumentsQueue({ status, search, limit, offset });
        return sendJson(res, 200, {
          success: true,
          total: result.total,
          count: result.documents.length,
          documents: result.documents,
        }, req);
      }

      // 8. Admin Document Review Decision (PATCH & POST supported)
      if (pathname.startsWith("/api/admin/documents/") && pathname.endsWith("/review") && (req.method === "PATCH" || req.method === "POST")) {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const docId = pathname.replace("/api/admin/documents/", "").replace("/review", "");
        const data = await parseJsonBody(req);
        const verificationStatus = data.verificationStatus || data.verification_status || data.status || "Verified Against Provided Criteria";
        const ok = adminReviewDocument(docId, {
          verificationStatus,
          verificationNotes: data.verificationNotes || data.notes || data.remark || "",
          reviewerAdminId: authUser.id,
        });
        if (!ok) {
          return sendJson(res, 404, { success: false, error: "Document not found or could not be updated." }, req);
        }
        const updatedDoc = getDocumentById(docId, null, "admin");
        return sendJson(res, 200, { success: true, message: "Document verification status updated successfully.", document: updatedDoc }, req);
      }

      // 9. Admin Citizen Registry List
      if (pathname === "/api/admin/users" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const users = getAllUsers(true);
        return sendJson(res, 200, { success: true, count: users.length, users }, req);
      }

      // ---------------------------------------------------------
      // 10. ADMIN SCHEME DATA INGESTION & SYNCHRONIZATION API
      // ---------------------------------------------------------
      // 10.1 Get Sync Status & Ingestion Health
      if (pathname === "/api/admin/sync/status" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        return sendJson(res, 200, {
          success: true,
          status: getSyncStatus(),
          scheduler: getSchedulerStatus(),
        }, req);
      }

      // 10.2 Trigger On-Demand Scheme Sync
      if (pathname === "/api/admin/sync/run" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const body = await parseJsonBody(req);
        try {
          const run = await runSync({
            sourceId: body.sourceId || "src_myscheme_api",
            triggerType: "manual",
            actorId: authUser.email,
            options: body.options || {},
          });
          return sendJson(res, 200, { success: true, run }, req);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // 10.3 Import Authorized JSON/CSV Dataset File
      if (pathname === "/api/admin/sync/upload" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const body = await parseJsonBody(req);
        if (!body.content) {
          return sendJson(res, 400, { success: false, error: "Dataset file content is required." }, req);
        }
        try {
          const fileFormat = body.format || (body.filename?.toLowerCase().endsWith(".csv") ? "csv" : "json");
          const run = await runSync({
            sourceId: body.sourceId || "src_file_dataset",
            triggerType: "manual",
            actorId: authUser.email,
            rawFileContent: body.content,
            fileFormat,
            fileName: body.filename || `dataset-import-${Date.now()}.${fileFormat}`,
            options: body.options || {},
          });
          return sendJson(res, 200, { success: true, run }, req);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // 10.4 List Sync Runs History
      if (pathname === "/api/admin/sync/runs" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));
        const runs = getSyncRuns({ limit, offset });
        return sendJson(res, 200, { success: true, count: runs.length, runs }, req);
      }

      // 10.5 Get Single Sync Run Details & Staged Items
      if (pathname.startsWith("/api/admin/sync/runs/") && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const runId = pathname.replace("/api/admin/sync/runs/", "");
        const details = getSyncRunDetails(runId);
        if (!details) {
          return sendJson(res, 404, { success: false, error: "Sync run record not found." }, req);
        }
        return sendJson(res, 200, { success: true, ...details }, req);
      }

      // 10.6 List Staged Ingestion Review Queue
      if (pathname === "/api/admin/sync/review-queue" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const runId = url.searchParams.get("runId") || undefined;
        const changeType = url.searchParams.get("changeType") || undefined;
        const status = url.searchParams.get("status") || undefined;
        const search = url.searchParams.get("search") || undefined;
        const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
        const offset = Math.max(0, Number(url.searchParams.get("offset") || 0));

        const queue = getReviewQueue({ runId, changeType, status, search, limit, offset });
        return sendJson(res, 200, { success: true, ...queue }, req);
      }

      // 10.7 Approve or Reject Staged Sync Item
      if (pathname === "/api/admin/sync/review" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const body = await parseJsonBody(req);
        const { itemId, decision, reviewNotes } = body;
        if (!itemId || !decision) {
          return sendJson(res, 400, { success: false, error: "itemId and decision ('approve' or 'reject') required." }, req);
        }
        try {
          let result;
          if (decision === "approve") {
            result = approveReviewItem(itemId, authUser.email, reviewNotes || "");
          } else if (decision === "reject") {
            result = rejectReviewItem(itemId, authUser.email, reviewNotes || "");
          } else {
            return sendJson(res, 400, { success: false, error: "Invalid decision. Must be 'approve' or 'reject'." }, req);
          }
          return sendJson(res, 200, { success: true, result }, req);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // 10.8 Batch Approve Staged Sync Items
      if (pathname === "/api/admin/sync/review/batch" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const body = await parseJsonBody(req);
        const { itemIds, reviewNotes } = body;
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
          return sendJson(res, 400, { success: false, error: "Array of itemIds is required." }, req);
        }
        try {
          const result = batchApproveReviewItems(itemIds, authUser.email, reviewNotes || "");
          return sendJson(res, 200, { success: true, ...result }, req);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // 10.9 Retry Failed Sync Run
      if (pathname.startsWith("/api/admin/sync/retry/") && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const runId = pathname.replace("/api/admin/sync/retry/", "");
        try {
          const run = await retryFailedRun(runId, authUser.email);
          return sendJson(res, 200, { success: true, run }, req);
        } catch (err) {
          return sendJson(res, 400, { success: false, error: err.message }, req);
        }
      }

      // 10.10 List and Configure Registered Ingestion Sources
      if (pathname === "/api/admin/sync/sources" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const sources = getSources();
        return sendJson(res, 200, { success: true, sources }, req);
      }

      if (pathname.startsWith("/api/admin/sync/sources/") && req.method === "PATCH") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const sourceId = pathname.replace("/api/admin/sync/sources/", "");
        const body = await parseJsonBody(req);
        const ok = updateSource(sourceId, body);
        return sendJson(res, 200, { success: ok, sourceId }, req);
      }

      // 10.11 Manage Ingestion Background Scheduler
      if (pathname === "/api/admin/sync/scheduler" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required." }, req);
        }
        if (authUser.systemRole !== "admin") {
          return sendJson(res, 403, { success: false, error: "Access denied: Administrator privileges required." }, req);
        }
        const body = await parseJsonBody(req);
        let scheduler;
        if (body.action === "start") {
          scheduler = startScheduler(body.intervalMs || 60000);
        } else if (body.action === "stop") {
          scheduler = stopScheduler();
        } else {
          scheduler = getSchedulerStatus();
        }
        return sendJson(res, 200, { success: true, scheduler }, req);
      }

      // ---------------------------------------------------------
      // SCHEMES ENDPOINT (PUBLIC INFORMATION)
      // ---------------------------------------------------------
      if (pathname === "/api/schemes" && req.method === "GET") {
        const schemes = db.prepare("SELECT * FROM schemes").all().map((s) => ({
          ...s,
          categories: JSON.parse(s.categories || "[]"),
          states: JSON.parse(s.states || "[]"),
          businessStatus: JSON.parse(s.business_status || "[]"),
          businessTypes: JSON.parse(s.business_types || "[]"),
          documents: JSON.parse(s.documents || "[]"),
          applicationSteps: JSON.parse(s.application_steps || "[]"),
        }));
        return sendJson(res, 200, { success: true, count: schemes.length, schemes }, req);
      }

      // ---------------------------------------------------------
      // SECURE AI ASSISTANT PROXY (NO CLIENT-SIDE KEY EXPOSURE)
      // ---------------------------------------------------------
      if (pathname === "/api/assistant" && req.method === "POST") {
        const reqData = await parseJsonBody(req);
        const question = sanitizeString(reqData.question || "");
        const profile = reqData.user_profile || {};
        const matches = reqData.matched_schemes || [];
        const lang = reqData.lang || "en";

        if (!question) {
          return sendJson(res, 400, { success: false, error: "Question is required." }, req);
        }

        // Read API key from server environment or .env configuration
        const serverKey = getAiApiKey();

        if (serverKey) {
          try {
            const context = matches.slice(0, 5).map(({ scheme, score, matchRating, reasons }) => ({
              name: scheme?.name || "",
              ministry: scheme?.ministry || "",
              match_rating: matchRating ?? score ?? 0,
              why_match: reasons?.green || [],
              benefits: scheme?.benefits || "",
              documents: scheme?.documents || [],
              portal_url: scheme?.portalUrl || scheme?.portal_url || scheme?.source || "",
            }));

            const systemPrompt =
              "You are the official AI Assistant for the 'AI-Driven Scheme Matching Platform' (Ministry of Social Justice & Empowerment, Government of India).\n" +
              "Answer questions grounded strictly and factually in the pre-computed scheme criteria and user profile provided below.\n" +
              "CRITICAL ARCHITECTURAL RULES:\n" +
              "1. NEVER invent scheme benefits, application deadlines, eligibility criteria, or official sources.\n" +
              "2. Explain eligibility through the 3 canonical statuses: Eligible, Potentially Eligible, and Not Eligible.\n" +
              "3. Clarify that match ratings (0-100) indicate profile compatibility and never override failed mandatory criteria.\n" +
              "4. ALWAYS state that final approval and benefit sanction belong exclusively to the competent departmental authority / financing bank upon physical document scrutiny.\n" +
              "5. Provide official application portal links directly from the stored scheme data.\n" +
              "User Profile: " + JSON.stringify(profile) + "\n\n" +
              "Pre-computed Matches: " + JSON.stringify(context);

            let answerText = null;
            let providerUsed = "local";

            // If OpenRouter API key (starts with "sk-or-" or specified as OpenRouter)
            if (serverKey.startsWith("sk-or-") || process.env.OPENROUTER_API_KEY) {
              const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${serverKey}`,
                  "Content-Type": "application/json",
                  "HTTP-Referer": "http://localhost:5173",
                  "X-Title": "Scheme Matcher AI Assistant",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  max_tokens: 1000,
                  temperature: 0.2,
                  messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: question },
                  ],
                }),
                signal: AbortSignal.timeout(15000),
              });

              if (openRouterRes.ok) {
                const orData = await openRouterRes.json();
                answerText = orData.choices?.[0]?.message?.content;
                providerUsed = "openrouter (google/gemini-2.5-flash)";
              } else {
                const errData = await openRouterRes.json().catch(() => ({}));
                console.warn("[OpenRouter] Primary model response error, attempting deepseek fallback:", errData?.error?.message || openRouterRes.statusText);

                // Fallback attempt on OpenRouter with deepseek/deepseek-chat
                const fallbackRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${serverKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "Scheme Matcher AI Assistant",
                  },
                  body: JSON.stringify({
                    model: "deepseek/deepseek-chat",
                    max_tokens: 1000,
                    temperature: 0.2,
                    messages: [
                      { role: "system", content: systemPrompt },
                      { role: "user", content: question },
                    ],
                  }),
                  signal: AbortSignal.timeout(15000),
                });
                if (fallbackRes.ok) {
                  const fbData = await fallbackRes.json();
                  answerText = fbData.choices?.[0]?.message?.content;
                  providerUsed = "openrouter (deepseek/deepseek-chat)";
                }
              }
            } else {
              // Standard Google Gemini API endpoint
              const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${serverKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [
                      {
                        role: "user",
                        parts: [{ text: `${systemPrompt}\n\nUser Question: ${question}` }],
                      },
                    ],
                    generationConfig: {
                      temperature: 0.2,
                      maxOutputTokens: 1000,
                    },
                  }),
                  signal: AbortSignal.timeout(15000),
                }
              );

              if (response.ok) {
                const data = await response.json();
                answerText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                providerUsed = "google-gemini";
              }
            }

            if (answerText && answerText.trim()) {
              return sendJson(res, 200, {
                success: true,
                answer: answerText.trim(),
                mode: "live_ai",
                provider: providerUsed,
              }, req);
            }
          } catch (err) {
            console.warn("[AI Proxy] Server API call failed, falling back to deterministic engine:", err.message);
          }
        }

        // Deterministic grounded response fallback
        const answer = generateGroundedFallback({ question, profile, matches });
        return sendJson(res, 200, {
          success: true,
          answer,
          mode: "grounded_offline",
        }, req);
      }


      return sendJson(res, 404, { success: false, error: "API route not found." }, req);
    } catch (err) {
      console.error("[API Error]", err);
      return sendJson(res, 500, { success: false, error: err.message }, req);
    }
  };
}
