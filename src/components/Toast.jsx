import { useEffect, useState } from "react";

export default function Toast({ message, type = "success", onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2600);
    const t2 = setTimeout(() => onDone?.(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const styles = {
    success: { bg: "var(--green-700)",  icon: "✓" },
    error:   { bg: "var(--red-700)",    icon: "✕" },
    info:    { bg: "var(--brand-soft)", icon: "·" },
  };
  const { bg, icon } = styles[type] ?? styles.success;

  return (
    <div style={{
      position: "fixed", top: "16px", left: "50%",
      transform: "translateX(-50%)",
      zIndex: 99999,
      display: "flex", alignItems: "center", gap: "10px",
      background: bg,
      color: "#fff",
      padding: "11px 16px",
      borderRadius: "var(--radius-full)",
      boxShadow: "var(--shadow-lg)",
      fontSize: "13px", fontWeight: 500,
      letterSpacing: "-0.01em",
      whiteSpace: "nowrap",
      animation: leaving ? "toastOut 0.3s ease forwards" : "toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both",
      maxWidth: "calc(100vw - 32px)",
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: "50%",
        background: "rgba(255,255,255,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "11px", fontWeight: 700, flexShrink: 0,
      }}>{icon}</span>
      {message}
    </div>
  );
}
