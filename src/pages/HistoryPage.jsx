import { useState } from "react";
import { Card, SectionLabel } from "../components/UI.jsx";
import { stockColor } from "../utils/helpers.js";

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

  return (
    <div className="page-enter">
      <div style={{ position: "relative", marginBottom: "16px" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
        <input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            borderRadius: "var(--radius-lg)",
            border: "1.5px solid var(--border)",
            background: "var(--surface)",
            fontSize: "13px", color: "var(--text-primary)",
            boxSizing: "border-box", boxShadow: "var(--shadow-sm)",
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
            {Object.keys(filtered[category]).map((itemName, idx, arr) => (
              <div key={idx} style={{ padding: "10px 14px", borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "7px", color: "var(--text-primary)" }}>
                  {itemName}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {filtered[category][itemName].map((e, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "5px",
                      background: "var(--surface2)", border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)", padding: "3px 9px", fontSize: "11px",
                    }}>
                      <span style={{ color: stockColor(e.stock), fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        {String(e.stock)}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "10px" }}>{e.date}</span>
                      {e.savedBy && (
                        <span style={{ color: "var(--text-muted)", fontSize: "9px", opacity: 0.65 }}>
                          · {e.savedBy}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        </div>
      ))}

      <div style={{ textAlign: "center", fontSize: "10px", color: "var(--text-muted)", padding: "8px", marginTop: "4px" }}>
        {t.historyFooter}
      </div>
    </div>
  );
}
