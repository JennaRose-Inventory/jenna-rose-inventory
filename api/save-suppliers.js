// api/save-suppliers.js — Sync supplier config to Firestore
// So the cron job can read supplier order days + thresholds

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).end();

  try {
    initAdmin();
    const db = getFirestore();
    const suppliers = req.body;
    if (!suppliers || typeof suppliers !== "object") {
      return res.status(400).json({ error: "Invalid suppliers data" });
    }
    await db.collection("config").doc("suppliers").set(suppliers);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("save-suppliers error:", err);
    return res.status(500).json({ error: err.message });
  }
}
