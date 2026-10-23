/**
 * SECURITY MODULE
 * Cryptographic password hashing (scrypt), timing-safe verification,
 * session token generation, input validation, and user sanitization.
 */

import crypto from "node:crypto";

const SCRYPT_KEY_LEN = 64;
const SCRYPT_COST = 16384;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;

/**
 * Hash a plaintext password using crypto.scrypt
 * Output format: scrypt:<salt_hex>:<hash_hex>
 */
export function hashPassword(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length < 4) {
    throw new Error("Password must be at least 4 characters long");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(plaintext, salt, SCRYPT_KEY_LEN, {
    N: SCRYPT_COST,
    r: SCRYPT_BLOCK_SIZE,
    p: SCRYPT_PARALLELIZATION,
  });
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Timing-safe password verification
 * Supports both modern scrypt hashes and legacy plaintext (for graceful upgrade)
 */
export function verifyPassword(plaintext, storedHash) {
  if (typeof plaintext !== "string" || !storedHash) {
    return { valid: false, needsUpgrade: false };
  }

  // Modern scrypt format
  if (storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) {
      return { valid: false, needsUpgrade: false };
    }
    const salt = parts[1];
    const key = parts[2];
    const keyBuffer = Buffer.from(key, "hex");

    const derivedKey = crypto.scryptSync(plaintext, salt, keyBuffer.length, {
      N: SCRYPT_COST,
      r: SCRYPT_BLOCK_SIZE,
      p: SCRYPT_PARALLELIZATION,
    });

    const valid = crypto.timingSafeEqual(keyBuffer, derivedKey);
    return { valid, needsUpgrade: false };
  }

  // Graceful legacy plaintext fallback (timing-safe comparison)
  const plaintextBuf = Buffer.from(plaintext);
  const storedBuf = Buffer.from(String(storedHash));
  if (plaintextBuf.length === storedBuf.length) {
    const valid = crypto.timingSafeEqual(plaintextBuf, storedBuf);
    return { valid, needsUpgrade: valid };
  }

  return { valid: false, needsUpgrade: false };
}

/**
 * Generate a cryptographically secure 256-bit session token
 */
export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Sanitize user object for transmission, stripping credentials and internal fields
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return {
    ...safe,
    isDemo: Boolean(user.is_demo ?? user.isDemo),
    categoryBadge: user.category_badge ?? user.categoryBadge,
    badgeColor: user.badge_color ?? user.badgeColor,
    systemRole: user.system_role ?? user.systemRole ?? "citizen",
    profileData: typeof user.profile_data === "string"
      ? JSON.parse(user.profile_data)
      : user.profileData || null,
  };
}

/**
 * Basic input sanitizers and validators
 */
export function validateEmailOrMobile(identifier) {
  if (!identifier || typeof identifier !== "string") return false;
  const clean = identifier.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[+]?[\d\s-]{8,15}$/;
  return emailRegex.test(clean) || phoneRegex.test(clean);
}

export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeString(str, maxLen = 255) {
  if (typeof str !== "string") return "";
  const noScripts = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  const stripped = noScripts.replace(/<[^>]*>/g, "");
  return stripped.trim().slice(0, maxLen);
}



