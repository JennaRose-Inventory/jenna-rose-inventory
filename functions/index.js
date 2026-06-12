const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();

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

    webpush.setVapidDetails(
      "mailto:jenna.rose.inventory@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));

    // 时间窗口
    const in30min  = new Date(now.getTime() + 30 * 60 * 1000);
    const in60min  = new Date(now.getTime() + 60 * 60 * 1000);
    const in65min  = new Date(now.getTime() + 65 * 60 * 1000); // 1小时窗口上限

    console.log(`[CHECK-NOTIF] Running at ${now.toLocaleTimeString("en-MY")}`);

    const alerts = [];

    // ── 预订提醒 ───────────────────────────────────────────────────────────────
    try {
      const resSnap = await db.collection("reservations")
        .where("notified", "==", false)
        .get();

      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const r of allRes) {
        if (r.status === "cancelled" || r.status === "completed") continue;
        const dt = new Date(`${r.reservationDate}T${r.reservationTime}`);

        // 30分钟前提醒
        if (dt >= now && dt <= in30min) {
          alerts.push({
            title: "📋 预订即将开始",
            body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)} — 30分钟后`,
            tag:   `res-30-${r.id}`,
            postSend: () => db.collection("reservations").doc(r.id).update({ notified: true }),
          });
        }
        // 1小时前提醒 (用 notified1h 字段追踪)
        else if (dt >= in60min && dt <= in65min && !r.notified1h) {
          alerts.push({
            title: "📋 预订提醒",
            body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)} — 1小时后`,
            tag:   `res-60-${r.id}`,
            postSend: () => db.collection("reservations").doc(r.id).update({ notified1h: true }),
          });
        }
      }

      console.log(`[CHECK-NOTIF] Reservations alerts: ${alerts.length}`);
    } catch (err) {
      console.error("[CHECK-NOTIF] Reservations error:", err);
    }

    // ── 提醒到期 ───────────────────────────────────────────────────────────────
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
