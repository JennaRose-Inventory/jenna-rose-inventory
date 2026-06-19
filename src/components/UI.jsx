// ── SVG Icon set (Apple SF-style, clean strokes) ─────────────────────────────
export function Icon({ name, size = 18, color = "currentColor", strokeWidth = 1.6 }) {
  const s = { width: size, height: size, display: "block", flexShrink: 0 };
  const p = { fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };

  const icons = {
    count: (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="5" y="3" width="14" height="18" rx="2.5" {...p}/>
        <line x1="9" y1="8" x2="15" y2="8" {...p}/>
        <line x1="9" y1="12" x2="15" y2="12" {...p}/>
        <line x1="9" y1="16" x2="12" y2="16" {...p}/>
      </svg>
    ),
    overview: (
      <svg viewBox="0 0 24 24" style={s}>
        <rect x="3" y="3" width="8" height="8" rx="2" {...p}/>
        <rect x="13" y="3" width="8" height="8" rx="2" {...p}/>
        <rect x="3" y="13" width="8" height="8" rx="2" {...p}/>
        <rect x="13" y="13" width="8" height="8" rx="2" {...p}/>
      </svg>
    ),
    history: (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="9" {...p}/>
        <polyline points="12 7 12 12 15.5 14" {...p}/>
      </svg>
    ),
    stats: (
      <svg viewBox="0 0 24 24" style={s}>
        <line x1="18" y1="20" x2="18" y2="10" {...p}/>
        <line x1="12" y1="20" x2="12" y2="4" {...p}/>
        <line x1="6"  y1="20" x2="6"  y2="14" {...p}/>
        <line x1="3"  y1="20" x2="21" y2="20" {...p}/>
      </svg>
    ),
    ai: (
      <svg viewBox="0 0 24 24" style={s}>
        <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V10a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" {...p}/>
        <circle cx="9"  cy="13" r="1.2" fill={color} stroke="none"/>
        <circle cx="15" cy="13" r="1.2" fill={color} stroke="none"/>
        <path d="M9.5 16.5c.7.7 1.5 1 2.5 1s1.8-.3 2.5-1" {...p}/>
      </svg>
    ),
    manage: (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="3" {...p}/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...p}/>
      </svg>
    ),
    user: (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="8" r="4" {...p}/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" {...p}/>
      </svg>
    ),
    coffee: (
      <svg viewBox="0 0 24 24" style={s}>
        <path d="M17 8h1a4 4 0 0 1 0 8h-1" {...p}/>
        <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" {...p}/>
        <line x1="6" y1="2" x2="6" y2="4" {...p}/>
        <line x1="10" y1="2" x2="10" y2="4" {...p}/>
        <line x1="14" y1="2" x2="14" y2="4" {...p}/>
      </svg>
    ),
    check: (
      <svg viewBox="0 0 24 24" style={s}>
        <polyline points="20 6 9 17 4 12" {...p}/>
      </svg>
    ),
    warning: (
      <svg viewBox="0 0 24 24" style={s}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" {...p}/>
        <line x1="12" y1="9" x2="12" y2="13" {...p}/>
        <line x1="12" y1="17" x2="12.01" y2="17" {...p}/>
      </svg>
    ),
    globe: (
      <svg viewBox="0 0 24 24" style={s}>
        <circle cx="12" cy="12" r="9" {...p}/>
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...p}/>
      </svg>
    ),
    menu: (
      <svg viewBox="0 0 24 24" style={s}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...p}/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...p}/>
        <line x1="9" y1="9" x2="15" y2="9" {...p}/>
        <line x1="9" y1="13" x2="13" y2="13" {...p}/>
      </svg>
    ),
  };

  return icons[name] ?? <svg viewBox="0 0 24 24" style={s}><circle cx="12" cy="12" r="5" fill={color}/></svg>;
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = "#fff" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}30`,
      borderTopColor: color,
      borderRadius: "50%",
      animation: "spin 0.65s linear infinite",
    }} />
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = "var(--brand-mid)", bg = "var(--brand-pale)" }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px",
      borderRadius: "var(--radius-full)",
      fontSize: "11px", fontWeight: 600,
      letterSpacing: "0.01em",
      color, background: bg,
      lineHeight: "18px",
    }}>
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "var(--surface)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border)",
      overflow: "hidden",
      boxShadow: "var(--shadow-xs)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}>
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
        fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.07em",
        textTransform: "uppercase", color: "var(--text-faint)",
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
    <select value={value} onChange={onChange} style={{
      width: "100%", padding: "10px 12px",
      borderRadius: "var(--radius-sm)",
      border: "1.5px solid var(--border)",
      background: "var(--surface2)",
      fontSize: "13px", color: "var(--text-primary)",
      appearance: "auto",
      ...style,
    }}>
      {children}
    </select>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ style = {}, ...props }) {
  return (
    <input style={{
      width: "100%", padding: "10px 12px",
      borderRadius: "var(--radius-sm)",
      border: "1.5px solid var(--border)",
      background: "var(--surface2)",
      fontSize: "13px", color: "var(--text-primary)",
      boxSizing: "border-box",
      ...style,
    }} {...props} />
  );
}

// ── Primary Button ────────────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, disabled, loading, style = {}, danger }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      width: "100%", padding: "11px",
      borderRadius: "var(--radius-sm)",
      background: danger ? "var(--red-500)" : "var(--brand)",
      color: "#fff",
      fontSize: "13px", fontWeight: 600,
      letterSpacing: "-0.01em",
      display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
      opacity: (disabled || loading) ? 0.5 : 1,
      transition: "opacity 0.15s",
      boxShadow: "var(--shadow-xs)",
      ...style,
    }}>
      {loading && <Spinner size={14} />}
      {children}
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = "var(--brand-mid)", icon }) {
  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border)",
      padding: "14px 14px 12px",
      boxShadow: "var(--shadow-xs)",
      flex: "1 1 0", minWidth: 0,
    }}>
      <div style={{ fontSize: "17px", marginBottom: "6px", opacity: 0.85 }}>{icon}</div>
      <div style={{
        fontSize: "24px", fontWeight: 700,
        color: accent, lineHeight: 1.1,
        fontFamily: "var(--font-mono)",
        letterSpacing: "-0.03em",
      }}>
        {value}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", fontWeight: 500 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}
