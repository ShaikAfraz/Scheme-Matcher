import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  db,
  saveUser,
  createSession,
  deleteSession,
  getAllDocuments,
  getDocumentById,
  deleteDocument,
  getDocumentHistory,
  adminReviewDocument,
} from "../server/db.js";
import {
  validateUploadPayload,
  storeDocumentFile,
  readDocumentFile,
  deleteDocumentFile,
  STORAGE_ROOT,
} from "../server/storage.js";
import {
  extractStructuredDocument,
  parseStructuredFieldsFromText,
  maskSensitiveIdentifier,
} from "../server/verification/extractor.js";
import {
  verifyDocument,
  calculateNameSimilarity,
} from "../server/verification/engine.js";

// Helper to construct a minimal valid PDF with specified textual content
function createTestPdf(contentLines) {
  const streamLines = contentLines
    .map((line, idx) => `0 -20 Td (${line.replace(/[()]/g, "")}) Tj`)
    .join("\n");

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 300 >> stream
BT
/F1 12 Tf
72 712 Td
(GOVERNMENT OF KARNATAKA) Tj
${streamLines}
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000600 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
680
%%EOF`;
  return Buffer.from(pdf, "utf8");
}

describe("Document Verification, Extraction & Secure Storage Workflow", () => {
  let citizenUser;
  let citizenToken;
  let secondCitizenUser;
  let adminUser;
  let createdDocIds = [];

  before(() => {
    // 1. Create primary test citizen
    citizenUser = saveUser({
      name: "Sunita Sharma",
      email: "sunita.verification.test@example.com",
      mobile: "9876599001",
      password: "Password@123",
      role: "Micro Entrepreneur",
      category: "OBC",
      income: 180000,
      state: "Karnataka",
    });
    citizenToken = createSession(citizenUser.id, 24);

    // 2. Create second test citizen for conflict & access tests
    secondCitizenUser = saveUser({
      name: "Ramesh Kumar",
      email: "ramesh.conflict.test@example.com",
      mobile: "9876599002",
      password: "Password@123",
      role: "Artisan",
      category: "SC",
      income: 150000,
      state: "Karnataka",
    });

    // 3. Create admin user
    adminUser = saveUser({
      name: "Verification Officer K. Rao",
      email: "officer.rao.test@schemematcher.gov.in",
      mobile: "9876599003",
      password: "AdminPassword@123",
      role: "Nodal Verification Officer",
      systemRole: "admin",
    });
  });

  after(() => {
    // Cleanup files and database records created in tests
    for (const docId of createdDocIds) {
      try {
        deleteDocument(docId, citizenUser.id, "admin");
      } catch {}
    }

    if (citizenUser?.id) {
      const userDir = path.join(STORAGE_ROOT, citizenUser.id);
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
      }
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(citizenUser.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(citizenUser.id);
    }
    if (secondCitizenUser?.id) {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(secondCitizenUser.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(secondCitizenUser.id);
    }
    if (adminUser?.id) {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(adminUser.id);
      db.prepare("DELETE FROM users WHERE id = ?").run(adminUser.id);
    }
  });

  // -----------------------------------------------------------
  // 1. STORAGE SECURITY & MAGIC BYTES VALIDATION
  // -----------------------------------------------------------
  describe("1. Private Storage & File Integrity Validation", () => {
    test("should reject 0-byte empty file upload", () => {
      assert.throws(
        () => {
          validateUploadPayload({
            filename: "empty.pdf",
            buffer: Buffer.alloc(0),
            reportedMimeType: "application/pdf",
          });
        },
        /Cannot upload empty file/
      );
    });

    test("should reject executable or spoofed files disguised as PDF", () => {
      // Fake PDF header with arbitrary text or script
      const spoofed = Buffer.from("MZ\\x90\\x00\\x03This is a disguised binary executable");
      assert.throws(
        () => {
          validateUploadPayload({
            filename: "malware.pdf",
            buffer: spoofed,
            reportedMimeType: "application/pdf",
          });
        },
        /Unsupported or malformed file type/
      );
    });

    test("should reject files exceeding statutory size ceiling (> 10MB)", () => {
      // Construct buffer 11MB
      const bigBuf = Buffer.alloc(11 * 1024 * 1024);
      bigBuf[0] = 0x25;
      bigBuf[1] = 0x50;
      bigBuf[2] = 0x44;
      bigBuf[3] = 0x46; // %PDF
      assert.throws(
        () => {
          validateUploadPayload({
            filename: "huge.pdf",
            buffer: bigBuf,
            reportedMimeType: "application/pdf",
          });
        },
        /exceeds statutory limit/
      );
    });

    test("should validate genuine PDF and compute SHA-256 fingerprint", () => {
      const pdfBuf = createTestPdf(["Revenue Department", "Income Certificate"]);
      const res = validateUploadPayload({
        filename: "income_slip.pdf",
        buffer: pdfBuf,
        reportedMimeType: "application/pdf",
      });

      assert.strictEqual(res.ext, "pdf");
      assert.strictEqual(res.mimeType, "application/pdf");
      assert.ok(res.fileHash.length === 64, "SHA-256 hash must be 64 hexadecimal characters");
    });

    test("should store file in private jail and prevent path traversal", () => {
      const pdfBuf = createTestPdf(["Aadhaar Verification"]);
      const docId = `doc_test_${Date.now()}`;
      createdDocIds.push(docId);

      const filePath = storeDocumentFile({
        userId: citizenUser.id,
        docId,
        buffer: pdfBuf,
        ext: "pdf",
      });

      assert.ok(fs.existsSync(filePath), "Stored file must exist on disk");
      assert.ok(filePath.startsWith(STORAGE_ROOT), "File must be jailed inside STORAGE_ROOT");

      // Verify reading through private storage
      const readBuf = readDocumentFile(filePath);
      assert.ok(readBuf && readBuf.length === pdfBuf.length);

      // Verify path traversal rejection
      assert.throws(() => {
        storeDocumentFile({
          userId: "../../etc",
          docId: "passwd",
          buffer: pdfBuf,
          ext: "txt",
        });
      });
    });
  });

  // -----------------------------------------------------------
  // 2. DOCUMENT EXTRACTION & STRUCTURED PARSING
  // -----------------------------------------------------------
  describe("2. Document Text Extraction & Pattern Parsing", () => {
    test("should extract structured credentials from genuine Income Certificate PDF", async () => {
      const pdfBuf = createTestPdf([
        "Revenue Department - Tahsildar Bangalore North",
        "INCOME CERTIFICATE No: RD0038291823",
        "Name of Applicant: Sunita Sharma",
        "Annual Family Income: Rs. 1,80,000",
        "Issue Date: 12/04/2024 Valid Till: 31/03/2027",
      ]);

      const extracted = await extractStructuredDocument(pdfBuf, "application/pdf", "income.pdf", "income");

      assert.strictEqual(extracted.documentTypeDetected, "income");
      assert.strictEqual(extracted.applicantName, "Sunita Sharma");
      assert.ok(extracted.issuingAuthority.includes("Revenue Department") || extracted.issuingAuthority.includes("Tahsildar"));
      assert.strictEqual(extracted.certificateNumber, "RD0038291823");
      assert.strictEqual(extracted.annualIncome, 180000);
      assert.strictEqual(extracted.issueDate, "2024-04-12");
      assert.strictEqual(extracted.expiryDate, "2027-03-31");
      assert.ok(extracted.confidence >= 0.7, "Confidence should be high for complete certificate");
      assert.strictEqual(extracted.missingOrUnreadable.length, 0);
    });

    test("should extract Caste Certificate and identify affirmative action category", async () => {
      const text = `
        GOVERNMENT OF KARNATAKA
        OFFICE OF THE TAHSILDAR
        CASTE CERTIFICATE
        Certificate No: CASTE/2024/99120
        This is to certify that Smt. Sunita Sharma
        belongs to Other Backward Class (OBC) category.
        Issued on: 15-05-2023
      `;

      const parsed = parseStructuredFieldsFromText(text, "caste");

      assert.strictEqual(parsed.documentTypeDetected, "caste");
      assert.strictEqual(parsed.applicantName, "Sunita Sharma");
      assert.strictEqual(parsed.certificateNumber, "CASTE/2024/99120");
      assert.strictEqual(parsed.issueDate, "2023-05-15");
    });

    test("should mask sensitive Aadhaar 12-digit number for PII protection", () => {
      const masked = maskSensitiveIdentifier("5421 8901 2345");
      assert.strictEqual(masked, "XXXX-XXXX-2345");
      assert.strictEqual(masked.includes("5421"), false, "Aadhaar first 8 digits must never be exposed");
    });
  });

  // -----------------------------------------------------------
  // 3. DETERMINISTIC VERIFICATION ENGINE
  // -----------------------------------------------------------
  describe("3. Deterministic Verification Engine & Eligibility Rules", () => {
    test("should award 'Verified Against Provided Criteria' for valid concordant income certificate", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "Sunita Sharma",
          issuingAuthority: "Tahsildar Bangalore North",
          certificateNumber: "RD0038291823",
          annualIncome: 180000,
          issueDate: "2024-04-12",
          expiryDate: "2027-03-31",
          documentTypeDetected: "income",
          userSelectedType: "income",
          confidence: 0.95,
        },
        userProfile: {
          name: "Sunita Sharma",
          income: 180000,
          category: "OBC",
          state: "Karnataka",
        },
        scheme: {
          id: "SC001",
          name: "Prime Minister Employment Generation Programme (PMEGP)",
          income_limit: 300000,
        },
      });

      assert.strictEqual(result.status, "Verified Against Provided Criteria");
      assert.strictEqual(result.isEligible, true);
      assert.strictEqual(result.requiresManualReview, false);
      assert.ok(result.evidence.some((e) => e.rule === "NAME_CONCORDANCE" && e.status === "PASS"));
      assert.ok(result.evidence.some((e) => e.rule === "INCOME_CEILING" && e.status === "PASS"));
      assert.ok(result.evidence.some((e) => e.rule === "EXPIRY_CHECK" && e.status === "PASS"));
    });

    test("should return 'Rejected With Reason' when annual income exceeds statutory scheme ceiling", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "Sunita Sharma",
          issuingAuthority: "Tahsildar",
          certificateNumber: "RD0099112233",
          annualIncome: 450000, // Exceeds ceiling
          issueDate: "2024-01-10",
          expiryDate: "2027-01-10",
          documentTypeDetected: "income",
          userSelectedType: "income",
          confidence: 0.9,
        },
        userProfile: {
          name: "Sunita Sharma",
          income: 450000,
        },
        scheme: {
          id: "SC001",
          income_limit: 300000, // Statutory ceiling
        },
      });

      assert.strictEqual(result.status, "Rejected With Reason");
      assert.strictEqual(result.isEligible, false);
      const failRule = result.evidence.find((e) => e.rule === "INCOME_CEILING");
      assert.ok(failRule && failRule.status === "FAIL");
      assert.ok(failRule.message.includes("exceeds the scheme limit"));
    });

    test("should return 'Rejected With Reason' when certificate has expired", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "Sunita Sharma",
          issuingAuthority: "Tahsildar",
          certificateNumber: "RD0038291823",
          annualIncome: 150000,
          issueDate: "2020-01-01",
          expiryDate: "2023-03-31", // Lapsed date
          documentTypeDetected: "income",
          userSelectedType: "income",
          confidence: 0.85,
        },
        userProfile: { name: "Sunita Sharma", income: 150000 },
        scheme: { income_limit: 300000 },
      });

      assert.strictEqual(result.status, "Rejected With Reason");
      const expRule = result.evidence.find((e) => e.rule === "EXPIRY_CHECK");
      assert.ok(expRule && expRule.status === "FAIL");
      assert.ok(expRule.message.includes("Certificate expired"));
    });

    test("should return 'Rejected With Reason' on hard name mismatch (different person)", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "Vikramaditya Hegde", // Completely different person
          issuingAuthority: "Tahsildar",
          certificateNumber: "RD99221100",
          annualIncome: 120000,
          documentTypeDetected: "income",
          userSelectedType: "income",
          confidence: 0.8,
        },
        userProfile: { name: "Sunita Sharma" },
      });

      assert.strictEqual(result.status, "Rejected With Reason");
      const nameRule = result.evidence.find((e) => e.rule === "NAME_CONCORDANCE");
      assert.ok(nameRule && nameRule.status === "FAIL");
      assert.ok(nameRule.message.includes("does not correspond to applicant"));
    });

    test("should return 'Needs Review' and route to admin on minor name variation / initials", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "S. K. Sharma", // Initials variation of Sunita Sharma
          issuingAuthority: "Tahsildar",
          certificateNumber: "RD99221188",
          annualIncome: 160000,
          issueDate: "2024-06-01",
          documentTypeDetected: "income",
          userSelectedType: "income",
          confidence: 0.8,
        },
        userProfile: { name: "Sunita Sharma", income: 160000 },
        scheme: { income_limit: 300000 },
      });

      assert.strictEqual(result.status, "Needs Review");
      assert.strictEqual(result.requiresManualReview, true);
      const nameRule = result.evidence.find((e) => e.rule === "NAME_CONCORDANCE");
      assert.ok(nameRule && nameRule.status === "WARNING");
      assert.ok(nameRule.message.includes("Flagged for administrative concordance check"));
    });

    test("should return 'Rejected With Reason' on duplicate file hash collision across accounts", () => {
      const result = verifyDocument({
        extractedData: {
          applicantName: "Sunita Sharma",
          documentTypeDetected: "income",
        },
        userProfile: { name: "Sunita Sharma" },
        duplicateChecks: { duplicateHashFound: true, duplicateCertFound: false },
      });

      assert.strictEqual(result.status, "Rejected With Reason");
      assert.ok(result.evidence.some((e) => e.rule === "DUPLICATE_FILE" && e.status === "FAIL"));
    });
  });

  // -----------------------------------------------------------
  // 4. VERIFICATION TIMELINE & ADMIN REVIEW
  // -----------------------------------------------------------
  describe("4. Verification History & Admin Determination Desk", () => {
    let testDocId;

    test("should record initial upload event in document_verification_history", () => {
      testDocId = `doc_hist_${Date.now()}`;
      createdDocIds.push(testDocId);

      const pdfBuf = createTestPdf(["Name: Sunita Sharma", "Income: 180000"]);
      const storedPath = storeDocumentFile({
        userId: citizenUser.id,
        docId: testDocId,
        buffer: pdfBuf,
        ext: "pdf",
      });

      db.prepare(`
        INSERT INTO documents (
          id, user_id, name, size, type, type_id, uploaded_at, status,
          file_path, verification_status, verification_reason
        ) VALUES (
          ?, ?, 'income_cert.pdf', '15.4 KB', 'Income Certificate', 'income',
          '10:30 AM', 'Needs Review', ?, 'Needs Review', 'Initial upload evaluated'
        )
      `).run(testDocId, citizenUser.id, storedPath);

      db.prepare(`
        INSERT INTO document_verification_history (
          id, document_id, user_id, previous_status, new_status,
          action, actor_id, actor_role, notes
        ) VALUES (?, ?, ?, NULL, 'Needs Review', 'UPLOADED', ?, 'citizen', 'Initial submission')
      `).run(`hist_1_${Date.now()}`, testDocId, citizenUser.id, citizenUser.id);

      const history = getDocumentHistory(testDocId, citizenUser.id);
      assert.ok(history.length >= 1, "Must have at least one history entry");
      assert.strictEqual(history[0].newStatus, "Needs Review");
      assert.strictEqual(history[0].action, "UPLOADED");
    });

    test("should allow administrator to review and update document status with official notes", () => {
      const ok = adminReviewDocument(testDocId, {
        verificationStatus: "Verified Against Provided Criteria",
        verificationNotes: "Approved by Nodal Verification Officer: Physical seals matched district revenue gazette.",
        reviewerAdminId: adminUser.id,
      });

      assert.strictEqual(ok, true);

      // Verify updated record in DB
      const updated = getDocumentById(testDocId, citizenUser.id);
      assert.strictEqual(updated.verificationStatus, "Verified Against Provided Criteria");
      assert.strictEqual(updated.isVerified, true);
      assert.strictEqual(updated.reviewedBy, adminUser.id);

      // Verify audit trail in history
      const history = getDocumentHistory(testDocId, citizenUser.id);
      assert.strictEqual(history.length, 2, "Must contain two timeline events");
      const reviewEvent = history[1];
      assert.strictEqual(reviewEvent.action, "MANUAL_REVIEW");
      assert.strictEqual(reviewEvent.actorRole, "admin");
      assert.ok(reviewEvent.notes.includes("Approved by Nodal Verification Officer"));
    });

    test("should enforce strict per-user access policies on documents", () => {
      // Second citizen cannot fetch primary citizen's document
      const denied = getDocumentById(testDocId, secondCitizenUser.id, "citizen");
      assert.strictEqual(denied, null, "Other citizens must be forbidden from accessing private documents");

      // Admin CAN view primary citizen's document
      const adminAccess = getDocumentById(testDocId, adminUser.id, "admin");
      assert.ok(adminAccess !== null, "Admin must be authorized to inspect documents");
    });

    test("should securely delete document record and unlink physical file upon authorized deletion", () => {
      const docToDelete = getDocumentById(testDocId, citizenUser.id);
      assert.ok(docToDelete && docToDelete.filePath);
      assert.ok(fs.existsSync(docToDelete.filePath));

      const deleted = deleteDocument(testDocId, citizenUser.id, "citizen");
      assert.ok(deleted);

      // Unlink physical file
      const removedFile = deleteDocumentFile(docToDelete.filePath);
      assert.strictEqual(removedFile, true);
      assert.strictEqual(fs.existsSync(docToDelete.filePath), false, "File must be completely erased from disk");

      // Verify database record gone
      const checkDb = getDocumentById(testDocId, citizenUser.id);
      assert.strictEqual(checkDb, null);

      // Verify history cascades or cleared
      const checkHist = getDocumentHistory(testDocId, citizenUser.id);
      assert.strictEqual(checkHist.length, 0);
    });
  });
});
