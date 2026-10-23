import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { PDFParse } from "pdf-parse";
import { createDatabaseApiMiddleware } from "../server/api.js";
import {
  initDatabase,
  createOrUpdateAdminAccount,
  db,
  createDossier,
  getUserDossiers,
  getDossierById,
  adminCreateScheme,
  adminUpdateScheme,
  adminToggleSchemeActive,
  getAdminSchemes,
  getAdminDocumentsQueue,
  getAdminOverviewStats,
} from "../server/db.js";
import { generateBankDossierPdf, generateDossierPdfBuffer } from "../server/dossierPdf.js";

describe("Bank Dossier & Administrative Portal Comprehensive Test Suite", () => {
  let server;
  let baseUrl;
  const timestamp = Date.now();

  // Test Citizen 1 (Owner)
  const citizen1Email = `dossier_user1_${timestamp}@test.in`;
  const citizen1Password = "DossierPass1@2026";
  let citizen1Token = "";
  let citizen1Id = "";

  // Test Citizen 2 (Attacker / Unauthorized Citizen)
  const citizen2Email = `dossier_user2_${timestamp}@test.in`;
  const citizen2Password = "DossierPass2@2026";
  let citizen2Token = "";
  let citizen2Id = "";

  // Test Administrator
  const adminEmail = `dossier_admin_${timestamp}@gov.in`;
  const adminPassword = "AdminDossierPass@2026";
  let adminToken = "";
  let adminId = "";

  before(async () => {
    initDatabase();

    // 1. Provision Administrator Account
    const admin = createOrUpdateAdminAccount({
      email: adminEmail,
      password: adminPassword,
      name: "Lead Bank Admin Sharma",
      role: "Lead Bank & Administrative Auditor",
    });
    adminId = admin.id;

    // 2. Start HTTP server with API middleware
    const middleware = createDatabaseApiMiddleware();
    server = http.createServer((req, res) => {
      middleware(req, res, () => {
        res.writeHead(404).end("Not Found");
      });
    });

    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://127.0.0.1:${port}`;

    // 3. Register Citizen 1
    const reg1Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Pooja Devi",
        email: citizen1Email,
        password: citizen1Password,
        mobile: "9876543210",
        state: "Uttar Pradesh",
        category: "SC",
        age: 28,
        income: 150000,
        businessType: "Handicrafts & Textile",
        businessStatus: "new",
        financialRequirement: 250000,
      }),
    });
    const reg1Data = await reg1Res.json();
    citizen1Token = reg1Data.token;
    citizen1Id = reg1Data.user.id;

    // 4. Register Citizen 2
    const reg2Res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Vikram Malhotra",
        email: citizen2Email,
        password: citizen2Password,
        mobile: "9123456780",
        state: "Maharashtra",
        category: "General",
        age: 35,
        income: 450000,
      }),
    });
    const reg2Data = await reg2Res.json();
    citizen2Token = reg2Data.token;
    citizen2Id = reg2Data.user.id;

    // 5. Admin Login
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    adminToken = adminLoginData.token;
  });

  after(async () => {
    try {
      if (citizen1Id || citizen2Id) {
        db.prepare("DELETE FROM dossiers WHERE user_id IN (?, ?)").run(citizen1Id, citizen2Id);
      }
      if (citizen1Id || citizen2Id || adminId) {
        db.prepare("DELETE FROM sessions WHERE user_id IN (?, ?, ?)").run(citizen1Id, citizen2Id, adminId);
        db.prepare("DELETE FROM users WHERE id IN (?, ?, ?)").run(citizen1Id, citizen2Id, adminId);
      }
      db.prepare("DELETE FROM schemes WHERE id LIKE 'TEST-%' OR id LIKE 'SCH_TEST_%' OR id LIKE 'SCH_ADM_%'").run();
    } catch (e) {
      console.warn("[Test Cleanup] Warning:", e.message);
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================
  // SECTION 1: BANK DOSSIER FUNCTIONALITY
  // ==========================================
  describe("1. Bank Dossier Generation, Content Accuracy & Security Isolation", () => {
    let createdDossierId = "";
    let createdDossierRef = "";

    it("should generate and persist a new Lead Bank Dossier via POST /api/dossiers", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          schemeIds: ["SC001", "SC002"],
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.dossier);
      assert.ok(data.dossier.id);
      assert.ok(data.dossier.referenceNumber);
      // Format must match DOS-YYYYMMDD-XXXX
      assert.match(data.dossier.referenceNumber, /^DOS-\d{8}-[A-Z0-9]{4}$/);
      assert.equal(data.dossier.userId, citizen1Id);

      createdDossierId = data.dossier.id;
      createdDossierRef = data.dossier.referenceNumber;
    });

    it("should retrieve dossier history for the authenticated owner via GET /api/dossiers", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(Array.isArray(data.dossiers));
      assert.ok(data.dossiers.length >= 1);
      const found = data.dossiers.find((d) => d.id === createdDossierId);
      assert.ok(found);
      assert.equal(found.referenceNumber, createdDossierRef);
    });

    it("should allow owner to fetch dossier details via GET /api/dossiers/:id", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.dossier.id, createdDossierId);
      assert.equal(data.dossier.userId, citizen1Id);
      assert.ok(data.dossier.profileSnapshot);
      assert.equal(data.dossier.profileSnapshot.name, "Pooja Devi");
    });

    it("should stream a valid print-friendly PDF via GET /api/dossiers/:id/pdf with correct headers", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}/pdf`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get("content-type"), "application/pdf");
      const contentDisposition = res.headers.get("content-disposition");
      assert.ok(contentDisposition && contentDisposition.includes(createdDossierRef));

      const arrayBuffer = await res.arrayBuffer();
      const pdfBuffer = Buffer.from(arrayBuffer);

      // Verify PDF starts with %PDF-
      assert.equal(pdfBuffer.subarray(0, 5).toString("utf-8"), "%PDF-");

      // Parse with PDFParse to verify text content
      const parser = new PDFParse({ data: pdfBuffer });
      const parsedResult = await parser.getText();
      const text = typeof parsedResult === "string" ? parsedResult : parsedResult.text;

      // Verify key textual anchors
      assert.ok(text.includes("NATIONAL BENEFICIARY ELIGIBILITY & LEAD BANK DOSSIER"));
      assert.ok(text.includes(createdDossierRef));
      assert.ok(text.includes("Pooja Devi"));
      assert.ok(text.includes("Uttar Pradesh"));
      // Statutory non-approval disclaimer MUST be present
      assert.ok(text.includes("STATUTORY NON-APPROVAL DISCLAIMER"));
      assert.ok(text.includes("does NOT constitute an official sanction"));
      // Lead bank submission checklist MUST be present
      assert.ok(text.includes("LEAD BANK SUBMISSION CHECKLIST"));
    });

    it("should strictly reject unauthorized citizen attempting to access another user's dossier (403 Forbidden)", async () => {
      // Citizen 2 tries to access Citizen 1's dossier metadata
      const metaRes = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.equal(metaRes.status, 403);
      const metaData = await metaRes.json();
      assert.equal(metaData.success, false);
      assert.ok(metaData.error.includes("Access denied"));

      // Citizen 2 tries to download Citizen 1's PDF dossier
      const pdfRes = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}/pdf`, {
        headers: { Authorization: `Bearer ${citizen2Token}` },
      });
      assert.equal(pdfRes.status, 403);
    });

    it("should reject unauthenticated requests to dossiers (401 Unauthorized)", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}`);
      assert.equal(res.status, 401);

      const pdfRes = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}/pdf`);
      assert.equal(pdfRes.status, 401);
    });

    it("should allow authorized administrator to view and download any citizen's dossier", async () => {
      const res = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.dossier.id, createdDossierId);

      const pdfRes = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}/pdf`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(pdfRes.status, 200);
      assert.equal(pdfRes.headers.get("content-type"), "application/pdf");
    });

    it("should regenerate dossier with updated database information via POST /api/dossiers/:id/regenerate", async () => {
      const regenRes = await fetch(`${baseUrl}/api/dossiers/${encodeURIComponent(createdDossierId)}/regenerate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });

      assert.equal(regenRes.status, 200);
      const data = await regenRes.json();
      assert.equal(data.success, true);
      assert.equal(data.dossier.id, createdDossierId);
      assert.equal(data.dossier.referenceNumber, createdDossierRef);
    });

    it("should handle empty schemes and missing profile fields gracefully without throwing", () => {
      const minimalDossier = {
        referenceNumber: "DOS-TEST-EMPTY",
        user_id: "test-user-empty",
        profileSnapshot: {},
        eligibilitySummary: [],
        documentsSummary: [],
        generatedAt: new Date().toISOString(),
      };

      const buffer = generateDossierPdfBuffer(minimalDossier);
      assert.ok(Buffer.isBuffer(buffer));
      assert.ok(buffer.length > 500);
      assert.equal(buffer.subarray(0, 5).toString("utf-8"), "%PDF-");
    });
  });

  // ==========================================
  // SECTION 2: ADMINISTRATIVE PORTAL & SCHEMES
  // ==========================================
  describe("2. Administrative Portal: Real Metrics, Scheme CRUD, Validation & Deactivation", () => {
    let createdSchemeId = "";
    const testSchemeCode = `TEST-SCH-${timestamp}`;

    it("should return genuine real SQLite metrics via GET /api/admin/metrics without hardcoded fallbacks", async () => {
      const res = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.metrics);
      assert.equal(typeof data.metrics.citizensCount, "number");
      assert.ok(data.metrics.citizensCount >= 2);
      assert.equal(typeof data.metrics.activeSchemesCount, "number");
      assert.ok(data.metrics.activeSchemesCount >= 500);
      assert.equal(typeof data.metrics.dossiersCount, "number");
      assert.ok(data.metrics.dossiersCount >= 1);
      assert.equal(typeof data.metrics.totalRequestedAmount, "number");
    });

    it("should reject non-admin citizen attempting to access admin endpoints (403 Forbidden)", async () => {
      const metricsRes = await fetch(`${baseUrl}/api/admin/metrics`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.equal(metricsRes.status, 403);

      const schemesRes = await fetch(`${baseUrl}/api/admin/schemes`, {
        headers: { Authorization: `Bearer ${citizen1Token}` },
      });
      assert.equal(schemesRes.status, 403);
    });

    it("should validate required fields and reject invalid scheme creation (400 Bad Request)", async () => {
      // 1. Missing name & ministry
      const res1 = await fetch(`${baseUrl}/api/admin/schemes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: "INVALID-1",
          name: "Abc", // less than 5 chars
          ministry: "A", // less than 3 chars
          portalUrl: "not-a-valid-url", // invalid URL
          minAge: 70,
          maxAge: 30, // minAge > maxAge
        }),
      });

      assert.equal(res1.status, 400);
      const data1 = await res1.json();
      assert.equal(data1.success, false);
      assert.ok(Array.isArray(data1.errors));
      assert.ok(data1.errors.length >= 3);
    });

    it("should create a valid scheme with verified fields via POST /api/admin/schemes", async () => {
      const res = await fetch(`${baseUrl}/api/admin/schemes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          code: testSchemeCode,
          name: "National Artisan Tooling Modernization Scheme",
          ministry: "Ministry of Micro, Small & Medium Enterprises",
          level: "Central",
          category: "Artisans & Craftsmen",
          financialAssistance: "₹1,50,000 Tooling Grant",
          description: "Subsidized capital grant for artisanal tool upgrades.",
          portalUrl: "https://msme.gov.in/artisan-tooling",
          source: "Gazette of India Notification 44/2026",
          minAge: 18,
          maxAge: 65,
          incomeLimit: 500000,
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.scheme);
      assert.equal(data.scheme.code, testSchemeCode);
      assert.equal(data.scheme.isActive, true);
      assert.equal(data.scheme.criteriaCompleteness, "verified");

      createdSchemeId = data.scheme.id;
    });

    it("should support scheme editing via PUT /api/admin/schemes/:id", async () => {
      const res = await fetch(`${baseUrl}/api/admin/schemes/${encodeURIComponent(createdSchemeId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: "National Artisan Tooling Modernization Scheme (Updated)",
          financialAssistance: "₹2,00,000 Revised Tooling Grant",
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.scheme.name, "National Artisan Tooling Modernization Scheme (Updated)");
    });

    it("should toggle scheme deactivation and activation via PATCH /api/admin/schemes/:id/status", async () => {
      // 1. Deactivate scheme
      const deactRes = await fetch(`${baseUrl}/api/admin/schemes/${encodeURIComponent(createdSchemeId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isActive: false }),
      });

      assert.equal(deactRes.status, 200);
      const deactData = await deactRes.json();
      assert.equal(deactData.success, true);
      assert.equal(deactData.scheme.isActive, false);

      // Verify that filter ?active=inactive returns this scheme
      const filterRes = await fetch(`${baseUrl}/api/admin/schemes?active=inactive&search=${encodeURIComponent(testSchemeCode)}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const filterData = await filterRes.json();
      assert.equal(filterData.success, true);
      assert.equal(filterData.schemes.length, 1);
      assert.equal(filterData.schemes[0].id, createdSchemeId);

      // 2. Reactivate scheme
      const actRes = await fetch(`${baseUrl}/api/admin/schemes/${encodeURIComponent(createdSchemeId)}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isActive: true }),
      });

      assert.equal(actRes.status, 200);
      const actData = await actRes.json();
      assert.equal(actData.success, true);
      assert.equal(actData.scheme.isActive, true);
    });

    it("should support scheme search, level filtering, and pagination", async () => {
      const res = await fetch(`${baseUrl}/api/admin/schemes?search=National&level=Central&limit=5&offset=0`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.total >= 1);
      assert.ok(data.schemes.length <= 5);
      data.schemes.forEach((s) => {
        assert.equal(s.level, "Central");
      });
    });
  });

  // ==========================================
  // SECTION 3: DOCUMENT REVIEW QUEUE & AUDIT LOGS
  // ==========================================
  describe("3. Document Review Queue, Officer Determination & Audit Logging", () => {
    let testDocId = "";

    it("should allow a citizen to upload a document needing officer review", async () => {
      const res = await fetch(`${baseUrl}/api/documents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${citizen1Token}`,
        },
        body: JSON.stringify({
          name: "Udyam_MSME_ReviewCase.pdf",
          type: "Udyam MSME Registration Certificate",
          typeId: "UDYAM",
          size: "1.2 MB",
          schemeId: "SC001",
          verificationStatus: "Needs Review",
          verificationReason: "Name spelling requires official manual officer verification.",
        }),
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      testDocId = data.document.id;
    });

    it("should query paginated documents queue filtered by 'Needs Review' status", async () => {
      const res = await fetch(`${baseUrl}/api/admin/documents?status=Needs%20Review&limit=10&offset=0`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.total >= 1);
      assert.ok(Array.isArray(data.documents));

      // Target document should appear in Needs Review queue
      const found = data.documents.find((d) => d.id === testDocId);
      assert.ok(found);
      assert.equal(found.verificationStatus, "Needs Review");
    });

    it("should allow authorized admin to record review decision and remarks via PATCH /api/admin/documents/:id/review", async () => {
      const reviewNote = "Verified original parchment against state MSME database. Approved for lead bank.";
      const res = await fetch(`${baseUrl}/api/admin/documents/${encodeURIComponent(testDocId)}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "Verified Against Provided Criteria",
          remark: reviewNote,
        }),
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.document.verificationStatus, "Verified Against Provided Criteria");

      // Verify audit log entry was created in SQLite audit_logs table
      const auditLog = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? ORDER BY id DESC LIMIT 1").get(testDocId);
      assert.ok(auditLog);
      assert.equal(auditLog.actor_id, adminId);
      assert.equal(auditLog.action, "DOCUMENT_REVIEWED");
      assert.ok(auditLog.details.includes("Verified Against Provided Criteria"));
    });

    it("should reject non-admin attempt to record document review decision (403 Forbidden)", async () => {
      const res = await fetch(`${baseUrl}/api/admin/documents/${encodeURIComponent(testDocId)}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${citizen2Token}`,
        },
        body: JSON.stringify({
          status: "Verified Against Provided Criteria",
          remark: "Illegal review by unauthorized citizen.",
        }),
      });

      assert.equal(res.status, 403);
    });
  });
});
