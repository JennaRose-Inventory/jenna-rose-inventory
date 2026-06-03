// ── Department helpers ────────────────────────────────────────────────────────

export const OWNER_NAMES    = ["Kelvin", "Jenn"]; // can switch departments
export const DEPARTMENTS    = ["frontend", "kitchen"];
export const DEPT_KEY       = "jr_department";
export const KITCHEN_SUPP_KEY = "jr_suppliers_kitchen";

export function getDept()    { return localStorage.getItem(DEPT_KEY) || null; }
export function setDept(d)   { localStorage.setItem(DEPT_KEY, d); }

export function isOwner(name) {
  return OWNER_NAMES.some(o => o.toLowerCase() === (name || "").toLowerCase().trim());
}

export function deptLabel(dept, lang) {
  const isZH = lang === "zh";
  if (dept === "kitchen")  return isZH ? "🍳 厨房" : "🍳 Kitchen";
  if (dept === "frontend") return isZH ? "☕ 前台" : "☕ Front";
  return "";
}

// localStorage key for kitchen suppliers (separate from frontend)
export function loadKitchenSuppliers() {
  try {
    const s = localStorage.getItem(KITCHEN_SUPP_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
export function saveKitchenSuppliers(data) {
  try { localStorage.setItem(KITCHEN_SUPP_KEY, JSON.stringify(data)); } catch {}
}
