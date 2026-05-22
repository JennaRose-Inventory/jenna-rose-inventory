import { useEffect, useState } from "react";

/* ── Toast context-free component ───────────────────────────────────────────
   Usage:  <Toast message="Saved!" type="success" onDone={() => setToast(null)} />
   types:  "success" | "error" | "info"
*/

export default function Toast({ message, type = "success", onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(() => onDone?.(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const colors = {
    success: { bg: "var(--green-600)", icon: "✓" },
    error:   { bg: "var(--red-600)",   icon: "✕" },
    info:    { bg: "var(--brown-500)", icon: "ℹ" },
  };
  const { bg, icon } = colors[type] ?? colors.success;

  return (
    <div style={{
      position: "fixed",
      top: "16px",
      right: "16px",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: bg,
      color: "#fff",
      padding: "12px 16px",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      fontSize: "14px",
      fontWeight: 500,
      maxWidth: "300px",
      animation: leaving
        ? "toastOut 0.35s ease forwards"
        : "toastIn 0.35s ease both",
    }}>
      <span style={{
        width: 22, height: 22,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "12px", fontWeight: 700, flexShrink: 0,
      }}>{icon}</span>
      {message}
    </div>
  );
}
