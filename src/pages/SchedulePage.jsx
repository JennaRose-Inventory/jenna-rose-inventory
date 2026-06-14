import { useState, useEffect } from "react";
import {
  addReservation, subscribeReservations,
  updateReservation, deleteReservation,
} from "../services/reservationService";
import {
  addReminder, subscribeReminders,
  updateReminder, deleteReminder, markReminderComplete,
} from "../services/reminderService";
import { db } from "../firebase";
import { collection, doc, setDoc, onSnapshot, orderBy, query } from "firebase/firestore";

// ─── 翻译 ──────────────────────────────────────────────────────────────────────
function useT(lang) {
  const isZH = lang === "zh";
  return {
    isZH,
    schedule:      isZH ? "操作"     : "Operations",
    reservations:  isZH ? "桌位预定" : "Reservations",
    reminders:     isZH ? "提醒"     : "Reminders",
    supplierRestock: isZH ? "供应商收货" : "Supplier Restock",
    markRestock:   isZH ? "标记收货" : "Mark Restock",
    lastRestock:   isZH ? "上次收货" : "Last restock",
    neverRestocked:isZH ? "从未记录" : "Never recorded",
    restockDate:   isZH ? "收货日期" : "Restock Date",
    confirmRestock:isZH ? "确认收货" : "Confirm",
    add:           isZH ? "+ 新增"   : "+ Add",
    search:        isZH ? "搜索姓名、电话、备注…" : "Search name, phone, notes…",
    confirmed:     isZH ? "已确认"   : "Confirmed",
    completed:     isZH ? "已完成"   : "Completed",
    cancelled:     isZH ? "已取消"   : "Cancelled",
    upcoming:      isZH ? "即将到来" : "Upcoming",
    overdue:       isZH ? "已逾期"   : "Overdue",
    done:          isZH ? "已完成"   : "Done",
    all:           isZH ? "全部"     : "All",
    noResults:     isZH ? "没有找到结果" : "No results found",
    noReservations:isZH ? "还没有预订" : "No reservations yet",
    noReminders:   isZH ? "没有提醒"  : "No reminders",
    noDone:        isZH ? "还没有完成的事项" : "Nothing completed yet",
    edit:          isZH ? "编辑"     : "Edit",
    complete:      isZH ? "完成"     : "Complete",
    cancel:        isZH ? "取消"     : "Cancel",
    delete:        isZH ? "删除"     : "Delete",
    deleteConfirm: isZH ? "确定删除？此操作无法撤销。" : "This cannot be undone.",
    newReservation:isZH ? "新增桌位预定" : "New Reservation",
    editReservation:isZH? "编辑预订" : "Edit Reservation",
    deleteReservation:isZH?"删除预订？":"Delete Reservation?",
    newReminder:   isZH ? "新增提醒" : "New Reminder",
    editReminder:  isZH ? "编辑提醒" : "Edit Reminder",
    deleteReminder:isZH ? "删除提醒？": "Delete Reminder?",
    saving:        isZH ? "保存中…"  : "Saving…",
    saveReservation:isZH? "保存预订" : "Save Reservation",
    saveReminder:  isZH ? "保存提醒" : "Save Reminder",
    cancelBtn:     isZH ? "取消"     : "Cancel",
    deleteBtn:     isZH ? "删除"     : "Delete",
    // form labels
    customerName:  isZH ? "客户姓名 *"   : "Customer Name *",
    phone:         isZH ? "电话号码"      : "Phone Number",
    date:          isZH ? "日期 *"        : "Date *",
    time:          isZH ? "时间 *"        : "Time *",
    pax:           isZH ? "人数 *"        : "Pax *",
    notes:         isZH ? "备注"          : "Notes",
    status:        isZH ? "状态"          : "Status",
    title:         isZH ? "标题 *"        : "Title *",
    description:   isZH ? "说明"          : "Description",
    remindAt:      isZH ? "提醒时间 *"    : "Remind at *",
    notesPlaceholder: isZH ? "生日、过敏、特殊要求…" : "Birthday, allergy, special request…",
    titlePlaceholder: isZH ? "例：买牛奶、员工会议" : "e.g. Buy Milk, Staff Meeting",
    descPlaceholder:  isZH ? "补充说明…"  : "Additional details…",
    overdueLabel:  isZH ? "— 已逾期"      : "— overdue",
    unknown:       isZH ? "未知日期"       : "Unknown Date",
  };
}

// ─── 状态颜色 ──────────────────────────────────────────────────────────────────
const STATUS_STYLE = {
  confirmed: { color: "#1D9E75", bg: "#E1F5EE" },
  completed: { color: "#888780", bg: "#F1EFE8" },
  cancelled: { color: "#A32D2D", bg: "#FCEBEB" },
};

// ─── 共用组件 ──────────────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid var(--border, #ddd)", borderRadius: 8,
  padding: "10px 12px", fontSize: 15,
  background: "var(--surface, inherit)", color: "var(--text-primary, inherit)",
};

function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg, #fff)",
        width: "100%", maxWidth: 520,
        borderRadius: "16px 16px 0 0",
        padding: "24px 20px 32px",
        maxHeight: "92vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 17, color: "var(--text-primary, #111)" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888", padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "var(--text-muted, #888)", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function StatPill({ count, label, color, bg }) {
  return (
    <div style={{ flex: 1, background: bg, borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{count}</div>
      <div style={{ fontSize: 11, color }}>{label}</div>
    </div>
  );
}

// ─── 预订表单 ──────────────────────────────────────────────────────────────────
const EMPTY_RES = { customerName: "", phone: "", reservationDate: "", reservationTime: "", pax: "", notes: "", status: "confirmed" };

function ReservationForm({ initial = EMPTY_RES, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={async e => { e.preventDefault(); if (!form.customerName || !form.reservationDate || !form.reservationTime || !form.pax) return; await onSave(form); }}>
      <Field label={t.customerName}>
        <input style={inputStyle} value={form.customerName} onChange={e => set("customerName", e.target.value)} placeholder="e.g. Kelvin" required />
      </Field>
      <Field label={t.phone}>
        <input style={inputStyle} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="e.g. 0123456789" type="tel" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label={t.date}><input style={inputStyle} value={form.reservationDate} onChange={e => set("reservationDate", e.target.value)} type="date" required /></Field>
        <Field label={t.time}><input style={inputStyle} value={form.reservationTime} onChange={e => set("reservationTime", e.target.value)} type="time" required /></Field>
      </div>
      <Field label={t.pax}>
        <input style={inputStyle} value={form.pax} onChange={e => set("pax", e.target.value)} type="number" min={1} max={999} required placeholder="e.g. 4" />
      </Field>
      <Field label={t.notes}>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder={t.notesPlaceholder} />
      </Field>
      <Field label={t.status}>
        <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="confirmed">{t.confirmed}</option>
          <option value="completed">{t.completed}</option>
          <option value="cancelled">{t.cancelled}</option>
        </select>
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ ...inputStyle, cursor: "pointer", background: "var(--surface2, #f1f1f1)", border: "none" }}>{t.cancelBtn}</button>
        <button type="submit" disabled={saving} style={{ ...inputStyle, cursor: "pointer", background: "#1D9E75", color: "#fff", border: "none", fontWeight: 600 }}>
          {saving ? t.saving : t.saveReservation}
        </button>
      </div>
    </form>
  );
}

// ─── 提醒表单 ──────────────────────────────────────────────────────────────────
const EMPTY_REM = { title: "", description: "", reminderAt: "" };

function toLocalDT(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReminderForm({ initial = EMPTY_REM, onSave, onCancel, saving, t }) {
  const [form, setForm] = useState({ ...initial, reminderAt: toLocalDT(initial.reminderAt) || initial.reminderAt || "" });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={async e => { e.preventDefault(); if (!form.title || !form.reminderAt) return; await onSave(form); }}>
      <Field label={t.title}>
        <input style={inputStyle} value={form.title} onChange={e => set("title", e.target.value)} placeholder={t.titlePlaceholder} required />
      </Field>
      <Field label={t.description}>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }} value={form.description} onChange={e => set("description", e.target.value)} placeholder={t.descPlaceholder} />
      </Field>
      <Field label={t.remindAt}>
        <input style={inputStyle} type="datetime-local" value={form.reminderAt} onChange={e => set("reminderAt", e.target.value)} required />
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button type="button" onClick={onCancel} style={{ ...inputStyle, cursor: "pointer", background: "var(--surface2, #f1f1f1)", border: "none" }}>{t.cancelBtn}</button>
        <button type="submit" disabled={saving} style={{ ...inputStyle, cursor: "pointer", background: "#534AB7", color: "#fff", border: "none", fontWeight: 600 }}>
          {saving ? t.saving : t.saveReminder}
        </button>
      </div>
    </form>
  );
}

// ─── 主页面 ────────────────────────────────────────────────────────────────────
export default function SchedulePage({ lang = "en", suppliers = {}, freshMap = {}, onFreshDate }) {
  const t = useT(lang);
  const [section, setSection] = useState("reservations"); // "reservations" | "reminders"

  // ── 预订 state ──
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddRes, setShowAddRes] = useState(false);
  const [editingRes, setEditingRes] = useState(null);
  const [confirmDelRes, setConfirmDelRes] = useState(null);

  // ── 提醒 state ──
  const [reminders, setReminders] = useState([]);
  const [remTab, setRemTab] = useState("upcoming");
  const [showAddRem, setShowAddRem] = useState(false);
  const [editingRem, setEditingRem] = useState(null);
  const [confirmDelRem, setConfirmDelRem] = useState(null);

  const [saving, setSaving] = useState(false);
  const [restockModal, setRestockModal] = useState(null); // { supplierName }
  const [supplierFreshMap, setSupplierFreshMap] = useState({}); // { supplierName: "DD/MM/YYYY" }

  // Listen to supplier restock dates from Firestore
  useEffect(() => {
    const q = query(collection(db, "freshDates"));
    const unsub = onSnapshot(q, snap => {
      const map = {};
      snap.docs.forEach(d => {
        const key = d.id;
        if (key.startsWith("supplier__")) {
          const name = key.replace("supplier__", "");
          map[name] = d.data().date;
        }
      });
      setSupplierFreshMap(map);
    });
    return unsub;
  }, []);

  async function handleSupplierRestock(supplierName, dateStr) {
    const key = `supplier__${supplierName}`;
    await setDoc(doc(db, "freshDates", key), { date: dateStr, supplierName });
    setRestockModal(null);
  }

  useEffect(() => { const u = subscribeReservations(setReservations); return u; }, []);
  useEffect(() => { const u = subscribeReminders(setReminders); return u; }, []);

  // ── 预订 helpers ──
  const filteredRes = reservations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.customerName?.toLowerCase().includes(q) || r.phone?.includes(q) || r.notes?.toLowerCase().includes(q);
  });

  const grouped = filteredRes.reduce((acc, r) => {
    const key = r.reservationDate || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => a < b ? 1 : -1);

  function formatDate(dateStr) {
    if (!dateStr || dateStr === "Unknown") return t.unknown;
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(t.isZH ? "zh-MY" : "en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function fmt12h(time) {
    if (!time) return "";
    const [h, m] = time.split(":").map(Number);
    return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
  }

  function friendlyTime(ts) {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString(t.isZH ? "zh-MY" : "en-MY", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  }

  function isOverdue(ts) {
    if (!ts) return false;
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d < new Date();
  }

  // ── 预订 CRUD ──
  async function handleAddRes(form) { setSaving(true); try { await addReservation(form); setShowAddRes(false); } finally { setSaving(false); } }
  async function handleEditRes(form) {
    setSaving(true);
    try { const { id, ...data } = { ...editingRes, ...form }; await updateReservation(id, data); setEditingRes(null); }
    finally { setSaving(false); }
  }
  async function handleDelRes(id) { await deleteReservation(id); setConfirmDelRes(null); }
  async function handleStatusChange(id, status) { await updateReservation(id, { status }); }

  // ── 提醒 CRUD ──
  async function handleAddRem(form) { setSaving(true); try { await addReminder(form); setShowAddRem(false); } finally { setSaving(false); } }
  async function handleEditRem(form) {
    setSaving(true);
    try {
      const { id, ...data } = { ...editingRem, ...form };
      delete data.createdAt;
      await updateReminder(id, data);
      setEditingRem(null);
    } finally { setSaving(false); }
  }
  async function handleDelRem(id) { await deleteReminder(id); setConfirmDelRem(null); }

  const filteredRem = reminders.filter(r => {
    if (remTab === "upcoming") return !r.completed;
    if (remTab === "completed") return r.completed;
    return true;
  });
  const upcomingCount = reminders.filter(r => !r.completed).length;
  const overdueCount  = reminders.filter(r => !r.completed && isOverdue(r.reminderAt)).length;

  // ── STATUS label helper ──
  function statusLabel(s) {
    if (s === "confirmed") return t.confirmed;
    if (s === "completed") return t.completed;
    if (s === "cancelled") return t.cancelled;
    return s;
  }

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 640, margin: "0 auto" }}>

      {/* ── 顶部切换 ── */}
      <div style={{ display: "flex", background: "var(--surface2, #f5f5f5)", borderRadius: 12, padding: 4, marginBottom: 20, gap: 4 }}>
        <button onClick={() => setSection("reservations")} style={{
          flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
          background: section === "reservations" ? "#1D9E75" : "transparent",
          color: section === "reservations" ? "#fff" : "var(--text-muted, #888)",
          fontWeight: section === "reservations" ? 700 : 500, fontSize: 14,
          transition: "all 0.15s",
        }}>
          📋 {t.reservations}
        </button>
        <button onClick={() => setSection("reminders")} style={{
          flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
          background: section === "reminders" ? "#534AB7" : "transparent",
          color: section === "reminders" ? "#fff" : "var(--text-muted, #888)",
          fontWeight: section === "reminders" ? 700 : 500, fontSize: 14,
          transition: "all 0.15s",
        }}>
          🔔 {t.reminders}
        </button>
        <button onClick={() => setSection("restock")} style={{
          flex: 1, padding: "10px 0", borderRadius: 9, border: "none", cursor: "pointer",
          background: section === "restock" ? "#3d2314" : "transparent",
          color: section === "restock" ? "#fff" : "var(--text-muted, #888)",
          fontWeight: section === "restock" ? 700 : 500, fontSize: 14,
          transition: "all 0.15s",
        }}>
          📦 {t.isZH ? "收货" : "Restock"}
        </button>
      </div>

      {/* ══════════════════════════════════════════════ 预订 ══ */}
      {section === "reservations" && (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary, #111)" }}>📋 {t.reservations}</div>
            <button onClick={() => setShowAddRes(true)} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {t.add}
            </button>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 14 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {Object.entries(STATUS_STYLE).map(([key, s]) => (
              <StatPill key={key} count={reservations.filter(r => r.status === key).length} label={statusLabel(key)} color={s.color} bg={s.bg} />
            ))}
          </div>

          {/* Empty */}
          {filteredRes.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div>{search ? t.noResults : t.noReservations}</div>
            </div>
          )}

          {/* Cards */}
          {sortedDates.map(date => (
            <div key={date} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {formatDate(date)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {grouped[date].map(r => {
                  const ss = STATUS_STYLE[r.status] || STATUS_STYLE.confirmed;
                  return (
                    <div key={r.id} style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #eee)", borderRadius: 14, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary, #111)" }}>{r.customerName}</div>
                          <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                            {fmt12h(r.reservationTime)} · {r.pax} {t.isZH ? "人" : "pax"}
                            {r.phone ? ` · ${r.phone}` : ""}
                          </div>
                        </div>
                        <span style={{ background: ss.bg, color: ss.color, fontSize: 11, fontWeight: 500, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
                          {statusLabel(r.status)}
                        </span>
                      </div>
                      {r.notes && <div style={{ fontSize: 13, color: "#666", marginBottom: 10, fontStyle: "italic" }}>"{r.notes}"</div>}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => setEditingRes(r)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border, #ddd)", background: "var(--surface2, #f7f7f7)", cursor: "pointer", color: "var(--text-primary, #111)" }}>✏️ {t.edit}</button>
                        {r.status !== "completed" && (
                          <button onClick={() => handleStatusChange(r.id, "completed")} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #9FE1CB", background: "#E1F5EE", color: "#0F6E56", cursor: "pointer" }}>✓ {t.complete}</button>
                        )}
                        {r.status !== "cancelled" && r.status !== "completed" && (
                          <button onClick={() => handleStatusChange(r.id, "cancelled")} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #F7C1C1", background: "#FCEBEB", color: "#A32D2D", cursor: "pointer" }}>✗ {t.cancel}</button>
                        )}
                        {r.phone && (
                          <a href={`https://wa.me/60${r.phone.replace(/^0/,"")}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid #c5e8c5", background: "#edf7ed", color: "#3B6D11", textDecoration: "none" }}>WhatsApp</a>
                        )}
                        <button onClick={() => setConfirmDelRes(r.id)} style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border, #eee)", background: "none", color: "#aaa", cursor: "pointer", marginLeft: "auto" }}>🗑</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ══════════════════════════════════════════════ 提醒 ══ */}
      {section === "reminders" && (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary, #111)" }}>🔔 {t.reminders}</div>
            <button onClick={() => setShowAddRem(true)} style={{ background: "#534AB7", color: "#fff", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              {t.add}
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <StatPill count={upcomingCount} label={t.upcoming} color="#1D9E75" bg="#E1F5EE" />
            <StatPill count={overdueCount}  label={t.overdue}  color="#A32D2D" bg="#FCEBEB" />
            <StatPill count={reminders.filter(r => r.completed).length} label={t.done} color="#5F5E5A" bg="#F1EFE8" />
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {[["upcoming", t.upcoming], ["completed", t.done], ["all", t.all]].map(([key, label]) => (
              <button key={key} onClick={() => setRemTab(key)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: `1px solid ${remTab === key ? "#534AB7" : "var(--border, #ddd)"}`,
                background: remTab === key ? "#534AB7" : "var(--surface2, #f5f5f5)",
                color: remTab === key ? "#fff" : "var(--text-muted, #666)",
                fontWeight: remTab === key ? 600 : 400, fontSize: 13, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {/* Empty */}
          {filteredRem.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
              <div>{remTab === "upcoming" ? t.noReminders : remTab === "completed" ? t.noDone : t.noReminders}</div>
            </div>
          )}

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredRem.map(r => {
              const overdue = !r.completed && isOverdue(r.reminderAt);
              return (
                <div key={r.id} style={{
                  background: "var(--surface, #fff)",
                  border: `1px solid ${overdue ? "#F7C1C1" : "var(--border, #eee)"}`,
                  borderLeft: `3px solid ${r.completed ? "#B4B2A9" : overdue ? "#E24B4A" : "#534AB7"}`,
                  borderRadius: 12, padding: "14px 16px",
                  opacity: r.completed ? 0.65 : 1,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <button onClick={() => markReminderComplete(r.id, !r.completed)} style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${r.completed ? "#B4B2A9" : "#534AB7"}`,
                      background: r.completed ? "#B4B2A9" : "transparent",
                      cursor: "pointer", flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                    }}>{r.completed ? "✓" : ""}</button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, textDecoration: r.completed ? "line-through" : "none", color: r.completed ? "#aaa" : "var(--text-primary, #111)" }}>
                        {r.title}
                      </div>
                      {r.description && <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{r.description}</div>}
                      <div style={{ fontSize: 12, marginTop: 4, color: overdue ? "#A32D2D" : "#999" }}>
                        {overdue && !r.completed ? "⚠️ " : "🕐 "}
                        {friendlyTime(r.reminderAt)}
                        {overdue && !r.completed ? t.overdueLabel : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => setEditingRem(r)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, color: "#888" }}>✏️</button>
                      <button onClick={() => setConfirmDelRem(r.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: 4, color: "#ccc" }}>🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════ 收货 ══ */}
      {section === "restock" && (() => {
        const supplierNames = Object.keys(suppliers);
        return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary, #111)" }}>📦 {t.isZH ? "供应商收货记录" : "Supplier Restock"}</div>
            </div>
            {supplierNames.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <div>{t.isZH ? "没有供应商" : "No suppliers found"}</div>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {supplierNames.map((name, i) => {
                const lastDate = supplierFreshMap[name];
                const isToday = (() => {
                  if (!lastDate) return false;
                  const [d, m, y] = lastDate.split("/").map(Number);
                  const now = new Date();
                  return d === now.getDate() && m === now.getMonth()+1 && y === now.getFullYear();
                })();
                const isYesterday = (() => {
                  if (!lastDate) return false;
                  const [d, m, y] = lastDate.split("/").map(Number);
                  const yest = new Date(); yest.setDate(yest.getDate()-1);
                  return d === yest.getDate() && m === yest.getMonth()+1 && y === yest.getFullYear();
                })();
                const dateLabel = !lastDate
                  ? (t.isZH ? "从未记录" : "Never recorded")
                  : isToday
                  ? (t.isZH ? "今天收货" : "Today")
                  : isYesterday
                  ? (t.isZH ? "昨天收货" : "Yesterday")
                  : (t.isZH ? `收货 ${lastDate}` : lastDate);
                return (
                  <div key={i} style={{
                    background: "var(--surface, #fff)",
                    border: "1px solid var(--border, #eee)",
                    borderLeft: `3px solid ${isToday ? "#1D9E75" : lastDate ? "var(--brand-light, #b8896a)" : "var(--border, #eee)"}`,
                    borderRadius: 12, padding: "14px 16px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary, #111)" }}>{name}</div>
                      <div style={{ fontSize: 12, color: isToday ? "#1D9E75" : "var(--text-muted, #888)", marginTop: 3 }}>
                        {isToday ? "✓ " : "🕐 "}{dateLabel}
                      </div>
                    </div>
                    <button
                      onClick={() => setRestockModal({ supplierName: name, currentDate: lastDate })}
                      style={{
                        fontSize: 12, padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${isToday ? "#9FE1CB" : "var(--border, #ddd)"}`,
                        background: isToday ? "#E1F5EE" : "var(--surface2, #f7f7f7)",
                        color: isToday ? "#0F6E56" : "var(--text-primary, #111)",
                        fontWeight: 500, whiteSpace: "nowrap",
                      }}>
                      {isToday ? (t.isZH ? "已收货 ✓" : "Done ✓") : (t.isZH ? "标记收货" : "Mark Restock")}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}

      {/* ── Restock date modal ── */}
      {restockModal && (() => {
        const today = new Date();
        const pad = n => String(n).padStart(2,"0");
        const todayVal = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
        return (
          <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={() => setRestockModal(null)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"var(--bg,#fff)", width:"100%", maxWidth:520, borderRadius:"16px 16px 0 0", padding:"24px 20px 32px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <span style={{ fontWeight:600, fontSize:17 }}>📦 {restockModal.supplierName}</span>
                <button onClick={() => setRestockModal(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888" }}>×</button>
              </div>
              {restockModal.currentDate && (
                <div style={{ fontSize:12, color:"var(--text-muted,#888)", marginBottom:12 }}>
                  {t.isZH ? `上次收货：${restockModal.currentDate}` : `Last restock: ${restockModal.currentDate}`}
                </div>
              )}
              <div style={{ fontSize:12, color:"var(--text-muted,#888)", marginBottom:8 }}>{t.isZH ? "收货日期" : "Restock Date"}</div>
              <input
                type="date"
                defaultValue={todayVal}
                id="supplier-restock-date"
                style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", borderRadius:8, border:"1.5px solid var(--border,#ddd)", fontSize:15, marginBottom:18, background:"var(--surface2,#f5f5f5)", color:"var(--text-primary,#111)" }}
              />
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => setRestockModal(null)} style={{ flex:1, padding:12, borderRadius:10, border:"1.5px solid var(--border,#ddd)", background:"var(--surface2,#f5f5f5)", fontSize:14, cursor:"pointer" }}>
                  {t.cancelBtn}
                </button>
                <button onClick={() => {
                  const input = document.getElementById("supplier-restock-date");
                  if (!input?.value) return;
                  const [y,m,d] = input.value.split("-");
                  handleSupplierRestock(restockModal.supplierName, `${d}/${m}/${y}`);
                }} style={{ flex:1, padding:12, borderRadius:10, background:"#3d2314", color:"#fff", fontSize:14, fontWeight:600, border:"none", cursor:"pointer" }}>
                  {t.isZH ? "确认收货" : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modals 预订 ── */}}
      {showAddRes && <Modal title={t.newReservation} onClose={() => setShowAddRes(false)}><ReservationForm onSave={handleAddRes} onCancel={() => setShowAddRes(false)} saving={saving} t={t} /></Modal>}
      {editingRes && <Modal title={t.editReservation} onClose={() => setEditingRes(null)}><ReservationForm initial={editingRes} onSave={handleEditRes} onCancel={() => setEditingRes(null)} saving={saving} t={t} /></Modal>}
      {confirmDelRes && (
        <Modal title={t.deleteReservation} onClose={() => setConfirmDelRes(null)}>
          <p style={{ color: "#666", marginBottom: 20 }}>{t.deleteConfirm}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmDelRes(null)} style={{ ...inputStyle, cursor: "pointer", background: "var(--surface2, #f1f1f1)", border: "none" }}>{t.cancelBtn}</button>
            <button onClick={() => handleDelRes(confirmDelRes)} style={{ ...inputStyle, cursor: "pointer", background: "#E24B4A", color: "#fff", border: "none", fontWeight: 600 }}>{t.deleteBtn}</button>
          </div>
        </Modal>
      )}

      {/* ── Modals 提醒 ── */}
      {showAddRem && <Modal title={t.newReminder} onClose={() => setShowAddRem(false)}><ReminderForm onSave={handleAddRem} onCancel={() => setShowAddRem(false)} saving={saving} t={t} /></Modal>}
      {editingRem && <Modal title={t.editReminder} onClose={() => setEditingRem(null)}><ReminderForm initial={editingRem} onSave={handleEditRem} onCancel={() => setEditingRem(null)} saving={saving} t={t} /></Modal>}
      {confirmDelRem && (
        <Modal title={t.deleteReminder} onClose={() => setConfirmDelRem(null)}>
          <p style={{ color: "#666", marginBottom: 20 }}>{t.deleteConfirm}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmDelRem(null)} style={{ ...inputStyle, cursor: "pointer", background: "var(--surface2, #f1f1f1)", border: "none" }}>{t.cancelBtn}</button>
            <button onClick={() => handleDelRem(confirmDelRem)} style={{ ...inputStyle, cursor: "pointer", background: "#E24B4A", color: "#fff", border: "none", fontWeight: 600 }}>{t.deleteBtn}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
