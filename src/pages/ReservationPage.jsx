import { useState, useEffect } from "react";
import {
  addReservation,
  subscribeReservations,
  updateReservation,
  deleteReservation,
} from "../services/reservationService";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS = {
  confirmed:  { label: "Confirmed",  color: "#1D9E75", bg: "#E1F5EE" },
  completed:  { label: "Completed",  color: "#888780", bg: "#F1EFE8" },
  cancelled:  { label: "Cancelled",  color: "#A32D2D", bg: "#FCEBEB" },
};

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY = {
  customerName: "",
  phone: "",
  reservationDate: "",
  reservationTime: "",
  pax: "",
  notes: "",
  status: "confirmed",
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.confirmed;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 500,
      padding: "3px 8px",
      borderRadius: 99,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end",
      justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--bg, #fff)",
        width: "100%", maxWidth: 520,
        borderRadius: "16px 16px 0 0",
        padding: "24px 20px 32px",
        maxHeight: "92vh", overflowY: "auto",
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

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #ddd", borderRadius: 8,
  padding: "10px 12px", fontSize: 15,
  background: "inherit", color: "inherit",
};

// ─── Reservation form (add / edit) ─────────────────────────────────────────────
function ReservationForm({ initial = EMPTY, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.customerName || !form.reservationDate || !form.reservationTime || !form.pax) return;
    await onSave(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field label="Customer Name *">
        <input style={inputStyle} value={form.customerName}
          onChange={e => set("customerName", e.target.value)}
          placeholder="e.g. Kelvin" required />
      </Field>
      <Field label="Phone Number">
        <input style={inputStyle} value={form.phone}
          onChange={e => set("phone", e.target.value)}
          placeholder="e.g. 0123456789" type="tel" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Date *">
          <input style={inputStyle} value={form.reservationDate}
            onChange={e => set("reservationDate", e.target.value)}
            type="date" required />
        </Field>
        <Field label="Time *">
          <input style={inputStyle} value={form.reservationTime}
            onChange={e => set("reservationTime", e.target.value)}
            type="time" required />
        </Field>
      </div>
      <Field label="Pax *">
        <input style={inputStyle} value={form.pax}
          onChange={e => set("pax", e.target.value)}
          type="number" min={1} max={999} required placeholder="e.g. 4" />
      </Field>
      <Field label="Notes">
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
          value={form.notes} onChange={e => set("notes", e.target.value)}
          placeholder="Birthday, allergy, special request…" />
      </Field>
      <Field label="Status">
        <select style={inputStyle} value={form.status} onChange={e => set("status", e.target.value)}>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Field>
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button type="button" onClick={onCancel}
          style={{ ...inputStyle, cursor: "pointer", background: "#f1f1f1", border: "none" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving}
          style={{ ...inputStyle, cursor: "pointer", background: "#1D9E75", color: "#fff", border: "none", fontWeight: 600 }}>
          {saving ? "Saving…" : "Save Reservation"}
        </button>
      </div>
    </form>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ReservationPage() {
  const [reservations, setReservations] = useState([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);      // { id, ...data }
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // id to delete

  // Real-time subscription
  useEffect(() => {
    const unsub = subscribeReservations(setReservations);
    return unsub;
  }, []);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = reservations.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.customerName?.toLowerCase().includes(q) ||
      r.phone?.includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  });

  // ── CRUD handlers ──────────────────────────────────────────────────────────
  async function handleAdd(form) {
    setSaving(true);
    try { await addReservation(form); setShowAdd(false); }
    finally { setSaving(false); }
  }

  async function handleEdit(form) {
    setSaving(true);
    try {
      const { id, ...data } = { ...editing, ...form };
      await updateReservation(id, data);
      setEditing(null);
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    await deleteReservation(id);
    setConfirmDelete(null);
  }

  async function handleStatusChange(id, status) {
    await updateReservation(id, { status });
  }

  // ── Group by date for display ──────────────────────────────────────────────
  const grouped = filtered.reduce((acc, r) => {
    const key = r.reservationDate || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => a < b ? 1 : -1);

  function formatDate(dateStr) {
    if (!dateStr || dateStr === "Unknown") return "Unknown Date";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function fmt12h(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const s = h >= 12 ? "PM" : "AM";
    return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${s}`;
  }

  return (
    <div style={{ padding: "16px 16px 80px", maxWidth: 640, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Reservations</h1>
        <button onClick={() => setShowAdd(true)} style={{
          background: "#1D9E75", color: "#fff", border: "none",
          borderRadius: 10, padding: "9px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>
          + Add
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aaa", fontSize: 16 }}>🔍</span>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, notes…"
          style={{ ...inputStyle, paddingLeft: 36 }}
        />
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {Object.entries(STATUS).map(([key, s]) => {
          const count = reservations.filter(r => r.status === key).length;
          return (
            <div key={key} style={{
              flex: 1, background: s.bg, borderRadius: 10,
              padding: "8px 10px", textAlign: "center",
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{count}</div>
              <div style={{ fontSize: 11, color: s.color }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px", color: "#aaa" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 16 }}>{search ? "No results found" : "No reservations yet"}</div>
        </div>
      )}

      {/* Grouped reservation cards */}
      {sortedDates.map(date => (
        <div key={date} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {formatDate(date)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {grouped[date].map(r => (
              <div key={r.id} style={{
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 14,
                padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{r.customerName}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                      {fmt12h(r.reservationTime)} · {r.pax} pax
                      {r.phone ? ` · ${r.phone}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* Notes */}
                {r.notes && (
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 10, fontStyle: "italic" }}>
                    "{r.notes}"
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => setEditing(r)} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer",
                  }}>✏️ Edit</button>

                  {r.status !== "completed" && (
                    <button onClick={() => handleStatusChange(r.id, "completed")} style={{
                      fontSize: 12, padding: "6px 12px", borderRadius: 8,
                      border: "1px solid #9FE1CB", background: "#E1F5EE",
                      color: "#0F6E56", cursor: "pointer",
                    }}>✓ Complete</button>
                  )}

                  {r.status !== "cancelled" && r.status !== "completed" && (
                    <button onClick={() => handleStatusChange(r.id, "cancelled")} style={{
                      fontSize: 12, padding: "6px 12px", borderRadius: 8,
                      border: "1px solid #F7C1C1", background: "#FCEBEB",
                      color: "#A32D2D", cursor: "pointer",
                    }}>✗ Cancel</button>
                  )}

                  {r.phone && (
                    <a href={`https://wa.me/60${r.phone.replace(/^0/, "")}`}
                      target="_blank" rel="noreferrer" style={{
                        fontSize: 12, padding: "6px 12px", borderRadius: 8,
                        border: "1px solid #c5e8c5", background: "#edf7ed",
                        color: "#3B6D11", textDecoration: "none", cursor: "pointer",
                      }}>WhatsApp</a>
                  )}

                  <button onClick={() => setConfirmDelete(r.id)} style={{
                    fontSize: 12, padding: "6px 12px", borderRadius: 8,
                    border: "1px solid #eee", background: "none",
                    color: "#aaa", cursor: "pointer", marginLeft: "auto",
                  }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Add modal */}
      {showAdd && (
        <Modal title="New Reservation" onClose={() => setShowAdd(false)}>
          <ReservationForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </Modal>
      )}

      {/* Edit modal */}
      {editing && (
        <Modal title="Edit Reservation" onClose={() => setEditing(null)}>
          <ReservationForm
            initial={editing}
            onSave={handleEdit}
            onCancel={() => setEditing(null)}
            saving={saving}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <Modal title="Delete Reservation?" onClose={() => setConfirmDelete(null)}>
          <p style={{ color: "#666", marginBottom: 20 }}>This cannot be undone.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmDelete(null)} style={{ ...inputStyle, cursor: "pointer", background: "#f1f1f1", border: "none" }}>Cancel</button>
            <button onClick={() => handleDelete(confirmDelete)} style={{ ...inputStyle, cursor: "pointer", background: "#E24B4A", color: "#fff", border: "none", fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
