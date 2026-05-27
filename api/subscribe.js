// api/subscribe.js — Vercel Serverless Function
// Saves push subscription to Firestore

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function initAdmin() {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    initAdmin();
    const db = getFirestore();
    const { subscription, deviceId, userName } = req.body;

    if (!subscription?.endpoint || !deviceId) {
      return res.status(400).json({ error: "Missing subscription or deviceId" });
    }

    const ref = db.collection("pushSubscriptions").doc(deviceId);

    if (req.method === "DELETE") {
      await ref.delete();
      return res.status(200).json({ ok: true, action: "unsubscribed" });
    }

    // Save/update subscription
    await ref.set({
      subscription,
      deviceId,
      userName:    userName || "unknown",
      updatedAt:   new Date().toISOString(),
      active:      true,
    }, { merge: true });

    return res.status(200).json({ ok: true, action: "subscribed" });
  } catch (err) {
    console.error("Subscribe error:", err);
    return res.status(500).json({ error: err.message });
  }
}
