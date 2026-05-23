import { useState } from "react";
import { Card, SectionLabel, Select, Input, PrimaryBtn } from "../components/UI.jsx";

// ── Supplier section ──────────────────────────────────────────────────────────
function SupplierSection({ t, allCategories, suppliers, onUpdateSuppliers, onToast }) {
  const isZH = t.appSub === "库存系统";
  const [selCat, setSelCat] = useState(allCategories[0] ?? "");
  const current = suppliers[selCat] ?? { type: "copy", contact: "", lang: "zh" };
  const [form, setForm] = useState(current);

  function handleCatChange(cat) {
    setSelCat(cat);
    setForm(suppliers[cat] ?? { type: "copy", contact: "", lang: "zh" });
  }

  function handleSave() {
    const updated = { ...suppliers, [selCat]: { ...form, contact: form.contact.trim() } };
    onUpdateSuppliers(updated);
    onToast(isZH ? `"${selCat}" 已更新 ✓` : `"${selCat}" updated ✓`, "success");
  }

  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };
  const typeLabel = {
    group: isZH ? "WhatsApp Group 链接" : "WhatsApp Group Link",
    phone: isZH ? "WhatsApp 号码" : "WhatsApp Phone Number",
    copy:  isZH ? "仅复制（无链接）" : "Copy only (no link)",
  };

  return (
    <Card style={{ padding: "14px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
        {isZH ? "配置每个分类的供应商联系方式。" : "Configure the supplier contact for each category."}
      </div>
      <div style={L}>{t.category}</div>
      <div style={{ marginBottom: "10px" }}>
        <Select value={selCat} onChange={(e) => handleCatChange(e.target.value)}>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
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
          <div style={{ marginBottom: "10px" }}>
            <Input
              placeholder={form.type === "group" ? "https://chat.whatsapp.com/xxx" : "60123456789"}
              value={form.contact}
              onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
            />
          </div>
        </>
      )}
      <div style={L}>{isZH ? "消息语言" : "Message Language"}</div>
      <div style={{ marginBottom: "14px" }}>
        <Select value={form.lang} onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value }))}>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </Select>
      </div>
      {/* Preview */}
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 12px", fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.6, whiteSpace: "pre-line" }}>
        {form.lang === "zh"
          ? "你好，我想订以下货品：\n\n• item 1\n• item 2\n\n请确认，谢谢 🙏"
          : "Hi, I'd like to order the following:\n\n• item 1\n• item 2\n\nPlease confirm, thank you 🙏"}
      </div>
      <PrimaryBtn onClick={handleSave}>{isZH ? "保存供应商设置" : "Save Supplier"}</PrimaryBtn>
    </Card>
  );
}

// ── Items section ─────────────────────────────────────────────────────────────
function ItemsSection({ t, items, setItems, allCategories, onToast }) {
  const isZH = t.appSub === "库存系统";
  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const firstActive = items.find((i) => i.active !== false);
  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  const [editItem, setEditItem]       = useState({ category: firstActive?.category ?? allCategories[0], name: firstActive?.name ?? "", type: firstActive?.type ?? "quantity" });
  const [newItem, setNewItem]         = useState({ category: allCategories[0], name: "", type: "quantity" });
  const [archiveSelect, setArchive]   = useState({ category: firstActive?.category ?? allCategories[0], name: firstActive?.name ?? "" });

  function itemsInCat(cat) { return items.filter((i) => i.active !== false && i.category === cat); }

  function addItem() {
    if (!newItem.name.trim()) return;
    if (items.find((i) => i.category === newItem.category && i.name === newItem.name.trim())) {
      onToast(t.alreadyExists, "error"); return;
    }
    setItems([...items, { ...newItem, name: newItem.name.trim(), stock: "", active: true, days }]);
    setNewItem((p) => ({ ...p, name: "" }));
    onToast(t.addedOk(newItem.name), "success");
  }

  function saveTypeChange() {
    const idx = items.findIndex((i) => i.category === editItem.category && i.name === editItem.name);
    if (idx === -1) return;
    const updated = [...items]; updated[idx] = { ...updated[idx], type: editItem.type };
    setItems(updated); onToast(t.updatedOk(editItem.name), "success");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Change type */}
      <div>
        <SectionLabel>✏️ {t.changeInputType}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>{t.changeInputDesc}</div>
          <div style={L}>{t.category}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={editItem.category} onChange={(e) => { const cat = e.target.value; const first = itemsInCat(cat)[0]; setEditItem({ category: cat, name: first?.name ?? "", type: first?.type ?? "quantity" }); }}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={L}>{t.item}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={editItem.name} onChange={(e) => { const name = e.target.value; const found = items.find((i) => i.category === editItem.category && i.name === name); setEditItem((p) => ({ ...p, name, type: found?.type ?? "quantity" })); }}>
              {itemsInCat(editItem.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <div style={L}>{t.inputType}</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={editItem.type} onChange={(e) => setEditItem((p) => ({ ...p, type: e.target.value }))}>
              <option value="quantity">{t.numberCount}</option>
              <option value="status">{t.enoughNeedOrder}</option>
            </Select>
          </div>
          <PrimaryBtn onClick={saveTypeChange}>{t.saveChange}</PrimaryBtn>
        </Card>
      </div>

      {/* Add new */}
      <div>
        <SectionLabel>➕ {t.addNewItem}</SectionLabel>
        <Card style={{ padding: "14px" }}>
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
        </Card>
      </div>

      {/* Archive */}
      <div>
        <SectionLabel>🗃️ {t.archiveItem}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>{t.archiveDesc}</div>
          <div style={L}>{t.category}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={archiveSelect.category} onChange={(e) => { const cat = e.target.value; const first = itemsInCat(cat)[0]; setArchive({ category: cat, name: first?.name ?? "" }); }}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={L}>{t.item}</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={archiveSelect.name} onChange={(e) => setArchive((p) => ({ ...p, name: e.target.value }))}>
              {itemsInCat(archiveSelect.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <PrimaryBtn danger onClick={() => { if (!archiveSelect.name) return; if (!window.confirm(t.archiveConfirm(archiveSelect.name))) return; archiveItem(); }}>
            {t.archiveItem}
          </PrimaryBtn>
        </Card>
      </div>
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

// ── Main ManagePage with tabs ─────────────────────────────────────────────────
export default function ManagePage({ t, items, setItems, allCategories, onToast, userName, onChangeName, suppliers, onUpdateSuppliers }) {
  const isZH = t.appSub === "库存系统";
  const TABS = [
    { id: "supplier", label: isZH ? "供应商" : "Suppliers" },
    { id: "items",    label: isZH ? "项目"   : "Items"     },
    { id: "account",  label: isZH ? "账户"   : "Account"   },
  ];
  const [activeTab, setActiveTab] = useState("supplier");

  return (
    <div className="page-enter" style={{ paddingBottom: "24px" }}>
      {/* Tab bar */}
      <div style={{
        display: "flex", gap: "6px",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "4px",
        marginBottom: "18px",
      }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            flex: 1, padding: "8px 4px",
            borderRadius: "var(--radius-sm)",
            background: activeTab === id ? "var(--surface)" : "transparent",
            color: activeTab === id ? "var(--brand)" : "var(--text-muted)",
            fontSize: "12px", fontWeight: activeTab === id ? 700 : 500,
            border: activeTab === id ? "1px solid var(--border)" : "1px solid transparent",
            boxShadow: activeTab === id ? "var(--shadow-xs)" : "none",
            transition: "all 0.15s",
            letterSpacing: "-0.01em",
          }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "supplier" && (
        <>
          <SectionLabel>📱 {isZH ? "供应商设置" : "Supplier Settings"}</SectionLabel>
          <SupplierSection t={t} allCategories={allCategories} suppliers={suppliers} onUpdateSuppliers={onUpdateSuppliers} onToast={onToast} />
        </>
      )}
      {activeTab === "items" && (
        <ItemsSection t={t} items={items} setItems={setItems} allCategories={allCategories} onToast={onToast} />
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
