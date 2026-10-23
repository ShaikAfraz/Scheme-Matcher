import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  initDatabase,
  saveUser,
  getUserById,
  updateUserProfile,
  saveAssessment,
  getUserAssessments,
  getAssessmentById,
  saveSchemeBookmark,
  getUserBookmarks,
  removeSchemeBookmark,
  recordAuditLog,
  getAuditLogs,
  getSystemStats,
  db,
} from "../server/db.js";

describe("Database Persistence & Authorization Module", () => {
  // Ensure DB tables are initialized
  initDatabase();

  const timestamp = Date.now();
  let citizenA = null;
  let citizenB = null;
  let adminUser = null;

  it("should setup test citizen and admin users", () => {
    citizenA = saveUser({
      id: `cit_a_${timestamp}`,
      name: "Anand Verma",
      email: `anand_${timestamp}@citizen.in`,
      password: "AnandSecurePass123",
      role: "Weaver Entrepreneur",
      systemRole: "citizen",
      profileData: {
        age: 34,
        category: "OBC",
        income: 180000,
        state: "Uttar Pradesh",
        businessType: "Handloom / Weaving",
        financialRequirement: 250000,
      },
    });

    citizenB = saveUser({
      id: `cit_b_${timestamp}`,
      name: "Sunita Bai",
      email: `sunita_${timestamp}@citizen.in`,
      password: "SunitaSecurePass123",
      role: "Artisan",
      systemRole: "citizen",
      profileData: {
        age: 41,
        category: "SC",
        income: 90000,
        state: "Madhya Pradesh",
        businessType: "Handicrafts",
        financialRequirement: 100000,
      },
    });

    adminUser = saveUser({
      id: `adm_${timestamp}`,
      name: "Dr. K. S. Verma",
      email: `admin_${timestamp}@gov.in`,
      password: "AdminGovSecret2026!",
      role: "District Welfare Officer",
      systemRole: "admin",
    });

    assert.ok(citizenA && citizenA.id);
    assert.ok(citizenB && citizenB.id);
    assert.ok(adminUser && adminUser.id);
    assert.equal(citizenA.systemRole, "citizen");
    assert.equal(adminUser.systemRole, "admin");
  });

  // 1. User Profile Updates Persistence
  it("should permanently update citizen profile and record audit log", () => {
    const updatedProfile = {
      age: 35,
      category: "OBC",
      income: 210000,
      state: "Uttar Pradesh",
      businessType: "Powerloom & Modern Weaving",
      financialRequirement: 350000,
      isArtisan: true,
    };

    const updatedUser = updateUserProfile(citizenA.id, updatedProfile);
    assert.ok(updatedUser, "Updated user must be returned");
    assert.equal(updatedUser.profileData.age, 35);
    assert.equal(updatedUser.profileData.income, 210000);
    assert.equal(updatedUser.profileData.isArtisan, true);

    // Direct SQLite verification from disk
    const raw = db.prepare("SELECT profile_data, updated_at FROM users WHERE id = ?").get(citizenA.id);
    assert.ok(raw, "User must exist in SQLite table");
    const parsed = JSON.parse(raw.profile_data);
    assert.equal(parsed.age, 35);
    assert.equal(parsed.financialRequirement, 350000);
    assert.ok(raw.updated_at, "updated_at timestamp must be set");
  });

  // 2. Assessment Results Persistence & Authorization
  it("should persist eligibility assessments and enforce user isolation", () => {
    const asm = saveAssessment({
      userId: citizenA.id,
      profileSnapshot: { age: 35, category: "OBC", income: 210000 },
      matchedSchemesCount: 4,
      topSchemeId: "SC016",
      topSchemeName: "PM Vishwakarma Scheme (for Traditional Artisans & Craftspeople)",
      topScore: 92,
      resultsSummary: [
        { id: "SC016", name: "PM Vishwakarma Scheme", score: 92 },
        { id: "SC001", name: "PMEGP", score: 85 },
      ],
    });

    assert.ok(asm && asm.id, "Assessment must be created with ID");
    assert.equal(asm.userId, citizenA.id);
    assert.equal(asm.topScore, 92);
    assert.equal(asm.matchedSchemesCount, 4);

    // Citizen A can access their own assessment
    const fetchedByA = getAssessmentById(asm.id, { userId: citizenA.id, role: "citizen" });
    assert.ok(fetchedByA, "Citizen A must be able to view their assessment");
    assert.equal(fetchedByA.topSchemeName, "PM Vishwakarma Scheme (for Traditional Artisans & Craftspeople)");

    // Citizen B CANNOT access Citizen A's assessment
    const blockedForB = getAssessmentById(asm.id, { userId: citizenB.id, role: "citizen" });
    assert.equal(blockedForB, null, "Citizen B must not be able to view Citizen A's assessment");

    // Administrator CAN access Citizen A's assessment
    const adminView = getAssessmentById(asm.id, { userId: adminUser.id, role: "admin" });
    assert.ok(adminView, "Administrator must be able to view any assessment");
    assert.equal(adminView.userId, citizenA.id);

    // Citizen A assessments list contains this assessment
    const listA = getUserAssessments(citizenA.id);
    assert.ok(listA.length >= 1);
    assert.equal(listA[0].id, asm.id);

    // Citizen B assessments list does NOT contain Citizen A's assessment
    const listB = getUserAssessments(citizenB.id);
    assert.equal(listB.some((a) => a.id === asm.id), false);
  });

  // 3. Scheme Bookmarks Persistence
  it("should save, retrieve, and remove scheme bookmarks", () => {
    // Save bookmark for citizen A
    const bmk = saveSchemeBookmark(citizenA.id, "SC016", "Recommended by District DIC officer");
    assert.ok(bmk, "Bookmark must be created");

    // Retrieve bookmarks for citizen A
    const list = getUserBookmarks(citizenA.id);
    assert.ok(list.length >= 1, "Must find saved bookmark");
    const item = list.find((b) => b.scheme.id === "SC016");
    assert.ok(item, "SC016 must be in saved bookmarks");
    assert.equal(item.notes, "Recommended by District DIC officer");

    // Citizen B has no bookmarks
    const listB = getUserBookmarks(citizenB.id);
    assert.equal(listB.length, 0);

    // Remove bookmark
    const removed = removeSchemeBookmark(citizenA.id, "SC016");
    assert.equal(removed, true, "Bookmark must be removed");

    const afterRemove = getUserBookmarks(citizenA.id);
    assert.equal(afterRemove.some((b) => b.scheme.id === "SC016"), false);
  });

  // 4. Audit Logs Recording & Access Restrictions
  it("should record audit logs and enforce administrator-only access", () => {
    recordAuditLog({
      userId: citizenA.id,
      action: "SCHEME_SEARCH",
      resourceType: "scheme",
      resourceId: "pmegp",
      details: { query: "handloom subsidy" },
      ipAddress: "127.0.0.1",
    });

    // Citizen is denied access to audit logs
    assert.throws(
      () => getAuditLogs({ role: "citizen" }),
      /Access denied/i,
      "Citizen role must be rejected from viewing audit logs"
    );

    // Administrator is permitted to view audit logs
    const logs = getAuditLogs({ role: "admin", limit: 20 });
    assert.ok(Array.isArray(logs), "Admin must receive logs array");
    assert.ok(logs.length >= 1, "At least 1 log entry must be present");
    assert.ok(logs.some((l) => l.action === "PROFILE_UPDATE" || l.action === "ASSESSMENT_RUN" || l.action === "SCHEME_SEARCH"));
  });

  // 5. System Statistics
  it("should compute dynamic system stats from database tables", () => {
    const stats = getSystemStats();
    assert.ok(stats.users >= 3, "Stats must count registered users");
    assert.ok(stats.schemes >= 19, "Stats must count codified schemes");
    assert.ok(stats.assessments >= 1, "Stats must count saved assessments");
    assert.ok(typeof stats.applications === "number");
    assert.ok(stats.financials, "Financial aggregates must be present");
    assert.ok(typeof stats.financials.totalRequested === "number");
    assert.ok(typeof stats.financials.totalSanctioned === "number");
    assert.ok(typeof stats.financials.totalSubsidy === "number");
    assert.ok(stats.stageDistribution, "Stage distribution must be calculated");
  });

  after(() => {
    try {
      const uids = [citizenA?.id, citizenB?.id, adminUser?.id].filter(Boolean);
      if (uids.length > 0) {
        db.prepare(`DELETE FROM saved_schemes WHERE user_id IN (${uids.map(() => "?").join(",")})`).run(...uids);
        db.prepare(`DELETE FROM assessments WHERE user_id IN (${uids.map(() => "?").join(",")})`).run(...uids);
        db.prepare(`DELETE FROM sessions WHERE user_id IN (${uids.map(() => "?").join(",")})`).run(...uids);
        db.prepare(`DELETE FROM audit_logs WHERE user_id IN (${uids.map(() => "?").join(",")})`).run(...uids);
        db.prepare(`DELETE FROM users WHERE id IN (${uids.map(() => "?").join(",")})`).run(...uids);
      }
    } catch {}
  });
});
