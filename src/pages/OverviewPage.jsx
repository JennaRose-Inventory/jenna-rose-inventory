import { Card, SectionLabel } from "../components/UI.jsx";
import { shortDate, stockColor, isLowStock } from "../utils/helpers.js";

export default function OverviewPage({ t, historyData }) {
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

  return (
    <div className="page-enter">

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
          </div>
        ))}
      </div>

      {/* Category groups */}
      {Object.keys(grouped).map((category) => (
        <div key={category} style={{ marginBottom: "16px" }}>
          <SectionLabel>{category}</SectionLabel>
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
      ))}
    </div>
  );
}
