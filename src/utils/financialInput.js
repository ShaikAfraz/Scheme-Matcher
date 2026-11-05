/**
 * FINANCIAL INPUT PARSING & VALIDATION UTILITY
 * Robust, consistent validation for currency & numeric fields across frontend and backend.
 * Handles:
 * - Direct numbers (150000, 250000, 0)
 * - Comma-formatted strings ("1,50,000", "2,50,000")
 * - Currency-prefixed strings ("₹150000", "₹ 2,50,000", "Rs. 150000", "INR 200000")
 * - Decimals ("150000.50")
 * - Zero amounts (allowed where permitted, e.g. unemployed/destitute family income = 0)
 * - Empty fields
 * - Strictly rejects genuinely invalid inputs (letters, negative numbers, multiple decimals)
 */

export function sanitizeNumericString(val) {
  if (val == null) return "";
  if (typeof val === "number") return isNaN(val) ? "" : String(val);
  const s = String(val).trim();
  // Strip currency symbols (₹, Rs, Rs., INR), commas, whitespace
  return s.replace(/[₹\s,]|rs\.?|inr/gi, "");
}

export function formatINR(val) {
  if (val == null || val === "" || isNaN(val)) return "0";
  const num = Number(val);
  return num.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

export function formatINRLakhs(num) {
  if (num == null || isNaN(num) || num < 0) return "";
  if (num === 0) return "₹0 (Zero Income / Unemployed)";
  const inrFormatted = `₹${formatINR(num)}`;
  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, "");
    return `${inrFormatted} (${cr} Crore)`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, "");
    return `${inrFormatted} (${lk} Lakh)`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, "");
    return `${inrFormatted} (${k} Thousand)`;
  }
  return inrFormatted;
}

export function parseFinancialAmount(val, options = {}) {
  const {
    fieldName = "Amount",
    allowZero = true,
    min = allowZero ? 0 : 1,
    max = 1000000000, // ₹100 Crore statutory upper bound
  } = options;

  if (val == null || val === "") {
    return {
      raw: val ?? "",
      cleaned: "",
      numeric: null,
      isValid: true,
      valid: true,
      isEmpty: true,
      error: null,
      formattedINR: "",
      formattedLakhs: "",
    };
  }

  const cleaned = sanitizeNumericString(val);
  if (cleaned === "") {
    return {
      raw: val,
      cleaned: "",
      numeric: null,
      isValid: true,
      valid: true,
      isEmpty: true,
      error: null,
      formattedINR: "",
      formattedLakhs: "",
    };
  }

  // Must be valid non-negative number (integer or decimal)
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return {
      raw: val,
      cleaned,
      numeric: null,
      isValid: false,
      valid: false,
      isEmpty: false,
      error: `Please enter a valid numeric amount for ${fieldName} (e.g. 150000 or ₹1,50,000).`,
      formattedINR: "",
      formattedLakhs: "",
    };
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) {
    return {
      raw: val,
      cleaned,
      numeric: null,
      isValid: false,
      valid: false,
      isEmpty: false,
      error: `Invalid number format for ${fieldName}.`,
      formattedINR: "",
      formattedLakhs: "",
    };
  }

  if (num < min) {
    return {
      raw: val,
      cleaned,
      numeric: num,
      isValid: false,
      valid: false,
      isEmpty: false,
      error: `${fieldName} cannot be less than ₹${formatINR(min)}.`,
      formattedINR: `₹${formatINR(num)}`,
      formattedLakhs: formatINRLakhs(num),
    };
  }

  if (num > max) {
    return {
      raw: val,
      cleaned,
      numeric: num,
      isValid: false,
      valid: false,
      isEmpty: false,
      error: `${fieldName} exceeds maximum allowable ceiling of ₹${formatINR(max)}.`,
      formattedINR: `₹${formatINR(num)}`,
      formattedLakhs: formatINRLakhs(num),
    };
  }

  return {
    raw: val,
    cleaned,
    numeric: num,
    isValid: true,
    valid: true,
    isEmpty: false,
    error: null,
    formattedINR: `₹${formatINR(num)}`,
    formattedLakhs: formatINRLakhs(num),
  };
}
