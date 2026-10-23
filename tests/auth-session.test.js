import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import {
  initDatabase,
  saveUser,
  getUserById,
  getUserByEmailOrMobile,
  authenticateUser,
  createSession,
  getSessionUser,
  deleteSession,
  deleteUserSessions,
  db,
} from "../server/db.js";

describe("Authentication & Session Management Module", () => {
  // Ensure DB tables are initialized
  initDatabase();

  const testEmail = `test_citizen_${Date.now()}@example.in`;
  const testPassword = "MySecurePassword2026!";
  let testUserId = null;

  it("should securely register a citizen with scrypt password hashing", () => {
    const user = saveUser({
      name: "Radha Sharma",
      email: testEmail,
      mobile: "+91 98989 12345",
      password: testPassword,
      role: "Women Artisan",
      systemRole: "citizen",
      profileData: {
        age: 32,
        gender: "Female",
        category: "OBC",
        income: 180000,
      },
    });

    assert.ok(user, "User record must be returned");
    assert.ok(user.id.startsWith("usr_"));
    assert.equal(user.email, testEmail);
    assert.equal(user.systemRole, "citizen");
    assert.equal(user.password, undefined, "Sanitized user must not expose password");

    testUserId = user.id;

    // Verify stored password in raw DB is an scrypt hash
    const rawUser = db.prepare("SELECT password FROM users WHERE id = ?").get(testUserId);
    assert.ok(rawUser.password.startsWith("scrypt:"), "Stored password must be scrypt hash");
  });

  it("should authenticate valid credentials and return user", () => {
    const authResult = authenticateUser(testEmail, testPassword);
    assert.ok(authResult, "Authentication should succeed with correct credentials");
    assert.equal(authResult.id, testUserId);
    assert.equal(authResult.password, undefined, "Sanitized authenticated user must not leak password");
  });

  it("should reject invalid credentials", () => {
    const wrongPass = authenticateUser(testEmail, "IncorrectPassword");
    assert.equal(wrongPass, null, "Should return null on wrong password");

    const wrongUser = authenticateUser("nonexistent@domain.com", testPassword);
    assert.equal(wrongUser, null, "Should return null on non-existent identifier");
  });

  it("should create a session token with valid expiration", () => {
    const session = createSession(testUserId, 24);
    assert.ok(session, "Session record must be created");
    assert.equal(session.token.length, 64, "Session token must be 64-char hex");
    assert.equal(session.userId, testUserId);
    assert.ok(new Date(session.expiresAt) > new Date(), "Session expiration must be in the future");

    // Retrieve user via session token
    const sessionUser = getSessionUser(session.token);
    assert.ok(sessionUser, "Should retrieve user via active session token");
    assert.equal(sessionUser.id, testUserId);
    assert.equal(sessionUser.email, testEmail);
  });

  it("should invalidate session when user logs out (deleteSession)", () => {
    const session = createSession(testUserId, 24);
    const token = session.token;

    // Verify session is active
    assert.ok(getSessionUser(token));

    // Log out / delete session
    const deleted = deleteSession(token);
    assert.equal(deleted, true);

    // Verify session token is no longer valid
    assert.equal(getSessionUser(token), null, "Invalidated session token must return null");
  });

  it("should delete all active sessions for a user", () => {
    const s1 = createSession(testUserId, 24);
    const s2 = createSession(testUserId, 24);

    assert.ok(getSessionUser(s1.token));
    assert.ok(getSessionUser(s2.token));

    deleteUserSessions(testUserId);

    assert.equal(getSessionUser(s1.token), null);
    assert.equal(getSessionUser(s2.token), null);
  });

  after(() => {
    try {
      if (testUserId) {
        db.prepare("DELETE FROM sessions WHERE user_id = ?").run(testUserId);
        db.prepare("DELETE FROM users WHERE id = ?").run(testUserId);
      }
    } catch {}
  });
});
