import { PDFParse } from "pdf-parse";
import fs from "fs";

// Read API key from environment or .env file
function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY;
  try {
    if (fs.existsSync(".env")) {
      const content = fs.readFileSync(".env", "utf8");
      const match = content.match(/(?:VITE_)?GEMINI_API_KEY=([^\r\n]+)/);
      if (match) return match[1].trim();
    }
  } catch {}
  return null;
}

/**
 * Mask sensitive numbers (e.g. 12-digit Aadhaar, 16-digit bank accounts) to protect PII.
 */
export function maskSensitiveIdentifier(str) {
  if (!str) return "";
  const cleaned = str.trim();
  // 12 digit Aadhaar pattern
  if (/^\d{4}\s*\d{4}\s*\d{4}$/.test(cleaned)) {
    const digits = cleaned.replace(/\s+/g, "");
    return `XXXX-XXXX-${digits.slice(-4)}`;
  }
  // Generic numeric ID longer than 6 digits
  if (/^\d{7,}$/.test(cleaned)) {
    return `${"X".repeat(cleaned.length - 4)}${cleaned.slice(-4)}`;
  }
  return cleaned;
}

/**
 * Extract raw text from document buffer (PDF, image, or text-encoded).
 */
export async function extractDocumentText(buffer, mimeType, filename = "") {
  if (!buffer || buffer.length === 0) return "";

  if (mimeType === "application/pdf") {
    try {
      const parser = new PDFParse({ data: buffer });
      const res = await parser.getText();
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
      if (res && res.text && res.text.trim().length > 0) {
        return res.text.trim();
      }
    } catch (err) {
      console.warn("[Extractor] PDFParse failed, trying raw stream extraction:", err.message);
    }

    // Fallback: search for text in PDF streams
    try {
      const latin = buffer.toString("latin1");
      const textMatches = [];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let match;
      while ((match = tjRegex.exec(latin)) !== null) {
        textMatches.push(match[1]);
      }
      if (textMatches.length > 0) {
        return textMatches.join(" ");
      }
    } catch {}
  }

  // Image files (JPEG, PNG): If Gemini API key is configured, invoke multimodal extraction
  const apiKey = getGeminiApiKey();
  if (apiKey && (mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "application/pdf")) {
    try {
      const prompt = `You are a strict, secure document data extraction parser for the Indian Government welfare platform Scheme Matcher.
Inspect this uploaded document and transcribe all readable text verbatim.
Do not hallucinate or make assumptions. If unreadable, say UNREADABLE.`;

      const base64Data = buffer.toString("base64");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      }
    } catch (err) {
      console.warn("[Extractor] Gemini OCR unavailable or timed out:", err.message);
    }
  }

  // Final fallback: return filename as metadata hint
  return `Document: ${filename || "Uploaded File"}`;
}

/**
 * Deterministic Regex Parser tailored for Indian Government certificates & commercial records.
 */
export function parseStructuredFieldsFromText(text, userSelectedType = "other") {
  const cleanText = text || "";
  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let applicantName = null;
  let issuingAuthority = null;
  let certificateNumber = null;
  let issueDate = null;
  let expiryDate = null;
  let annualIncome = null;
  let detectedType = null;
  const missingOrUnreadable = [];

  // 1. Detect Document Type from content
  const lower = cleanText.toLowerCase();
  if (lower.includes("income certificate") || lower.includes("annual income") || lower.includes("family income")) {
    detectedType = "income";
  } else if (lower.includes("caste certificate") || lower.includes("community certificate") || lower.includes("scheduled caste") || lower.includes("scheduled tribe") || lower.includes("other backward class") || lower.includes("obc")) {
    detectedType = "caste";
  } else if (lower.includes("unique identification authority") || lower.includes("uidai") || lower.includes("aadhaar") || lower.includes("mera aadhaar")) {
    detectedType = "aadhaar";
  } else if (lower.includes("udyam") || lower.includes("ministry of micro") || lower.includes("msme")) {
    detectedType = "udyam";
  } else if (lower.includes("project report") || lower.includes("dpr") || lower.includes("machinery quotation") || lower.includes("project cost")) {
    detectedType = "dpr";
  } else if (lower.includes("passbook") || lower.includes("account number") || lower.includes("ifsc") || lower.includes("bank of") || lower.includes("state bank")) {
    detectedType = "bank";
  } else if (lower.includes("domicile") || lower.includes("resident certificate") || lower.includes("nativity")) {
    detectedType = "domicile";
  } else {
    detectedType = userSelectedType || "other";
  }

  // 2. Extract Applicant Name
  const namePatterns = [
    /(?:Name\s*(?:of Applicant|of Beneficiary|of Holder|of Certificate Holder)?|Applicant Name|Candidate Name|Beneficiary Name|Holder Name)\s*[:\-–]?\s*([A-Za-z.\s]{2,35})(?=$|[\r\n,;:])/i,
    /(?:Shri|Smt\.|Smt|Kumari|Mr\.|Mrs\.|Ms\.)\s+([A-Za-z.\s]{2,35})(?=$|[\r\n,;:])/i,
    /Certified that\s+(?:Smt\.|Smt|Shri|Kumari|Mr\.|Mrs\.|Ms\.)?\s*([A-Za-z.\s]{2,35})(?=$|[\r\n,;:]|\s+(?:son|daughter|wife|resident|belongs))/i,
  ];

  for (const pat of namePatterns) {
    const m = cleanText.match(pat);
    if (m && m[1]) {
      let candidate = m[1].replace(/[\r\n\t]+/g, " ").trim();
      // Strip honorific prefixes
      candidate = candidate.replace(/^(?:Shri|Smt\.|Smt|Kumari|Mr\.|Mrs\.|Ms\.)\s+/i, "").trim();
      // Stop before delimiter words
      candidate = candidate.split(/\b(?:Annual|Family|Income|Son|Daughter|Wife|Resident|Belongs|Category|Age|DOB|Dated|Valid)\b/i)[0].trim();
      // Ensure candidate doesn't match common noise words
      if (candidate.length >= 3 && !/^(Government|Revenue|Department|Certificate|State|District|Tahsildar|Date|Annual)/i.test(candidate)) {
        applicantName = candidate;
        break;
      }
    }
  }


  // 3. Extract Issuing Authority
  const authPatterns = [
    /(Government of [A-Za-z\s]+(?:Department)?)/i,
    /(Revenue Department[,\sA-Za-z]*)/i,
    /(Tahsildar[,\sA-Za-z0-9-]*)/i,
    /(Sub-Divisional (?:Officer|Magistrate)[,\sA-Za-z0-9-]*)/i,
    /(District Magistrate[,\sA-Za-z0-9-]*)/i,
    /(Unique Identification Authority of India|UIDAI)/i,
    /(Ministry of Micro, Small and Medium Enterprises)/i,
    /(General Manager[,\sA-Za-z]*District Industries Centre)/i,
  ];

  for (const pat of authPatterns) {
    const m = cleanText.match(pat);
    if (m && m[1]) {
      issuingAuthority = m[1].trim();
      break;
    }
  }

  // 4. Extract Certificate / Document Identifier Number
  const certPatterns = [
    /(?:Certificate\s*(?:No|Number)|Cert\s*No|Registration\s*(?:No|Number)|Udyam\s*Reg(?:\s*No)?|Reference\s*No|Sl\s*No|RD\s*No)\s*[:\-–]?\s*([A-Za-z0-9\/-]{5,32})/i,
    /(RD\d{10,14})/i,
    /(UDYAM-[A-Z]{2}-\d{2}-\d{7})/i,
    /(\d{4}\s*\d{4}\s*\d{4})/, // 12-digit Aadhaar format
  ];

  for (const pat of certPatterns) {
    const m = cleanText.match(pat);
    if (m && m[1]) {
      certificateNumber = maskSensitiveIdentifier(m[1].trim());
      break;
    }
  }

  // 5. Extract Annual Income (numeric & comma formatted)
  const incomePatterns = [
    /(?:Annual\s*(?:Family\s*)?Income|Family\s*Income|Total\s*Income|Income\s*from\s*all\s*sources)\s*[:\-–]?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:Rs\.?|INR|₹)\s*([\d,]{4,10})/i,
  ];

  for (const pat of incomePatterns) {
    const m = cleanText.match(pat);
    if (m && m[1]) {
      const rawNum = m[1].replace(/,/g, "");
      const val = parseFloat(rawNum);
      if (!isNaN(val) && val >= 10000 && val <= 50000000) {
        annualIncome = Math.round(val);
        break;
      }
    }
  }

  // 6. Extract Issue Date & Expiry Date
  const dateRegex = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g;
  const datesFound = [];
  let dMatch;
  while ((dMatch = dateRegex.exec(cleanText)) !== null) {
    datesFound.push(dMatch[1]);
  }

  if (datesFound.length > 0) {
    // Check line context for issue vs expiry
    const issueMatch = cleanText.match(/(?:Issue\s*Date|Date\s*of\s*Issue|Issued\s*on|Dated)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (issueMatch && issueMatch[1]) {
      issueDate = normalizeDateString(issueMatch[1]);
    } else {
      issueDate = normalizeDateString(datesFound[0]);
    }

    const expiryMatch = cleanText.match(/(?:Valid\s*(?:Till|Upto|Until)|Expiry\s*Date|Date\s*of\s*Expiry)\s*[:\-–]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i);
    if (expiryMatch && expiryMatch[1]) {
      expiryDate = normalizeDateString(expiryMatch[1]);
    } else if (datesFound.length > 1 && datesFound[1] !== datesFound[0]) {
      expiryDate = normalizeDateString(datesFound[1]);
    }
  }

  // Compute extraction confidence score based on key fields presence
  let score = 0;
  if (applicantName) score += 0.3;
  if (issuingAuthority) score += 0.25;
  if (certificateNumber) score += 0.25;
  if (issueDate) score += 0.1;
  if (detectedType === userSelectedType) score += 0.1;
  const confidence = Math.min(1.0, Math.max(0.1, Number(score.toFixed(2))));

  // Flag missing fields based on document category
  if (!applicantName) missingOrUnreadable.push("applicantName");
  if (!issuingAuthority) missingOrUnreadable.push("issuingAuthority");
  if (!certificateNumber) missingOrUnreadable.push("certificateNumber");
  if (userSelectedType === "income" && !annualIncome) missingOrUnreadable.push("annualIncome");

  return {
    applicantName,
    issuingAuthority,
    certificateNumber,
    issueDate,
    expiryDate,
    annualIncome,
    documentTypeDetected: detectedType,
    confidence,
    missingOrUnreadable,
    rawTextPreview: cleanText.slice(0, 300),
  };
}

/**
 * Normalizes date representations (DD/MM/YYYY or DD-MM-YYYY) into ISO YYYY-MM-DD.
 */
function normalizeDateString(str) {
  if (!str) return null;
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    // If year is 2 digits
    if (year < 100) year += year > 50 ? 1900 : 2000;
    // Check if format was YYYY-MM-DD
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
    }
  }
  return str;
}

/**
 * High-level extractor orchestrator.
 */
export async function extractStructuredDocument(buffer, mimeType, filename = "", userSelectedType = "other") {
  const rawText = await extractDocumentText(buffer, mimeType, filename);
  const parsed = parseStructuredFieldsFromText(rawText, userSelectedType);
  return {
    ...parsed,
    rawText,
    filename,
    mimeType,
  };
}
