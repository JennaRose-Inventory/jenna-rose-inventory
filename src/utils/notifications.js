// ── Notification System ───────────────────────────────────────────────────────
// Web Push via VAPID — works on Android + iPhone PWA (iOS 16.4+)
// Background notifications via Vercel Cron + web-push

const VAPID_PUBLIC_KEY = "BHfXekzQTzYXWI2kLs1VS96eOVUrFanrjhr69rCb07uZeuMl-PFakelsDFVPmrs_59H-8fvCDeW5cTPYHgoW9P0";
const NOTIF_KEY        = "jr_notif_enabled";
const DEVICE_ID_KEY    = "jr_device_id";
const NOTIF_SENT_KEY   = "jr_notif_sent";
const EN_DAYS          = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ── Device ID — unique per device ─────────────────────────────────────────────
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

// ── Permission helpers ────────────────────────────────────────────────────────
export function getNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function isNotifEnabled() {
  return localStorage.getItem(NOTIF_KEY) === "true" &&
    getNotifPermission() === "granted";
}

export function setNotifEnabled(val) {
  localStorage.setItem(NOTIF_KEY, val ? "true" : "false");
}

// ── Convert VAPID key to Uint8Array ──────────────────────────────────────────
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)));
}

// ── Request permission + subscribe to push ────────────────────────────────────
export async function requestPermission(userName = "") {
  if (!("Notification" in window)) return { granted: false, reason: "unsupported" };
  if (!("serviceWorker" in navigator)) return { granted: false, reason: "no-sw" };

  // Request browser permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { granted: false, reason: "denied" };

  try {
    // Get service worker registration
    const reg = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Save subscription to server
    const res = await fetch("/api/subscribe", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription,
        deviceId: getDeviceId(),
        userName,
      }),
    });

    if (!res.ok) throw new Error("Server subscription failed");

    setNotifEnabled(true);
    return { granted: true };
  } catch (err) {
    console.error("Push subscription failed:", err);
    // Still enable in-app notifications even if push fails
    setNotifEnabled(true);
    return { granted: true, pushFailed: true };
  }
}

// ── Unsubscribe ───────────────────────────────────────────────────────────────
export async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    await fetch("/api/subscribe", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: {}, deviceId: getDeviceId() }),
    });
  } catch (err) {
    console.error("Unsubscribe failed:", err);
  }
  setNotifEnabled(false);
}

// ── Sync suppliers to server (so cron can read them) ─────────────────────────
export async function syncSuppliersToServer(suppliers) {
  try {
    await fetch("/api/save-suppliers", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(suppliers),
    });
  } catch (err) {
    console.warn("Supplier sync failed:", err);
  }
}

// ── Spam prevention ───────────────────────────────────────────────────────────
function getSentToday() {
  try {
    const today  = new Date().toLocaleDateString("en-GB");
    const raw    = localStorage.getItem(NOTIF_SENT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
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
function alreadySent(key) { return !!getSentToday()[key]; }

// ── In-app fallback notification (when app is open) ───────────────────────────
function sendInAppNotification(title, body) {
  if (getNotifPermission() !== "granted") return;
  try {
    const n = new Notification(title, {
      body, icon: "/icon.svg", badge: "/icon.svg",
      tag: title, requireInteraction: false,
    });
    setTimeout(() => n.close(), 8000);
  } catch {}
}

// ── Check on app open (in-app backup) ────────────────────────────────────────
export function checkOrderDayAlerts({ items, suppliers, historyData, lang }) {
  if (!isNotifEnabled()) return;
  if (!items?.length || !suppliers || !historyData?.length) return;

  const isZH    = lang === "zh";
  const todayEN = EN_DAYS[new Date().getDay()];
  const stockMap = {};
  (historyData[0]?.items ?? []).forEach(i => {
    stockMap[`${i.category}||${i.name}`] = i.stock;
  });

  Object.entries(suppliers).forEach(([category, supplier]) => {
    const orderDays  = supplier.orderDays ?? supplier.days ?? [];
    if (!orderDays.includes(todayEN)) return;

    const spamKey = `inapp_${category}_${todayEN}`;
    if (alreadySent(spamKey)) return;

    const supThreshold = supplier.lowStock !== "" && !isNaN(Number(supplier.lowStock))
      ? Number(supplier.lowStock) : 3;

    const lowItems = items.filter(item => {
      if (item.category !== category || item.active === false) return false;
      const stock = stockMap[`${item.category}||${item.name}`];
      if (!stock || stock === "Enough") return false;
      if (stock === "Need Order") return true;
      const threshold = item.lowStock !== "" && !isNaN(Number(item.lowStock))
        ? Number(item.lowStock) : supThreshold;
      return !isNaN(Number(stock)) && Number(stock) <= threshold;
    });

    if (!lowItems.length) return;

    const title = isZH ? "⚠️ 低库存提醒" : "⚠️ Low Stock Alert";
    const body  = lowItems.length === 1
      ? (isZH
          ? `${lowItems[0].name} 只剩 ${stockMap[`${category}||${lowItems[0].name}`]} 个，今天是 ${category} 下单日！`
          : `${lowItems[0].name} only has ${stockMap[`${category}||${lowItems[0].name}`]} left. ${category} order day!`)
      : (isZH
          ? `今天是 ${category} 下单日，${lowItems.length} 个货品库存不足`
          : `${category} order day — ${lowItems.length} items low on stock`);

    sendInAppNotification(title, body);
    markSent(spamKey);
  });
}
