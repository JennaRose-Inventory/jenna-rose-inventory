import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebase";

const COL = "reminders";

// ─── Create ────────────────────────────────────────────────────────────────────
export async function addReminder(data) {
  return addDoc(collection(db, COL), {
    title: data.title,
    description: data.description || "",
    reminderAt: Timestamp.fromDate(new Date(data.reminderAt)),
    completed: false,
    notified: false,
    createdAt: Timestamp.now(),
  });
}

// ─── Read ──────────────────────────────────────────────────────────────────────
export async function getReminders() {
  const q = query(collection(db, COL), orderBy("reminderAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Real-time listener ────────────────────────────────────────────────────────
export function subscribeReminders(callback) {
  const q = query(collection(db, COL), orderBy("reminderAt", "asc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Update ────────────────────────────────────────────────────────────────────
export async function updateReminder(id, data) {
  const payload = { ...data };
  if (data.reminderAt && !(data.reminderAt instanceof Timestamp)) {
    payload.reminderAt = Timestamp.fromDate(new Date(data.reminderAt));
  }
  return updateDoc(doc(db, COL, id), payload);
}

// ─── Delete ────────────────────────────────────────────────────────────────────
export async function deleteReminder(id) {
  return deleteDoc(doc(db, COL, id));
}

// ─── Mark complete ─────────────────────────────────────────────────────────────
export async function markReminderComplete(id, done = true) {
  return updateReminder(id, { completed: done });
}

// ─── Get due (reminderAt <= now, notified=false, not completed) ────────────────
export async function getPendingReminderAlerts() {
  const now = Timestamp.now();
  const snap = await getDocs(
    query(
      collection(db, COL),
      where("notified", "==", false),
      where("completed", "==", false),
      where("reminderAt", "<=", now)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Mark notified ─────────────────────────────────────────────────────────────
export async function markReminderNotified(id) {
  return updateReminder(id, { notified: true });
}
