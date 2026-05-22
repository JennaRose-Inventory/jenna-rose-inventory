// ── Key helpers ──────────────────────────────────────────────────────────────
export const countKey = (item) => `${item.category}||${item.name}`;

// ── Stock classification ──────────────────────────────────────────────────────
export function isLowStock(item) {
  const s = item.stock;
  if (s === "" || s === null || s === undefined) return false;
  if (s === "Need Order" || s === "not enough") return true;
  const n = Number(s);
  return !isNaN(n) && n <= 3;
}

export function stockColor(val) {
  if (val === undefined || val === null || val === "") return "var(--text-muted)";
  if (val === "Need Order") return "var(--red-600)";
  if (val === "Enough")     return "var(--green-600)";
  const n = Number(val);
  if (!isNaN(n)) {
    if (n <= 3)  return "var(--red-600)";
    if (n <= 6)  return "var(--amber-500)";
    return "var(--green-600)";
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
  "01/01/2025","01/02/2025","11/02/2025","12/02/2025","04/04/2025",
  "01/05/2025","31/05/2025","02/06/2025","26/08/2025","31/08/2025",
  "16/09/2025","20/10/2025","25/12/2025",
  "01/01/2026","20/01/2026","21/01/2026","31/03/2026","01/05/2026",
  "31/05/2026","01/06/2026","31/08/2026","16/09/2026","25/12/2026",
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
