import { useState } from "react";
import { Card, SectionLabel } from "../components/UI.jsx";
import { shortDate, stockColor, isLowStock } from "../utils/helpers.js";
import { buildMessage, buildWhatsAppUrl } from "../utils/suppliers.js";

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ category, items, latestMap, onClose, t, supplier }) {
  const isZH = supplier?.lang === "zh";

  // Default: select all low stock items; if none low, select all
  const lowItems = items.filter((item) => isLowStock({ stock: latestMap[`${category}||${item.name}`] }));
  const defaultSelected = new Set(
    (lowItems.length > 0 ? lowItems : items).map((i) => i.name)
  );
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
  const message = buildMessage(category, selectedList);
  const waResult = supplier ? buildWhatsAppUrl(supplier, selectedList) : null;

  async function handleSend() {
    if (!selectedList.length) return;

    // Always copy message to clipboard first
    try { await navigator.clipboard.writeText(message); } catch {}

    if (!waResult) {
      // Copy only
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    }

    if (waResult.type === "group") {
      // For groups: copy message + open group link
      setCopied(true);
      setTimeout(() => { window.open(waResult.url, "_blank"); onClose(); }, 400);
      return;
    }

    if (waResult.type === "phone") {
      // For phone: message is already in URL, just open
      window.open(waResult.url, "_blank");
      onClose();
    }
  }

  const hasSupplier = supplier && supplier.type !== "copy";
  const btnLabel = !selectedList.length
    ? (isZH ? "请选择项目" : "Select items")
    : waResult?.type === "group"
      ? (isZH ? "复制 & 打开 WhatsApp" : "Copy & Open WhatsApp")
    : waResult?.type === "phone"
      ? (isZH ? "发送 WhatsApp" : "Send WhatsApp")
    : copied
      ? (isZH ? "已复制 ✓" : "Copied ✓")
      : (isZH ? "复制订单" : "Copy Order");

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        zIndex: 500, backdropFilter: "blur(2px)",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px",
        background: "var(--surface)",
        borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
        boxShadow: "var(--shadow-lg)",
        zIndex: 501,
        padding: "0 0 32px",
        maxHeight: "85dvh",
        display: "flex", flexDirection: "column",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "var(--border2)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "4px 18px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>
              {category}
            </div>
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
          <button onClick={onClose} style={{ fontSize: "18px", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}>✕</button>
        </div>

        {/* Select all / clear */}
        <div style={{ display: "flex", gap: "8px", padding: "10px 18px 4px" }}>
          <button onClick={selectAll} style={{ fontSize: "11px", color: "var(--brown-600, var(--brown-500))", fontWeight: 600, background: "var(--brown-100)", border: "none", borderRadius: "var(--radius-full)", padding: "4px 12px", cursor: "pointer" }}>
            {isZH ? "全选" : "All"}
          </button>
          <button onClick={clearAll} style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "4px 12px", cursor: "pointer" }}>
            {isZH ? "清除" : "Clear"}
          </button>
        </div>

        {/* Item list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {items.map((item, idx) => {
            const key = `${category}||${item.name}`;
            const val = latestMap[key];
            const low = isLowStock({ stock: val });
            const isSelected = selected.has(item.name);

            return (
              <div
                key={idx}
                onClick={() => toggle(item.name)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 18px",
                  cursor: "pointer",
                  background: isSelected ? "var(--brown-100)" : "transparent",
                  borderBottom: "1px solid var(--border)",
                  transition: "background 0.12s",
                }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `2px solid ${isSelected ? "var(--brown-700)" : "var(--border2)"}`,
                  background: isSelected ? "var(--brown-700)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.12s",
                }}>
                  {isSelected && <span style={{ color: "#fff", fontSize: "11px", fontWeight: 700 }}>✓</span>}
                </div>

                {/* Name */}
                <div style={{ flex: 1, fontSize: "13px", color: low ? "var(--red-600)" : "var(--text-primary)", fontWeight: low ? 600 : 400 }}>
                  {low && "! "}{item.name}
                </div>

                {/* Latest stock */}
                {val !== undefined && val !== "" && (
                  <div style={{ fontSize: "11px", fontWeight: 700, color: stockColor(val), fontFamily: "var(--font-mono)" }}>
                    {val === "Need Order" ? "⚠" : val === "Enough" ? "✓" : val}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Preview message */}
        {selectedList.length > 0 && (
          <div style={{
            margin: "10px 18px 0",
            padding: "10px 12px",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: "11px", color: "var(--text-secondary)",
            whiteSpace: "pre-line", lineHeight: 1.6,
            maxHeight: "80px", overflowY: "auto",
          }}>
            {message}
          </div>
        )}

        {/* Send button */}
        <div style={{ padding: "12px 18px 0" }}>
          <button
            onClick={handleSend}
            disabled={!selectedList.length}
            style={{
              width: "100%", padding: "14px",
              borderRadius: "var(--radius-lg)",
              background: copied ? "var(--green-600)"
                : !selectedList.length ? "var(--border2)"
                : waResult ? "#25D366"   // WhatsApp green
                : "var(--brown-700)",
              color: "#fff",
              fontSize: "14px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              transition: "background 0.2s",
              cursor: selectedList.length ? "pointer" : "default",
              boxShadow: selectedList.length ? "0 4px 16px rgba(0,0,0,0.15)" : "none",
            }}
          >
            {waResult ? "📱" : "📋"} {btnLabel}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Main Overview Page ────────────────────────────────────────────────────────
export default function OverviewPage({ t, historyData, suppliers }) {
  const [activeModal, setActiveModal] = useState(null); // category name
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
    (rec.items ?? []).forEach((item) => {
      map[`${item.category}||${item.name}`] = item.stock;
    });
    return map;
  });

  const seenKeys = new Set();
  const allItems = [];
  records.forEach((rec) => {
    (rec.items ?? []).forEach((item) => {
      const key = `${item.category}||${item.name}`;
      if (!seenKeys.has(key) && item.active !== false) {
        seenKeys.add(key);
        allItems.push({ category: item.category, name: item.name });
      }
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

  // Items for modal (from grouped)
  const modalItems = activeModal ? (grouped[activeModal] ?? []) : [];

  return (
    <div className="page-enter">

      {/* Order Modal */}
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

      {/* Date header */}
      <div style={{ display: "flex", alignItems: "flex-end", padding: "0 14px 8px 14px" }}>
        <div style={{ flex: 1 }} />
        {records.map((rec, i) => (
          <div key={i} style={{ width: colW, textAlign: "center", marginLeft: "6px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: i === 0 ? "var(--brown-700)" : "var(--text-muted)" }}>
              {shortDate(rec.date)}
            </div>
            <div style={{ fontSize: "9px", fontWeight: 600, color: i === 0 ? "var(--brown-400)" : "var(--text-muted)" }}>
              {i === 0 ? t.latest : t.yesterday}
            </div>
            {rec.savedBy && (
              <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "1px" }}>
                👤 {rec.savedBy}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Category groups */}
      {Object.keys(grouped).map((category) => {
        const supplier = suppliers?.[category] ?? null;
        const hasContact = !!supplier;

        return (
          <div key={category} style={{ marginBottom: "16px" }}>
            {/* Section label + order button */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 2px", marginBottom: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                {category}
              </span>
              {hasContact && (
                <button
                  onClick={() => setActiveModal(category)}
                  style={{
                    display: "flex", alignItems: "center", gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "var(--radius-full)",
                    background: supplier.type === "copy" ? "var(--surface2)" : "#e7f8ee",
                    border: `1px solid ${supplier.type === "copy" ? "var(--border)" : "#b7e4c7"}`,
                    fontSize: "11px", fontWeight: 600,
                    color: supplier.type === "copy" ? "var(--text-secondary)" : "#1a7f37",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {supplier.type === "copy" ? "📋" : "📱"}
                  {supplier.type === "copy"
                    ? (t.appSub === "库存系统" ? " 复制" : " Copy")
                    : (t.appSub === "库存系统" ? " 订货" : " Order")}
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
                    background: low ? "var(--red-50)" : "transparent",
                  }}>
                    <div style={{
                      flex: 1, fontSize: "12px",
                      color: low ? "var(--red-600)" : "var(--text-primary)",
                      paddingRight: "6px",
                      display: "flex", alignItems: "center", gap: "5px",
                    }}>
                      {low && <span style={{ fontSize: "10px", color: "var(--red-500)", fontWeight: 700 }}>!</span>}
                      {item.name}
                    </div>
                    {recordMaps.map((rmap, i) => {
                      const val = rmap[key];
                      const display = valDisplay(val);
                      const isNum = val !== undefined && val !== "" && !isNaN(Number(val));
                      return (
                        <div key={i} style={{
                          width: colW, textAlign: "center", marginLeft: "6px",
                          fontSize: i === 0 ? "13px" : "11px",
                          fontWeight: i === 0 ? 700 : 400,
                          fontFamily: isNum ? "var(--font-mono)" : "inherit",
                          color: i === 0 ? stockColor(val) : "var(--text-muted)",
                          opacity: i === 0 ? 1 : 0.55,
                        }}>
                          {display}
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
