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

    // 预订时间窗口
    const in60min  = new Date(now.getTime() + 60 * 60 * 1000);
    const in65min  = new Date(now.getTime() + 65 * 60 * 1000);
    const in120min = new Date(now.getTime() + 120 * 60 * 1000);
    const in125min = new Date(now.getTime() + 125 * 60 * 1000);

    console.log(`[CHECK-NOTIF] Running at ${now.toLocaleTimeString("en-MY")}`);

    const alerts = [];

    // ── 预订提醒 (1小时前 + 2小时前) ──────────────────────────────────────────
    try {
      const resSnap = await db.collection("reservations")
        .where("notified", "==", false)
        .get();

      const allRes = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const r of allRes) {
        if (r.status === "cancelled" || r.status === "completed") continue;
        const dt = new Date(`${r.reservationDate}T${r.reservationTime}`);

        // 1小时前
        if (dt >= now && dt <= in60min) {
          alerts.push({
            title: "📋 预订即将开始",
            body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)} — 1小时后`,
            tag:   `res-60-${r.id}`,
            postSend: () => db.collection("reservations").doc(r.id).update({ notified: true }),
          });
        }
        // 2小时前 (用 notified2h 字段追踪)
        else if (dt >= in120min && dt <= in125min && !r.notified2h) {
          alerts.push({
            title: "📋 预订提醒",
            body:  `${r.customerName} · ${r.pax} 人 · ${fmt12h(r.reservationTime)} — 2小时后`,
            tag:   `res-120-${r.id}`,
            postSend: () => db.collection("reservations").doc(r.id).update({ notified2h: true }),
          });
        }
      }

      console.log(`[CHECK-NOTIF] Reservation alerts: ${alerts.length}`);
    } catch (err) {
      console.error("[CHECK-NOTIF] Reservations error:", err);
    }

    // ── 提醒通知 (前一天1pm + 当天1小时前) ────────────────────────────────────
    try {
      const remSnap = await db.collection("reminders")
        .where("completed", "==", false)
        .get();

      const allRem = remSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      for (const r of allRem) {
        if (!r.reminderAt) continue;
        const reminderDate = r.reminderAt.toDate ? r.reminderAt.toDate() : new Date(r.reminderAt);

        // 前一天 1pm 通知
        const dayBeforeAt1pm = new Date(reminderDate);
        dayBeforeAt1pm.setDate(dayBeforeAt1pm.getDate() - 1);
        dayBeforeAt1pm.setHours(13, 0, 0, 0);

        if (!r.notifiedDayBefore && now >= dayBeforeAt1pm && reminderDate > now) {
          alerts.push({
            title: "🔔 明天提醒",
            body:  r.description ? `${r.title} — ${r.description}` : r.title,
            tag:   `rem-daybefore-${r.id}`,
            postSend: () => db.collection("reminders").doc(r.id).update({ notifiedDayBefore: true }),
          });
        }

        // 当天1小时前
        const oneHrBefore = new Date(reminderDate.getTime() - 60 * 60 * 1000);
        if (!r.notified1h && now >= oneHrBefore && reminderDate > now) {
          alerts.push({
            title: "🔔 提醒 — 1小时后",
            body:  r.description ? `${r.title} — ${r.description}` : r.title,
            tag:   `rem-1h-${r.id}`,
            postSend: () => db.collection("reminders").doc(r.id).update({ notified1h: true }),
          });
        }

        // 到时通知 (保留原有逻辑)
        const nowTimestamp = Timestamp.fromDate(now);
        if (!r.notified && r.reminderAt <= nowTimestamp) {
          alerts.push({
            title: "🔔 提醒",
            body:  r.description ? `${r.title} — ${r.description}` : r.title,
            tag:   `rem-${r.id}`,
            postSend: () => db.collection("reminders").doc(r.id).update({ notified: true }),
          });
        }
      }

      console.log(`[CHECK-NOTIF] Reminder alerts: ${alerts.filter(a=>a.tag.startsWith("rem")).length}`);
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

    for (const alert of alerts) {
      try { await alert.postSend(); } catch (err) {
        console.error("[CHECK-NOTIF] postSend error:", err);
      }
    }

    for (const deviceId of failedDevices) {
      await db.collection("pushSubscriptions").doc(deviceId).update({ active: false });
    }

    console.log(`[CHECK-NOTIF] Done: ${sent} sent, ${failed} failed`);
  }
);
