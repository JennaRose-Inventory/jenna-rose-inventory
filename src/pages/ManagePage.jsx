import { useState } from "react";
import { Card, SectionLabel, Select, Input, PrimaryBtn } from "../components/UI.jsx";
import { validateContact } from "../utils/suppliers.js";

const EN_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

// ── Accordion row ─────────────────────────────────────────────────────────────
function Accordion({ icon, title, desc, open, onToggle, children }) {
  return (
    <div style={{
      background: "var(--surface)",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border)",
      overflow: "hidden",
      boxShadow: "var(--shadow-xs)",
    }}>
      {/* Header — always visible */}
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 16px", background: "none", border: "none",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{title}</div>
          {!open && desc && <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" }}>{desc}</div>}
        </div>
        <span style={{
          fontSize: "12px", color: "var(--text-faint)",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
          flexShrink: 0,
        }}>▾</span>
      </button>
      {/* Content */}
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ height: "14px" }} />
          {children}
        </div>
      )}
    </div>
  );
}

// ── Items section ─────────────────────────────────────────────────────────────
function ItemsSection({ t, items, setItems, allCategories, onToast }) {
  const isZH = t.appSub === "库存系统";
  const firstActive = items.find((i) => i.active !== false);
  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  // Only one accordion open at a time
  const [openSection, setOpenSection] = useState(null);
  function toggle(id) { setOpenSection(prev => prev === id ? null : id); }

  // Edit item state
  const [editItem, setEditItem] = useState({
    category: firstActive?.category ?? allCategories[0] ?? "",
    name:     firstActive?.name     ?? "",
    newName:  firstActive?.name     ?? "",
    type:     firstActive?.type     ?? "quantity",
  });

  // Add item state
  const [newItem, setNewItem] = useState({ category: allCategories[0] ?? "", name: "", type: "quantity" });

  // Archive state
  const [archiveSelect, setArchive] = useState({
    category: firstActive?.category ?? allCategories[0] ?? "",
    name:     firstActive?.name     ?? "",
  });

  function itemsInCat(cat) { return items.filter((i) => i.active !== false && i.category === cat); }

  function saveEditItem() {
    const idx = items.findIndex((i) => i.category === editItem.category && i.name === editItem.name);
    if (idx === -1) return;
    const trimmedName = editItem.newName.trim();
    if (!trimmedName) { onToast(isZH ? "名字不能为空" : "Name cannot be empty", "error"); return; }
    if (trimmedName !== editItem.name && items.find((i) => i.category === editItem.category && i.name === trimmedName)) {
      onToast(t.alreadyExists, "error"); return;
    }
    const updated = [...items];
    // Store _origName so lastMap can still find historical stock — fix #1 & #4
    const origName = updated[idx]._origName ?? editItem.name;
    updated[idx] = { ...updated[idx], name: trimmedName, type: editItem.type, _origName: origName };
    setItems(updated);
    setEditItem(p => ({ ...p, name: trimmedName, newName: trimmedName }));
    onToast(isZH ? `"${trimmedName}" 已更新 ✓` : `"${trimmedName}" updated ✓`, "success");
  }

  function addItem() {
    if (!newItem.name.trim()) return;
    if (items.find((i) => i.category === newItem.category && i.name === newItem.name.trim())) {
      onToast(t.alreadyExists, "error"); return;
    }
    setItems([...items, { ...newItem, name: newItem.name.trim(), stock: "", active: true, days: EN_DAYS }]);
    setNewItem((p) => ({ ...p, name: "" }));
    onToast(t.addedOk(newItem.name), "success");
  }

  function archiveItem() {
    const idx = items.findIndex((i) => i.category === archiveSelect.category && i.name === archiveSelect.name);
    if (idx === -1) return;
    const updated = [...items]; updated[idx] = { ...updated[idx], active: false };
    setItems(updated);
    const next = items.find((i) => i.active !== false && i.category === archiveSelect.category && i.name !== archiveSelect.name);
    setArchive((p) => ({ ...p, name: next?.name ?? "" }));
    onToast(t.archived(archiveSelect.name), "info");
  }

  const activeCount  = items.filter(i => i.active !== false).length;
  const catCount     = allCategories.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

      {/* Summary pill */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-faint)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "3px 10px" }}>
          {activeCount} {isZH ? "个活跃项目" : "active items"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-faint)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "3px 10px" }}>
          {catCount} {isZH ? "个分类" : "categories"}
        </div>
      </div>

      {/* ── Edit Item ── */}
      <Accordion
        icon="✏️"
        title={isZH ? "编辑项目" : "Edit Item"}
        desc={isZH ? "更改项目名称或输入类型" : "Rename or change input type"}
        open={openSection === "edit"}
        onToggle={() => toggle("edit")}
      >
        <div style={L}>{t.category}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={editItem.category} onChange={(e) => {
            const cat = e.target.value;
            const first = itemsInCat(cat)[0];
            setEditItem({ category: cat, name: first?.name ?? "", newName: first?.name ?? "", type: first?.type ?? "quantity" });
          }}>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        <div style={L}>{t.item}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={editItem.name} onChange={(e) => {
            const name = e.target.value;
            const found = items.find((i) => i.category === editItem.category && i.name === name);
            setEditItem(p => ({ ...p, name, newName: name, type: found?.type ?? "quantity" }));
          }}>
            {itemsInCat(editItem.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
          </Select>
        </div>

        <div style={L}>{isZH ? "新名称" : "New Name"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Input
            value={editItem.newName}
            onChange={(e) => setEditItem(p => ({ ...p, newName: e.target.value }))}
            placeholder={isZH ? "输入新名称…" : "Enter new name…"}
          />
        </div>

        <div style={L}>{t.inputType}</div>
        <div style={{ marginBottom: "14px" }}>
          <Select value={editItem.type} onChange={(e) => setEditItem(p => ({ ...p, type: e.target.value }))}>
            <option value="quantity">{t.numberCount}</option>
            <option value="status">{t.enoughNeedOrder}</option>
          </Select>
        </div>
        <PrimaryBtn onClick={saveEditItem}>{isZH ? "保存更改" : "Save Changes"}</PrimaryBtn>
      </Accordion>

      {/* ── Add Item ── */}
      <Accordion
        icon="➕"
        title={isZH ? "添加新项目" : "Add New Item"}
        desc={isZH ? "在某个分类下增加新项目" : "Add an item to a category"}
        open={openSection === "add"}
        onToggle={() => toggle("add")}
      >
        <div style={L}>{t.category}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div style={L}>{t.itemName}</div>
        <div style={{ marginBottom: "10px" }}>
          <Input placeholder={t.typeNewItemName} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
        </div>
        <div style={L}>{t.inputType}</div>
        <div style={{ marginBottom: "14px" }}>
          <Select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}>
            <option value="quantity">{t.numberCount}</option>
            <option value="status">{t.enoughNeedOrder}</option>
          </Select>
        </div>
        <PrimaryBtn onClick={addItem}>{t.addItem}</PrimaryBtn>
      </Accordion>

      {/* ── Archive Item ── */}
      <Accordion
        icon="🗃️"
        title={isZH ? "归档项目" : "Archive Item"}
        desc={isZH ? "隐藏不再使用的项目" : "Hide items no longer needed"}
        open={openSection === "archive"}
        onToggle={() => toggle("archive")}
      >
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>{t.archiveDesc}</div>
        <div style={L}>{t.category}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={archiveSelect.category} onChange={(e) => {
            const cat = e.target.value;
            const first = itemsInCat(cat)[0];
            setArchive({ category: cat, name: first?.name ?? "" });
          }}>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div style={L}>{t.item}</div>
        <div style={{ marginBottom: "14px" }}>
          <Select value={archiveSelect.name} onChange={(e) => setArchive(p => ({ ...p, name: e.target.value }))}>
            {itemsInCat(archiveSelect.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
          </Select>
        </div>
        <PrimaryBtn danger onClick={() => {
          if (!archiveSelect.name) return;
          if (!window.confirm(t.archiveConfirm(archiveSelect.name))) return;
          archiveItem();
        }}>
          {t.archiveItem}
        </PrimaryBtn>
      </Accordion>

    </div>
  );
}

// ── Supplier section ──────────────────────────────────────────────────────────
function SupplierSection({ t, allCategories, suppliers, onUpdateSuppliers, onToast, items, setItems }) {
  const isZH = t.appSub === "库存系统";
  const supplierNames = Object.keys(suppliers);

  const [openSection, setOpenSection] = useState(null);
  const [selCat, setSelCat] = useState(supplierNames[0] ?? allCategories[0] ?? "");

  function buildForm(cat) {
    const s = suppliers[cat] ?? {};
    // If supplier has no days set, derive from existing items in that category
    const itemDays = items
      .filter(i => i.category === cat && i.active !== false)
      .flatMap(i => i.days ?? []);
    const existingDays = [...new Set(itemDays)];
    return {
      type:    s.type    ?? "copy",
      contact: s.contact ?? "",
      lang:    s.lang    ?? "zh",
      days:    s.days?.length > 0 ? s.days : existingDays,
    };
  }

  const [form, setForm] = useState(() => buildForm(supplierNames[0] ?? ""));

  // Keep form in sync when suppliers prop changes (e.g. after save)
  const [lastSelCat, setLastSelCat] = useState(selCat);
  if (selCat !== lastSelCat) {
    setLastSelCat(selCat);
    setForm(buildForm(selCat));
  }

  const [newSupplier, setNewSupplier] = useState({
    name: "", type: "group", contact: "", lang: "zh", days: [],
  });

  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  const typeLabel = {
    group: isZH ? "WhatsApp Group 链接" : "WhatsApp Group Link",
    phone: isZH ? "WhatsApp 号码"       : "WhatsApp Phone Number",
    copy:  isZH ? "仅复制（无链接）"    : "Copy only (no link)",
  };

  function handleCatChange(cat) {
    setSelCat(cat);
    setForm(buildForm(cat));
  }

  // Sync item days for a category
  function syncItemDays(category, days) {
    setItems(prev => prev.map(item =>
      item.category === category ? { ...item, days } : item
    ));
  }

  function handleSave() {
    const days = form.days ?? [];
    const v = validateContact(form.type, form.contact);
    if (!v.ok) { onToast(v.msg, "error"); return; }
    const updated = {
      ...suppliers,
      [selCat]: {
        type:    form.type,
        contact: (form.contact ?? "").trim(),
        lang:    form.lang ?? "zh",
        days,
      },
    };
    onUpdateSuppliers(updated);
    // Sync Count days for all items in this category
    syncItemDays(selCat, days);
    onToast(isZH ? `"${selCat}" 已更新 ✓` : `"${selCat}" updated ✓`, "success");
  }

  function handleDelete() {
    if (!window.confirm(isZH ? `确定删除 "${selCat}" 供应商？` : `Delete supplier "${selCat}"?`)) return;
    const updated = { ...suppliers };
    delete updated[selCat];
    onUpdateSuppliers(updated);
    const remaining = Object.keys(updated);
    const next = remaining[0] ?? "";
    setSelCat(next);
    if (next) setForm(buildForm(next));
    onToast(isZH ? `"${selCat}" 已删除` : `"${selCat}" deleted`, "info");
  }

  function handleAddSupplier() {
    if (!newSupplier.name.trim()) {
      onToast(isZH ? "请输入供应商名称" : "Please enter supplier name", "error"); return;
    }
    const v = validateContact(newSupplier.type, newSupplier.contact);
    if (!v.ok) { onToast(v.msg, "error"); return; }
    const name = newSupplier.name.trim();
    const days = newSupplier.days;
    const updated = {
      ...suppliers,
      [name]: { type: newSupplier.type, contact: newSupplier.contact.trim(), lang: newSupplier.lang, days },
    };
    onUpdateSuppliers(updated);
    // Sync Count days for items in this new category
    if (days.length > 0) syncItemDays(name, days);
    setNewSupplier({ name: "", type: "group", contact: "", lang: "zh", days: [] });
    setSelCat(name);
    setForm({ type: updated[name].type, contact: updated[name].contact, lang: updated[name].lang, days });
    setOpenSection("edit");
    onToast(isZH ? `"${name}" 已添加 ✓` : `"${name}" added ✓`, "success");
  }

  function toggleDay(day, setTarget) {
    setTarget(prev => {
      const days = prev.days ?? [];
      const next = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
      return { ...prev, days: next };
    });
  }

  const EN_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function DayPicker({ value, onChange }) {
    return (
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "14px" }}>
        {EN_DAYS.map((day, i) => {
          const active = (value ?? []).includes(day);
          return (
            <button key={day} onClick={() => onChange(day)} style={{
              padding: "6px 11px", borderRadius: "var(--radius-full)",
              background: active ? "var(--brand)" : "var(--surface2)",
              color: active ? "#fff" : "var(--text-muted)",
              fontSize: "11px", fontWeight: active ? 700 : 400,
              border: `1.5px solid ${active ? "var(--brand)" : "var(--border)"}`,
              cursor: "pointer", transition: "all 0.12s",
              boxShadow: active ? "0 2px 8px rgba(61,35,20,0.2)" : "none",
            }}>{EN_SHORT[i]}</button>
          );
        })}
      </div>
    );
  }

  const supplierCount = Object.keys(suppliers).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

      {/* Summary pill */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "4px" }}>
        <div style={{ fontSize: "11px", color: "var(--text-faint)", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "3px 10px" }}>
          {supplierCount} {isZH ? "个供应商" : "suppliers"}
        </div>
      </div>

      {/* ── Edit Supplier ── */}
      <Accordion
        icon="✏️"
        title={isZH ? "编辑供应商" : "Edit Supplier"}
        desc={isZH ? "更改联系方式或下单日" : "Update contact or order days"}
        open={openSection === "edit"}
        onToggle={() => setOpenSection(p => p === "edit" ? null : "edit")}
      >
        <div style={L}>{isZH ? "选择供应商" : "Select Supplier"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={selCat} onChange={(e) => handleCatChange(e.target.value)}>
            {Object.keys(suppliers).map((c) => <option key={c} value={c}>{c}</option>)}
            {Object.keys(suppliers).length === 0 && <option value="">{isZH ? "无供应商" : "No suppliers"}</option>}
          </Select>
        </div>

        <div style={L}>{isZH ? "联系类型" : "Contact Type"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, contact: "" }))}>
            {["group","phone","copy"].map((o) => <option key={o} value={o}>{typeLabel[o]}</option>)}
          </Select>
        </div>

        {form.type !== "copy" && (
          <>
            <div style={L}>{isZH ? "联系方式" : "Contact"}</div>
            <div style={{ marginBottom: "4px" }}>
              <Input
                placeholder={form.type === "group" ? "https://chat.whatsapp.com/xxx" : "60123456789"}
                value={form.contact ?? ""}
                onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
              />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "10px" }}>
              {form.type === "phone"
                ? (isZH ? "格式：60123456789（不需要 + 或 -）" : "Format: 60123456789 (no + or dashes)")
                : (isZH ? "从 WhatsApp Group → Invite Link 复制" : "Copy from WhatsApp Group → Invite Link")}
            </div>
          </>
        )}

        <div style={L}>{isZH ? "消息语言" : "Message Language"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={form.lang ?? "zh"} onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value }))}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </Select>
        </div>

        <div style={L}>{isZH ? "下单日" : "Order Days"}</div>
        <DayPicker value={form.days ?? []} onChange={(day) => toggleDay(day, setForm)} />

        <div style={{ display: "flex", gap: "8px" }}>
          <PrimaryBtn onClick={handleSave} style={{ flex: 2 }}>{isZH ? "保存更改" : "Save Changes"}</PrimaryBtn>
          <PrimaryBtn danger onClick={handleDelete} style={{ flex: 1 }}>{isZH ? "删除" : "Delete"}</PrimaryBtn>
        </div>
      </Accordion>

      {/* ── Add Supplier ── */}
      <Accordion
        icon="➕"
        title={isZH ? "添加供应商" : "Add Supplier"}
        desc={isZH ? "新增供应商联系方式" : "Add a new supplier contact"}
        open={openSection === "add"}
        onToggle={() => setOpenSection(p => p === "add" ? null : "add")}
      >
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
          {isZH ? "添加新的供应商 category 和联系方式。" : "Add a new supplier with contact details."}
        </div>

        <div style={L}>{isZH ? "供应商名称（Category 名）" : "Supplier Name (Category)"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Input
            placeholder={isZH ? "例：New Supplier" : "e.g. New Supplier"}
            value={newSupplier.name}
            onChange={(e) => setNewSupplier((p) => ({ ...p, name: e.target.value }))}
          />
        </div>

        <div style={L}>{isZH ? "联系类型" : "Contact Type"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={newSupplier.type} onChange={(e) => setNewSupplier((p) => ({ ...p, type: e.target.value, contact: "" }))}>
            {["group","phone","copy"].map((o) => <option key={o} value={o}>{typeLabel[o]}</option>)}
          </Select>
        </div>

        {newSupplier.type !== "copy" && (
          <>
            <div style={L}>{isZH ? "联系方式" : "Contact"}</div>
            <div style={{ marginBottom: "4px" }}>
              <Input
                placeholder={newSupplier.type === "group" ? "https://chat.whatsapp.com/xxx" : "60123456789"}
                value={newSupplier.contact}
                onChange={(e) => setNewSupplier((p) => ({ ...p, contact: e.target.value }))}
              />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "10px" }}>
              {newSupplier.type === "phone"
                ? (isZH ? "格式：60123456789（不需要 + 或 -）" : "Format: 60123456789 (no + or dashes)")
                : (isZH ? "从 WhatsApp Group → Invite Link 复制" : "Copy from WhatsApp Group → Invite Link")}
            </div>
          </>
        )}

        <div style={L}>{isZH ? "消息语言" : "Message Language"}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={newSupplier.lang} onChange={(e) => setNewSupplier((p) => ({ ...p, lang: e.target.value }))}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </Select>
        </div>

        <div style={L}>{isZH ? "下单日" : "Order Days"}</div>
        <DayPicker value={newSupplier.days} onChange={(day) => toggleDay(day, setNewSupplier)} />

        <PrimaryBtn onClick={handleAddSupplier}>{isZH ? "添加供应商" : "Add Supplier"}</PrimaryBtn>
      </Accordion>

    </div>
  );
}

// ── Account section ───────────────────────────────────────────────────────────
function AccountSection({ t, userName, onChangeName, onToast }) {
  const isZH = t.appSub === "库存系统";
  const [newName, setNewName] = useState(userName || "");
  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };
  return (
    <Card style={{ padding: "14px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
        {t.currentName}: <strong style={{ color: "var(--brand)" }}>{userName}</strong>
      </div>
      <div style={L}>{isZH ? "新名字" : "New Name"}</div>
      <div style={{ marginBottom: "14px" }}>
        <Input placeholder={t.namePlaceholder} value={newName} onChange={(e) => setNewName(e.target.value)} />
      </div>
      <PrimaryBtn onClick={() => {
        if (!newName.trim()) return;
        onChangeName(newName.trim());
        onToast(t.nameChanged(newName.trim()), "success");
      }}>
        {isZH ? "保存名字" : "Save Name"}
      </PrimaryBtn>
    </Card>
  );
}

// ── Main ManagePage — Items first, Suppliers second, Account third ─────────────
export default function ManagePage({ t, items, setItems, allCategories, onToast, userName, onChangeName, suppliers, onUpdateSuppliers }) {
  const isZH = t.appSub === "库存系统";
  const TABS = [
    { id: "items",    label: isZH ? "项目"   : "Items"     },
    { id: "supplier", label: isZH ? "供应商" : "Suppliers" },
    { id: "account",  label: isZH ? "账户"   : "Account"   },
  ];
  const [activeTab, setActiveTab] = useState("items");

  return (
    <div className="page-enter" style={{ paddingBottom: "24px" }}>
      {/* Tab bar */}
      <div style={{ display: "flex", gap: "6px", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "4px", marginBottom: "18px" }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: "8px 4px", borderRadius: "var(--radius-sm)",
            background: activeTab === id ? "var(--surface)" : "transparent",
            color: activeTab === id ? "var(--brand)" : "var(--text-muted)",
            fontSize: "12px", fontWeight: activeTab === id ? 700 : 500,
            border: activeTab === id ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: activeTab === id ? "var(--shadow-xs)" : "none",
            transition: "all 0.15s", letterSpacing: "-0.01em",
          }}>{label}</button>
        ))}
      </div>

      {activeTab === "items" && (
        <ItemsSection t={t} items={items} setItems={setItems} allCategories={allCategories} onToast={onToast} />
      )}
      {activeTab === "supplier" && (
        <>
          <SectionLabel>📱 {isZH ? "供应商设置" : "Supplier Settings"}</SectionLabel>
          <SupplierSection t={t} allCategories={allCategories} suppliers={suppliers} onUpdateSuppliers={onUpdateSuppliers} onToast={onToast} items={items} setItems={setItems} />
        </>
      )}
      {activeTab === "account" && (
        <>
          <SectionLabel>👤 {isZH ? "账户设置" : "Account"}</SectionLabel>
          <AccountSection t={t} userName={userName} onChangeName={onChangeName} onToast={onToast} />
        </>
      )}
    </div>
  );
}
