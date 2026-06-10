import { useState, useEffect } from "react";
import {
  addReminder,
  subscribeReminders,
  updateReminder,
  deleteReminder,
  markReminderComplete,
} from "../services/reminderService";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function toLocalDatetimeInputValue(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function friendlyTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-MY", {
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function isOverdue(ts) {
  if (!ts) return false;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d < new Date();
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff",
        width: "100%", maxWidth: 520,
        borderRadius: "16px 16px 0 0",
        padding: "24px 20px 32px",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22,
            cursor: "pointer", color: "#888", padding: 4, lineHeight: 1,
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #ddd", borderRadius: 8,
  padding: "10px 12px", fontSize: 15,
  background: "inherit", color: "inherit",
};

const EMPTY = { title: "", description: "", reminderAt: "" };

function ReminderForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    ...initial,
    reminderAt: toLocalDatetimeInputValue(initial.reminderAt) || initial.reminderAt || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <form onSubmit={async e => { e.preventDefault(); if (!form.title || !form.reminderAt) return; await onSave(form); }}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Title *</label>
        <input style={inputStyle} value={form.title}
          onChange={e => set("title", e.target.value)}
          placeholder="e.g. Buy Milk, Staff Meeting" required />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          value={form.description} onChange={e => set("description", e.target.value)}
          placeholder="Additional details…" />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>Remind at *</label>
        <input style={inputStyle} type="datetime-local"
          value={form.reminderAt} onChange={e => set("reminderAt", e.target.value)} required />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={onCancel}
          style={{ ...inputStyle, cursor: "pointer", background: "#f1f1f1", border: "none" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ ...inputStyle, cursor: "pointer", background: "#5DCAA5", color: "#fff", border: "none", fontWeight: 600 }}>
          {saving ? "Saving…" : "Save Reminder"}
        </button>
      </div>
    </form>
  );
}

// ─── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Done" },
  { key: "all", label: "All" },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ReminderPage() {
  const [reminders, setReminders] = useState([]);
  const [tab, setTab] = useState("upcoming");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    const unsub = subscribeReminders(setReminders);
    return unsub;
  }, []);

  const filtered = reminders.filter(r => {
    if (tab === "upcoming") return !r.completed;
    if (tab === "completed") return r.completed;
    return true;
  });

  async function handleAdd(form) {
    setSaving(true);
    try { await addReminder(form); setShowAdd(false); }
    finally { setSaving(false); }
  }

  async function handleEdit(form) {
    setSaving(true);
    try {
      const { id, ...data } = { ...editing, ...form };
      // clean up Firestore Timestamp field before overwriting
      delete data.createdAt;
      await updateReminder(id, data);
      setEditing(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    await deleteReminder(id);
    setConfirmDelete(null);
  }

  const upcomingCount = reminders.filter(r => !r.completed).length;
  const overdueCount  = reminders.filter(r => !r.completed && isOverdue(r.reminderAt)).length;

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reminders</h1>
        <button onClick={() => setShowAdd(true)} style={{
          background: "#5DCAA5", color: "#fff", border: "none",
          borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Add
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, background: "#E1F5EE", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1D9E75" }}>{upcomingCount}</div>
          <div style={{ fontSize: 11, color: "#1D9E75" }}>Upcoming</div>
        </div>
        <div style={{ flex: 1, background: "#FCEBEB", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#A32D2D" }}>{overdueCount}</div>
          <div style={{ fontSize: 11, color: "#A32D2D" }}>Overdue</div>
        </div>
        <div style={{ flex: 1, background: "#F1EFE8", borderRadius: 10, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#5F5E5A" }}>{reminders.filter(r => r.completed).length}</div>
          <div style={{ fontSize: 11, color: "#5F5E5A" }}>Done</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid #ddd",
            background: tab === t.key ? "#5DCAA5" : "#f5f5f5",
            color: tab === t.key ? "#fff" : "#666",
            fontWeight: tab === t.key ? 600 : 400,
            fontSize: 13, cursor: "pointer",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <div style={{ fontSize: 16 }}>
            {tab === "upcoming" ? "No upcoming reminders" : tab === "completed" ? "Nothing completed yet" : "No reminders"}
          </div>
        </div>
      )}

      {/* Reminder cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(r => {
          const overdue = !r.completed && isOverdue(r.reminderAt);
          return (
            <div key={r.id} style={{
              background: "#fff",
              border: `1px solid ${overdue ? "#F7C1C1" : "#eee"}`,
              borderLeft: `3px solid ${r.completed ? "#B4B2A9" : overdue ? "#E24B4A" : "#5DCAA5"}`,
              borderRadius: 12,
              padding: "14px 16px",
              opacity: r.completed ? 0.65 : 1,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                {/* Checkbox */}
                <button onClick={() => markReminderComplete(r.id, !r.completed)} style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `2px solid ${r.completed ? "#B4B2A9" : "#5DCAA5"}`,
                  background: r.completed ? "#B4B2A9" : "transparent",
                  cursor: "pointer", flexShrink: 0, marginTop: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                }}>
                  {r.completed ? "✓" : ""}
                </button>

                {/* Content */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 15,
                    textDecoration: r.completed ? "line-through" : "none",
                    color: r.completed ? "#aaa" : "inherit",
                  }}>
                    {r.title}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{r.description}</div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 4, color: overdue ? "#A32D2D" : "#999" }}>
                    {overdue && !r.completed ? "⚠️ " : "🕐 "}
                    {friendlyTime(r.reminderAt)}
                    {overdue && !r.completed ? " — overdue" : ""}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => setEditing(r)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, padding: 4, color: "#888",
                  }}>✏️</button>
                  <button onClick={() => setConfirmDelete(r.id)} style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 16, padding: 4, color: "#ccc",
                  }}>🗑</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add modal */}
      {showAdd && (
        <Modal title="New Reminder" onClose={() => setShowAdd(false)}>
          <ReminderForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit Reminder" onClose={() => setEditing(null)}>
          <ReminderForm
            initial={editing}
            onSave={handleEdit}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Delete Reminder?" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: "#666", marginBottom: 20 }}>This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)}
              style={{ ...inputStyle, cursor: "pointer", background: "#f1f1f1", border: "none" }}>Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)}
              style={{ ...inputStyle, cursor: "pointer", background: "#E24B4A", color: "#fff", border: "none", fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
