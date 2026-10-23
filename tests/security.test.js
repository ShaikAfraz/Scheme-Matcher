import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  sanitizeUser,
  sanitizeString,
  isValidEmail,
} from "../server/security.js";

describe("Security Module - Password Hashing and Validation", () => {
  it("should generate scrypt hash format with salt and hash parts", () => {
    const raw = "CitizenSecret@2026";
    const hashed = hashPassword(raw);

    assert.ok(hashed.startsWith("scrypt:"), "Hash must begin with scrypt identifier prefix");
    const parts = hashed.split(":");
    assert.equal(parts.length, 3, "Hash string must have scrypt:salt:derivedKey format");
    assert.equal(parts[1].length, 32, "Salt must be 16 bytes encoded as 32 hex chars");
    assert.equal(parts[2].length, 128, "Key must be 64 bytes encoded as 128 hex chars");
  });

  it("should generate distinct salts and hashes for the same password", () => {
    const p = "SamePassword123";
    const hash1 = hashPassword(p);
    const hash2 = hashPassword(p);

    assert.notEqual(hash1, hash2, "Distinct salts must produce different hash strings");
  });

  it("should verify correct password with scrypt timing-safe check", () => {
    const raw = "ValidPassphrase#123";
    const hashed = hashPassword(raw);

    const result = verifyPassword(raw, hashed);
    assert.equal(result.valid, true);
    assert.equal(result.needsUpgrade, false);
  });

  it("should reject incorrect password", () => {
    const raw = "ValidPassphrase#123";
    const hashed = hashPassword(raw);

    assert.equal(verifyPassword("WrongPassword", hashed).valid, false);
    assert.equal(verifyPassword("", hashed).valid, false);
    assert.equal(verifyPassword(null, hashed).valid, false);
  });

  it("should support legacy plaintext comparison for backward compatibility with existing users", () => {
    const legacyPlain = "demo123";
    const validMatch = verifyPassword("demo123", legacyPlain);
    assert.equal(validMatch.valid, true);
    assert.equal(validMatch.needsUpgrade, true);

    const invalidMatch = verifyPassword("wrongpass", legacyPlain);
    assert.equal(invalidMatch.valid, false);
  });


  it("should generate cryptographically strong 256-bit session tokens", () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();

    assert.equal(token1.length, 64, "Token should be 32 bytes encoded in 64 hex characters");
    assert.equal(token2.length, 64);
    assert.notEqual(token1, token2, "Session tokens must be collision-resistant");
  });

  it("should sanitize user objects by stripping password and password hash", () => {
    const userRow = {
      id: "usr_101",
      name: "Ramesh Kumar",
      email: "ramesh@citizen.in",
      password: "scrypt:98a72b:f03b8c7e...",
      system_role: "citizen",
      role: "Artisan",
      profile_data: JSON.stringify({ age: 38, category: "SC" }),
    };

    const sanitized = sanitizeUser(userRow);
    assert.equal(sanitized.password, undefined, "Password must be stripped from sanitized user");
    assert.equal(sanitized.id, "usr_101");
    assert.equal(sanitized.systemRole, "citizen");
    assert.deepEqual(sanitized.profileData, { age: 38, category: "SC" });
  });

  it("should sanitize input strings and strip potential script tags", () => {
    assert.equal(sanitizeString("  hello world  "), "hello world");
    assert.equal(sanitizeString("<script>alert('xss')</script>"), "");
    assert.equal(sanitizeString(null), "");
    assert.equal(sanitizeString(undefined), "");
  });

  it("should accurately validate email syntax", () => {
    assert.equal(isValidEmail("citizen@gov.in"), true);
    assert.equal(isValidEmail("user.name+tag@sub.domain.org"), true);
    assert.equal(isValidEmail("invalid-email"), false);
    assert.equal(isValidEmail("@domain.com"), false);
    assert.equal(isValidEmail(""), false);
  });
});
