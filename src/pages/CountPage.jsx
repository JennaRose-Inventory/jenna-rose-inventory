import { useState } from "react";
import { Card, SectionLabel, Spinner } from "../components/UI.jsx";
import { countKey, isLowStock } from "../utils/helpers.js";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export default function CountPage({ items, counts, onCountChange, onSave }) {
  const [selectedDay, setSelectedDay] = useState(
    DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  );
  const [saving, setSaving] = useState(false);

  const activeItems = items.filter(
    (item) => item.active !== false && (item.days ?? DAYS).includes(selectedDay)
  );

  const grouped = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const filledCount = activeItems.filter(
    (i) => counts[countKey(i)] !== undefined && counts[countKey(i)] !== ""
  ).length;

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
        marginBottom: "16px",
        scrollbarWidth: "none",
      }}>
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            style={{
              padding: "7px 13px",
              borderRadius: "var(--radius-full)",
              background: selectedDay === day ? "var(--brown-700)" : "var(--surface)",
              color: selectedDay === day ? "#fff" : "var(--text-secondary)",
              fontSize: "12px", fontWeight: 600,
              border: `1.5px solid ${selectedDay === day ? "var(--brown-700)" : "var(--border)"}`,
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              flexShrink: 0,
            }}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* Progress indicator */}
      {activeItems.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px" }}>
            <span>{filledCount} / {activeItems.length} filled</span>
            <span>{Math.round((filledCount / activeItems.length) * 100)}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(filledCount / activeItems.length) * 100}%`,
              background: "var(--brown-500)",
              borderRadius: "99px",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      )}

      {/* Item groups */}
      {Object.keys(grouped).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
          <Card>
            {grouped[category].map((item, idx) => {
              const key = countKey(item);
              const val = counts[key] ?? "";
              const low = val !== "" && isLowStock({ ...item, stock: val });
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 14px",
                    borderBottom: idx < grouped[category].length - 1 ? "1px solid var(--border)" : "none",
                    background: low ? "var(--red-50)" : "transparent",
                    transition: "background 0.2s",
                  }}
                >
                  {low && (
                    <span style={{ fontSize: "14px", flexShrink: 0 }}>⚠️</span>
                  )}
                  <div style={{
                    flex: 1, fontSize: "13px",
                    color: low ? "var(--red-600)" : "var(--text-primary)",
                    fontWeight: low ? 600 : 400,
                  }}>
                    {item.name}
                  </div>

                  {item.type === "status" ? (
                    <select
                      value={val}
                      onChange={(e) => onCountChange(item, e.target.value)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${val === "Need Order" ? "var(--red-500)" : val === "Enough" ? "var(--green-500)" : "var(--border)"}`,
                        fontSize: "12px", fontWeight: 500,
                        background: val === "Need Order" ? "var(--red-50)" : val === "Enough" ? "var(--green-50)" : "var(--surface2)",
                        color: val === "Need Order" ? "var(--red-600)" : val === "Enough" ? "var(--green-600)" : "var(--text-muted)",
                        minWidth: "110px",
                      }}
                    >
                      <option value="">— select —</option>
                      <option value="Enough">Enough</option>
                      <option value="Need Order">Need Order</option>
                    </select>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={val}
                      placeholder="—"
                      onChange={(e) => onCountChange(item, e.target.value)}
                      style={{
                        width: "64px", padding: "6px 8px",
                        textAlign: "center",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${low ? "var(--red-500)" : val !== "" ? "var(--brown-400)" : "var(--border)"}`,
                        fontSize: "14px", fontWeight: 600,
                        background: low ? "var(--red-50)" : "var(--surface2)",
                        color: low ? "var(--red-600)" : "var(--text-primary)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </Card>
        </div>
      ))}

      {activeItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
          No items scheduled for {selectedDay}.
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
            color: "#fff",
            fontSize: "14px", fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            boxShadow: "0 4px 16px rgba(75,46,26,0.35)",
            opacity: filledCount === 0 ? 0.5 : 1,
            transition: "all 0.2s",
            letterSpacing: "0.02em",
          }}
        >
          {saving ? (
            <>
              <Spinner size={16} />
              Saving…
            </>
          ) : (
            <>
              💾 Save Inventory
              {filledCount > 0 && (
                <span style={{
                  background: "rgba(255,255,255,0.2)",
                  borderRadius: "var(--radius-full)",
                  padding: "1px 8px", fontSize: "12px",
                }}>
                  {filledCount} items
                </span>
              )}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
