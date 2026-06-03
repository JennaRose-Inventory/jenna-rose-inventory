// api/send-notifications.js — Vercel Serverless Function
// Called by Vercel Cron at 1pm and 10pm Malaysia time (UTC+8)
// Cron runs in UTC: 1pm MYT = 5am UTC, 10pm MYT = 2pm UTC

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import webpush from "web-push";

// Malaysia day names
const EN_DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function initAdmin() {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

function initWebPush() {
  webpush.setVapidDetails(
    "mailto:jenna.rose.inventory@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export default async function handler(req, res) {
  // Allow manual trigger + cron
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple auth check for manual triggers
  const authHeader = req.headers.authorization;
  if (req.method === "GET" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    initAdmin();
    initWebPush();
    const db = getFirestore();

    // Get Malaysia time
    const now      = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    const todayEN  = EN_DAYS[now.getDay()];
    const todayStr = now.toLocaleDateString("en-GB"); // DD/MM/YYYY

    console.log(`[CRON] Running for ${todayEN} ${todayStr}`);

    // Get all push subscriptions
    const subsSnap = await db.collection("pushSubscriptions").where("active","==",true).get();
    if (subsSnap.empty) {
      console.log("[CRON] No subscriptions found");
      return res.status(200).json({ ok: true, sent: 0, reason: "no subscriptions" });
    }

    // Get suppliers config (stored in a single doc)
    const suppliersDoc = await db.collection("config").doc("suppliers").get();
    const suppliersRaw = suppliersDoc.exists ? suppliersDoc.data() : {};
    const lang         = suppliersRaw._lang ?? "en";
    const isZH         = lang === "zh";
    // Remove meta fields before processing
    const suppliers = Object.fromEntries(
      Object.entries(suppliersRaw).filter(([k]) => !k.startsWith("_"))
    );

    // Get latest inventory record
    const historySnap = await db.collection("inventoryHistory")
      .orderBy("createdAt", "desc").limit(1).get();

    if (historySnap.empty) {
      return res.status(200).json({ ok: true, sent: 0, reason: "no history" });
    }

    const latestRecord = historySnap.docs[0].data();
    const latestItems  = latestRecord.items ?? [];

    // Build stock map
    const stockMap = {};
    latestItems.forEach(item => {
      stockMap[`${item.category}||${item.name}`] = item.stock;
    });

    // Find which suppliers have today as order day with low stock
    const alerts = [];

    Object.entries(suppliers).forEach(([category, supplier]) => {
      const orderDays = supplier.orderDays ?? supplier.days ?? [];
      if (!orderDays.includes(todayEN)) return;

      const supThreshold = supplier.lowStock !== "" && !isNaN(Number(supplier.lowStock))
        ? Number(supplier.lowStock) : 3;

      const lowItems = latestItems.filter(item => {
        if (item.category !== category || item.active === false) return false;
        const stock = stockMap[`${item.category}||${item.name}`];
        if (stock === undefined || stock === "" || stock === "Enough") return false;
        if (stock === "Need Order") return true;
        const threshold = item.lowStock !== "" && !isNaN(Number(item.lowStock))
          ? Number(item.lowStock) : supThreshold;
        return !isNaN(Number(stock)) && Number(stock) <= threshold;
      });

      if (lowItems.length === 0) return;

      if (lowItems.length === 1) {
        const item  = lowItems[0];
        const stock = stockMap[`${category}||${item.name}`];
        const title = isZH ? "⚠️ 低库存提醒" : "⚠️ Low Stock Alert";
        const body  = isZH
          ? `${item.name} 只剩 ${stock} 个，今天是 ${category} 下单日，记得订货！`
          : `${item.name} only has ${stock} left. Today is ${category} order day — remember to order!`;
        alerts.push({ title, body });
      } else {
        const title = isZH ? `⚠️ ${category} 低库存提醒` : `⚠️ ${category} Low Stock`;
        const body  = isZH
          ? `今天是下单日，${lowItems.length} 个货品库存不足：${lowItems.slice(0,3).map(i=>i.name).join("、")}${lowItems.length>3?"等":""}`
          : `Today is order day. ${lowItems.length} items low: ${lowItems.slice(0,3).map(i=>i.name).join(", ")}${lowItems.length>3?"...":""}`;
        alerts.push({ title, body });
      }
    });

    if (alerts.length === 0) {
      console.log("[CRON] No low stock alerts today");
    }

    // ── Freshness alerts (RV Bakery + 千层蛋糕) ────────────────────────────────
    const FRESH_CATEGORIES = ["RV Bakery", "千层蛋糕"];
    try {
      const freshSnap = await db.collection("freshDates").get();
      const freshMap  = {};
      freshSnap.docs.forEach(d => {
        freshMap[d.id.replace(/__/g, "||")] = d.data().date;
      });

      const today     = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
      const staleItems = [];

      latestItems.forEach(item => {
        if (!FRESH_CATEGORIES.includes(item.category)) return;
        if (item.active === false) return;
        const freshDays = item.freshDays;
        if (!freshDays || freshDays <= 0) return;
        const stock = stockMap[`${item.category}||${item.name}`];
        if (!stock || stock === "0" || Number(stock) <= 0) return;

        const key     = `${item.category}||${item.name}`;
        const dateStr = freshMap[key];
        if (!dateStr) return;

        const [dd, mm, yyyy] = dateStr.split("/").map(Number);
        const restockDate    = new Date(yyyy, mm - 1, dd);
        today.setHours(0,0,0,0);
        const daysOld = Math.floor((today - restockDate) / 86400000);

        if (daysOld >= freshDays) {
          staleItems.push({ name: item.name, category: item.category, daysOld, stock });
        }
      });

      if (staleItems.length > 0) {
        const title = isZH ? "🕐 蛋糕新鲜度提醒" : "🕐 Freshness Alert";
        const body  = staleItems.length === 1
          ? (isZH
              ? `${staleItems[0].name} 已放 ${staleItems[0].daysOld} 天，还有 ${staleItems[0].stock} 个，请处理！`
              : `${staleItems[0].name} is ${staleItems[0].daysOld} days old with ${staleItems[0].stock} left — please handle!`)
          : (isZH
              ? `${staleItems.length} 个蛋糕已超过新鲜期：${staleItems.slice(0,3).map(i=>i.name).join("、")}${staleItems.length>3?"等":""}`
              : `${staleItems.length} items past freshness date: ${staleItems.slice(0,3).map(i=>i.name).join(", ")}${staleItems.length>3?"...":""}`);
        alerts.push({ title, body });
      }
    } catch (err) {
      console.error("[CRON] Freshness check error:", err);
    }

    if (alerts.length === 0) {
      return res.status(200).json({ ok: true, sent: 0, reason: "no alerts" });
    }

    // Send to all subscriptions
    let sent = 0, failed = 0;
    const failedDevices = [];

    for (const subDoc of subsSnap.docs) {
      const { subscription, deviceId } = subDoc.data();
      for (const alert of alerts) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: alert.title,
              body:  alert.body,
              icon:  "/icon.svg",
              badge: "/badge.png",
              tag:   `jr-${todayStr}-${alert.title.slice(0,20)}`,
            })
          );
          sent++;
        } catch (err) {
          console.error(`[CRON] Failed for device ${deviceId}:`, err.statusCode);
          failed++;
          // If subscription expired/invalid, mark inactive
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedDevices.push(deviceId);
          }
        }
      }
    }

    // Clean up expired subscriptions
    for (const deviceId of failedDevices) {
      await db.collection("pushSubscriptions").doc(deviceId).update({ active: false });
    }

    console.log(`[CRON] Done: ${sent} sent, ${failed} failed`);
    return res.status(200).json({ ok: true, sent, failed, alerts: alerts.length });

  } catch (err) {
    console.error("[CRON] Error:", err);
    return res.status(500).json({ error: err.message });
  }
}
