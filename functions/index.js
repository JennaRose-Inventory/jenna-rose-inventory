const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();

// ── VAPID keys — 从你的 Vercel 环境变量复制过来 ────────────────────────────────
// 运行前先设置: firebase functions:secrets:set VAPID_PUBLIC_KEY
//                              firebase functions:secrets:set VAPID_PRIVATE_KEY

function fmt12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

exports.checkNotifications = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Kuala_Lumpur",
    secrets: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
  },
  async (event) => {
    const db = getFirestore();

    // Setup web push
    webpush.setVapidDetails(
      "mailto:jenna.rose.inventory@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const now  = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
    const soon = new Date(now.getTime() + 30 * 60 * 1000);

    console.log(`[CHECK-NOTIF] Running at ${now.toLocaleTimeString("en-MY")}`);

    const alerts = [];

    // ── 1. 预订提醒 ────────────────────────────────────────────────────────────
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
          title: "📋 即将到来的预订",
          body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)}`,
          tag:   `res-${r.id}`,
          postSend: () => db.collection("reservations").doc(r.id).update({ notified: true }),
        });
      }
    } catch (err) {
      console.error("[CHECK-NOTIF] Reservations error:", err);
    }

    // ── 2. 提醒到期 ────────────────────────────────────────────────────────────
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
          title: "🔔 提醒",
          body:  r.description ? `${r.title} — ${r.description}` : r.title,
          tag:   `rem-${r.id}`,
          postSend: () => db.collection("reminders").doc(r.id).update({ notified: true }),
        });
      }
    } catch (err) {
      console.error("[CHECK-NOTIF] Reminders error:", err);
    }

    if (alerts.length === 0) {
      console.log("[CHECK-NOTIF] No alerts");
      return;
    }

    // ── 发送推送通知 ───────────────────────────────────────────────────────────
    const subsSnap = await db.collection("pushSubscriptions")
      .where("active", "==", true)
      .get();

    if (subsSnap.empty) {
      console.log("[CHECK-NOTIF] No subscriptions");
      return;
    }

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
          console.error(`[CHECK-NOTIF] Failed for ${deviceId}:`, err.statusCode);
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            failedDevices.push(deviceId);
          }
        }
      }
    }

    // Mark notified
    for (const alert of alerts) {
      try { await alert.postSend(); } catch (err) {
        console.error("[CHECK-NOTIF] postSend error:", err);
      }
    }

    // Clean up expired subscriptions
    for (const deviceId of failedDevices) {
      await db.collection("pushSubscriptions").doc(deviceId).update({ active: false });
    }

    console.log(`[CHECK-NOTIF] Done: ${sent} sent, ${failed} failed`);
  }
);
