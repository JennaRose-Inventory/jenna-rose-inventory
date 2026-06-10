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
import { db } from "../firebase"; // adjust path to your existing firebase.js

const COL = "reservations";

// ─── Create ────────────────────────────────────────────────────────────────────
export async function addReservation(data) {
  return addDoc(collection(db, COL), {
    customerName: data.customerName,
    phone: data.phone,
    reservationDate: data.reservationDate,   // "YYYY-MM-DD"
    reservationTime: data.reservationTime,   // "HH:MM"
    pax: Number(data.pax),
    notes: data.notes || "",
    status: data.status || "confirmed",
    notified: false,
    createdAt: Timestamp.now(),
  });
}

// ─── Read (all, sorted newest first) ──────────────────────────────────────────
export async function getReservations() {
  const q = query(collection(db, COL), orderBy("reservationDate", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Real-time listener ────────────────────────────────────────────────────────
export function subscribeReservations(callback) {
  const q = query(collection(db, COL), orderBy("reservationDate", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// ─── Update ────────────────────────────────────────────────────────────────────
export async function updateReservation(id, data) {
  const ref = doc(db, COL, id);
  return updateDoc(ref, { ...data });
}

// ─── Delete ────────────────────────────────────────────────────────────────────
export async function deleteReservation(id) {
  return deleteDoc(doc(db, COL, id));
}

// ─── Get upcoming (within next N minutes, notified=false) ─────────────────────
export async function getPendingReservationAlerts(withinMinutes = 30) {
  const now = new Date();
  const soon = new Date(now.getTime() + withinMinutes * 60 * 1000);

  const snap = await getDocs(
    query(collection(db, COL), where("notified", "==", false))
  );

  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => {
      if (r.status === "cancelled" || r.status === "completed") return false;
      const dt = new Date(`${r.reservationDate}T${r.reservationTime}`);
      return dt >= now && dt <= soon;
    });
}

// ─── Mark notified ─────────────────────────────────────────────────────────────
export async function markReservationNotified(id) {
  return updateReservation(id, { notified: true });
}
