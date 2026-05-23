import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, SectionLabel } from "../components/UI.jsx";
import { shortDate, stockColor, isLowStock } from "../utils/helpers.js";
import { buildMessage, buildWhatsAppUrl } from "../utils/suppliers.js";

function OrderModal({ category, items, latestMap, onClose, t, supplier }) {
  const isZH = t.appSub === "库存系统";

  const lowItems = items.filter((item) => isLowStock({ stock: latestMap[`${category}||${item.name}`] }));
  const defaultSelected = new Set((lowItems.length > 0 ? lowItems : items).map((i) => i.name));
  const [selected, setSelected] = useState(defaultSelected);
  const [copied, setCopied] = useState(false);

  function toggle(name) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }
  function selectAll() { setSelected(new Set(items.map((i) => i.name))); }
  function clearAll()  { setSelected(new Set()); }

  const selectedList = items.map((i) => i.name).filter((n) => selected.has(n));
  const message  = buildMessage(category, selectedList, supplier?.lang);
  const waResult = supplier ? buildWhatsAppUrl(supplier, selectedList) : null;

  async function handleSend() {
    if (!selectedList.length) return;
    try { await navigator.clipboard.writeText(message); } catch {}
    if (!waResult) { setCopied(true); setTimeout(() => setCopied(false), 2500); return; }
    if (waResult.type === "group") {
      setCopied(true);
      setTimeout(() => { window.open(waResult.url, "_blank"); onClose(); }, 400);
      return;
    }
    if (waResult.type === "phone") { window.open(waResult.url, "_blank"); onClose(); }
  }

  const btnLabel = !selectedList.length
    ? (isZH ? "请选择项目" : "Select items")
    : waResult?.type === "group" ? (isZH ? "复制 & 打开 WhatsApp" : "Copy & Open WhatsApp")
    : waResult?.type === "phone" ? (isZH ? "发送 WhatsApp" : "Send WhatsApp")
    : copied ? (isZH ? "已复制 ✓" : "Copied ✓")
    : (isZH ? "复制订单" : "Copy Order");

  return createPortal(
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 9998,
      }} />

      {/* Bottom sheet */}
      <div style={{
        position: "fixed", bottom: 0,
        left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px",
        background: "var(--surface)",
        borderRadius: "20px 20px 0 0",
        boxShadow: "0 -8px 32px rgba(0,0,0,0.2)",
        zIndex: 9999,
        maxHeight: "88dvh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--border2)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 18px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{category}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
              {supplier?.type === "copy"
                ? (isZH ? "复制后去 WeChat/WhatsApp 粘贴" : "Copy then paste to WeChat/WhatsApp")
                : "WhatsApp"}
              {" · "}
              <span style={{ color: "var(--brown-500)", fontWeight: 600 }}>
                {selectedList.length} {isZH ? "项已选" : "selected"}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize: "20px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "6px", lineHeight: 1 }}>✕</button>
        </div>

        {/* Select all / clear */}
        <div style={{ display: "flex", gap: "8px", padding: "10px 18px 6px", flexShrink: 0 }}>
          <button onClick={selectAll} style={{ fontSize: "11px", color: "var(--brown-500)", fontWeight: 600, background: "var(--brown-100)", border: "none", borderRadius: 99, padding: "4px 14px", cursor: "pointer" }}>
            {isZH ? "全选" : "All"}
          </button>
          <button onClick={clearAll} style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 99, padding: "4px 14px", cursor: "pointer" }}>
            {isZH ? "清除" : "Clear"}
          </button>
        </div>

        {/* Scrollable item list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {items.map((item, idx) => {
            const key = `${category}||${item.name}`;
            const val = latestMap[key];
            const low = isLowStock({ stock: val });
            const isSelected = selected.has(item.name);
            return (
              <div key={idx} onClick={() => toggle(item.name)} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 18px", cursor: "pointer",
                background: isSelected ? "var(--brown-100)" : "transparent",
                borderBottom: "1px solid var(--border)",
                transition: "background 0.12s",
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${isSelected ? "var(--brown-700)" : "var(--border2)"}`,
                  background: isSelected ? "var(--brown-700)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                }}>
                  {isSelected && <span style={{ color: "#fff", fontSize: "12px", fontWeight: 700 }}>✓</span>}
                </div>
                <div style={{ flex: 1, fontSize: "13px", color: low ? "var(--red-600)" : "var(--text-primary)", fontWeight: low ? 600 : 400 }}>
                  {low && "! "}{item.name}
                </div>
                {val !== undefined && val !== "" && (
                  <div style={{ fontSize: "12px", fontWeight: 700, color: stockColor(val), fontFamily: "var(--font-mono)" }}>
                    {val === "Need Order" ? "⚠" : val === "Enough" ? "✓" : val}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Message preview */}
        {selectedList.length > 0 && (
          <div style={{
            margin: "10px 18px 0", flexShrink: 0,
            padding: "10px 12px",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: "11px", color: "var(--text-secondary)",
            whiteSpace: "pre-line", lineHeight: 1.6,
            maxHeight: "72px", overflowY: "auto",
          }}>
            {message}
          </div>
        )}

        {/* Send button */}
        <div style={{ padding: "12px 18px 28px", flexShrink: 0 }}>
          <button onClick={handleSend} disabled={!selectedList.length} style={{
            width: "100%", padding: "14px",
            borderRadius: "var(--radius-lg)",
            background: copied ? "var(--green-600)"
              : !selectedList.length ? "var(--border2)"
              : waResult ? "#25D366"
              : "var(--brown-700)",
            color: "#fff", fontSize: "14px", fontWeight: 700, border: "none",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "background 0.2s",
            cursor: selectedList.length ? "pointer" : "default",
            boxShadow: selectedList.length ? "0 4px 16px rgba(0,0,0,0.15)" : "none",
          }}>
            {waResult ? "📱" : "📋"} {btnLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

export default function OverviewPage({ t, historyData, suppliers }) {
  const [activeModal, setActiveModal] = useState(null);
  const records = historyData.slice(0, 2);

  if (records.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
        {t.noSavedYet.split("\n").map((line, i) => <div key={i}>{line}</div>)}
      </div>
    );
  }

  const recordMaps = records.map((rec) => {
    const map = {};
    (rec.items ?? []).forEach((item) => { map[`${item.category}||${item.name}`] = item.stock; });
    return map;
  });

  const seenKeys = new Set();
  const allItems = [];
  records.forEach((rec) => {
    (rec.items ?? []).forEach((item) => {
      const key = `${item.category}||${item.name}`;
      if (!seenKeys.has(key) && item.active !== false) { seenKeys.add(key); allItems.push({ category: item.category, name: item.name }); }
    });
  });

  const grouped = allItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const colW = "52px";

  function valDisplay(val) {
    if (val === undefined || val === null || val === "") return "—";
    if (val === "Need Order") return "⚠";
    if (val === "Enough") return "✓";
    return String(val);
  }

  const modalItems = activeModal ? (grouped[activeModal] ?? []) : [];
  const isZH = t.appSub === "库存系统";
  const lowCount = Object.values(recordMaps[0] ?? {}).filter(v => isLowStock({ stock: v })).length;

  return (
    <div className="page-enter">

      {activeModal && (
        <OrderModal
          category={activeModal}
          items={modalItems}
          latestMap={recordMaps[0] ?? {}}
          onClose={() => setActiveModal(null)}
          t={t}
          supplier={suppliers?.[activeModal] ?? null}
        />
      )}

      {/* Low stock banner */}
      {lowCount > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--red-50)", border: "1px solid #fca5a5",
          borderRadius: "var(--radius-md)", padding: "10px 14px",
          marginBottom: "14px",
        }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red-500)", flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: "12px", color: "var(--red-700)", fontWeight: 600 }}>
            {isZH ? `${lowCount} 项库存不足` : `${lowCount} item${lowCount > 1 ? "s" : ""} low on stock`}
          </div>
          <div style={{ fontSize: "10px", color: "var(--red-500)" }}>
            {isZH ? "以红色标注 ↓" : "marked below ↓"}
          </div>
        </div>
      )}

      {/* Date header */}
      <div style={{ display: "flex", alignItems: "flex-end", padding: "0 14px 8px 14px" }}>
        <div style={{ flex: 1 }} />
        {records.map((rec, i) => (
          <div key={i} style={{ width: colW, textAlign: "center", marginLeft: "6px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: i === 0 ? "var(--brand-soft)" : "var(--text-faint)" }}>
              {shortDate(rec.date)}
            </div>
            <div style={{ fontSize: "9px", fontWeight: 500, color: i === 0 ? "var(--brand-light)" : "var(--text-faint)" }}>
              {i === 0 ? t.latest : t.yesterday}
            </div>
            {rec.savedBy && (
              <div style={{ fontSize: "9px", color: "var(--text-faint)", marginTop: "1px" }}>
                {rec.savedBy}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category groups */}
      {Object.keys(grouped).map((category) => {
        const supplier = suppliers?.[category] ?? null;
        return (
          <div key={category} style={{ marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {category}
              </span>
              {supplier && (
                <button onClick={() => setActiveModal(category)} style={{
                  display: "flex", alignItems: "center", gap: "5px",
                  padding: "4px 10px", borderRadius: 99,
                  background: supplier.type === "copy" ? "var(--surface2)" : "#f0faf4",
                  border: `1px solid ${supplier.type === "copy" ? "var(--border)" : "#a7d7b8"}`,
                  fontSize: "11px", fontWeight: 600,
                  color: supplier.type === "copy" ? "var(--text-secondary)" : "#1a7f37",
                  cursor: "pointer",
                  letterSpacing: "-0.01em",
                }}>
                  {supplier.type === "copy" ? (
                    // Copy icon
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  ) : (
                    // WhatsApp icon
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.826L.057 23.927a.5.5 0 0 0 .609.61l6.102-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.523-5.166-1.432l-.371-.22-3.844.924.942-3.844-.241-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                    </svg>
                  )}
                  {supplier.type === "copy"
                    ? (isZH ? "复制" : "Copy")
                    : (isZH ? "订货" : "Order")}
                </button>
              )}
            </div>

            <Card>
              {grouped[category].map((item, idx) => {
                const key = `${item.category}||${item.name}`;
                const latestVal = recordMaps[0]?.[key];
                const low = isLowStock({ stock: latestVal });
                return (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center",
                    padding: "9px 14px",
                    borderBottom: idx < grouped[category].length - 1 ? "1px solid var(--border)" : "none",
                    background: "transparent",
                  }}>
                    {/* Item name — subtle dot if low, name stays neutral */}
                    <div style={{
                      flex: 1, fontSize: "12px",
                      color: "var(--text-primary)",
                      paddingRight: "6px",
                      display: "flex", alignItems: "center", gap: "7px",
                    }}>
                      {/* Low stock dot indicator */}
                      {low && (
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: "var(--red-500)",
                          flexShrink: 0,
                          display: "inline-block",
                          opacity: 0.85,
                        }} />
                      )}
                      {item.name}
                    </div>

                    {/* Value columns */}
                    {recordMaps.map((rmap, i) => {
                      const val = rmap[key];
                      const display = valDisplay(val);
                      const isNum = val !== undefined && val !== "" && !isNaN(Number(val));
                      const isLatest = i === 0;
                      const showPill = isLatest && low && display !== "—";

                      return (
                        <div key={i} style={{
                          width: colW, textAlign: "center", marginLeft: "6px",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {showPill ? (
                            // Low stock pill — only on latest column
                            <span style={{
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              minWidth: "32px", padding: "2px 8px",
                              borderRadius: "var(--radius-full)",
                              background: "var(--red-100)",
                              border: "1px solid #fca5a5",
                              fontSize: "12px", fontWeight: 700,
                              color: "var(--red-700)",
                              fontFamily: isNum ? "var(--font-mono)" : "inherit",
                              letterSpacing: isNum ? "-0.02em" : "0",
                            }}>
                              {display}
                            </span>
                          ) : (
                            <span style={{
                              fontSize: isLatest ? "13px" : "11px",
                              fontWeight: isLatest ? 600 : 400,
                              fontFamily: isNum ? "var(--font-mono)" : "inherit",
                              color: isLatest
                                ? (display === "—" ? "var(--text-faint)" : stockColor(val))
                                : "var(--text-faint)",
                              opacity: isLatest ? 1 : 0.5,
                              letterSpacing: isNum ? "-0.02em" : "0",
                            }}>
                              {display}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </Card>
          </div>
        );
      })}
    </div>
  );
}
