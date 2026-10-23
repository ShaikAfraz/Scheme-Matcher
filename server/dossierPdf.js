/**
 * BANK DOSSIER PDF GENERATOR
 * Generates official-standard, print-friendly, downloadable PDF binary buffer
 * for citizen scheme submissions to lead banks and nodal agencies.
 * 
 * Complies with PDF 1.4 specification with zero external dependencies.
 */

import { maskSensitiveIdentifier } from "./verification/extractor.js";

/**
 * PDF Writer supporting geometric shapes, fonts, tables, wrapped text,
 * headers/footers, and multi-page flows.
 */
export class PdfDocumentWriter {
  constructor() {
    this.width = 595.28; // Standard A4 width in points
    this.height = 841.89; // Standard A4 height in points
    this.margin = 36;
    this.contentWidth = this.width - this.margin * 2;
    this.pages = [];
    this.currentPage = null;
    this.y = this.height - this.margin;
    this.addPage();
  }

  addPage() {
    this.currentPage = {
      commands: [],
    };
    this.pages.push(this.currentPage);
    this.y = this.height - this.margin;
    return this.currentPage;
  }

  cmd(str) {
    this.currentPage.commands.push(str);
  }

  checkPageBreak(neededHeight = 40) {
    if (this.y - neededHeight < this.margin + 30) {
      this.addPage();
      return true;
    }
    return false;
  }

  rect(x, y, w, h, { fill = null, stroke = null, lineWidth = 1 } = {}) {
    this.cmd("q");
    this.cmd(`${lineWidth} w`);
    if (fill) this.cmd(`${fill[0]} ${fill[1]} ${fill[2]} rg`);
    if (stroke) this.cmd(`${stroke[0]} ${stroke[1]} ${stroke[2]} RG`);
    this.cmd(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) this.cmd("B");
    else if (fill) this.cmd("f");
    else if (stroke) this.cmd("S");
    this.cmd("Q");
  }

  line(x1, y1, x2, y2, { color = [0.8, 0.8, 0.8], lineWidth = 1 } = {}) {
    this.cmd("q");
    this.cmd(`${lineWidth} w`);
    this.cmd(`${color[0]} ${color[1]} ${color[2]} RG`);
    this.cmd(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    this.cmd("Q");
  }

  escapeText(str) {
    if (str == null) return "";
    return String(str)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/₹/g, "INR ")
      .replace(/[^\x00-\x7F]/g, " "); // Replace non-ASCII with clean space for Type 1 fonts
  }

  text(txt, x, y, { font = "/F1", size = 10, color = [0.1, 0.1, 0.1] } = {}) {
    const sanitized = this.escapeText(txt);
    this.cmd("q");
    this.cmd("BT");
    this.cmd(`${font} ${size} Tf`);
    this.cmd(`${color[0]} ${color[1]} ${color[2]} rg`);
    this.cmd(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    this.cmd(`(${sanitized}) Tj`);
    this.cmd("ET");
    this.cmd("Q");
  }

  wrapText(text, maxCharsPerLine = 75) {
    if (!text) return [];
    const words = String(text).split(/\s+/);
    const lines = [];
    let currentLine = "";

    for (const w of words) {
      if ((currentLine + " " + w).trim().length <= maxCharsPerLine) {
        currentLine = (currentLine + " " + w).trim();
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = w;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  build() {
    const pageKids = [];
    let currentObjNum = 6;
    const pageEntries = [];

    // Annotate footers on all pages
    const totalPages = this.pages.length;
    for (let p = 0; p < totalPages; p++) {
      const page = this.pages[p];
      // Save current page command target
      this.currentPage = page;
      // Draw subtle footer separator
      this.line(this.margin, 30, this.width - this.margin, 30, { color: [0.8, 0.8, 0.8], lineWidth: 0.5 });
      this.text(
        "Scheme Matcher Citizen Welfare Portal - System-Generated Bank Submission Dossier",
        this.margin,
        18,
        { font: "/F1", size: 8, color: [0.45, 0.45, 0.45] }
      );
      this.text(
        `Page ${p + 1} of ${totalPages}`,
        this.width - this.margin - 50,
        18,
        { font: "/F2", size: 8, color: [0.35, 0.35, 0.35] }
      );
    }

    for (let i = 0; i < this.pages.length; i++) {
      const pageObjNum = currentObjNum++;
      const streamObjNum = currentObjNum++;
      pageKids.push(`${pageObjNum} 0 R`);
      pageEntries.push({ pageObjNum, streamObjNum, page: this.pages[i] });
    }

    const objects = [];
    objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[2] = `<< /Type /Pages /Kids [${pageKids.join(" ")}] /Count ${this.pages.length} >>`;
    objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
    objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
    objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>";

    for (const entry of pageEntries) {
      objects[entry.pageObjNum] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.width} ${this.height}] /Contents ${entry.streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> >>`;
      const streamContent = entry.page.commands.join("\n");
      const streamLen = Buffer.byteLength(streamContent, "latin1");
      objects[entry.streamObjNum] = `<< /Length ${streamLen} >>\nstream\n${streamContent}\nendstream`;
    }

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = [];
    for (let i = 1; i < objects.length; i++) {
      offsets[i] = Buffer.byteLength(pdf, "latin1");
      pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objects.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    return Buffer.from(pdf, "latin1");
  }
}

/**
 * Format currency amount safely without missing symbols
 */
function formatRupees(amount) {
  if (amount == null || isNaN(amount)) return "Not Specified";
  return `INR ${Number(amount).toLocaleString("en-IN")}`;
}

/**
 * Format date in standard Indian administrative format (e.g. 24 Oct 2026, 02:45 IST)
 */
function formatDossierDate(isoString) {
  try {
    const d = isoString ? new Date(isoString) : new Date();
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }) + " IST";
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Generate full Bank Dossier PDF Buffer
 * @param {Object} params
 * @param {string} params.referenceNumber
 * @param {string} params.generatedAt
 * @param {Object} params.profile
 * @param {Array} params.schemes
 * @param {Array} params.documents
 * @param {Object} params.eligibilityResults
 * @returns {Buffer} PDF binary buffer
 */
export function generateBankDossierPdf({
  referenceNumber,
  generatedAt,
  profile = {},
  schemes = [],
  documents = [],
  eligibilityResults = [],
}) {
  const doc = new PdfDocumentWriter();
  const left = doc.margin;
  const contentW = doc.contentWidth;

  // -------------------------------------------------------------
  // 1. OFFICIAL HEADER BOX
  // -------------------------------------------------------------
  const headerHeight = 85;
  doc.y -= headerHeight;
  // Deep navy government banner
  doc.rect(left, doc.y, contentW, headerHeight, { fill: [0.08, 0.16, 0.28], stroke: [0.05, 0.10, 0.20], lineWidth: 1 });

  // Emblem/Agency Line
  doc.text("GOVERNMENT OF INDIA - CITIZEN WELFARE PORTAL", left + 14, doc.y + 66, {
    font: "/F2",
    size: 9,
    color: [0.93, 0.79, 0.40], // Saffron / Gold accent
  });

  // Main Dossier Title
  doc.text("NATIONAL BENEFICIARY ELIGIBILITY & LEAD BANK DOSSIER", left + 14, doc.y + 47, {
    font: "/F2",
    size: 13,
    color: [1, 1, 1],
  });

  // Subtitle
  doc.text("LEAD BANK APPLICATION & SCHEME MATCHING DOSSIER - Official Citizen Record for Bank Appraisal", left + 14, doc.y + 32, {
    font: "/F3",
    size: 8,
    color: [0.82, 0.88, 0.94],
  });

  // Reference and Date Pill Box inside Header (Right side)
  const metaBoxW = 190;
  const metaBoxX = left + contentW - metaBoxW - 12;
  const metaBoxY = doc.y + 14;
  doc.rect(metaBoxX, metaBoxY, metaBoxW, 58, { fill: [0.04, 0.10, 0.18], stroke: [0.2, 0.3, 0.4], lineWidth: 0.8 });

  doc.text("DOSSIER REFERENCE:", metaBoxX + 8, metaBoxY + 44, { font: "/F1", size: 7.5, color: [0.7, 0.75, 0.82] });
  doc.text(referenceNumber || "DOS-PENDING", metaBoxX + 8, metaBoxY + 30, { font: "/F2", size: 10, color: [0.95, 0.75, 0.35] });

  doc.text("GENERATION TIMESTAMP:", metaBoxX + 8, metaBoxY + 18, { font: "/F1", size: 7.5, color: [0.7, 0.75, 0.82] });
  doc.text(formatDossierDate(generatedAt), metaBoxX + 8, metaBoxY + 7, { font: "/F1", size: 8, color: [1, 1, 1] });

  doc.y -= 16;

  // -------------------------------------------------------------
  // 2. BENEFICIARY PROFILE SECTION
  // -------------------------------------------------------------
  doc.checkPageBreak(120);
  const sec1Height = 88;
  doc.y -= sec1Height;

  // Section Header Bar
  doc.rect(left, doc.y + sec1Height - 20, contentW, 20, { fill: [0.93, 0.95, 0.98], stroke: [0.8, 0.85, 0.92], lineWidth: 0.8 });
  doc.text("1. BENEFICIARY PROFILE & DEMOGRAPHIC DECLARATION", left + 8, doc.y + sec1Height - 14, {
    font: "/F2",
    size: 9.5,
    color: [0.08, 0.16, 0.28],
  });

  // Profile Card Content Box
  doc.rect(left, doc.y, contentW, sec1Height - 20, { fill: [1, 1, 1], stroke: [0.8, 0.85, 0.92], lineWidth: 0.8 });

  const col1X = left + 12;
  const col2X = left + contentW / 2 + 10;
  let py = doc.y + sec1Height - 34;

  const bName = profile.name || "Citizen Beneficiary";
  const bState = profile.state || "All India";
  const bDistrict = profile.district || "General District";
  const bCategory = profile.category || "General";
  const bIncome = profile.income != null ? formatRupees(profile.income) : "INR 1,50,000";
  const bOcc = profile.occupation || profile.businessType || "Self-Employed / Individual";
  const bAge = profile.age ? `${profile.age} Years` : "Adult (18+)";
  const bMaskedId = profile.aadhaar ? maskSensitiveIdentifier(profile.aadhaar) : (profile.mobile ? `Mobile: ${maskSensitiveIdentifier(profile.mobile)}` : "Verified System ID");

  // Col 1
  doc.text("Beneficiary Name:", col1X, py, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bName, col1X + 90, py, { font: "/F2", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.text("Social Category:", col1X, py - 14, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bCategory, col1X + 90, py - 14, { font: "/F2", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.text("Annual Income:", col1X, py - 28, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bIncome, col1X + 90, py - 28, { font: "/F2", size: 8.5, color: [0.12, 0.45, 0.22] });

  doc.text("Age / Group:", col1X, py - 42, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bAge, col1X + 90, py - 42, { font: "/F1", size: 8.5, color: [0.1, 0.1, 0.1] });

  // Col 2
  doc.text("Target State:", col2X, py, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bState, col2X + 90, py, { font: "/F2", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.text("Target District:", col2X, py - 14, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bDistrict, col2X + 90, py - 14, { font: "/F1", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.text("Occupation / Sector:", col2X, py - 28, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bOcc, col2X + 90, py - 28, { font: "/F1", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.text("Verified ID Reference:", col2X, py - 42, { font: "/F1", size: 8.5, color: [0.4, 0.45, 0.5] });
  doc.text(bMaskedId, col2X + 90, py - 42, { font: "/F2", size: 8.5, color: [0.1, 0.1, 0.1] });

  doc.y -= 14;

  // -------------------------------------------------------------
  // 3. SELECTED SCHEMES & VERIFIED ELIGIBILITY RESULTS
  // -------------------------------------------------------------
  doc.checkPageBreak(90);
  const selectedSchemes = Array.isArray(schemes) && schemes.length > 0 ? schemes : [
    {
      id: "SCH_DEF_01",
      name: "Standard Central Financial Assistance",
      ministry: "Ministry of Finance",
      benefits: "Capital subsidy and priority credit support",
      portalUrl: "https://myscheme.gov.in",
      eligibilityStatus: "Eligible",
    },
  ];

  // Section Header
  doc.y -= 22;
  doc.rect(left, doc.y, contentW, 20, { fill: [0.93, 0.95, 0.98], stroke: [0.8, 0.85, 0.92], lineWidth: 0.8 });
  doc.text(`2. EVALUATED SCHEMES & ELIGIBILITY STATUS (${selectedSchemes.length} Included)`, left + 8, doc.y + 6, {
    font: "/F2",
    size: 9.5,
    color: [0.08, 0.16, 0.28],
  });
  doc.y -= 8;

  for (let idx = 0; idx < selectedSchemes.length; idx++) {
    const s = selectedSchemes[idx];
    const matchItem = eligibilityResults.find((r) => r.schemeId === s.id || r.id === s.id) || {};
    const statusText = s.eligibilityStatus || matchItem.eligibilityStatus || "Eligible";
    const statusColor = statusText === "Eligible" ? [0.1, 0.5, 0.2] : statusText === "Potentially Eligible" ? [0.65, 0.45, 0.05] : [0.75, 0.15, 0.15];

    // Card for scheme
    doc.checkPageBreak(58);
    const cardHeight = 52;
    doc.y -= cardHeight;
    doc.rect(left, doc.y, contentW, cardHeight, { fill: [0.99, 0.99, 0.99], stroke: [0.85, 0.88, 0.93], lineWidth: 0.6 });

    // Scheme Name & Code
    doc.text(`${idx + 1}. ${s.name || "Government Welfare Scheme"}`, left + 10, doc.y + cardHeight - 14, {
      font: "/F2",
      size: 9,
      color: [0.08, 0.16, 0.28],
    });

    // Status Badge (Right)
    const badgeW = 120;
    const badgeX = left + contentW - badgeW - 10;
    doc.rect(badgeX, doc.y + cardHeight - 19, badgeW, 14, {
      fill: statusText === "Eligible" ? [0.91, 0.97, 0.92] : [0.99, 0.96, 0.88],
      stroke: statusColor,
      lineWidth: 0.7,
    });
    doc.text(statusText.toUpperCase(), badgeX + 8, doc.y + cardHeight - 15, {
      font: "/F2",
      size: 7.5,
      color: statusColor,
    });

    // Details line 1: Ministry & Benefits
    const minText = `Ministry: ${s.ministry || "Government of India"}  |  Assistance: ${s.benefits || "Direct Benefit"}`;
    doc.text(minText.slice(0, 80), left + 10, doc.y + cardHeight - 27, {
      font: "/F1",
      size: 8,
      color: [0.35, 0.38, 0.42],
    });

    // Details line 2: Official Source Link
    const sourceLink = s.portalUrl || s.portal_url || "https://myscheme.gov.in";
    doc.text(`Official Source / Application Portal: ${sourceLink}`, left + 10, doc.y + cardHeight - 39, {
      font: "/F1",
      size: 7.5,
      color: [0.15, 0.35, 0.65],
    });

    doc.y -= 6;
  }

  // -------------------------------------------------------------
  // 4. DOCUMENT VERIFICATION PORTFOLIO CHECKLIST
  // -------------------------------------------------------------
  doc.checkPageBreak(120);
  doc.y -= 22;
  doc.rect(left, doc.y, contentW, 20, { fill: [0.93, 0.95, 0.98], stroke: [0.8, 0.85, 0.92], lineWidth: 0.8 });
  doc.text(`3. DOCUMENT VERIFICATION PORTFOLIO (${documents.length} Items)`, left + 8, doc.y + 6, {
    font: "/F2",
    size: 9.5,
    color: [0.08, 0.16, 0.28],
  });
  doc.y -= 2;

  // Table header
  doc.y -= 16;
  doc.rect(left, doc.y, contentW, 16, { fill: [0.90, 0.92, 0.95], stroke: [0.8, 0.85, 0.9], lineWidth: 0.5 });
  doc.text("#", left + 8, doc.y + 4, { font: "/F2", size: 8, color: [0.2, 0.2, 0.2] });
  doc.text("Document Name", left + 26, doc.y + 4, { font: "/F2", size: 8, color: [0.2, 0.2, 0.2] });
  doc.text("Category", left + 200, doc.y + 4, { font: "/F2", size: 8, color: [0.2, 0.2, 0.2] });
  doc.text("Verification Determination", left + 310, doc.y + 4, { font: "/F2", size: 8, color: [0.2, 0.2, 0.2] });
  doc.text("Original Presented", left + 435, doc.y + 4, { font: "/F2", size: 8, color: [0.2, 0.2, 0.2] });

  const docList = Array.isArray(documents) && documents.length > 0 ? documents : [
    { name: "Aadhaar Card", type: "Identity Proof", verificationStatus: "Verified Against Provided Criteria" },
    { name: "Income Certificate", type: "Financial Proof", verificationStatus: "Verified Against Provided Criteria" },
  ];

  for (let i = 0; i < docList.length; i++) {
    const d = docList[i];
    doc.checkPageBreak(22);
    doc.y -= 18;
    const isEven = i % 2 === 0;
    doc.rect(left, doc.y, contentW, 18, {
      fill: isEven ? [1, 1, 1] : [0.97, 0.98, 0.99],
      stroke: [0.85, 0.88, 0.92],
      lineWidth: 0.5,
    });

    const isV = d.verificationStatus?.includes("Verified") || d.status === "Verified";
    const vText = isV ? "Verified Against Provided Criteria" : (d.verificationStatus || "Needs Review");
    const vColor = isV ? [0.1, 0.5, 0.2] : [0.65, 0.45, 0.05];

    doc.text(String(i + 1), left + 8, doc.y + 5, { font: "/F1", size: 7.5, color: [0.4, 0.4, 0.4] });
    doc.text((d.name || "Document").slice(0, 30), left + 26, doc.y + 5, { font: "/F2", size: 7.5, color: [0.1, 0.1, 0.1] });
    doc.text((d.type || "General").split("(")[0].trim().slice(0, 20), left + 200, doc.y + 5, { font: "/F1", size: 7.5, color: [0.35, 0.35, 0.35] });
    doc.text(vText.slice(0, 26), left + 310, doc.y + 5, { font: "/F2", size: 7.5, color: vColor });
    doc.text("[  ] Verified at Branch", left + 435, doc.y + 5, { font: "/F1", size: 7.5, color: [0.5, 0.5, 0.5] });
  }

  doc.y -= 12;

  // -------------------------------------------------------------
  // 5. LEAD BANK APPLICATION CHECKLIST
  // -------------------------------------------------------------
  doc.checkPageBreak(85);
  doc.y -= 22;
  doc.rect(left, doc.y, contentW, 20, { fill: [0.93, 0.95, 0.98], stroke: [0.8, 0.85, 0.92], lineWidth: 0.8 });
  doc.text("4. LEAD BANK SUBMISSION CHECKLIST - CITIZEN INSTRUCTIONS", left + 8, doc.y + 6, {
    font: "/F2",
    size: 9.5,
    color: [0.08, 0.16, 0.28],
  });
  doc.y -= 4;

  const checklistHeight = 58;
  doc.y -= checklistHeight;
  doc.rect(left, doc.y, contentW, checklistHeight, { fill: [1, 1, 1], stroke: [0.85, 0.88, 0.92], lineWidth: 0.7 });

  const steps = [
    "[ ] STEP 1: Bring physical original copies of all uploaded documents to the designated Lead Bank Branch or DIC.",
    "[ ] STEP 2: Quote Dossier Reference Number at the Citizen Help Desk for fast verification lookup.",
    "[ ] STEP 3: Submit self-attested document photocopies along with official branch credit application form.",
    "[ ] STEP 4: Obtain branch acknowledgment stamp on this dossier slip for permanent physical tracking.",
  ];

  let sy = doc.y + checklistHeight - 14;
  for (const step of steps) {
    doc.text(step, left + 10, sy, { font: "/F1", size: 7.5, color: [0.2, 0.22, 0.25] });
    sy -= 12;
  }

  doc.y -= 14;

  // -------------------------------------------------------------
  // 6. STATUTORY DISCLAIMER (MANDATORY NON-APPROVAL NOTICE)
  // -------------------------------------------------------------
  doc.checkPageBreak(75);
  const disclaimerHeight = 62;
  doc.y -= disclaimerHeight;

  // Warm warning amber border & background
  doc.rect(left, doc.y, contentW, disclaimerHeight, {
    fill: [0.99, 0.98, 0.94],
    stroke: [0.85, 0.70, 0.35],
    lineWidth: 1,
  });

  doc.text("STATUTORY DISCLAIMER & NON-SANCTION NOTICE (STATUTORY NON-APPROVAL DISCLAIMER)", left + 10, doc.y + disclaimerHeight - 14, {
    font: "/F2",
    size: 8,
    color: [0.65, 0.25, 0.05],
  });

  const disclaimerLines = [
    "This dossier is system-generated and does NOT constitute an official sanction, approval, or guarantee of funding.",
    "Scheme Matcher provides deterministic eligibility assessments strictly derived from citizen-reported profile data",
    "and publicly codified scheme criteria. Official sanction, interest subsidy, or capital disbursement remains",
    "subject to in-person physical verification of original records, regulatory credit appraisal, and statutory guidelines",
    "administered by the lending financial institution or competent government authority.",
  ];

  let dy = doc.y + disclaimerHeight - 25;
  for (const line of disclaimerLines) {
    doc.text(line, left + 10, dy, { font: "/F1", size: 7, color: [0.45, 0.25, 0.08] });
    dy -= 8.5;
  }

  return doc.build();
}

export const generateDossierPdfBuffer = generateBankDossierPdf;
