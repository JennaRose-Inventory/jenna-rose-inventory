/**
 * notificationService.js
 *
 * Central notification engine. Can be called from:
 *   - DebugPage (manually)
 *   - A future Vercel Cron endpoint (api/check-notifications.js)
 *
 * Depends on your EXISTING push notification helpers in utils/notifications.js
 * — specifically sendPushToAllSubscribers(title, body, data).
 *   Adjust the import below if your export name is different.
 */

import { getPendingReservationAlerts, markReservationNotified } from "./reservationService";
import { getPendingReminderAlerts, markReminderNotified } from "./reminderService";

// ─── Adjust this import to match YOUR existing notification utility ─────────────
// e.g. import { sendPushToAllSubscribers } from "../utils/notifications";
// We expose a local wrapper so callers never touch the raw push API.
let _pushFn = null;

export function registerPushFunction(fn) {
  _pushFn = fn;
}

async function sendPush(title, body, data = {}) {
  if (typeof _pushFn === "function") {
    await _pushFn(title, body, data);
  } else {
    // Fallback: browser Notification API (works locally without a server)
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/badge.png", data });
    } else {
      console.warn("[notificationService] No push function registered and Notifications not granted.");
    }
  }
}

// ─── Format helpers ────────────────────────────────────────────────────────────
function fmt12h(time24) {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ─── Core engine ──────────────────────────────────────────────────────────────
/**
 * checkNotifications()
 *
 * Checks upcoming reservations and due reminders, fires push notifications
 * for any unnotified ones, then marks them notified in Firestore.
 *
 * Returns a summary object for use in the debug UI.
 */
export async function checkNotifications(withinMinutes = 30) {
  const summary = {
    reservationsChecked: 0,
    reservationsFired: 0,
    remindersChecked: 0,
    remindersFired: 0,
    errors: [],
  };

  // ── Reservations ────────────────────────────────────────────────────────────
  try {
    const pending = await getPendingReservationAlerts(withinMinutes);
    summary.reservationsChecked = pending.length;

    for (const r of pending) {
      try {
        await sendPush(
          "Upcoming Reservation",
          `${r.customerName} · ${r.pax} pax · ${fmt12h(r.reservationTime)}`,
          { type: "reservation", id: r.id }
        );
        await markReservationNotified(r.id);
        summary.reservationsFired++;
      } catch (err) {
        summary.errors.push(`Reservation ${r.id}: ${err.message}`);
      }
    }
  } catch (err) {
    summary.errors.push(`Reservations fetch: ${err.message}`);
  }

  // ── Reminders ───────────────────────────────────────────────────────────────
  try {
    const due = await getPendingReminderAlerts();
    summary.remindersChecked = due.length;

    for (const r of due) {
      try {
        await sendPush(
          "Reminder",
          r.description ? `${r.title} — ${r.description}` : r.title,
          { type: "reminder", id: r.id }
        );
        await markReminderNotified(r.id);
        summary.remindersFired++;
      } catch (err) {
        summary.errors.push(`Reminder ${r.id}: ${err.message}`);
      }
    }
  } catch (err) {
    summary.errors.push(`Reminders fetch: ${err.message}`);
  }

  return summary;
}

// ─── One-shot test push (for DebugPage) ───────────────────────────────────────
export async function sendTestPush() {
  await sendPush(
    "Test Notification",
    "Push notifications are working correctly.",
    { type: "test" }
  );
}
