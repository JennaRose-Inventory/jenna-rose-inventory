import { useState } from "react";
import { Card, SectionLabel, Select, Input, PrimaryBtn } from "../components/UI.jsx";

export default function ManagePage({ items, setItems, allCategories, onToast }) {
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  const firstActive = items.find((i) => i.active !== false);
  const [editItem, setEditItem] = useState({
    category: firstActive?.category ?? allCategories[0],
    name: firstActive?.name ?? "",
    type: firstActive?.type ?? "quantity",
  });
  const [archiveSelect, setArchiveSelect] = useState({
    category: firstActive?.category ?? allCategories[0],
    name: firstActive?.name ?? "",
  });
  const [newItem, setNewItem] = useState({ category: allCategories[0], name: "", type: "quantity" });

  function itemsInCat(cat) {
    return items.filter((i) => i.active !== false && i.category === cat);
  }

  function addItem() {
    if (!newItem.name.trim()) return;
    if (items.find((i) => i.category === newItem.category && i.name === newItem.name.trim())) {
      onToast("Item already exists in this category", "error");
      return;
    }
    setItems([...items, { ...newItem, name: newItem.name.trim(), stock: "", active: true, days }]);
    setNewItem((prev) => ({ ...prev, name: "" }));
    onToast(`"${newItem.name}" added ✓`, "success");
  }

  function saveTypeChange() {
    const idx = items.findIndex((i) => i.category === editItem.category && i.name === editItem.name);
    if (idx === -1) return;
    const updated = [...items];
    updated[idx] = { ...updated[idx], type: editItem.type };
    setItems(updated);
    onToast(`"${editItem.name}" updated ✓`, "success");
  }

  function archiveItem() {
    if (!archiveSelect.name) return;
    const idx = items.findIndex((i) => i.category === archiveSelect.category && i.name === archiveSelect.name);
    if (idx === -1) return;
    const updated = [...items];
    updated[idx] = { ...updated[idx], active: false };
    setItems(updated);
    const next = items.find((i) => i.active !== false && i.category === archiveSelect.category && i.name !== archiveSelect.name);
    setArchiveSelect((prev) => ({ ...prev, name: next?.name ?? "" }));
    onToast(`"${archiveSelect.name}" archived`, "info");
  }

  const labelStyle = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "24px" }}>

      {/* ── Change input type ── */}
      <div>
        <SectionLabel>✏️ Change Input Type</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Switch an item between number count and Enough / Need Order.
          </div>
          <div style={labelStyle}>Category</div>
          <div style={{ marginBottom: "10px" }}>
            <Select
              value={editItem.category}
              onChange={(e) => {
                const cat = e.target.value;
                const first = itemsInCat(cat)[0];
                setEditItem({ category: cat, name: first?.name ?? "", type: first?.type ?? "quantity" });
              }}
            >
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>Item</div>
          <div style={{ marginBottom: "10px" }}>
            <Select
              value={editItem.name}
              onChange={(e) => {
                const name = e.target.value;
                const found = items.find((i) => i.category === editItem.category && i.name === name);
                setEditItem((prev) => ({ ...prev, name, type: found?.type ?? "quantity" }));
              }}
            >
              {itemsInCat(editItem.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>Input Type</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={editItem.type} onChange={(e) => setEditItem((p) => ({ ...p, type: e.target.value }))}>
              <option value="quantity">Number count</option>
              <option value="status">Enough / Need Order</option>
            </Select>
          </div>
          <PrimaryBtn onClick={saveTypeChange}>Save Change</PrimaryBtn>
        </Card>
      </div>

      {/* ── Add new item ── */}
      <div>
        <SectionLabel>➕ Add New Item</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={labelStyle}>Category</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>Item Name</div>
          <div style={{ marginBottom: "10px" }}>
            <Input
              placeholder="Type new item name…"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
          </div>
          <div style={labelStyle}>Input Type</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}>
              <option value="quantity">Number count</option>
              <option value="status">Enough / Need Order</option>
            </Select>
          </div>
          <PrimaryBtn onClick={addItem}>Add Item</PrimaryBtn>
        </Card>
      </div>

      {/* ── Archive item ── */}
      <div>
        <SectionLabel>🗃️ Archive Item</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Archived items are hidden from Count and Overview but kept in History.
          </div>
          <div style={labelStyle}>Category</div>
          <div style={{ marginBottom: "10px" }}>
            <Select
              value={archiveSelect.category}
              onChange={(e) => {
                const cat = e.target.value;
                const first = itemsInCat(cat)[0];
                setArchiveSelect({ category: cat, name: first?.name ?? "" });
              }}
            >
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>Item</div>
          <div style={{ marginBottom: "14px" }}>
            <Select
              value={archiveSelect.name}
              onChange={(e) => setArchiveSelect((p) => ({ ...p, name: e.target.value }))}
            >
              {itemsInCat(archiveSelect.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <PrimaryBtn
            danger
            onClick={() => {
              if (!archiveSelect.name) return;
              if (!window.confirm(`Archive "${archiveSelect.name}"?`)) return;
              archiveItem();
            }}
          >
            Archive Item
          </PrimaryBtn>
        </Card>
      </div>
    </div>
  );
}
