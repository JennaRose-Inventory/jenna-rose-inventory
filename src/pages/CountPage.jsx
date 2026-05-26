import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { SectionLabel, Spinner } from "../components/UI.jsx";
import { countKey, isLowStock } from "../utils/helpers.js";

const STATUS_CATEGORIES = ["TS Mart", "Thermalnator", "旺明"];
const EN_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function cycleStatus(current) {
  if (!current || current === "") return "Enough";
  if (current === "Enough") return "Need Order";
  return "";
}

function StatusToggle({ value, onChange, t }) {
  const isEnough    = value === "Enough";
  const isNeedOrder = value === "Need Order";
  return (
    <button onClick={() => onChange(cycleStatus(value))} style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "7px 12px", borderRadius: "var(--radius-full)",
      border: `1.5px solid ${isNeedOrder ? "var(--red-500)" : isEnough ? "var(--green-500)" : "var(--border)"}`,
      background: isNeedOrder ? "var(--red-50)" : isEnough ? "var(--green-50)" : "var(--surface2)",
      cursor: "pointer", transition: "all 0.15s",
      minWidth: "110px", justifyContent: "center",
    }}>
      <span style={{ fontSize: "14px", lineHeight: 1 }}>{isNeedOrder ? "⚠️" : isEnough ? "✓" : "·"}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color: isNeedOrder ? "var(--red-600)" : isEnough ? "var(--green-600)" : "var(--text-muted)" }}>
        {isNeedOrder ? t.needOrder : isEnough ? t.enough : t.tapToSet}
      </span>
    </button>
  );
}

// ── Save summary modal ────────────────────────────────────────────────────────
function SaveSummaryModal({ summary, onClose, t }) {
  const isZH = t.appSub === "库存系统";
  const lowItems = summary.filter(i => isLowStock({ stock: i.stock }) && i.stock !== "");
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }} />
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "480px", background: "var(--surface)", borderRadius: "20px 20px 0 0", boxShadow: "0 -8px 32px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: "80dvh", display: "flex", flexDirection: "column", paddingBottom: "28px" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--border2)" }} />
        </div>
        <div style={{ padding: "8px 18px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
              {isZH ? "✓ 保存成功" : "✓ Saved Successfully"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              {isZH ? `共 ${summary.length} 项` : `${summary.length} items saved`}
              {lowItems.length > 0 && <span style={{ color: "var(--red-600)", fontWeight: 600, marginLeft: "8px" }}>· {lowItems.length} {isZH ? "项低库存" : "low stock"}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: "18px", color: "var(--text-muted)", padding: "4px", background: "none", border: "none" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
          {summary.map((item, idx) => {
            const low = isLowStock({ stock: item.stock });
            const display = item.stock === "" ? "—" : item.stock === "Enough" ? "✓" : item.stock === "Need Order" ? "⚠" : item.stock;
            return (
              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px", borderBottom: idx < summary.length - 1 ? "1px solid var(--border)" : "none", background: low ? "var(--red-50)" : "transparent" }}>
                <div style={{ fontSize: "12px", color: low ? "var(--red-600)" : "var(--text-primary)" }}>
                  {low && "● "}{item.name}
                  <span style={{ fontSize: "10px", color: "var(--text-faint)", marginLeft: "6px" }}>{item.category}</span>
                </div>
                <span style={{ fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-mono)", color: low ? "var(--red-600)" : item.stock === "Enough" ? "var(--green-600)" : "var(--text-secondary)" }}>{display}</span>
              </div>
            );
          })}
        </div>
        <div style={{ padding: "14px 18px 0" }}>
          <button onClick={onClose} style={{ width: "100%", padding: "13px", borderRadius: "var(--radius-md)", background: "var(--brand)", color: "#fff", fontSize: "14px", fontWeight: 600, border: "none" }}>
            {isZH ? "好的" : "Done"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Day switch warning ────────────────────────────────────────────────────────
function DaySwitchWarning({ onConfirm, onCancel, t }) {
  const isZH = t.appSub === "库存系统";
  return createPortal(
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "calc(100% - 40px)", maxWidth: "340px", background: "var(--surface)", borderRadius: "var(--radius-xl)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 9999, padding: "24px 22px", textAlign: "center" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "8px" }}>
          {isZH ? "还有未保存的内容" : "Unsaved changes"}
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "22px", lineHeight: 1.5 }}>
          {isZH ? "切换星期会清除已填的数据，确定要切换吗？" : "Switching days will clear your current entries. Continue?"}
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", background: "var(--surface2)", fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" }}>
            {isZH ? "取消" : "Cancel"}
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "11px", borderRadius: "var(--radius-sm)", background: "var(--red-500)", color: "#fff", fontSize: "13px", fontWeight: 600, border: "none" }}>
            {isZH ? "确定切换" : "Switch"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main CountPage ────────────────────────────────────────────────────────────
export default function CountPage({ t, items, counts, onCountChange, onSave, onClearCounts, historyData = [], todayRecord, todayCount = 0 }) {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [selectedDay, setSelectedDay] = useState(EN_DAYS[todayIdx]);
  const [saving, setSaving]           = useState(false);
  const [summary, setSummary]         = useState(null);
  const [pendingDay, setPendingDay]   = useState(null);
  const inputRefs = useRef({});
  const isZH = t.appSub === "库存系统";

  const lastRecord = historyData[0];
  // Fix #1: build lastMap using both current name AND _origName to handle renames
  const lastMap = {};
  (lastRecord?.items ?? []).forEach(i => {
    lastMap[`${i.category}||${i.name}`] = i.stock;
    if (i._origName) lastMap[`${i.category}||${i._origName}`] = i.stock;
  });
  // Also map current items' _origName → stock so renamed items still show last value
  items.forEach(item => {
    if (item._origName) {
      const origKey = `${item.category}||${item._origName}`;
      const curKey  = `${item.category}||${item.name}`;
      if (lastMap[origKey] && !lastMap[curKey]) {
        lastMap[curKey] = lastMap[origKey];
      }
    }
  });

  const isWrongDay = selectedDay !== EN_DAYS[todayIdx];

  const activeItems = items.filter(
    (item) => item.active !== false && (item.days ?? EN_DAYS).includes(selectedDay)
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

  function handleDayClick(day) {
    if (day === selectedDay) return;
    if (filledCount > 0) { setPendingDay(day); } else { setSelectedDay(day); }
  }

  function confirmDaySwitch() {
    setSelectedDay(pendingDay);
    setPendingDay(null);
    // Clear ALL counts, not just current day's items
    onClearCounts();
  }

  async function handleSave() {
    setSaving(true);
    const filledItems = activeItems
      .filter(i => counts[countKey(i)] !== undefined && counts[countKey(i)] !== "")
      .map(i => ({ name: i.name, category: i.category, stock: counts[countKey(i)] }));
    await onSave(selectedDay);
    setSaving(false);
    if (filledItems.length > 0) setSummary(filledItems);
  }

  return (
    <div className="page-enter" style={{ paddingBottom: "90px" }}>

      {pendingDay && <DaySwitchWarning onConfirm={confirmDaySwitch} onCancel={() => setPendingDay(null)} t={t} />}
      {summary    && <SaveSummaryModal summary={summary} onClose={() => setSummary(null)} t={t} />}

      {/* Day selector */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px", marginBottom: "10px", scrollbarWidth: "none" }}>
        {EN_DAYS.map((dayEN, idx) => {
          const isSelected = selectedDay === dayEN;
          const isToday    = idx === todayIdx;
          return (
            <button key={dayEN} onClick={() => handleDayClick(dayEN)} style={{
              padding: "7px 13px", borderRadius: "var(--radius-full)",
              background: isSelected ? "var(--brand)" : isToday ? "var(--brand-ghost)" : "var(--surface)",
              color: isSelected ? "#fff" : isToday ? "var(--brand)" : "var(--text-secondary)",
              fontWeight: isToday ? 700 : 500, fontSize: "12px",
              border: `1.5px solid ${isSelected ? "var(--brand)" : isToday ? "var(--brand-pale)" : "var(--border)"}`,
              whiteSpace: "nowrap", transition: "all 0.15s", flexShrink: 0, position: "relative",
              boxShadow: isToday && !isSelected ? "0 0 0 3px var(--brand-pale)" : "none",
            }}>
              {t.daysShort[idx]}
              {isToday && <span style={{ position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: isSelected ? "rgba(255,255,255,0.7)" : "var(--brand)" }} />}
            </button>
          );
        })}
      </div>

      {/* Today already saved banner — shows merge info */}
      {todayRecord && !isWrongDay && filledCount === 0 && (
        <div style={{ background:"var(--green-50)", border:"1px solid var(--green-100)", borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:"12px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"15px" }}>✓</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"12px", fontWeight:600, color:"var(--green-700)" }}>
                {isZH
                  ? `今天已保存（${todayRecord.savedBy} · ${todayRecord.time ?? ""}）`
                  : `Saved today by ${todayRecord.savedBy} · ${todayRecord.time ?? ""}`}
              </div>
              <div style={{ fontSize:"10px", color:"var(--green-600)", marginTop:"1px", opacity:0.8 }}>
                {isZH
                  ? "继续填写会自动合并，不会覆盖已有数据"
                  : "Saving again will merge — won't overwrite existing data"}
              </div>
            </div>
          </div>
          {/* Show which items already have values vs missing */}
          {(() => {
            const existingMap = {};
            (todayRecord.items ?? []).forEach(i => {
              existingMap[`${i.category}||${i.name}`] = i.stock;
            });
            const filledAlready = activeItems.filter(i => {
              const v = existingMap[`${i.category}||${i.name}`];
              return v !== "" && v !== null && v !== undefined;
            }).length;
            const missing = activeItems.length - filledAlready;
            if (missing === 0) return null;
            return (
              <div style={{ marginTop:"8px", display:"flex", gap:"8px" }}>
                <span style={{ fontSize:"10px", background:"var(--green-100)", color:"var(--green-700)", borderRadius:"var(--radius-full)", padding:"2px 10px", fontWeight:600 }}>
                  ✓ {filledAlready} {isZH ? "已填" : "filled"}
                </span>
                <span style={{ fontSize:"10px", background:"var(--amber-50)", color:"var(--amber-600)", border:"1px solid var(--amber-100)", borderRadius:"var(--radius-full)", padding:"2px 10px", fontWeight:600 }}>
                  · {missing} {isZH ? "未填" : "not yet filled"}
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Wrong day warning banner */}
      {isWrongDay && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--amber-50)", border: "1px solid var(--amber-100)",
          borderRadius: "var(--radius-md)", padding: "10px 14px", marginBottom: "12px",
        }}>
          <span style={{ fontSize: "16px" }}>📅</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--amber-600)" }}>
              {isZH ? `你正在填写${t.days[EN_DAYS.indexOf(selectedDay)]}的点货` : `You are counting for ${selectedDay}`}
            </div>
            <div style={{ fontSize: "10px", color: "var(--amber-600)", opacity: 0.8, marginTop: "1px" }}>
              {isZH ? `今天是${t.days[todayIdx]}` : `Today is ${EN_DAYS[todayIdx]}`}
            </div>
          </div>
          <button onClick={() => setSelectedDay(EN_DAYS[todayIdx])} style={{
            fontSize: "10px", fontWeight: 600, color: "var(--amber-600)",
            background: "var(--amber-100)", border: "none",
            borderRadius: "var(--radius-full)", padding: "4px 10px", cursor: "pointer",
          }}>
            {isZH ? "回今天" : "Back to today"}
          </button>
        </div>
      )}

      {/* Progress bar */}
      {activeItems.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "5px" }}>
            <span>{t.filledOf(filledCount, activeItems.length)}</span>
            <span>{Math.round((filledCount / activeItems.length) * 100)}%</span>
          </div>
          <div style={{ height: "4px", background: "var(--border)", borderRadius: "99px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(filledCount / activeItems.length) * 100}%`, background: isWrongDay ? "var(--amber-500)" : "var(--brand-mid)", borderRadius: "99px", transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      {/* Item groups */}
      {Object.keys(grouped).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
            {grouped[category].map((item, idx) => {
              const key  = countKey(item);
              const val  = counts[key] ?? "";
              const type = effectiveType(item);
              const lastVal = lastMap[key];
              const hasLast = lastVal !== undefined && lastVal !== "";
              return (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 14px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{item.name}</div>
                    {hasLast && (
                      <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "2px" }}>
                        {isZH ? "上次：" : "Last: "}
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {lastVal === "Enough" ? "✓" : lastVal === "Need Order" ? "⚠" : lastVal}
                        </span>
                      </div>
                    )}
                  </div>
                  {type === "status" ? (
                    <StatusToggle value={val} onChange={(v) => onCountChange(item, v)} t={t} />
                  ) : (
                    <input
                      ref={(el) => { inputRefs.current[key] = el; }}
                      type="number" inputMode="numeric"
                      value={val} placeholder=""
                      onChange={(e) => onCountChange(item, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, item)}
                      style={{ width: "64px", padding: "6px 8px", textAlign: "center", borderRadius: "var(--radius-sm)", border: `1.5px solid ${val !== "" ? "var(--brand-light)" : "var(--border)"}`, fontSize: "14px", fontWeight: 600, background: "var(--surface2)", color: "var(--text-primary)" }}
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
          {t.noItemsDay(t.days[EN_DAYS.indexOf(selectedDay)] ?? selectedDay)}
        </div>
      )}

      {/* Sticky save button */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "480px", padding: "12px 16px", background: "linear-gradient(to top, var(--bg) 70%, transparent)", zIndex: 100 }}>
        <button onClick={handleSave} disabled={saving || filledCount === 0} style={{
          width: "100%", padding: "14px", borderRadius: "var(--radius-lg)",
          background: saving ? "var(--brand-light)" : isWrongDay ? "var(--amber-600)" : "var(--brand)",
          color: "#fff", fontSize: "14px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          boxShadow: `0 4px 20px ${isWrongDay ? "rgba(192,98,10,0.35)" : "rgba(61,35,20,0.3)"}`,
          opacity: filledCount === 0 ? 0.45 : 1,
          transition: "all 0.2s", border: "none",
        }}>
          {saving ? (
            <><Spinner size={16} />{t.saving}</>
          ) : (
            <>
              {isWrongDay ? "📅" : "💾"} {t.saveBtn}
              {isWrongDay && (
                <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "var(--radius-full)", padding: "2px 8px", fontSize: "11px" }}>
                  {isZH ? t.days[EN_DAYS.indexOf(selectedDay)] : selectedDay}
                </span>
              )}
              {!isWrongDay && filledCount > 0 && (
                <span style={{ background: "rgba(255,255,255,0.18)", borderRadius: "var(--radius-full)", padding: "2px 9px", fontSize: "12px" }}>
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
