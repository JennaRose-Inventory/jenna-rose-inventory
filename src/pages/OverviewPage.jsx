import { Card, SectionLabel, Badge } from "../components/UI.jsx";
import { shortDate, stockColor, isLowStock } from "../utils/helpers.js";

export default function OverviewPage({ historyData }) {
  const records = historyData.slice(0, 3);

  if (records.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
        No saved inventory yet.<br />Fill in Count and press Save first.
      </div>
    );
  }

  // Build lookup maps per record
  const recordMaps = records.map((rec) => {
    const map = {};
    (rec.items ?? []).forEach((item) => {
      map[`${item.category}||${item.name}`] = item.stock;
    });
    return map;
  });

  // Collect all unique active items preserving category order from latest record
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

  // Low stock items from latest record
  const lowItems = (records[0]?.items ?? [])
    .filter((item) => item.active !== false && isLowStock(item))
    .sort((a, b) => {
      const na = isNaN(Number(a.stock)) ? 999 : Number(a.stock);
      const nb = isNaN(Number(b.stock)) ? 999 : Number(b.stock);
      return na - nb;
    });

  // Group low items by category
  const lowGrouped = lowItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const colW = "40px";

  function valDisplay(val) {
    if (val === undefined || val === null || val === "") return "—";
    return String(val);
  }

  function shortVal(val) {
    if (val === "Need Order") return "⚠️";
    if (val === "Enough") return "✓";
    return valDisplay(val);
  }

  return (
    <div className="page-enter">

      {/* ── Low stock alert banner ─────────────────────────────────────── */}
      {lowItems.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel right={
            <Badge color="var(--red-600)" bg="var(--red-100)">
              {lowItems.length} items
            </Badge>
          }>
            ⚠️ Low Stock Alert
          </SectionLabel>

          {Object.keys(lowGrouped).map((category) => (
            <div key={category} style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", paddingLeft: "2px" }}>
                {category}
              </div>
              <Card>
                {lowGrouped[category].map((item, idx) => {
                  const val = item.stock;
                  const display = valDisplay(val);
                  return (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 14px",
                      borderBottom: idx < lowGrouped[category].length - 1 ? "1px solid var(--red-100)" : "none",
                      background: "var(--red-50)",
                    }}>
                      <span style={{ fontSize: "13px" }}>⚠️</span>
                      <div style={{ flex: 1, fontSize: "13px", color: "var(--red-600)", fontWeight: 600 }}>
                        {item.name}
                      </div>
                      <span style={{
                        fontWeight: 700, fontSize: "13px",
                        color: "var(--red-600)",
                        background: "var(--red-100)",
                        padding: "2px 10px",
                        borderRadius: "var(--radius-full)",
                        fontFamily: "var(--font-mono)",
                      }}>
                        {display}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* ── 3-day comparison ──────────────────────────────────────────── */}
      <SectionLabel right={
        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {records.length} saves shown
        </span>
      }>
        3-Day Overview
      </SectionLabel>

      {/* Date header row */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "0 14px 8px 14px",
      }}>
        <div style={{ flex: 1 }} />
        {records.map((rec, i) => (
          <div key={i} style={{
            width: colW, textAlign: "center",
            marginLeft: "6px",
          }}>
            <div style={{
              fontSize: "11px", fontWeight: 700,
              color: i === 0 ? "var(--brown-700)" : "var(--text-muted)",
            }}>
              {shortDate(rec.date)}
            </div>
            {i === 0 && (
              <div style={{ fontSize: "9px", color: "var(--brown-400)", fontWeight: 600 }}>latest</div>
            )}
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
                    fontWeight: low ? 600 : 400,
                    paddingRight: "6px",
                  }}>
                    {low && "⚠️ "}{item.name}
                  </div>
                  {recordMaps.map((rmap, i) => {
                    const val = rmap[key];
                    const display = shortVal(val);
                    return (
                      <div key={i} style={{
                        width: colW, textAlign: "center",
                        marginLeft: "6px",
                        fontSize: "12px",
                        fontWeight: i === 0 ? 700 : 400,
                        fontFamily: typeof val === "number" || !isNaN(Number(val)) ? "var(--font-mono)" : "inherit",
                        color: i === 0 ? stockColor(val) : "var(--text-muted)",
                        opacity: i === 0 ? 1 : 0.6,
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
