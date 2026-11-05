/**
 * CITIZEN PROFILES & SESSION MANAGEMENT
 * Authentic citizen user authentication and profile persistence.
 *
 * All demo personas and fake applicant data have been removed.
 * Only real authenticated citizen accounts and their database records are used.
 */

export const DEMO_PROFILES = [];

/**
 * Storage keys for real citizen accounts and sessions
 */
const STORAGE_KEY = "scheme_matcher_custom_users";
const CURRENT_USER_KEY = "scheme_matcher_active_user";
const AUTH_TOKEN_KEY = "scheme_matcher_auth_token";

export function getCustomUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function getStoredAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch (e) {
    return "";
  }
}

export function setStoredAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (e) {}
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (e) {}
}

export async function syncUserToDatabase(user) {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });
    return await res.json();
  } catch (e) {
    console.warn("[Database Sync] Running in offline / local mode:", e.message);
    return { success: false, message: e.message };
  }
}

export function saveCustomUser(user) {
  try {
    const users = getCustomUsers();
    const updated = [user, ...users.filter((u) => u.email !== user.email)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}

export function getStoredActiveUser() {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setStoredActiveUser(user) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {}
}
