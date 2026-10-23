/**
 * Deterministic Verification Engine for Scheme Matcher.
 *
 * Implements strict, verifiable rule checks comparing extracted certificate
 * details against the citizen's profile and the target scheme's statutory requirements.
 */

/**
 * Calculate token overlap and Levenshtein similarity between two strings.
 */
export function calculateNameSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;

  const normalize = (s) =>
    s
      .toLowerCase()
      .replace(/\b(mr|mrs|ms|shri|smt|kumari|dr|shree)\b\.?/gi, "")
      .replace(/[^a-z\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const n1 = normalize(str1);
  const n2 = normalize(str2);

  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0;
  if (n1.includes(n2) || n2.includes(n1)) return 0.9;

  // Token set overlap
  const tokens1 = new Set(n1.split(" "));
  const tokens2 = new Set(n2.split(" "));
  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  const tokenRatio = intersection.size / union.size;

  // Levenshtein distance
  const len1 = n1.length;
  const len2 = n2.length;
  const matrix = Array.from({ length: len1 + 1 }, () => new Array(len2 + 1).fill(0));

  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = n1[i - 1] === n2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const dist = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const charRatio = (maxLen - dist) / maxLen;

  return Math.max(tokenRatio, charRatio);
}

/**
 * Execute deterministic verification rules.
 */
export function verifyDocument({
  extractedData = {},
  userProfile = {},
  scheme = null,
  duplicateChecks = { duplicateHashFound: false, duplicateCertFound: false },
}) {
  const evidence = [];
  const missingRequirements = [];
  let hasFail = false;
  let hasWarning = false;

  const {
    applicantName,
    issuingAuthority,
    certificateNumber,
    issueDate,
    expiryDate,
    annualIncome,
    documentTypeDetected,
    confidence = 0.5,
  } = extractedData;

  // -------------------------------------------------------------
  // RULE 1: DUPLICATE DETECTION (PREVENT FRAUDULENT RE-UPLOAD)
  // -------------------------------------------------------------
  if (duplicateChecks.duplicateHashFound) {
    hasFail = true;
    evidence.push({
      rule: "DUPLICATE_FILE",
      status: "FAIL",
      message: "Security Flag: Identical document binary is already registered under another citizen profile.",
    });
    missingRequirements.push("Unique, genuine document credentials required.");
  } else if (duplicateChecks.duplicateCertFound) {
    hasFail = true;
    evidence.push({
      rule: "DUPLICATE_CERTIFICATE_NUMBER",
      status: "FAIL",
      message: `Security Flag: Certificate number ${certificateNumber} is already associated with another citizen record.`,
    });
    missingRequirements.push("Certificate number conflict must be resolved with issuing authority.");
  } else {
    evidence.push({
      rule: "DUPLICATE_CHECK",
      status: "PASS",
      message: "Deduplication check passed: Zero hash or certificate conflicts across registry.",
    });
  }

  // -------------------------------------------------------------
  // RULE 2: NAME CONCORDANCE (APPLICANT IDENTITY VERIFICATION)
  // -------------------------------------------------------------
  const profileName = userProfile.name || "";
  if (applicantName && profileName) {
    const similarity = calculateNameSimilarity(applicantName, profileName);
    const pct = Math.round(similarity * 100);

    if (similarity >= 0.8) {
      evidence.push({
        rule: "NAME_CONCORDANCE",
        status: "PASS",
        similarity,
        message: `Applicant name concordance verified: '${applicantName}' matches registered citizen profile '${profileName}' (${pct}% match).`,
      });
    } else if (similarity >= 0.5) {
      hasWarning = true;
      evidence.push({
        rule: "NAME_CONCORDANCE",
        status: "WARNING",
        similarity,
        message: `Name variation detected: Document displays '${applicantName}' while profile is registered as '${profileName}' (${pct}% match). Flagged for administrative concordance check.`,
      });
      missingRequirements.push("Administrative manual clearance for name spelling concordance.");
    } else {
      hasFail = true;
      evidence.push({
        rule: "NAME_CONCORDANCE",
        status: "FAIL",
        similarity,
        message: `Name discrepancy: Extracted holder name '${applicantName}' does not correspond to applicant '${profileName}' (${pct}% match).`,
      });
      missingRequirements.push("Certificate must be issued in the name of the registered applicant.");
    }
  } else if (!applicantName) {
    hasWarning = true;
    evidence.push({
      rule: "NAME_CONCORDANCE",
      status: "WARNING",
      message: "Applicant name could not be reliably extracted from the document header. Manual review required.",
    });
    missingRequirements.push("Clear, legible applicant name required.");
  }

  // -------------------------------------------------------------
  // RULE 3: DOCUMENT TYPE CONCORDANCE
  // -------------------------------------------------------------
  const userType = extractedData.userSelectedType || "other";
  if (documentTypeDetected && userType && userType !== "other") {
    if (documentTypeDetected === userType) {
      evidence.push({
        rule: "TYPE_CONCORDANCE",
        status: "PASS",
        message: `Document content matches declared category '${userType}'.`,
      });
    } else if (
      (userType === "income" && documentTypeDetected === "caste") ||
      (userType === "caste" && documentTypeDetected === "income")
    ) {
      hasFail = true;
      evidence.push({
        rule: "TYPE_CONCORDANCE",
        status: "FAIL",
        message: `Document mismatch: You declared an ${userType.toUpperCase()} certificate, but uploaded a ${documentTypeDetected.toUpperCase()} certificate.`,
      });
      missingRequirements.push(`Upload valid ${userType.toUpperCase()} certificate.`);
    } else {
      hasWarning = true;
      evidence.push({
        rule: "TYPE_CONCORDANCE",
        status: "WARNING",
        message: `Document classification advisory: Content identified as '${documentTypeDetected}' while declared as '${userType}'.`,
      });
    }
  }

  // -------------------------------------------------------------
  // RULE 4: STATUTORY INCOME CEILING CHECK
  // -------------------------------------------------------------
  if (annualIncome !== null && annualIncome !== undefined) {
    if (scheme && scheme.income_limit && scheme.income_limit > 0) {
      if (annualIncome > scheme.income_limit) {
        hasFail = true;
        evidence.push({
          rule: "INCOME_CEILING",
          status: "FAIL",
          extractedIncome: annualIncome,
          ceiling: scheme.income_limit,
          message: `Statutory income breach: Extracted annual income of ₹${annualIncome.toLocaleString(
            "en-IN"
          )} exceeds the scheme limit of ₹${scheme.income_limit.toLocaleString("en-IN")}.`,
        });
        missingRequirements.push(
          `Annual family income must not exceed ₹${scheme.income_limit.toLocaleString("en-IN")}.`
        );
      } else {
        evidence.push({
          rule: "INCOME_CEILING",
          status: "PASS",
          extractedIncome: annualIncome,
          ceiling: scheme.income_limit,
          message: `Income eligibility verified: Extracted income ₹${annualIncome.toLocaleString(
            "en-IN"
          )} is within scheme limit of ₹${scheme.income_limit.toLocaleString("en-IN")}.`,
        });
      }
    } else {
      evidence.push({
        rule: "INCOME_RECORD",
        status: "PASS",
        extractedIncome: annualIncome,
        message: `Annual family income extracted: ₹${annualIncome.toLocaleString("en-IN")}.`,
      });
    }

    // Check discrepancy against user's declared profile income
    if (userProfile.income && userProfile.income > 0) {
      const diffRatio = Math.abs(annualIncome - userProfile.income) / userProfile.income;
      if (diffRatio > 0.35) {
        hasWarning = true;
        evidence.push({
          rule: "INCOME_PROFILE_VARIANCE",
          status: "WARNING",
          message: `Variance observed: Certificate income (₹${annualIncome.toLocaleString(
            "en-IN"
          )}) differs by ${Math.round(diffRatio * 100)}% from declared profile income (₹${Number(
            userProfile.income
          ).toLocaleString("en-IN")}).`,
        });
      }
    }
  } else if (userType === "income") {
    hasWarning = true;
    evidence.push({
      rule: "INCOME_LEGIBILITY",
      status: "WARNING",
      message: "Annual income figure could not be automatically parsed from this income document.",
    });
    missingRequirements.push("Legible annual income figures required.");
  }

  // -------------------------------------------------------------
  // RULE 5: CERTIFICATE VALIDITY & EXPIRY WINDOW
  // -------------------------------------------------------------
  const now = new Date();
  if (expiryDate) {
    const exp = new Date(expiryDate);
    if (!isNaN(exp.getTime())) {
      if (exp < now) {
        hasFail = true;
        evidence.push({
          rule: "EXPIRY_CHECK",
          status: "FAIL",
          expiryDate,
          message: `Document lapsed: Certificate expired on ${expiryDate}.`,
        });
        missingRequirements.push("Active, unexpired certificate required.");
      } else {
        evidence.push({
          rule: "EXPIRY_CHECK",
          status: "PASS",
          expiryDate,
          message: `Document active: Valid until ${expiryDate}.`,
        });
      }
    }
  }

  if (issueDate) {
    const iss = new Date(issueDate);
    if (!isNaN(iss.getTime())) {
      if (iss > now) {
        hasFail = true;
        evidence.push({
          rule: "ISSUE_DATE_CHECK",
          status: "FAIL",
          issueDate,
          message: `Chronological violation: Certificate has an invalid future issue date (${issueDate}).`,
        });
        missingRequirements.push("Genuine document with authentic historical issue date.");
      } else if (userType === "income") {
        // Income certificates typically have 1-3 year statutory shelf life
        const diffDays = (now.getTime() - iss.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 365 * 3) {
          hasWarning = true;
          evidence.push({
            rule: "ISSUE_DATE_CHECK",
            status: "WARNING",
            issueDate,
            message: `Aging document: Income certificate issued on ${issueDate} exceeds the standard 3-year statutory validity window.`,
          });
          missingRequirements.push("Recent income certificate (issued within last 12-36 months).");
        } else {
          evidence.push({
            rule: "ISSUE_DATE_CHECK",
            status: "PASS",
            issueDate,
            message: `Issue date verified: ${issueDate} is within acceptable validity guidelines.`,
          });
        }
      } else {
        evidence.push({
          rule: "ISSUE_DATE_CHECK",
          status: "PASS",
          issueDate,
          message: `Issue date verified: ${issueDate}.`,
        });
      }
    }
  }

  // -------------------------------------------------------------
  // RULE 6: MANDATORY ISSUING AUTHORITY & REGISTRATION SEAL
  // -------------------------------------------------------------
  if (issuingAuthority) {
    evidence.push({
      rule: "ISSUING_AUTHORITY",
      status: "PASS",
      authority: issuingAuthority,
      message: `Competent authority identified: ${issuingAuthority}.`,
    });
  } else {
    hasWarning = true;
    evidence.push({
      rule: "ISSUING_AUTHORITY",
      status: "WARNING",
      message: "Competent issuing authority seal or header could not be verified automatically.",
    });
    missingRequirements.push("Authorized department/tahsildar header.");
  }

  if (certificateNumber) {
    evidence.push({
      rule: "CERTIFICATE_IDENTIFIER",
      status: "PASS",
      certificateNumber,
      message: `Certificate serial reference recorded: ${certificateNumber}.`,
    });
  } else {
    hasWarning = true;
    evidence.push({
      rule: "CERTIFICATE_IDENTIFIER",
      status: "WARNING",
      message: "Official certificate serial number or registration reference is missing or unreadable.",
    });
  }

  // -------------------------------------------------------------
  // SYNTHESIS: DETERMINISTIC STATUS RESOLUTION
  // -------------------------------------------------------------
  let status = "Pending";
  let summary = "";

  if (hasFail) {
    status = "Rejected With Reason";
    summary = `Verification rejected: Failed statutory checks (${missingRequirements.join("; ")}).`;
  } else if (hasWarning || confidence < 0.6) {
    status = "Needs Review";
    summary = `Pending official review: Credential requires administrative clearance (${missingRequirements.join("; ") || "unverified fields"}).`;
  } else {
    status = "Verified Against Provided Criteria";
    summary = "Criteria met: Document credentials successfully match applicant profile and statutory scheme requirements.";
  }

  return {
    status,
    statusLabel: status,
    summary,
    evidence,
    missingRequirements,
    confidence,
    isEligible: status === "Verified Against Provided Criteria",
    requiresManualReview: status === "Needs Review",
    verifiedAt: new Date().toISOString(),
    disclaimer:
      "Verification is an automated criteria check based on self-attested documents. Official legal sanction requires physical verification of original certificates with the lending bank or district nodal committee.",
  };
}
