import { Card, SectionLabel, Badge } from "../components/UI.jsx";
import {
  buildItemHistoryMap, avgStock, isWeekend,
  isMalaysiaHoliday, countKey,
} from "../utils/helpers.js";

// ── Day-of-week pattern engine ────────────────────────────────────────────────
function buildDowPatterns(itemHistMap) {
  // Returns { key: { Mon: avg, Tue: avg, ... } }
  const patterns = {};
  Object.entries(itemHistMap).forEach(([key, entries]) => {
    const byDow = {};
    entries.forEach((e) => {
      const n = Number(e.stock);
      if (!isNaN(n)) {
        if (!byDow[e.dow]) byDow[e.dow] = [];
        byDow[e.dow].push(n);
      }
    });
    const dowAvg = {};
    Object.entries(byDow).forEach(([dow, vals]) => {
      dowAvg[dow] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    if (Object.keys(dowAvg).length > 0) patterns[key] = dowAvg;
  });
  return patterns;
}

function nextDayName() {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return days[tomorrow.getDay()];
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-GB");
}

function upcomingHolidayName() {
  const MY_NAMED = {
    "01/01/2026": "New Year's Day",
    "20/01/2026": "Chinese New Year",
    "21/01/2026": "Chinese New Year (2nd day)",
    "31/03/2026": "Hari Raya Aidilfitri",
    "01/05/2026": "Labour Day",
    "31/08/2026": "National Day",
    "16/09/2026": "Malaysia Day",
    "25/12/2026": "Christmas",
  };
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const str = d.toLocaleDateString("en-GB");
    if (MY_NAMED[str]) return { date: str, name: MY_NAMED[str], daysAway: i };
  }
  return null;
}

export default function PredictionsPage({ historyData, items }) {
  if (historyData.length < 3) {
    return (
      <div className="page-enter" style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
        Need at least 3 saves to generate predictions.<br />Keep saving daily!
      </div>
    );
  }

  const itemHistMap  = buildItemHistoryMap(historyData);
  const dowPatterns  = buildDowPatterns(itemHistMap);
  const nextDay      = nextDayName();
  const tomorrowDate = tomorrowStr();
  const isNextWeekend    = isWeekend(tomorrowDate);
  const isNextHoliday    = isMalaysiaHoliday(tomorrowDate);
  const upcomingHoliday  = upcomingHolidayName();
  const latestItems      = historyData[0]?.items ?? [];

  // ── Predicted orders for tomorrow ────────────────────────────────────────
  const predictedOrders = [];
  latestItems.forEach((item) => {
    if (item.active === false) return;
    const key = countKey(item);
    const pattern = dowPatterns[key];
    if (!pattern || !pattern[nextDay]) return;
    const predicted = Math.round(pattern[nextDay]);
    const current   = Number(item.stock);
    if (!isNaN(current) && predicted > current) {
      predictedOrders.push({
        name: item.name,
        category: item.category,
        current,
        predicted,
        gap: predicted - current,
      });
    }
  });
  predictedOrders.sort((a, b) => b.gap - a.gap);

  // ── Likely to run out soon ───────────────────────────────────────────────
  const runOutSoon = [];
  latestItems.forEach((item) => {
    if (item.active === false) return;
    const key = countKey(item);
    const entries = itemHistMap[key] ?? [];
    const n = Number(item.stock);
    if (isNaN(n) || entries.length < 2) return;

    // Calculate average daily consumption (drop in stock per record)
    const nums = entries
      .map((e) => Number(e.stock))
      .filter((v) => !isNaN(v))
      .slice(0, 7);
    if (nums.length < 2) return;
    const drops = [];
    for (let i = 0; i < nums.length - 1; i++) {
      const diff = nums[i + 1] - nums[i]; // positive = restocked, negative = consumed
      if (diff < 0) drops.push(Math.abs(diff));
    }
    if (!drops.length) return;
    const avgDrop = drops.reduce((a, b) => a + b, 0) / drops.length;
    if (avgDrop <= 0) return;
    const daysLeft = Math.floor(n / avgDrop);
    if (daysLeft <= 3 && n > 0) {
      runOutSoon.push({ name: item.name, category: item.category, stock: n, daysLeft, avgDrop: avgDrop.toFixed(1) });
    }
  });
  runOutSoon.sort((a, b) => a.daysLeft - b.daysLeft);

  // ── Weekend/holiday demand surge items ───────────────────────────────────
  const surgePicks = [];
  Object.entries(itemHistMap).forEach(([key, entries]) => {
    const weekdayNums = entries.filter((e) => !e.isWeekend && !e.isHoliday).map((e) => Number(e.stock)).filter((n) => !isNaN(n));
    const weekendNums = entries.filter((e) => e.isWeekend || e.isHoliday).map((e) => Number(e.stock)).filter((n) => !isNaN(n));
    if (weekdayNums.length < 2 || weekendNums.length < 1) return;
    const wdAvg = weekdayNums.reduce((a, b) => a + b, 0) / weekdayNums.length;
    const weAvg = weekendNums.reduce((a, b) => a + b, 0) / weekendNums.length;
    if (weAvg > wdAvg * 1.25) {
      const [, name] = key.split("||");
      const item = latestItems.find((i) => i.name === name);
      surgePicks.push({ name, category: item?.category ?? "", surgeRatio: ((weAvg / wdAvg) - 1) * 100 });
    }
  });
  surgePicks.sort((a, b) => b.surgeRatio - a.surgeRatio).splice(6);

  // ── Day-specific pattern insights ────────────────────────────────────────
  const dayInsights = [];
  const targetDows = ["Fri","Sat","Sun"];
  targetDows.forEach((dow) => {
    const highItems = [];
    Object.entries(dowPatterns).forEach(([key, pattern]) => {
      if (!pattern[dow]) return;
      const allAvg = Object.values(pattern).reduce((a, b) => a + b, 0) / Object.values(pattern).length;
      if (pattern[dow] > allAvg * 1.3) {
        const [, name] = key.split("||");
        highItems.push({ name, avg: pattern[dow].toFixed(1) });
      }
    });
    if (highItems.length) {
      dayInsights.push({ dow, items: highItems.slice(0, 4) });
    }
  });

  const dowFull = { Mon:"Monday", Tue:"Tuesday", Wed:"Wednesday", Thu:"Thursday", Fri:"Friday", Sat:"Saturday", Sun:"Sunday" };

  return (
    <div className="page-enter" style={{ paddingBottom: "24px" }}>

      {/* ── Context banner ── */}
      <div style={{
        background: isNextHoliday ? "var(--red-100)" : isNextWeekend ? "var(--amber-100)" : "var(--blue-100)",
        border: `1px solid ${isNextHoliday ? "var(--red-500)" : isNextWeekend ? "var(--amber-500)" : "var(--blue-500)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "12px 14px",
        marginBottom: "20px",
        display: "flex", alignItems: "flex-start", gap: "10px",
      }}>
        <span style={{ fontSize: "20px" }}>
          {isNextHoliday ? "🎉" : isNextWeekend ? "🏖️" : "📅"}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>
            Tomorrow is {dowFull[nextDay]}
            {isNextHoliday ? " · Public Holiday" : isNextWeekend ? " · Weekend" : ""}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px" }}>
            {isNextHoliday || isNextWeekend
              ? "Higher demand expected — check surge items below."
              : "Regular weekday. Predictions based on historical patterns."}
          </div>
        </div>
      </div>

      {/* ── Upcoming holiday alert ── */}
      {upcomingHoliday && (
        <div style={{
          background: "var(--amber-50)",
          border: "1px solid var(--amber-500)",
          borderRadius: "var(--radius-lg)",
          padding: "10px 14px",
          marginBottom: "20px",
          fontSize: "12px",
          display: "flex", alignItems: "center", gap: "8px",
        }}>
          <span style={{ fontSize: "16px" }}>🗓️</span>
          <div>
            <span style={{ fontWeight: 700, color: "var(--amber-500)" }}>{upcomingHoliday.name}</span>
            <span style={{ color: "var(--text-secondary)" }}> in {upcomingHoliday.daysAway} days ({upcomingHoliday.date})</span>
            <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "1px" }}>
              Stock up on high-demand items before this date.
            </div>
          </div>
        </div>
      )}

      {/* ── Predicted next order ── */}
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel right={
          <Badge color="var(--brown-700)" bg="var(--brown-100)">{dowFull[nextDay]}</Badge>
        }>
          📋 Predicted Next Order
        </SectionLabel>

        {predictedOrders.length === 0 ? (
          <div style={{ fontSize: "12px", color: "var(--text-muted)", padding: "10px 2px" }}>
            Not enough pattern data yet for {dowFull[nextDay]}.
          </div>
        ) : (
          <Card>
            {predictedOrders.slice(0, 8).map((item, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px",
                borderBottom: idx < Math.min(predictedOrders.length, 8) - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.category}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    now <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>{item.current}</span>
                    {" → "}
                    need <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--brown-500)" }}>{item.predicted}</span>
                  </div>
                  <Badge color="var(--amber-500)" bg="var(--amber-100)">+{item.gap} to order</Badge>
                </div>
              </div>
            ))}
          </Card>
        )}
      </div>

      {/* ── Likely to run out ── */}
      {runOutSoon.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel>🚨 Likely To Run Out Soon</SectionLabel>
          <Card>
            {runOutSoon.slice(0, 6).map((item, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 14px",
                background: item.daysLeft <= 1 ? "var(--red-50)" : "transparent",
                borderBottom: idx < runOutSoon.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{ fontSize: "16px" }}>{item.daysLeft <= 1 ? "🔴" : "🟠"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: item.daysLeft <= 1 ? "var(--red-600)" : "var(--text-primary)" }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                    avg usage: {item.avgDrop}/save · stock: {item.stock}
                  </div>
                </div>
                <Badge
                  color={item.daysLeft <= 1 ? "var(--red-600)" : "var(--amber-500)"}
                  bg={item.daysLeft <= 1 ? "var(--red-100)" : "var(--amber-100)"}
                >
                  ~{item.daysLeft}d left
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── Weekend/holiday surge items ── */}
      {surgePicks.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel>🏖️ Weekend / Holiday Surge Items</SectionLabel>
          <Card>
            {surgePicks.map((item, idx) => (
              <div key={idx} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 14px",
                borderBottom: idx < surgePicks.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)" }}>{item.name}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{item.category}</div>
                </div>
                <Badge color="var(--green-600)" bg="var(--green-100)">
                  +{Math.round(item.surgeRatio)}% on weekends
                </Badge>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ── Day-specific patterns ── */}
      {dayInsights.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel>📊 Day-Specific Patterns</SectionLabel>
          {dayInsights.map((insight, i) => (
            <div key={i} style={{ marginBottom: "10px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "4px", paddingLeft: "2px" }}>
                {dowFull[insight.dow]}
              </div>
              <Card>
                {insight.items.map((item, idx) => (
                  <div key={idx} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "8px 14px",
                    borderBottom: idx < insight.items.length - 1 ? "1px solid var(--border)" : "none",
                    fontSize: "12px",
                  }}>
                    <span style={{ color: "var(--text-primary)" }}>{item.name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", color: "var(--brown-500)", fontWeight: 700 }}>
                      avg {item.avg}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center", padding: "8px" }}>
        Predictions based on {historyData.length} historical saves · Malaysia holidays included
      </div>
    </div>
  );
}
