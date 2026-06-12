import { useMemo } from "react";
import { isLowStock, lowStockTrend, buildItemHistoryMap, countKey } from "../utils/helpers.js";
import { Card, SectionLabel } from "../components/UI.jsx";
import { subscribeReservations } from "../services/reservationService.js";
import { subscribeReminders }    from "../services/reminderService.js";
import { useState, useEffect }   from "react";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12h(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}

function todayStr() {
  const d = new Date();
  const pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function minutesUntil(dateStr, timeStr) {
  const dt = new Date(`${dateStr}T${timeStr}`);
  return Math.round((dt - new Date()) / 60000);
}

function isOverdue(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d < new Date();
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Section({ icon, title, badge, badgeColor = "#A32D2D", badgeBg = "#FCEBEB", children }) {
  return (
    <div style={{
      background: "var(--surface, #fff)",
      border: "0.5px solid var(--border, #eee)",
      borderRadius: 14,
      overflow: "hidden",
      marginBottom: 10,
    }}>
      <div style={{ padding: "10px 14px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted, #888)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>{icon}</span> {title}
        </div>
        {badge !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: badgeBg, color: badgeColor }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ children, highlight }) {
  return (
    <div style={{
      padding: "9px 14px",
      borderTop: "0.5px solid var(--border, #eee)",
      display: "flex", alignItems: "center", gap: 10,
      background: highlight || "transparent",
    }}>
      {children}
    </div>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 99, background: bg, color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function StatBox({ val, label, color }) {
  return (
    <div style={{ flex: 1, background: "var(--surface2, #f5f5f5)", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 20, fontWeight: 500, color }}>{val}</div>
      <div style={{ fontSize: 10, color: "var(--text-muted, #888)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function NewDashboardPage({ t, historyData = [], items = [], isLoading }) {
  const isZH = t?.appSub === "库存系统";

  const [reservations, setReservations] = useState([]);
  const [reminders,    setReminders]    = useState([]);

  useEffect(() => { const u = subscribeReservations(setReservations); return u; }, []);
  useEffect(() => { const u = subscribeReminders(setReminders);    return u; }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading && historyData.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
        {[100, 140, 120, 100, 80].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 14, background: "var(--surface2, #f5f5f5)", animation: "pulse 1.5s ease infinite" }} />
        ))}
      </div>
    );
  }

  // ── Data ─────────────────────────────────────────────────────────────────────
  const activeItems  = items.filter(i => i.active !== false);
  const latestItems  = historyData[0]?.items ?? [];
  const itemHistMap  = useMemo(() => buildItemHistoryMap(historyData.slice(0, 14)), [historyData]);

  // 1. Need Attention
  const lowNow = latestItems.filter(isLowStock);

  const runOutSoon = useMemo(() => {
    const result = [];
    latestItems.forEach(item => {
      if (item.active === false) return;
      const key = countKey(item);
      const entries = itemHistMap[key] ?? [];
      const n = Number(item.stock);
      if (isNaN(n) || n <= 0 || entries.length < 2) return;
      const nums = entries.map(e => Number(e.stock)).filter(v => !isNaN(v)).slice(0, 7);
      if (nums.length < 2) return;
      const drops = [];
      for (let i = 0; i < nums.length - 1; i++) {
        const diff = nums[i+1] - nums[i];
        if (diff < 0) drops.push(Math.abs(diff));
      }
      if (!drops.length) return;
      const avgDrop = drops.reduce((a,b)=>a+b,0) / drops.length;
      if (avgDrop <= 0) return;
      const daysLeft = Math.floor(n / avgDrop);
      if (daysLeft <= 3) result.push({ name: item.name, category: item.category, stock: n, daysLeft });
    });
    return result.sort((a,b) => a.daysLeft - b.daysLeft);
  }, [latestItems, itemHistMap]);

  const chronicLow = useMemo(() => lowStockTrend(historyData.slice(0, 14), 5), [historyData]);

  // Combine attention items — deduplicate
  const attentionItems = useMemo(() => {
    const seen = new Set();
    const out = [];
    runOutSoon.forEach(r => {
      seen.add(r.name);
      out.push({ ...r, type: "runout" });
    });
    lowNow.forEach(item => {
      if (!seen.has(item.name)) {
        seen.add(item.name);
        out.push({ name: item.name, category: item.category, stock: item.stock, type: "low" });
      }
    });
    // Add chronic that aren't already listed
    chronicLow.slice(0, 3).forEach(c => {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        out.push({ name: c.name, category: c.category, count: c.count, type: "chronic" });
      }
    });
    return out.slice(0, 5);
  }, [runOutSoon, lowNow, chronicLow]);

  // 2. Today's Operations
  const today = todayStr();
  const todayRes = reservations.filter(r =>
    r.reservationDate === today && r.status !== "cancelled" && r.status !== "completed"
  ).sort((a,b) => a.reservationTime > b.reservationTime ? 1 : -1);

  const totalPax = todayRes.reduce((s,r) => s + (Number(r.pax)||0), 0);

  const nextRes = todayRes.find(r => minutesUntil(r.reservationDate, r.reservationTime) > 0);
  const nextMins = nextRes ? minutesUntil(nextRes.reservationDate, nextRes.reservationTime) : null;

  const activeReminders = reminders.filter(r => !r.completed);
  const overdueReminders = activeReminders.filter(r => isOverdue(r.reminderAt));
  const nextReminder = activeReminders
    .filter(r => !isOverdue(r.reminderAt))
    .sort((a,b) => {
      const da = a.reminderAt?.toDate ? a.reminderAt.toDate() : new Date(a.reminderAt);
      const db2 = b.reminderAt?.toDate ? b.reminderAt.toDate() : new Date(b.reminderAt);
      return da - db2;
    })[0];

  // 3. Suggested Orders
  const suggestedOrders = useMemo(() => {
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const tomorrow = days[new Date(Date.now() + 86400000).getDay()];
    const result = [];

    latestItems.forEach(item => {
      if (item.active === false) return;
      const key = countKey(item);
      const entries = itemHistMap[key] ?? [];
      const dowNums = entries
        .filter(e => e.dow === tomorrow)
        .map(e => Number(e.stock))
        .filter(v => !isNaN(v));
      if (dowNums.length < 2) return;
      const avg = dowNums.reduce((a,b)=>a+b,0) / dowNums.length;
      const current = Number(item.stock);
      if (isNaN(current)) return;
      const gap = Math.round(avg) - current;
      if (gap > 0) result.push({ name: item.name, category: item.category, current, gap });
    });

    return result.sort((a,b) => b.gap - a.gap).slice(0, 4);
  }, [latestItems, itemHistMap]);

  // 5. Health Score
  const totalActive = activeItems.length || 1;
  const lowCount    = lowNow.length;
  const chronicPenalty = Math.min(chronicLow.length * 2, 15);
  const healthScore = Math.max(0, Math.round(((totalActive - lowCount) / totalActive) * 100 - chronicPenalty));
  const healthColor = healthScore >= 85 ? "#1D9E75" : healthScore >= 60 ? "#BA7517" : "#A32D2D";
  const healthLabel = isZH
    ? (healthScore >= 85 ? "状态良好" : healthScore >= 60 ? "需要关注" : "情况较差")
    : (healthScore >= 85 ? "Good" : healthScore >= 60 ? "Needs attention" : "Poor");

  const noData = historyData.length === 0;

  return (
    <div style={{ paddingBottom: 24 }}>

      {/* ── 1. Need Attention ─────────────────────────────────────────── */}
      <Section
        icon="⚠️"
        title={isZH ? "需要注意" : "Need attention"}
        badge={attentionItems.length > 0 ? `${attentionItems.length} ${isZH ? "项" : "items"}` : (isZH ? "一切正常" : "All good")}
        badgeColor={attentionItems.length > 0 ? "#A32D2D" : "#0F6E56"}
        badgeBg={attentionItems.length > 0 ? "#FCEBEB" : "#E1F5EE"}
      >
        {attentionItems.length === 0 && (
          <Row>
            <span style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>
              {noData ? (isZH ? "暂无数据" : "No data yet") : (isZH ? "没有低库存货品 ✓" : "No low stock items ✓")}
            </span>
          </Row>
        )}
        {attentionItems.map((item, i) => (
          <Row key={i} highlight={i === 0 && item.type !== "chronic" ? "var(--red-50, #fff5f5)" : undefined}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: item.type === "chronic" ? "#EF9F27" : "#E24B4A" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 1 }}>
                {item.type === "runout"
                  ? (isZH ? `预计 ${item.daysLeft} 天用完` : `~${item.daysLeft} day${item.daysLeft === 1 ? "" : "s"} left`)
                  : item.type === "chronic"
                  ? (isZH ? `连续 ${item.count} 次低库存` : `Low ${item.count} times`)
                  : item.category}
              </div>
            </div>
            {item.type !== "chronic" && (
              <Pill
                label={isZH ? `库存 ${item.stock}` : `Stock ${item.stock}`}
                color="#A32D2D" bg="#FCEBEB"
              />
            )}
            {item.type === "chronic" && (
              <Pill label={isZH ? "慢性问题" : "Chronic"} color="#854F0B" bg="#FAEEDA" />
            )}
          </Row>
        ))}
      </Section>

      {/* ── 2. Today's Operations ─────────────────────────────────────── */}
      <Section icon="📅" title={isZH ? "今天的安排" : "Today"}>
        <div style={{ display: "flex", gap: 8, padding: "0 12px 10px" }}>
          <StatBox val={todayRes.length}   label={isZH ? "桌位预定" : "Reservations"} color="#185FA5" />
          <StatBox val={totalPax}          label={isZH ? "总人数"   : "Total pax"}     color="#185FA5" />
          <StatBox val={activeReminders.length} label={isZH ? "提醒待办" : "Reminders"} color={overdueReminders.length > 0 ? "#A32D2D" : "#854F0B"} />
        </div>

        {nextRes ? (
          <Row>
            <span style={{ fontSize: 14 }}>🕐</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>
                {isZH ? "下一个预定" : "Next reservation"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 1 }}>
                {fmt12h(nextRes.reservationTime)} · {nextRes.customerName} · {nextRes.pax} {isZH ? "人" : "pax"}
              </div>
            </div>
            <Pill
              label={nextMins <= 60
                ? (isZH ? `${nextMins}分钟后` : `${nextMins}min`)
                : (isZH ? `${Math.round(nextMins/60)}小时后` : `${Math.round(nextMins/60)}h`)}
              color="#185FA5" bg="#E6F1FB"
            />
          </Row>
        ) : (
          <Row>
            <span style={{ fontSize: 13, color: "var(--text-muted, #888)" }}>
              {isZH ? "今天没有预定" : "No reservations today"}
            </span>
          </Row>
        )}

        {overdueReminders.length > 0 && (
          <Row highlight="#FAEEDA">
            <span style={{ fontSize: 14 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>
                {overdueReminders[0].title}
              </div>
              <div style={{ fontSize: 11, color: "#854F0B", marginTop: 1 }}>
                {isZH ? "已逾期" : "Overdue"}
              </div>
            </div>
            <Pill label={isZH ? "待处理" : "Due"} color="#854F0B" bg="#FAEEDA" />
          </Row>
        )}

        {nextReminder && !overdueReminders.length && (
          <Row>
            <span style={{ fontSize: 14 }}>🔔</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>{nextReminder.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 1 }}>
                {(() => {
                  const d = nextReminder.reminderAt?.toDate ? nextReminder.reminderAt.toDate() : new Date(nextReminder.reminderAt);
                  return d.toLocaleString(isZH ? "zh-MY" : "en-MY", { month:"short", day:"numeric", hour:"numeric", minute:"2-digit", hour12:true });
                })()}
              </div>
            </div>
            <Pill label={isZH ? "即将到来" : "Upcoming"} color="#185FA5" bg="#E6F1FB" />
          </Row>
        )}
      </Section>

      {/* ── 3. Suggested Orders ───────────────────────────────────────── */}
      {suggestedOrders.length > 0 && (
        <Section icon="📦" title={isZH ? "建议补货" : "Suggested orders"}>
          {suggestedOrders.map((item, i) => (
            <Row key={i}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary, #111)" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 1 }}>
                  {isZH ? `现有 ${item.current}` : `Current: ${item.current}`}
                </div>
              </div>
              <Pill label={isZH ? `建议补 +${item.gap}` : `Order +${item.gap}`} color="#0F6E56" bg="#E1F5EE" />
            </Row>
          ))}
        </Section>
      )}

      {/* ── 4. Chronic Low Stock ──────────────────────────────────────── */}
      {chronicLow.length > 0 && (
        <Section icon="🔥" title={isZH ? "长期低库存" : "Frequently low"}>
          {chronicLow.slice(0, 5).map((item, i) => (
            <Row key={i}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: i === 0 ? "#A32D2D" : "var(--text-primary, #111)" }}>{item.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 1 }}>{item.category}</div>
              </div>
              <Pill
                label={isZH ? `${item.count} 次低库存` : `${item.count}× low`}
                color={i === 0 ? "#A32D2D" : "#854F0B"}
                bg={i === 0 ? "#FCEBEB" : "#FAEEDA"}
              />
            </Row>
          ))}
        </Section>
      )}

      {/* ── 5. Health Score ───────────────────────────────────────────── */}
      <Section icon="💚" title={isZH ? "库存健康度" : "Inventory health"}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 14px 14px" }}>
          {/* Ring */}
          <div style={{ position: "relative", width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="var(--border, #eee)" strokeWidth="6" />
              <circle cx="32" cy="32" r="26" fill="none"
                stroke={healthColor} strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 26 * healthScore / 100} ${2 * Math.PI * 26}`}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, color: healthColor }}>
              {healthScore}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary, #111)" }}>{healthLabel}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted, #888)", marginTop: 4 }}>
              {isZH
                ? `${totalActive - lowCount}/${totalActive} 项库存正常`
                : `${totalActive - lowCount}/${totalActive} items normal`}
            </div>
            {lowCount > 0 && (
              <div style={{ fontSize: 11, color: "#A32D2D", marginTop: 2 }}>
                {isZH ? `${lowCount} 项需要关注` : `${lowCount} need attention`}
              </div>
            )}
          </div>
        </div>
      </Section>

    </div>
  );
}
