import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { StatCard, Card, SectionLabel, Badge } from "../components/UI.jsx";
import { lowStockTrend, weeklyActivity, topCategories, buildItemHistoryMap, isLowStock } from "../utils/helpers.js";

export default function DashboardPage({ t, historyData, items }) {
  const [range, setRange] = useState(14); // 7, 14, 30
  const isZH = t.appSub === "库存系统";

  if (historyData.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
        {t.noDataYet}
      </div>
    );
  }

  const sliced      = historyData.slice(0, range);
  const activeItems = items.filter((i) => i.active !== false);
  const latestItems = historyData[0]?.items ?? [];
  const lowStockNow = latestItems.filter(isLowStock);
  const lowTrend    = lowStockTrend(sliced, 8);
  const topCats     = topCategories(sliced, 6);
  const itemHistMap = buildItemHistoryMap(sliced);

  const weeklyRaw = weeklyActivity(sliced);
  const weekly = weeklyRaw.map((d, i) => ({ day: t.daysShort[i], saves: d.saves }));

  const mostActive = Object.entries(itemHistMap)
    .map(([key, entries]) => { const [, name] = key.split("||"); return { name, count: entries.length }; })
    .sort((a, b) => b.count - a.count).slice(0, 6);

  const lowTrendChart = sliced.slice().reverse().map((rec, i) => ({
    label: rec.date ? rec.date.slice(0, 5) : `#${i}`,
    low: (rec.items ?? []).filter(isLowStock).length,
  }));

  const tooltipStyle = {
    contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "11px", boxShadow: "var(--shadow-md)" },
    labelStyle: { color: "var(--text-secondary)", fontWeight: 600 },
    itemStyle: { color: "var(--brand-mid)" },
  };

  const RANGES = [
    { val: 7,  label: isZH ? "7天"  : "7d"  },
    { val: 14, label: isZH ? "14天" : "14d" },
    { val: 30, label: isZH ? "30天" : "30d" },
  ];

  return (
    <div className="page-enter" style={{ paddingBottom: "24px" }}>

      {/* Date range selector */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "18px" }}>
        {RANGES.map(({ val, label }) => (
          <button key={val} onClick={() => setRange(val)} style={{
            padding: "6px 16px", borderRadius: "var(--radius-full)",
            background: range === val ? "var(--brand)" : "var(--surface)",
            color: range === val ? "#fff" : "var(--text-muted)",
            fontSize: "12px", fontWeight: 600,
            border: `1.5px solid ${range === val ? "var(--brand)" : "var(--border)"}`,
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "11px", color: "var(--text-faint)", alignSelf: "center" }}>
          {sliced.length} {isZH ? "条记录" : "records"}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <StatCard icon="📦" value={activeItems.length} label={t.activeItems} sub={t.acrossCategories([...new Set(activeItems.map(i => i.category))].length)} accent="var(--brand-mid)" />
        <StatCard icon="⚠️" value={lowStockNow.length} label={t.lowStockNow} sub={t.fromLatestSave} accent={lowStockNow.length > 0 ? "var(--red-700)" : "var(--green-700)"} />
        <StatCard icon="📅" value={sliced.length} label={t.totalSaves} sub={t.allTime} accent="var(--blue-600)" />
      </div>

      {/* Weekly activity */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>{t.weeklySaveActivity}</SectionLabel>
        <Card style={{ padding: "14px 8px 8px" }}>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekly} barSize={28} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyle} cursor={{ fill: "var(--surface2)" }} />
              <Bar dataKey="saves" fill="var(--brand-pale)" radius={[4,4,0,0]} name={t.saves}
                activeBar={{ fill: "var(--brand-mid)" }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Low stock trend */}
      {lowTrendChart.length > 2 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel right={isZH ? `最近${sliced.length}次` : `last ${sliced.length} saves`}>{t.lowStockTrend}</SectionLabel>
          <Card style={{ padding: "14px 8px 8px" }}>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={lowTrendChart} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line dataKey="low" stroke="var(--red-500)" strokeWidth={2} dot={{ r: 3, fill: "var(--red-500)" }} name={t.lowItems} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Top categories */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>{t.mostCountedCats}</SectionLabel>
        <Card>
          {topCats.map((cat, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderBottom: idx < topCats.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>{cat.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ height: "5px", width: `${Math.round((cat.count / topCats[0].count) * 72)}px`, background: "var(--brand-pale)", borderRadius: "99px", minWidth: "12px" }} />
                <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-faint)", minWidth: "20px", textAlign: "right" }}>{cat.count}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Most tracked */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>{t.mostTrackedItems}</SectionLabel>
        <Card>
          {mostActive.map((item, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", borderBottom: idx < mostActive.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-faint)", width: "18px" }}>{idx + 1}</span>
              <div style={{ flex: 1, fontSize: "12px", color: "var(--text-primary)" }}>{item.name}</div>
              <Badge color="var(--brand-mid)" bg="var(--brand-ghost)">{t.timesTracked(item.count)}</Badge>
            </div>
          ))}
        </Card>
      </div>

      {/* Chronic low stock */}
      {lowTrend.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel right={t.byFrequency}>{t.chronicLowStock}</SectionLabel>
          <Card>
            {lowTrend.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 14px", background: idx === 0 ? "var(--red-50)" : "transparent", borderBottom: idx < lowTrend.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: idx === 0 ? "var(--red-500)" : "var(--border2)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", color: idx === 0 ? "var(--red-700)" : "var(--text-primary)", fontWeight: 500 }}>{item.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-faint)" }}>{item.category}</div>
                </div>
                <Badge color="var(--red-700)" bg="var(--red-100)">{t.timesLow(item.count)}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
