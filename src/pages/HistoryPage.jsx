import { useState } from "react";
import { Card, SectionLabel } from "../components/UI.jsx";
import { stockColor, isLowStock } from "../utils/helpers.js";

function shortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dateStr;
}

export default function HistoryPage({ t, historyData }) {
  const [search, setSearch] = useState("");
  const records = historyData.slice(0, 14);

  const historyMap = {};
  records.forEach((record) => {
    (record.items ?? []).forEach((item) => {
      if (!historyMap[item.category]) historyMap[item.category] = {};
      if (!historyMap[item.category][item.name]) historyMap[item.category][item.name] = [];
      const s = item.stock;
      if (s !== "" && s !== null && s !== undefined) {
        historyMap[item.category][item.name].push({
          date: shortDate(record.date),
          stock: s,
          savedBy: record.savedBy || null,
        });
      }
    });
  });

  const filtered = Object.keys(historyMap).reduce((acc, cat) => {
    const names = Object.keys(historyMap[cat]).filter(
      (n) => n.toLowerCase().includes(search.toLowerCase()) || cat.toLowerCase().includes(search.toLowerCase())
    );
    if (names.length) {
      acc[cat] = {};
      names.forEach((n) => { acc[cat][n] = historyMap[cat][n]; });
    }
    return acc;
  }, {});

  function stockDisplay(val) {
    if (val === "Enough") return { label: "✓", color: "var(--green-500)" };
    if (val === "Need Order") return { label: "⚠ Need Order", color: "var(--red-600)" };
    return { label: String(val), color: stockColor(val) };
  }

  return (
    <div className="page-enter">
      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", pointerEvents: "none", opacity: 0.4 }}>⌕</span>
        <input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 34px",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            fontSize: "13px", color: "var(--text-primary)",
            boxSizing: "border-box", boxShadow: "var(--shadow-xs)",
          }}
        />
      </div>

      {Object.keys(filtered).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
          {search ? t.noMatch : t.noHistory}
        </div>
      )}

      {Object.keys(filtered).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
          <Card>
            {Object.keys(filtered[category]).map((itemName, idx, arr) => {
              const entries = filtered[category][itemName];
              return (
                <div key={idx} style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                  {/* Item name header */}
                  <div style={{ padding: "10px 14px 6px", fontWeight: 600, fontSize: "12px", color: "var(--text-primary)" }}>
                    {itemName}
                  </div>
                  {/* One row per entry */}
                  {entries.map((e, i) => {
                    const { label, color } = stockDisplay(e.stock);
                    const low = isLowStock({ stock: e.stock });
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center",
                        padding: "7px 14px 7px 20px",
                        background: i % 2 === 0 ? "transparent" : "var(--surface2)",
                        borderTop: "1px solid var(--border)",
                      }}>
                        {/* Date */}
                        <div style={{ fontSize: "11px", color: "var(--text-faint)", width: "44px", flexShrink: 0 }}>
                          {e.date}
                        </div>
                        {/* Staff */}
                        {e.savedBy && (
                          <div style={{ fontSize: "10px", color: "var(--text-faint)", flex: 1, paddingLeft: "8px" }}>
                            {e.savedBy}
                          </div>
                        )}
                        {!e.savedBy && <div style={{ flex: 1 }} />}
                        {/* Stock value */}
                        <div style={{
                          fontSize: "12px", fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color,
                          background: low ? "var(--red-100)" : "transparent",
                          padding: low ? "2px 8px" : "0",
                          borderRadius: low ? "var(--radius-full)" : "0",
                          border: low ? "1px solid #fca5a5" : "none",
                        }}>
                          {label}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ height: "4px" }} />
                </div>
              );
            })}
          </Card>
        </div>
      ))}

      <div style={{ textAlign: "center", fontSize: "10px", color: "var(--text-faint)", padding: "8px", marginTop: "4px" }}>
        {t.historyFooter}
      </div>
    </div>
  );
}
