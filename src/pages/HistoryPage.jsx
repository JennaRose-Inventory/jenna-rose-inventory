import { useState } from "react";
import { Card, SectionLabel } from "../components/UI.jsx";
import { stockColor } from "../utils/helpers.js";

export default function HistoryPage({ historyData }) {
  const [search, setSearch] = useState("");

  // Build { category: { name: [{date, stock}] } }
  const historyMap = {};
  historyData.forEach((record) => {
    (record.items ?? []).forEach((item) => {
      if (!historyMap[item.category]) historyMap[item.category] = {};
      if (!historyMap[item.category][item.name]) historyMap[item.category][item.name] = [];
      const s = item.stock;
      if (s !== "" && s !== null && s !== undefined) {
        historyMap[item.category][item.name].push({ date: record.date, stock: s });
      }
    });
  });

  const filtered = Object.keys(historyMap).reduce((acc, cat) => {
    const names = Object.keys(historyMap[cat]).filter(
      (n) => n.toLowerCase().includes(search.toLowerCase()) ||
             cat.toLowerCase().includes(search.toLowerCase())
    );
    if (names.length) {
      acc[cat] = {};
      names.forEach((n) => { acc[cat][n] = historyMap[cat][n]; });
    }
    return acc;
  }, {});

  return (
    <div className="page-enter">
      {/* Search */}
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <span style={{
          position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)",
          fontSize: "14px", pointerEvents: "none",
        }}>🔍</span>
        <input
          placeholder="Search item or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            fontSize: "13px", color: "var(--text-primary)",
            boxSizing: "border-box",
            boxShadow: "var(--shadow-sm)",
          }}
        />
      </div>

      {Object.keys(filtered).length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
          {search ? "No items match your search." : "No history yet."}
        </div>
      )}

      {Object.keys(filtered).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
          <Card>
            {Object.keys(filtered[category]).map((itemName, idx, arr) => {
              const entries = filtered[category][itemName].slice(0, 10);
              return (
                <div key={idx} style={{
                  padding: "10px 14px",
                  borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "6px", color: "var(--text-primary)" }}>
                    {itemName}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                    {entries.map((e, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-sm)",
                        padding: "3px 8px",
                        fontSize: "10px",
                      }}>
                        <span style={{ color: "var(--text-muted)" }}>{e.date}</span>
                        <span style={{ color: stockColor(e.stock), fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                          {String(e.stock)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      ))}
    </div>
  );
}
