import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  initDatabase,
  saveApplication,
  getApplications,
  getApplicationById,
  deleteApplication,
  lookupPublicApplication,
} from "../server/db.js";

describe("Application Ownership & Authorization Module", () => {
  initDatabase();

  const userA = `citizen_a_${Date.now()}`;
  const userB = `citizen_b_${Date.now()}`;
  const appAId = `APP-TEST-A-${Date.now()}`;
  const appBId = `APP-TEST-B-${Date.now()}`;

  it("should permit citizen A to create and access their own application", () => {
    const appA = saveApplication(
      {
        id: appAId,
        schemeId: "SC001",
        schemeName: "PMEGP Scheme",
        ministry: "Ministry of MSME",
        userId: userA,
        applicantName: "Citizen A",
        applicantPhone: "+91 91111 00001",
        state: "Uttar Pradesh",
        district: "Varanasi",
        requestedAmount: 500000,
        status: "Application Submitted",
        currentStage: 1,
      },
      { userId: userA, role: "citizen" }
    );

    assert.ok(appA);
    assert.equal(appA.id, appAId);
    assert.equal(appA.userId, userA);

    const fetched = getApplicationById(appAId, { userId: userA, role: "citizen" });
    assert.ok(fetched);
    assert.equal(fetched.id, appAId);
  });

  it("should permit citizen B to create their own application", () => {
    const appB = saveApplication(
      {
        id: appBId,
        schemeId: "SC002",
        schemeName: "Stand-Up India",
        ministry: "Ministry of Finance",
        userId: userB,
        applicantName: "Citizen B",
        applicantPhone: "+91 92222 00002",
        state: "Bihar",
        district: "Patna",
        requestedAmount: 1000000,
        status: "Under Review",
        currentStage: 2,
      },
      { userId: userB, role: "citizen" }
    );

    assert.ok(appB);
    assert.equal(appB.id, appBId);
  });

  it("should isolate application lists between citizens", () => {
    const listA = getApplications({ userId: userA, role: "citizen" });
    const listB = getApplications({ userId: userB, role: "citizen" });

    assert.ok(listA.some((a) => a.id === appAId));
    assert.equal(listA.some((a) => a.id === appBId), false, "Citizen A must NOT see Citizen B's application in list");

    assert.ok(listB.some((a) => a.id === appBId));
    assert.equal(listB.some((a) => a.id === appAId), false, "Citizen B must NOT see Citizen A's application in list");
  });

  it("should block citizen A from reading citizen B's application by ID", () => {
    const forbiddenRead = getApplicationById(appBId, { userId: userA, role: "citizen" });
    assert.equal(forbiddenRead, null, "Cross-user direct read must return null / be blocked");
  });

  it("should block citizen A from updating citizen B's application", () => {
    assert.throws(
      () => {
        saveApplication(
          {
            id: appBId,
            schemeId: "SC002",
            userId: userB,
            status: "Hacked Status",
          },
          { userId: userA, role: "citizen" }
        );
      },
      /Access denied|Unauthorized/i,
      "Cross-user modification must throw an Access denied error"
    );
  });

  it("should block citizen A from deleting citizen B's application", () => {
    assert.throws(
      () => {
        deleteApplication(appBId, { userId: userA, role: "citizen" });
      },
      /Access denied|Unauthorized/i,
      "Cross-user deletion must throw an Access denied error"
    );
  });


  it("should allow an administrator to view any citizen application", () => {
    const adminRead = getApplicationById(appAId, { userId: "admin_user", role: "admin" });
    assert.ok(adminRead, "Administrator role must have authorized access to view applications");
    assert.equal(adminRead.id, appAId);
  });

  it("should sanitize public tracking lookups without leaking citizen PII", () => {
    const publicResult = lookupPublicApplication(appAId);
    assert.ok(publicResult, "Public reference search should find application");
    assert.equal(publicResult.id, appAId);
    assert.equal(publicResult.schemeName, "PMEGP Scheme");
    assert.equal(publicResult.currentStage, 1);
    assert.equal(publicResult.userId, undefined, "Public tracking must NEVER expose internal user_id");
    assert.equal(publicResult.applicantPhone, undefined, "Public tracking must NOT leak applicant phone number");
  });
});
