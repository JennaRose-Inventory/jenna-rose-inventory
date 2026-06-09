// ── Auth helpers ──────────────────────────────────────────────────────────────
const AUTH_KEY = "jr_auth"; // localStorage key

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setStoredAuth(data) {
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(data)); } catch {}
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEY);
  // Also clear name and dept so fresh login
  localStorage.removeItem("jr_user");
  localStorage.removeItem("jr_department");
}

export function isAdmin(username) {
  return ["Kelvin","Jenn"].some(a => a.toLowerCase() === (username||"").toLowerCase().trim());
}
