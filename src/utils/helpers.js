// ── Key helpers ──────────────────────────────────────────────────────────────
export const countKey = (item) => `${item.category}||${item.name}`;

// ── App date — day starts at 6am, not midnight ────────────────────────────────
// If current time is before 6am, treat as previous day
// This gives buffer for late night operations (e.g. 12am-6am still = yesterday)
export function getAppDate() {
  const now = new Date();
  if (now.getHours() < 6) {
    // Before 6am — treat as yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString("en-GB");
  }
  return now.toLocaleDateString("en-GB");
}

// App day index (0=Mon ... 6=Sun) — also adjusted for 6am boundary
export function getAppDayIndex() {
  const now = new Date();
  const d = now.getHours() < 6
    ? new Date(now.getTime() - 86400000)
    : now;
  return d.getDay() === 0 ? 6 : d.getDay() - 1;
}

// ── Get effective low stock threshold for an item ─────────────────────────────
// Priority: item.lowStock → suppliers[category].lowStock → default 3
export function getThreshold(item, suppliers = {}) {
  if (item?.lowStock !== undefined && item.lowStock !== "" && !isNaN(Number(item.lowStock))) {
    return Number(item.lowStock);
  }
  const sup = suppliers[item?.category];
  if (sup?.lowStock !== undefined && sup.lowStock !== "" && !isNaN(Number(sup.lowStock))) {
    return Number(sup.lowStock);
  }
  return 3; // default
}

// ── Stock classification ──────────────────────────────────────────────────────
export function isLowStock(item, suppliers = {}) {
  const s = item.stock;
  if (s === "" || s === null || s === undefined) return false;
  if (s === "Need Order" || s === "not enough") return true;
  const n = Number(s);
  if (isNaN(n)) return false;
  const threshold = getThreshold(item, suppliers);
  return n <= threshold;
}

export function stockColor(val, item, suppliers = {}) {
  if (val === undefined || val === null || val === "") return "var(--text-muted)";
  if (val === "Need Order") return "var(--red-600)";
  if (val === "Enough")     return "var(--green-600)";
  const n = Number(val);
  if (!isNaN(n)) {
    const threshold = item ? getThreshold(item, suppliers) : 3;
    if (n <= threshold) return "var(--red-600)";
    return "var(--text-primary)"; // normal — just black
  }
  return "var(--text-secondary)";
}

export function stockBg(val) {
  if (val === undefined || val === null || val === "") return "transparent";
  if (val === "Need Order") return "var(--red-100)";
  if (val === "Enough")     return "var(--green-100)";
  const n = Number(val);
  if (!isNaN(n)) {
    if (n <= 3)  return "var(--red-100)";
    if (n <= 6)  return "var(--amber-100)";
    return "var(--green-100)";
  }
  return "transparent";
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export const todayStr = () => new Date().toLocaleDateString("en-GB");

export function shortDate(dateStr) {
  if (!dateStr) return "-";
  const parts = dateStr.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dateStr;
}

export function dayOfWeek(dateStr) {
  if (!dateStr) return "";
  const [d, m, y] = dateStr.split("/");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return days[new Date(`${y}-${m}-${d}`).getDay()] ?? "";
}

// ── Malaysia public holidays 2025-2026 (approximate) ─────────────────────────
const MY_HOLIDAYS = new Set([
  // 2025
  "01/01/2025","01/02/2025","11/02/2025","12/02/2025","04/04/2025",
  "01/05/2025","31/05/2025","02/06/2025","26/08/2025","31/08/2025",
  "16/09/2025","20/10/2025","25/12/2025",
  // 2026
  "01/01/2026","20/01/2026","21/01/2026","31/03/2026","01/05/2026",
  "31/05/2026","01/06/2026","31/08/2026","16/09/2026","25/12/2026",
  // 2027
  "01/01/2027","09/02/2027","10/02/2027","20/03/2027","01/05/2027",
  "31/05/2027","07/06/2027","31/08/2027","16/09/2027","25/12/2027",
]);

export function isMalaysiaHoliday(dateStr) {
  return MY_HOLIDAYS.has(dateStr);
}

export function isWeekend(dateStr) {
  if (!dateStr) return false;
  const [d, m, y] = dateStr.split("/");
  const day = new Date(`${y}-${m}-${d}`).getDay();
  return day === 0 || day === 6;
}

// ── Analytics helpers ─────────────────────────────────────────────────────────
export function buildItemHistoryMap(historyData) {
  // Returns { "cat||name": [{ date, stock, dayOfWeek }, ...] }
  const map = {};
  historyData.forEach((record) => {
    (record.items ?? []).forEach((item) => {
      const key = countKey(item);
      if (!map[key]) map[key] = [];
      const s = item.stock;
      if (s !== "" && s !== null && s !== undefined) {
        map[key].push({
          date: record.date,
          stock: s,
          dow: dayOfWeek(record.date),
          isHoliday: isMalaysiaHoliday(record.date),
          isWeekend: isWeekend(record.date),
        });
      }
    });
  });
  return map;
}

export function avgStock(entries) {
  const nums = entries
    .map((e) => Number(e.stock))
    .filter((n) => !isNaN(n));
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Items sorted by how often they appear low in history
export function lowStockTrend(historyData, topN = 8) {
  const freq = {};
  historyData.forEach((record) => {
    (record.items ?? []).forEach((item) => {
      if (isLowStock(item)) {
        const key = countKey(item);
        freq[key] = (freq[key] ?? 0) + 1;
      }
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([key, count]) => {
      const [category, name] = key.split("||");
      return { category, name, count };
    });
}

// Weekly activity: count of saves per day-of-week
export function weeklyActivity(historyData) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const counts = Object.fromEntries(days.map((d) => [d, 0]));
  historyData.forEach((r) => {
    const dow = dayOfWeek(r.date);
    if (dow in counts) counts[dow]++;
  });
  return days.map((d) => ({ day: d, saves: counts[d] }));
}

// Most counted categories by appearance in history
export function topCategories(historyData, topN = 6) {
  const freq = {};
  historyData.forEach((record) => {
    const seen = new Set();
    (record.items ?? []).forEach((item) => {
      if (!seen.has(item.category)) {
        freq[item.category] = (freq[item.category] ?? 0) + 1;
        seen.add(item.category);
      }
    });
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, count]) => ({ name, count }));
}

// ── Freshness tracking ────────────────────────────────────────────────────────
// Returns days since last restock for an item, or null if no record
export function daysSinceRestock(itemKey, freshMap) {
  const dateStr = freshMap?.[itemKey];
  if (!dateStr) return null;
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  const restockDate = new Date(yyyy, mm - 1, dd);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((today - restockDate) / 86400000);
  return diff;
}

// Returns true if item needs freshness alert
export function isFreshAlert(item, freshMap) {
  const freshDays = item?.freshDays;
  if (!freshDays || freshDays <= 0) return false;
  const days = daysSinceRestock(`${item.category}||${item.name}`, freshMap);
  if (days === null) return false; // never restocked = no alert
  return days >= freshDays;
}
