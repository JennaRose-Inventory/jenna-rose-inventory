// api/check-notifications.js — Vercel Serverless Function
// Called by Vercel Cron every 5 minutes
// Checks upcoming reservations (within 30 min) and due reminders, sends push notifications

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import webpush from "web-push";

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

function fmt12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Auth check for manual triggers
  const authHeader = req.headers.authorization;
  if (req.method === "GET" && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    initAdmin();
    initWebPush();
    const db = getFirestore();

    // Malaysia time
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    const soon = new Date(now.getTime() + 30 * 60 * 1000);

    console.log(`[CHECK-NOTIF] Running at ${now.toLocaleTimeString("en-MY")}`);

    const alerts = [];

    // ── 1. Upcoming reservations (within next 30 min) ──────────────────────────
    try {
      const resSnap = await db.collection("reservations")
        .where("notified", "==", false)
        .get();

      const pendingRes = resSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          if (r.status === "cancelled" || r.status === "completed") return false;
          const dt = new Date(`${r.reservationDate}T${r.reservationTime}`);
          return dt >= now && dt <= soon;
        });

      console.log(`[CHECK-NOTIF] Reservations pending: ${pendingRes.length}`);

      for (const r of pendingRes) {
        alerts.push({
          title: "📋 即将到来的预订 Upcoming Reservation",
          body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)}`,
          tag:   `res-${r.id}`,
          // Mark notified after sending
          postSend: () => db.collection("reservations").doc(r.id).update({ notified: true }),
        });
      }
    } catch (err) {
      console.error("[CHECK-NOTIF] Reservations error:", err);
    }

    // ── 2. Due reminders ───────────────────────────────────────────────────────
    try {
      const nowTimestamp = Timestamp.fromDate(now);
      const remSnap = await db.collection("reminders")
        .where("notified", "==", false)
        .where("completed", "==", false)
        .where("reminderAt", "<=", nowTimestamp)
        .get();

      console.log(`[CHECK-NOTIF] Reminders due: ${remSnap.size}`);

      for (const doc of remSnap.docs) {
        const r = { id: doc.id, ...doc.data() };
        alerts.push({
          title: "🔔 提醒 Reminder",
          body:  r.description ? `${r.title} — ${r.description}` : r.title,
          tag:   `rem-${r.id}`,
          postSend: () => db.collection("reminders").doc(r.id).update({ notified: true }),
        });
      }
    } catch (err) {
      console.error("[CHECK-NOTIF] Reminders error:", err);
    }

    if (alerts.length === 0) {
      console.log("[CHECK-NOTIF] No alerts to send");
      return res.status(200).json({ ok: true, sent: 0, reason: "no alerts" });
    }

    // ── Get active push subscriptions ─────────────────────────────────────────
    const subsSnap = await db.collection("pushSubscriptions").where("active", "==", true).get();
    if (subsSnap.empty) {
      console.log("[CHECK-NOTIF] No subscriptions");
      return res.status(200).json({ ok: true, sent: 0, reason: "no subscriptions" });
    }

    // ── Send notifications ─────────────────────────────────────────────────────
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
              tag:   alert.tag,
            })
          );
          sent++;
        } catch (err) {
          console.error(`[CHECK-NOTIF] Failed for device ${deviceId}:`, err.statusCode);
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedDevices.push(deviceId);
          }
        }
      }
    }

    // ── Mark notified in Firestore ─────────────────────────────────────────────
    for (const alert of alerts) {
      try { await alert.postSend(); } catch (err) {
        console.error("[CHECK-NOTIF] postSend error:", err);
      }
    }

    // ── Clean up expired subscriptions ────────────────────────────────────────
    for (const deviceId of failedDevices) {
      await db.collection("pushSubscriptions").doc(deviceId).update({ active: false });
    }

    console.log(`[CHECK-NOTIF] Done: ${sent} sent, ${failed} failed`);
    return res.status(200).json({ ok: true, sent, failed, alerts: alerts.length });

  } catch (err) {
    console.error("[CHECK-NOTIF] Fatal error:", err);
    return res.status(500).json({ error: err.message });
  }
}
