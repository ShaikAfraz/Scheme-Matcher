import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createDatabaseApiMiddleware } from "../server/api.js";
import { initDatabase, createOrUpdateAdminAccount, db } from "../server/db.js";

describe("Comprehensive Security & Authentication Flows Suite", () => {
  let server;
  let baseUrl;
  const timestamp = Date.now();

  const citizenEmail = `citizen_${timestamp}@test.in`;
  const citizenPassword = "CitizenSecure@2026";
  let citizenToken = "";
  let citizenId = "";

  const adminEmail = `admin_${timestamp}@gov.in`;
  const adminPassword = "AdminClearance@2026";
  let adminToken = "";
  let adminId = "";

  before(async () => {
    initDatabase();

    // Provision test administrator via secure server-side provisioning
    const admin = createOrUpdateAdminAccount({
      email: adminEmail,
      password: adminPassword,
      name: "Security Officer Verma",
      role: "Central Verification Administrator",
    });
    adminId = admin.id;

    // Start ephemeral HTTP test server
    const middleware = createDatabaseApiMiddleware();
    server = http.createServer((req, res) => {
      middleware(req, res, () => {
        res.writeHead(404).end("Not Found");
      });
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    try {
      db.prepare("DELETE FROM document_verification_history WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.in' OR email LIKE '%@gov.in')").run();
      db.prepare("DELETE FROM documents WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.in' OR email LIKE '%@gov.in')").run();
      db.prepare("DELETE FROM schemes WHERE id LIKE 'SCH_ADM_%' OR id LIKE 'TEST-%'").run();
      db.prepare("DELETE FROM users WHERE email LIKE '%@test.in' OR email LIKE '%@gov.in'").run();
    } catch (_) {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe("1. Citizen Registration Security & Role Tampering Prevention", () => {
    it("should register a citizen account and strictly strip attacker-supplied systemRole: 'admin'", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Attacker User",
          email: citizenEmail,
          mobile: "9876543210",
          password: citizenPassword,
          systemRole: "admin", // Attacker trying to elevate themselves to admin!
          gender: "Male",
          state: "Maharashtra",
          category: "SC",
          businessType: "Manufacturing",
          profileData: {
            age: 32,
            income: 120000,
            financialRequirement: 200000,
          },
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.user);
      assert.ok(data.token);

      // System role MUST BE "citizen", never "admin" from public registration!
      assert.equal(data.user.systemRole, "citizen", "Public registration must never assign admin role");
      citizenId = data.user.id;
      citizenToken = data.token;
    });

    it("should reject registration with duplicate email", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Duplicate User",
          email: citizenEmail,
          password: "AnotherPassword123",
        }),
      });

      assert.equal(res.status, 409, "Duplicate registration must return 409 Conflict");
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /already exists/i);
    });

    it("should reject registration with empty required fields", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "",
          email: "incomplete@test.in",
          password: "",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  describe("2. Citizen Login, Session Lifecycle & Profile Management", () => {
    it("should reject login with incorrect password", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: citizenEmail,
          password: "WrongPassword999",
        }),
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it("should authenticate citizen with valid credentials and return scrypt-validated token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: citizenEmail,
          password: citizenPassword,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.token);
      assert.equal(data.user.email, citizenEmail);
      citizenToken = data.token;
    });

    it("should access /api/auth/me with active session token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.user.id, citizenId);
      assert.equal(data.user.systemRole, "citizen");
    });

    it("should allow citizen to update their demographic parameters via /api/auth/profile", async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({
          age: 35,
          income: 160000,
          category: "ST",
          state: "Odisha",
          financialRequirement: 300000,
          systemRole: "admin", // Tampering attempt via profile update!
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.user.profileData.age, 35);
      assert.equal(data.user.profileData.state, "Odisha");
      assert.equal(data.user.systemRole, "citizen", "Citizen profile update must not allow changing systemRole");
    });
  });

  describe("3. Password Recovery & Token Expiry Security Flow", () => {
    let resetToken = "";

    it("should generate a secure password reset token for registered citizen", async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: citizenEmail }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.resetToken, "Reset token generated for evaluation in prototype");
      resetToken = data.resetToken;
    });

    it("should reject password reset with invalid token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: "invalid-token-123456",
          newPassword: "BrandNewPassword@2026",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /invalid or expired/i);
    });

    it("should successfully reset password with valid token and invalidate old sessions", async () => {
      const newPassword = "BrandNewPassword@2026";
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);

      // Old password should now fail
      const oldLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: citizenEmail,
          password: citizenPassword,
        }),
      });
      assert.equal(oldLogin.status, 401, "Old password must be invalidated");

      // New password should succeed
      const newLogin = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: citizenEmail,
          password: newPassword,
        }),
      });
      assert.equal(newLogin.status, 200);
      const loginData = await newLogin.json();
      citizenToken = loginData.token;
    });

    it("should reject re-using the already consumed reset token", async () => {
      const res = await fetch(`${baseUrl}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword: "YetAnotherPassword123",
        }),
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /invalid or expired/i);
    });

    it("should reject unauthenticated request to /api/auth/change-password with 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "SomePassword@123",
          newPassword: "NewRotatedPassword@2026",
        }),
      });
      assert.equal(res.status, 401);
    });

    it("should reject password change with incorrect current password", async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "WrongPassword@999",
          newPassword: "ValidRotatedPassword@2026",
        }),
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /incorrect current password/i);
    });

    it("should successfully rotate password when authenticated with valid current credentials", async () => {
      const res = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${citizenToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: "BrandNewPassword@2026",
          newPassword: "UpdatedRotatedSecret@2026",
        }),
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
    });
  });

  describe("4. Administrative Flow & Role-Based Access Control (RBAC)", () => {
    it("should reject citizen attempting to authenticate at /api/auth/admin/login with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: citizenEmail,
          password: "UpdatedRotatedSecret@2026",
        }),
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /not an authorized administrator|access denied/i);
    });

    it("should authenticate official administrator at /api/auth/admin/login", async () => {
      const res = await fetch(`${baseUrl}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: adminEmail,
          password: adminPassword,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.user.systemRole, "admin");
      assert.ok(data.token);
      adminToken = data.token;
    });

    it("should reject unauthenticated access to /api/admin/stats with 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /authentication required/i);
    });

    it("should reject citizen token on /api/admin/stats with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.error, /administrator privileges required/i);
    });

    it("should reject citizen token on /api/admin/schemes with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/schemes`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should reject citizen token on /api/admin/documents with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/documents`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.equal(res.status, 403);
    });

    it("should allow verified administrator to fetch /api/admin/stats", async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.stats);
      assert.ok(data.stats.users.citizens >= 1);
      assert.ok(data.stats.schemes.total >= 500);
      assert.ok(data.stats.counts.citizens >= 1);
    });

    it("should allow administrator to create, verify, update, and manage schemes via /api/admin/schemes", async () => {
      // 1. Create Scheme
      const createRes = await fetch(`${baseUrl}/api/admin/schemes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: `TEST-SCH-${timestamp}`,
          name: "National Weaver Modernization Subsidy",
          ministry: "Ministry of Textiles",
          level: "Central",
          category: "Artisans & Weavers",
          financialAssistance: "₹5 Lakh Equipment Grant",
          description: "Grant for digital handloom equipment.",
        }),
      });

      assert.equal(createRes.status, 201);
      const createData = await createRes.json();
      assert.equal(createData.success, true);
      const schemeId = createData.scheme.id;

      // 2. Toggle verification
      const verifyRes = await fetch(`${baseUrl}/api/admin/schemes/${encodeURIComponent(schemeId)}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isVerified: true }),
      });
      assert.equal(verifyRes.status, 200);
      const verifyData = await verifyRes.json();
      assert.equal(verifyData.success, true);
      assert.equal(verifyData.scheme.isVerified, true);

      // 3. Delete test scheme
      const delRes = await fetch(`${baseUrl}/api/admin/schemes/${encodeURIComponent(schemeId)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(delRes.status, 200);
    });

    it("should allow administrator to review citizen document queue via /api/admin/documents/:id/review", async () => {
      // First, citizen uploads a document
      const uploadRes = await fetch(`${baseUrl}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${citizenToken}`,
        },
        body: JSON.stringify({
          name: "Weaver_Registration_Certificate.pdf",
          type: "State Weaver Registration Proof",
          size: "420 KB",
        }),
      });
      assert.equal(uploadRes.status, 201);
      const uploadData = await uploadRes.json();
      assert.ok(uploadData.document);
      const docId = uploadData.document.id;

      // Admin reviews and approves the document
      const reviewRes = await fetch(`${baseUrl}/api/admin/documents/${encodeURIComponent(docId)}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "Verified",
          remark: "Verified against State Handloom Registry record.",
        }),
      });

      assert.equal(reviewRes.status, 200);
      const reviewData = await reviewRes.json();
      assert.equal(reviewData.success, true);
      assert.equal(reviewData.document.status, "Verified");
    });
  });

  describe("5. Logout & Session Invalidation", () => {
    it("should invalidate citizen session token on logout", async () => {
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${citizenToken}` },
      });

      assert.equal(logoutRes.status, 200);
      const logoutData = await logoutRes.json();
      assert.equal(logoutData.success, true);

      // Subsequent call to /api/auth/me should fail with 401
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${citizenToken}` },
      });
      assert.equal(meRes.status, 401, "Logged-out session token must be rejected");
    });
  });
});
