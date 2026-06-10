import { useState } from "react";
import { checkNotifications, sendTestPush } from "../services/notificationService";
import { getPendingReservationAlerts } from "../services/reservationService";
import { getPendingReminderAlerts } from "../services/reminderService";

// ─── Utility ───────────────────────────────────────────────────────────────────
function LogLine({ type, text }) {
  const colors = { info: "#1D9E75", warn: "#BA7517", error: "#A32D2D", muted: "#888" };
  return (
    <div style={{
      fontFamily: "monospace", fontSize: 12,
      color: colors[type] || colors.info,
      padding: "3px 0",
      borderBottom: "1px solid #f0f0f0",
    }}>
      [{type?.toUpperCase()}] {text}
    </div>
  );
}

function Section({ title, color = "#1D9E75", children }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee",
      borderTop: `3px solid ${color}`,
      borderRadius: 12, padding: "16px",
      marginBottom: 14,
    }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color }}>{title}</div>
      {children}
    </div>
  );
}

function Btn({ onClick, loading, label, loadingLabel, color = "#1D9E75" }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      width: "100%", padding: "12px", borderRadius: 10, border: "none",
      background: loading ? "#ddd" : color,
      color: loading ? "#aaa" : "#fff",
      fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer",
      marginBottom: 8,
    }}>
      {loading ? loadingLabel : label}
    </button>
  );
}

function fmt12h(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function DebugPage() {
  const [logs, setLogs] = useState([]);
  const [running, setRunning]   = useState(false);
  const [testing, setTesting]   = useState(false);
  const [loadingR, setLoadingR] = useState(false);
  const [loadingRm, setLoadingRm] = useState(false);
  const [pendingRes, setPendingRes]   = useState(null);
  const [pendingRem, setPendingRem]   = useState(null);

  function log(type, text) {
    setLogs(prev => [...prev, { type, text, ts: new Date().toLocaleTimeString() }]);
  }

  function clearLogs() { setLogs([]); }

  // ── Run full notification check ────────────────────────────────────────────
  async function handleRunCheck() {
    setRunning(true);
    log("info", "Starting checkNotifications()…");
    try {
      const result = await checkNotifications(30);
      log("info", `Reservations checked: ${result.reservationsChecked}, fired: ${result.reservationsFired}`);
      log("info", `Reminders checked: ${result.remindersChecked}, fired: ${result.remindersFired}`);
      if (result.errors.length) {
        result.errors.forEach(e => log("error", e));
      } else {
        log("info", "No errors.");
      }
    } catch (err) {
      log("error", err.message);
    } finally {
      setRunning(false);
    }
  }

  // ── Show pending reservations ──────────────────────────────────────────────
  async function handleShowPendingReservations() {
    setLoadingR(true);
    log("info", "Fetching pending reservations (within 30 min)…");
    try {
      const list = await getPendingReservationAlerts(30);
      setPendingRes(list);
      log("info", `Found ${list.length} pending reservation(s).`);
    } catch (err) {
      log("error", err.message);
    } finally {
      setLoadingR(false);
    }
  }

  // ── Show pending reminders ─────────────────────────────────────────────────
  async function handleShowPendingReminders() {
    setLoadingRm(true);
    log("info", "Fetching due reminders…");
    try {
      const list = await getPendingReminderAlerts();
      setPendingRem(list);
      log("info", `Found ${list.length} due reminder(s).`);
    } catch (err) {
      log("error", err.message);
    } finally {
      setLoadingRm(false);
    }
  }

  // ── Send test push ─────────────────────────────────────────────────────────
  async function handleTestPush() {
    setTesting(true);
    log("info", "Sending test push notification…");
    try {
      // Request permission if not yet granted
      if ("Notification" in window && Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        log(perm === "granted" ? "info" : "warn", `Permission: ${perm}`);
      }
      await sendTestPush();
      log("info", "Test push sent.");
    } catch (err) {
      log("error", err.message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Debug</h1>
        <span style={{
          background: "#FAEEDA", color: "#BA7517",
          fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99,
        }}>
          DEV ONLY
        </span>
      </div>
      <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>
        Local testing tools. Use before deploying to production.
      </p>

      {/* Action buttons */}
      <Section title="Notification Engine" color="#1D9E75">
        <Btn
          onClick={handleRunCheck}
          loading={running}
          label="▶  Run Notification Check"
          loadingLabel="Running…"
          color="#1D9E75"
        />
        <Btn
          onClick={handleTestPush}
          loading={testing}
          label="🔔  Send Test Push Notification"
          loadingLabel="Sending…"
          color="#5DCAA5"
        />
      </Section>

      <Section title="Inspect Pending Items" color="#185FA5">
        <Btn
          onClick={handleShowPendingReservations}
          loading={loadingR}
          label="📋  Show Pending Reservations"
          loadingLabel="Loading…"
          color="#185FA5"
        />
        {pendingRes !== null && (
          <div style={{ marginBottom: 12 }}>
            {pendingRes.length === 0
              ? <div style={{ fontSize: 13, color: "#888", textAlign: "center", padding: "10px 0" }}>No reservations due within 30 min</div>
              : pendingRes.map(r => (
                <div key={r.id} style={{
                  background: "#E6F1FB", borderRadius: 8, padding: "8px 12px",
                  marginBottom: 6, fontSize: 13,
                }}>
                  <strong>{r.customerName}</strong> · {r.pax} pax · {fmt12h(r.reservationTime)} on {r.reservationDate}
                  {r.notes && <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>{r.notes}</div>}
                </div>
              ))}
          </div>
        )}

        <Btn
          onClick={handleShowPendingReminders}
          loading={loadingRm}
          label="🔔  Show Pending Reminders"
          loadingLabel="Loading…"
          color="#534AB7"
        />
        {pendingRem !== null && (
          <div>
            {pendingRem.length === 0
              ? <div style={{ fontSize: 13, color: "#888", textAlign: "center", padding: "10px 0" }}>No reminders currently due</div>
              : pendingRem.map(r => (
                <div key={r.id} style={{
                  background: "#EEEDFE", borderRadius: 8, padding: "8px 12px",
                  marginBottom: 6, fontSize: 13,
                }}>
                  <strong>{r.title}</strong>
                  {r.description && <span style={{ color: "#555" }}> — {r.description}</span>}
                </div>
              ))}
          </div>
        )}
      </Section>

      {/* Log console */}
      <Section title="Console Log" color="#888">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <button onClick={clearLogs} style={{
            fontSize: 12, color: "#aaa", background: "none",
            border: "none", cursor: "pointer",
          }}>Clear</button>
        </div>
        <div style={{
          background: "#f8f8f8", borderRadius: 8, padding: 10,
          minHeight: 80, maxHeight: 220, overflowY: "auto",
          fontFamily: "monospace",
        }}>
          {logs.length === 0 && (
            <div style={{ color: "#ccc", fontSize: 12 }}>No activity yet. Run a check above.</div>
          )}
          {logs.map((l, i) => (
            <LogLine key={i} type={l.type} text={`${l.ts} ${l.text}`} />
          ))}
        </div>
      </Section>

      {/* Cron reminder */}
      <div style={{
        background: "#FAEEDA", border: "1px solid #FAC775",
        borderRadius: 12, padding: "14px 16px",
        fontSize: 13, color: "#633806",
      }}>
        <strong>Future: Vercel Cron Integration</strong><br />
        When ready, wire <code>api/check-notifications.js</code> to call <code>checkNotifications()</code> every 5 minutes.
        The service layer is already cron-ready — no changes needed to business logic.
      </div>
    </div>
  );
}
