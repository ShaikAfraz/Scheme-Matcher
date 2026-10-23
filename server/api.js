import {
  db,
  getAllUsers,
  getUserById,
  saveUser,
  getAllApplications,
  getApplicationById,
  saveApplication,
  deleteApplication,
  getAllDocuments,
  saveDocument,
} from "./db.js";
import "./seed.js";

// Request body parser helper
async function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(data));
}

export function createDatabaseApiMiddleware() {
  return async (req, res, next) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(200, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
      // 1. Health / Database Status Endpoint
      if (pathname === "/api/status" && req.method === "GET") {
        const userCount = db.prepare("SELECT count(*) as count FROM users").get().count;
        const appCount = db.prepare("SELECT count(*) as count FROM applications").get().count;
        const schemeCount = db.prepare("SELECT count(*) as count FROM schemes").get().count;

        return sendJson(res, 200, {
          status: "connected",
          engine: "SQLite 3 (better-sqlite3)",
          database: "database.sqlite",
          persisted: true,
          counts: {
            users: userCount,
            applications: appCount,
            schemes: schemeCount,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // 2. Users Endpoints
      if (pathname === "/api/users" && req.method === "GET") {
        const users = getAllUsers();
        return sendJson(res, 200, { success: true, count: users.length, users });
      }

      if (pathname === "/api/users" && req.method === "POST") {
        const userData = await parseJsonBody(req);
        if (!userData.name) {
          return sendJson(res, 400, { success: false, error: "Name is required" });
        }
        saveUser(userData);
        const saved = getUserById(userData.id);
        return sendJson(res, 201, { success: true, message: "User saved to SQLite database", user: saved });
      }

      // 3. Applications Endpoints
      if (pathname === "/api/applications" && req.method === "GET") {
        const id = url.searchParams.get("id");
        if (id) {
          const app = getApplicationById(id);
          if (!app) {
            return sendJson(res, 404, { success: false, error: "Application not found" });
          }
          return sendJson(res, 200, { success: true, application: app });
        }

        const q = url.searchParams.get("q");
        if (q) {
          const cleanQ = q.trim().toUpperCase().replace(/\s+/g, "");
          const all = getAllApplications();
          const matched = all.find((a) => {
            const matchId = a.id && a.id.toUpperCase().replace(/\s+/g, "").includes(cleanQ);
            const matchPhone = a.applicantPhone && a.applicantPhone.replace(/[\s+-]/g, "").includes(cleanQ.replace(/[\s+-]/g, ""));
            return matchId || matchPhone;
          });
          if (!matched) {
            return sendJson(res, 404, { success: false, error: "No matching application found" });
          }
          return sendJson(res, 200, { success: true, application: matched });
        }

        const userId = url.searchParams.get("userId");
        const apps = getAllApplications(userId);
        return sendJson(res, 200, { success: true, count: apps.length, applications: apps });
      }

      if (pathname === "/api/applications" && req.method === "DELETE") {
        const id = url.searchParams.get("id");
        if (!id) {
          return sendJson(res, 400, { success: false, error: "Application ID is required" });
        }
        deleteApplication(id);
        return sendJson(res, 200, { success: true, message: `Application ${id} deleted successfully` });
      }

      if (pathname === "/api/applications" && req.method === "POST") {
        const appData = await parseJsonBody(req);
        if (!appData.id || !appData.schemeName) {
          return sendJson(res, 400, { success: false, error: "Application ID and Scheme Name are required" });
        }
        saveApplication(appData);
        const saved = getApplicationById(appData.id);
        return sendJson(res, 201, {
          success: true,
          message: "Application saved to SQLite database",
          application: saved,
        });
      }

      // 4. Documents Endpoints
      if (pathname === "/api/documents" && req.method === "GET") {
        const userId = url.searchParams.get("userId");
        const docs = getAllDocuments(userId);
        return sendJson(res, 200, { success: true, count: docs.length, documents: docs });
      }

      if (pathname === "/api/documents" && req.method === "POST") {
        const docData = await parseJsonBody(req);
        saveDocument(docData);
        return sendJson(res, 201, { success: true, message: "Document saved to SQLite database" });
      }

      // 5. Schemes Endpoint
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
        return sendJson(res, 200, { success: true, count: schemes.length, schemes });
      }

      return sendJson(res, 404, { success: false, error: "API route not found" });
    } catch (err) {
      console.error("[API Error]", err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  };
}
