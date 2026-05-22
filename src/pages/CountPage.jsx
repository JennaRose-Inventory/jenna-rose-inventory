import { useState, useRef } from "react";
import { SectionLabel, Spinner } from "../components/UI.jsx";
import { countKey } from "../utils/helpers.js";

const STATUS_CATEGORIES = ["TS Mart", "Thermalnator", "旺明"];

function cycleStatus(current) {
  if (!current || current === "") return "Enough";
  if (current === "Enough") return "Need Order";
  return "";
}

function StatusToggle({ value, onChange, t }) {
  const isEmpty     = !value || value === "";
  const isEnough    = value === "Enough";
  const isNeedOrder = value === "Need Order";

  return (
    <button
      onClick={() => onChange(cycleStatus(value))}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "7px 12px",
        borderRadius: "var(--radius-full)",
        border: `1.5px solid ${isNeedOrder ? "var(--red-500)" : isEnough ? "var(--green-500)" : "var(--border)"}`,
        background: isNeedOrder ? "var(--red-50)" : isEnough ? "var(--green-50)" : "var(--surface2)",
        cursor: "pointer", transition: "all 0.15s",
        minWidth: "110px", justifyContent: "center",
      }}
    >
      <span style={{ fontSize: "14px", lineHeight: 1 }}>
        {isNeedOrder ? "⚠️" : isEnough ? "✓" : "·"}
      </span>
      <span style={{
        fontSize: "12px", fontWeight: 600,
        color: isNeedOrder ? "var(--red-600)" : isEnough ? "var(--green-600)" : "var(--text-muted)",
      }}>
        {isNeedOrder ? t.needOrder : isEnough ? t.enough : t.tapToSet}
      </span>
    </button>
  );
}

export default function CountPage({ t, items, counts, onCountChange, onSave }) {
  const DAYS = t.days;
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  );
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef({});

  const activeItems = items.filter(
    (item) => item.active !== false && (item.days ?? DAYS).includes(
      // match against EN days regardless of display language
      ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"][DAYS.indexOf(selectedDay)] ?? selectedDay
    )
  );

  const grouped = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const filledCount = activeItems.filter(
    (i) => counts[countKey(i)] !== undefined && counts[countKey(i)] !== ""
  ).length;

  function effectiveType(item) {
    if (STATUS_CATEGORIES.includes(item.category)) return "status";
    return item.type ?? "quantity";
  }

  function handleKeyDown(e, item) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const currentIdx = activeItems.findIndex((i) => countKey(i) === countKey(item));
    for (let i = currentIdx + 1; i < activeItems.length; i++) {
      const next = activeItems[i];
      if (effectiveType(next) === "quantity") {
        const ref = inputRefs.current[countKey(next)];
        if (ref) { ref.focus(); ref.select(); }
        return;
      }
    }
  }

  async function handleSave() {
    setSaving(true);
    await onSave();
    setSaving(false);
  }

  return (
    <div className="page-enter" style={{ paddingBottom: "90px" }}>

      {/* Day selector */}
      <div style={{
        display: "flex", gap: "6px",
        overflowX: "auto", paddingBottom: "2px",
        marginBottom: "16px", scrollbarWidth: "none",
      }}>
        {DAYS.map((day, idx) => (
          <button key={day} onClick={() => setSelectedDay(day)} style={{
            padding: "7px 13px",
            borderRadius: "var(--radius-full)",
            background: selectedDay === day ? "var(--brown-700)" : "var(--surface)",
            color: selectedDay === day ? "#fff" : "var(--text-secondary)",
            fontSize: "12px", fontWeight: 600,
            border: `1.5px solid ${selectedDay === day ? "var(--brown-700)" : "var(--border)"}`,
            whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0,
          }}>
            {t.daysShort[idx]}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {activeItems.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px" }}>
            <span>{t.filledOf(filledCount, activeItems.length)}</span>
            <span>{Math.round((filledCount / activeItems.length) * 100)}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(filledCount / activeItems.length) * 100}%`,
              background: "var(--brown-500)", borderRadius: "99px",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {/* Item groups */}
      {Object.keys(grouped).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
          <div style={{
            background: "var(--surface)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}>
            {grouped[category].map((item, idx) => {
              const key = countKey(item);
              const val = counts[key] ?? "";
              const type = effectiveType(item);

              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "11px 14px",
                }}>
                  <div style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)" }}>
                    {item.name}
                  </div>
                  {type === "status" ? (
                    <StatusToggle value={val} onChange={(v) => onCountChange(item, v)} t={t} />
                  ) : (
                    <input
                      ref={(el) => { inputRefs.current[key] = el; }}
                      type="number" inputMode="numeric"
                      value={val} placeholder="—"
                      onChange={(e) => onCountChange(item, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      style={{
                        width: "64px", padding: "6px 8px",
                        textAlign: "center",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${val !== "" ? "var(--brown-400)" : "var(--border)"}`,
                        fontSize: "14px", fontWeight: 600,
                        background: "var(--surface2)",
                        color: "var(--text-primary)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {activeItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
          {t.noItemsDay(selectedDay)}
        </div>
      )}

      {/* Sticky save button */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px",
        padding: "12px 16px",
        background: "linear-gradient(to top, var(--bg) 70%, transparent)",
        zIndex: 100,
      }}>
        <button
          onClick={handleSave}
          disabled={saving || filledCount === 0}
          style={{
            width: "100%", padding: "14px",
            borderRadius: "var(--radius-lg)",
            background: saving ? "var(--brown-400)" : "var(--brown-700)",
            color: "#fff", fontSize: "14px", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            boxShadow: "0 4px 16px rgba(75,46,26,0.35)",
            opacity: filledCount === 0 ? 0.5 : 1,
            transition: "all 0.2s", letterSpacing: "0.02em",
          }}
        >
          {saving ? (
            <><Spinner size={16} />{t.saving}</>
          ) : (
            <>
              💾 {t.saveBtn}
              {filledCount > 0 && (
                <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "var(--radius-full)", padding: "1px 8px", fontSize: "12px" }}>
                  {filledCount} {t.items}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
