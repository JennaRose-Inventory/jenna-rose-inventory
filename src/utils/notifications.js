// ── Notification System ───────────────────────────────────────────────────────
// Client-side push notifications using Web Notification API
// Works on Android Chrome + iPhone PWA (iOS 16.4+)
// No server required — triggers on app open if today is an order day

const NOTIF_KEY      = "jr_notif_enabled";
const NOTIF_SENT_KEY = "jr_notif_sent"; // track sent notifications to prevent spam

const EN_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── Permission ────────────────────────────────────────────────────────────────
export function getNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export function isNotifEnabled() {
  return localStorage.getItem(NOTIF_KEY) === "true" &&
    getNotifPermission() === "granted";
}

export function setNotifEnabled(val) {
  localStorage.setItem(NOTIF_KEY, val ? "true" : "false");
}

export async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

// ── Spam prevention ───────────────────────────────────────────────────────────
function getSentToday() {
  try {
    const today = new Date().toLocaleDateString("en-GB");
    const raw   = localStorage.getItem(NOTIF_SENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    // Clear if not today
    if (parsed.date !== today) return {};
    return parsed.keys ?? {};
  } catch { return {}; }
}

function markSent(key) {
  try {
    const today = new Date().toLocaleDateString("en-GB");
    const sent  = getSentToday();
    sent[key]   = true;
    localStorage.setItem(NOTIF_SENT_KEY, JSON.stringify({ date: today, keys: sent }));
  } catch {}
}

function alreadySent(key) {
  return !!getSentToday()[key];
}

// ── Send notification ─────────────────────────────────────────────────────────
function sendNotification(title, body, icon = "/icon.svg") {
  if (!isNotifEnabled()) return;
  try {
    const n = new Notification(title, {
      body,
      icon,
      badge: "/icon.svg",
      tag:   title, // prevents duplicate banners for same title
      requireInteraction: false,
      silent: false,
    });
    // Auto-close after 8 seconds
    setTimeout(() => n.close(), 8000);
  } catch (err) {
    console.warn("Notification failed:", err);
  }
}

// ── Main check: run on app load ───────────────────────────────────────────────
// Checks if today is an order day for any supplier and if any items are low stock
export function checkOrderDayAlerts({ items, suppliers, historyData, lang }) {
  if (!isNotifEnabled()) return;
  if (!items?.length || !suppliers) return;

  const isZH   = lang === "zh";
  const todayEN = EN_DAYS[new Date().getDay()]; // e.g. "Monday"
  const latestRecord = historyData?.[0];
  if (!latestRecord) return;

  // Build latest stock map
  const stockMap = {};
  (latestRecord.items ?? []).forEach(i => {
    stockMap[`${i.category}||${i.name}`] = i.stock;
  });

  // Check each supplier
  Object.entries(suppliers).forEach(([category, supplier]) => {
    const orderDays = supplier.orderDays ?? supplier.days ?? [];
    if (!orderDays.includes(todayEN)) return;

    // Get threshold for this supplier
    const supThreshold = supplier.lowStock !== "" && !isNaN(Number(supplier.lowStock))
      ? Number(supplier.lowStock) : 3;

    // Find low stock items in this category
    const lowItems = items.filter(item => {
      if (item.category !== category || item.active === false) return false;
      const key   = `${item.category}||${item.name}`;
      const stock = stockMap[key];
      if (stock === undefined || stock === "") return false;
      if (stock === "Need Order") return true;
      const threshold = item.lowStock !== "" && !isNaN(Number(item.lowStock))
        ? Number(item.lowStock) : supThreshold;
      return !isNaN(Number(stock)) && Number(stock) <= threshold;
    });

    if (lowItems.length === 0) return;

    // Prevent spam — only send once per category per day
    const spamKey = `${category}_${todayEN}`;
    if (alreadySent(spamKey)) return;

    // Send notification
    if (lowItems.length === 1) {
      const item  = lowItems[0];
      const stock = stockMap[`${category}||${item.name}`];
      const title = isZH ? "⚠️ 低库存提醒" : "⚠️ Low Stock Alert";
      const body  = isZH
        ? `${item.name} 只剩 ${stock} 个，今天是 ${category} 下单日，记得订货！`
        : `${item.name} only has ${stock} left. Today is ${category} order day — remember to order!`;
      sendNotification(title, body);
    } else {
      const title = isZH ? `⚠️ ${category} 低库存提醒` : `⚠️ ${category} Low Stock`;
      const body  = isZH
        ? `今天是下单日，${lowItems.length} 个货品库存不足：${lowItems.slice(0,3).map(i => i.name).join("、")}${lowItems.length > 3 ? "等" : ""}`
        : `Today is order day. ${lowItems.length} items low: ${lowItems.slice(0,3).map(i => i.name).join(", ")}${lowItems.length > 3 ? "..." : ""}`;
      sendNotification(title, body);
    }

    markSent(spamKey);
  });
}
