import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { StatCard, Card, SectionLabel, Badge } from "../components/UI.jsx";
import {
  lowStockTrend, weeklyActivity, topCategories,
  buildItemHistoryMap, avgStock, isLowStock,
} from "../utils/helpers.js";

export default function DashboardPage({ historyData, items }) {
  if (historyData.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
        No data yet. Start saving inventory counts to see analytics.
      </div>
    );
  }

  const activeItems = items.filter((i) => i.active !== false);
  const latestItems = historyData[0]?.items ?? [];
  const lowStockNow = latestItems.filter(isLowStock);
  const lowTrend    = lowStockTrend(historyData, 8);
  const weekly      = weeklyActivity(historyData);
  const topCats     = topCategories(historyData, 6);
  const itemHistMap = buildItemHistoryMap(historyData);

  // Most active items: most entries in history
  const mostActive = Object.entries(itemHistMap)
    .map(([key, entries]) => {
      const [, name] = key.split("||");
      return { name, count: entries.length };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Low stock trend chart data (last 14 records)
  const lowTrendChart = historyData.slice(0, 14).reverse().map((rec, i) => ({
    label: rec.date ? rec.date.slice(0, 5) : `#${i}`,
    low: (rec.items ?? []).filter(isLowStock).length,
  }));

  const tooltipStyle = {
    contentStyle: {
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      fontSize: "11px",
      boxShadow: "var(--shadow-md)",
    },
    labelStyle: { color: "var(--text-secondary)", fontWeight: 600 },
    itemStyle: { color: "var(--brown-700)" },
  };

  return (
    <div className="page-enter" style={{ paddingBottom: "24px" }}>

      {/* ── Stat cards row ── */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <StatCard
          icon="📦"
          value={activeItems.length}
          label="Active Items"
          sub={`across ${[...new Set(activeItems.map(i => i.category))].length} categories`}
          accent="var(--brown-500)"
        />
        <StatCard
          icon="⚠️"
          value={lowStockNow.length}
          label="Low Stock Now"
          sub="from latest save"
          accent={lowStockNow.length > 0 ? "var(--red-600)" : "var(--green-600)"}
        />
        <StatCard
          icon="📅"
          value={historyData.length}
          label="Total Saves"
          sub="all time"
          accent="var(--blue-500)"
        />
      </div>

      {/* ── Weekly activity bar chart ── */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>Weekly Save Activity</SectionLabel>
        <Card style={{ padding: "14px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekly} barSize={28} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--bg2)" }} />
              <Bar dataKey="saves" fill="var(--brown-400)" radius={[4, 4, 0, 0]} name="Saves" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* ── Low stock trend line ── */}
      {lowTrendChart.length > 2 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel right="last 14 saves">Low Stock Trend</SectionLabel>
          <Card style={{ padding: "14px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={lowTrendChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line dataKey="low" stroke="var(--red-500)" strokeWidth={2} dot={{ r: 3, fill: "var(--red-500)" }} name="Low items" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ── Top categories ── */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>Most Counted Categories</SectionLabel>
        <Card>
          {topCats.map((cat, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "10px 14px",
              borderBottom: idx < topCats.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>
                {cat.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  height: "6px",
                  width: `${Math.round((cat.count / topCats[0].count) * 80)}px`,
                  background: "var(--brown-300, #c4a07a)",
                  borderRadius: "99px",
                  minWidth: "12px",
                }} />
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", minWidth: "24px", textAlign: "right" }}>
                  {cat.count}
                </span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Most active items ── */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>Most Tracked Items</SectionLabel>
        <Card>
          {mostActive.map((item, idx) => (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: "10px",
              padding: "9px 14px",
              borderBottom: idx < mostActive.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", width: "18px" }}>
                {idx + 1}
              </span>
              <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)" }}>{item.name}</div>
              <Badge color="var(--brown-700)" bg="var(--brown-100)">{item.count}×</Badge>
            </div>
          ))}
        </Card>
      </div>

      {/* ── Chronic low-stock items ── */}
      {lowTrend.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel right="by frequency">Chronic Low Stock</SectionLabel>
          <Card>
            {lowTrend.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 14px",
                borderBottom: idx < lowTrend.length - 1 ? "1px solid var(--border)" : "none",
                background: idx === 0 ? "var(--red-50)" : "transparent",
              }}>
                <span style={{ fontSize: "13px" }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: idx === 0 ? "var(--red-600)" : "var(--text-primary)", fontWeight: 500 }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.category}</div>
                </div>
                <Badge color="var(--red-600)" bg="var(--red-100)">{item.count}× low</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
