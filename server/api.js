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
  saveDocument,
} from "./db.js";
import { sanitizeString, validateEmailOrMobile } from "./security.js";
import "./seed.js";

// Helper to parse JSON request bodies safely
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      // Safeguard: reject payloads larger than 2MB
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error("Payload too large"));
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  });
  res.end(JSON.stringify(data));
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

// Generate grounded fallback response when external AI is unavailable
function generateGroundedFallback({ question = "", profile = {}, matches = [] }) {
  const q = question.toLowerCase();
  const top = matches[0] || null;
  const topName = top ? (top.scheme?.name || top.scheme_name) : "Government Welfare Schemes";
  const topScore = top ? (top.score ?? top.match_score ?? 0) : 0;

  if (q.includes("document") || q.includes("certificate") || q.includes("paper")) {
    const docs = top?.scheme?.documents || [
      "Aadhaar Card",
      "Caste / Category Certificate",
      "Family Income Certificate",
      "Project Report (DPR)",
    ];
    return `For ${topName}, the primary required documents are:\n` +
      docs.map((d) => `• ${d}`).join("\n") +
      "\n\nPlease ensure your caste and family income certificates are issued within the last 12 months by an authorized revenue official (Tehsildar / SDM).";
  }

  if (q.includes("subsidy") || q.includes("margin") || q.includes("loan")) {
    const benefits = top?.scheme?.benefits || "Government financial subsidy and bank credit linkage";
    return `Under ${topName}, the financial benefit structure is:\n${benefits}\n\nNote that government subsidies are back-ended and credited via DBT after bank verification.`;
  }

  return `Based on your submitted profile (${profile.age || 28}yo, ${profile.category || "General"} category), your top matching opportunity is ${topName} with a suitability score of ${topScore}%.\n\nPlease verify your caste and annual income certificates with your district administration before applying.`;
}

export function createDatabaseApiMiddleware() {
  return async (req, res, next) => {
    // 1. Handle CORS Preflight
    if (req.method === "OPTIONS") {
      const origin = getAllowedOrigin(req);
      res.writeHead(200, {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
      // HEALTH / SYSTEM STATUS
      // ---------------------------------------------------------
      if (pathname === "/api/status" && req.method === "GET") {
        const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
        const appCount = db.prepare("SELECT count(*) as count FROM applications").get().count;
        const schemeCount = db.prepare("SELECT count(*) as count FROM schemes").get().count;
        const sessionCount = db.prepare("SELECT count(*) as count FROM sessions WHERE expires_at > datetime('now')").get().count;

        return sendJson(res, 200, {
          status: "connected",
          engine: "SQLite 3 (better-sqlite3) with Scrypt Security & Session Management",
          database: "database.sqlite",
          persisted: true,
          counts: {
            users: userCount,
            applications: appCount,
            schemes: schemeCount,
            activeSessions: sessionCount,
          },
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
          profileData: data.profileData || data,
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
      // DOCUMENT ENDPOINTS (SECURED)
      // ---------------------------------------------------------
      if (pathname === "/api/documents" && req.method === "GET") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to view documents." }, req);
        }
        const docs = getAllDocuments(authUser.id, authUser.systemRole);
        return sendJson(res, 200, { success: true, count: docs.length, documents: docs }, req);
      }

      if (pathname === "/api/documents" && req.method === "POST") {
        const authUser = getAuthUser(req);
        if (!authUser) {
          return sendJson(res, 401, { success: false, error: "Authentication required to upload documents." }, req);
        }
        const docData = await parseJsonBody(req);
        saveDocument(docData, authUser.id);
        return sendJson(res, 201, { success: true, message: "Document record saved." }, req);
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

        // Read API key from server environment variable ONLY
        const serverKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

        if (serverKey) {
          try {
            const context = matches.slice(0, 5).map(({ scheme, score, reasons }) => ({
              name: scheme?.name || "",
              ministry: scheme?.ministry || "",
              match_score: score ?? 0,
              why_match: reasons?.green || [],
              benefits: scheme?.benefits || "",
              documents: scheme?.documents || [],
            }));

            const systemPrompt =
              "You are the official AI Assistant for the 'AI-Driven Scheme Matching Platform for Marginalized Entrepreneurs' (SIH26092, Ministry of Social Justice & Empowerment).\n" +
              "Answer questions grounded strictly in the pre-computed matches and user profile provided below.\n" +
              "CRITICAL RULES:\n" +
              "1. You DO NOT invent or calculate new eligibility — you explain the pre-computed deterministic results.\n" +
              "2. You NEVER claim guaranteed approval or sanction from any government body.\n" +
              "3. Speak in empathetic, clear, plain language, avoiding bureaucratic jargon.\n" +
              "User Profile: " + JSON.stringify(profile) + "\n\n" +
              "Pre-computed Matches: " + JSON.stringify(context);

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
                    maxOutputTokens: 1024,
                  },
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                return sendJson(res, 200, {
                  success: true,
                  answer: text,
                  mode: "live_ai",
                }, req);
              }
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
