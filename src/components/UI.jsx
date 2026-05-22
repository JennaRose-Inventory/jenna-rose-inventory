// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = "#fff" }) {
  return (
    <span style={{
      display: "inline-block",
      width: size, height: size,
      border: `2px solid ${color}40`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = "var(--brown-500)", bg = "var(--brown-100)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px",
      borderRadius: "var(--radius-full)",
      fontSize: "11px", fontWeight: 600,
      color, background: bg,
      lineHeight: "18px",
    }}>
      {children}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, right }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0 2px", marginBottom: "6px",
    }}>
      <span style={{
        fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--text-muted)",
      }}>
        {children}
      </span>
      {right && <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{right}</span>}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ value, onChange, children, style = {} }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border)",
        background: "var(--surface2)",
        fontSize: "13px", color: "var(--text-primary)",
        appearance: "auto",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ style = {}, ...props }) {
  return (
    <input
      style={{
        width: "100%", padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: "1.5px solid var(--border)",
        background: "var(--surface2)",
        fontSize: "13px", color: "var(--text-primary)",
        boxSizing: "border-box",
        ...style,
      }}
      {...props}
    />
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, disabled, loading, style = {}, danger }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "12px",
        borderRadius: "var(--radius-md)",
        background: danger ? "var(--red-600)" : "var(--brown-700)",
        color: "#fff",
        fontSize: "13px", fontWeight: 600,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
        opacity: (disabled || loading) ? 0.65 : 1,
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      {loading && <Spinner size={15} />}
      {children}
    </button>
  );
}

// ── Stats mini card ───────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = "var(--brown-500)", icon }) {
  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid var(--border)",
      padding: "14px 14px 12px",
      boxShadow: "var(--shadow-sm)",
      flex: "1 1 0",
      minWidth: 0,
    }}>
      <div style={{ fontSize: "18px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: accent, lineHeight: 1.1, fontFamily: "var(--font-mono)" }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "3px", fontWeight: 500 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}
