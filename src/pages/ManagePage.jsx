import { useState } from "react";
import { Card, SectionLabel, Select, Input, PrimaryBtn } from "../components/UI.jsx";

const TYPE_OPTIONS = ["group", "phone", "copy"];
const LANG_OPTIONS = ["zh", "en"];

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
    onToast(isZH ? `"${selCat}" 供应商已更新 ✓` : `"${selCat}" supplier updated ✓`, "success");
  }

  const labelStyle = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  const typeLabel = {
    group: isZH ? "WhatsApp Group 链接" : "WhatsApp Group Link",
    phone: isZH ? "WhatsApp 号码"       : "WhatsApp Phone Number",
    copy:  isZH ? "仅复制（无链接）"    : "Copy only (no link)",
  };

  const contactPlaceholder = {
    group: "https://chat.whatsapp.com/xxx",
    phone: isZH ? "60123456789（不用+）" : "60123456789 (no +)",
    copy:  isZH ? "不需要填写" : "Not required",
  };

  return (
    <Card style={{ padding: "14px" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>
        {isZH ? "每个 Category 配置对应的供应商联系方式。" : "Configure the supplier contact for each category."}
      </div>

      <div style={labelStyle}>{t.category}</div>
      <div style={{ marginBottom: "10px" }}>
        <Select value={selCat} onChange={(e) => handleCatChange(e.target.value)}>
          {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      <div style={labelStyle}>{isZH ? "联系类型" : "Contact Type"}</div>
      <div style={{ marginBottom: "10px" }}>
        <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value, contact: "" }))}>
          {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{typeLabel[o]}</option>)}
        </Select>
      </div>

      {form.type !== "copy" && (
        <>
          <div style={labelStyle}>{isZH ? "联系方式" : "Contact"}</div>
          <div style={{ marginBottom: "10px" }}>
            <Input
              placeholder={contactPlaceholder[form.type]}
              value={form.contact}
              onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
            />
          </div>
        </>
      )}

      <div style={labelStyle}>{isZH ? "消息语言" : "Message Language"}</div>
      <div style={{ marginBottom: "14px" }}>
        <Select value={form.lang} onChange={(e) => setForm((p) => ({ ...p, lang: e.target.value }))}>
          <option value="zh">中文</option>
          <option value="en">English</option>
        </Select>
      </div>

      {/* Preview */}
      <div style={{
        background: "var(--surface2)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)", padding: "10px 12px",
        fontSize: "11px", color: "var(--text-muted)",
        marginBottom: "14px", lineHeight: 1.6,
      }}>
        <div style={{ fontWeight: 600, marginBottom: "4px", color: "var(--text-secondary)" }}>
          {isZH ? "消息预览：" : "Message preview:"}
        </div>
        {form.lang === "zh"
          ? "你好，我想订以下货品：\n\n• item 1\n• item 2\n\n请确认，谢谢 🙏"
          : "Hi, I'd like to order the following:\n\n• item 1\n• item 2\n\nPlease confirm, thank you 🙏"
        }
      </div>

      <PrimaryBtn onClick={handleSave}>
        {isZH ? "保存供应商设置" : "Save Supplier"}
      </PrimaryBtn>
    </Card>
  );
}

export default function ManagePage({ t, items, setItems, allCategories, onToast, userName, onChangeName, suppliers, onUpdateSuppliers }) {
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
  const [newName, setNewName] = useState(userName || "");

  function itemsInCat(cat) { return items.filter((i) => i.active !== false && i.category === cat); }

  function addItem() {
    if (!newItem.name.trim()) return;
    if (items.find((i) => i.category === newItem.category && i.name === newItem.name.trim())) {
      onToast(t.alreadyExists, "error"); return;
    }
    setItems([...items, { ...newItem, name: newItem.name.trim(), stock: "", active: true, days }]);
    setNewItem((prev) => ({ ...prev, name: "" }));
    onToast(t.addedOk(newItem.name), "success");
  }

  function saveTypeChange() {
    const idx = items.findIndex((i) => i.category === editItem.category && i.name === editItem.name);
    if (idx === -1) return;
    const updated = [...items];
    updated[idx] = { ...updated[idx], type: editItem.type };
    setItems(updated);
    onToast(t.updatedOk(editItem.name), "success");
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
    onToast(t.archived(archiveSelect.name), "info");
  }

  const labelStyle = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: "14px", paddingBottom: "24px" }}>

      {/* Change name */}
      <div>
        <SectionLabel>👤 {t.changeName}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
            {t.currentName}: <strong style={{ color: "var(--brown-700)" }}>{userName}</strong>
          </div>
          <div style={labelStyle}>{t.itemName.replace("Item","").trim() || "Name"}</div>
          <div style={{ marginBottom: "10px" }}>
            <Input
              placeholder={t.namePlaceholder}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <PrimaryBtn onClick={() => {
            if (!newName.trim()) return;
            onChangeName(newName.trim());
            onToast(t.nameChanged(newName.trim()), "success");
          }}>
            {t.nameConfirm}
          </PrimaryBtn>
        </Card>
      </div>

      {/* Supplier settings */}
      <div>
        <SectionLabel>📱 {t.appSub === "库存系统" ? "供应商设置" : "Supplier Settings"}</SectionLabel>
        <SupplierSection
          t={t}
          allCategories={allCategories}
          suppliers={suppliers}
          onUpdateSuppliers={onUpdateSuppliers}
          onToast={onToast}
        />
      </div>

      {/* Change input type */}
      <div>
        <SectionLabel>✏️ {t.changeInputType}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>{t.changeInputDesc}</div>
          <div style={labelStyle}>{t.category}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={editItem.category} onChange={(e) => {
              const cat = e.target.value;
              const first = itemsInCat(cat)[0];
              setEditItem({ category: cat, name: first?.name ?? "", type: first?.type ?? "quantity" });
            }}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>{t.item}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={editItem.name} onChange={(e) => {
              const name = e.target.value;
              const found = items.find((i) => i.category === editItem.category && i.name === name);
              setEditItem((prev) => ({ ...prev, name, type: found?.type ?? "quantity" }));
            }}>
              {itemsInCat(editItem.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>{t.inputType}</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={editItem.type} onChange={(e) => setEditItem((p) => ({ ...p, type: e.target.value }))}>
              <option value="quantity">{t.numberCount}</option>
              <option value="status">{t.enoughNeedOrder}</option>
            </Select>
          </div>
          <PrimaryBtn onClick={saveTypeChange}>{t.saveChange}</PrimaryBtn>
        </Card>
      </div>

      {/* Add new item */}
      <div>
        <SectionLabel>➕ {t.addNewItem}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={labelStyle}>{t.category}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>{t.itemName}</div>
          <div style={{ marginBottom: "10px" }}>
            <Input placeholder={t.typeNewItemName} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
          </div>
          <div style={labelStyle}>{t.inputType}</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}>
              <option value="quantity">{t.numberCount}</option>
              <option value="status">{t.enoughNeedOrder}</option>
            </Select>
          </div>
          <PrimaryBtn onClick={addItem}>{t.addItem}</PrimaryBtn>
        </Card>
      </div>

      {/* Archive item */}
      <div>
        <SectionLabel>🗃️ {t.archiveItem}</SectionLabel>
        <Card style={{ padding: "14px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "12px" }}>{t.archiveDesc}</div>
          <div style={labelStyle}>{t.category}</div>
          <div style={{ marginBottom: "10px" }}>
            <Select value={archiveSelect.category} onChange={(e) => {
              const cat = e.target.value;
              const first = itemsInCat(cat)[0];
              setArchiveSelect({ category: cat, name: first?.name ?? "" });
            }}>
              {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div style={labelStyle}>{t.item}</div>
          <div style={{ marginBottom: "14px" }}>
            <Select value={archiveSelect.name} onChange={(e) => setArchiveSelect((p) => ({ ...p, name: e.target.value }))}>
              {itemsInCat(archiveSelect.category).map((i) => <option key={i.name} value={i.name}>{i.name}</option>)}
            </Select>
          </div>
          <PrimaryBtn danger onClick={() => {
            if (!archiveSelect.name) return;
            if (!window.confirm(t.archiveConfirm(archiveSelect.name))) return;
            archiveItem();
          }}>{t.archiveItem}</PrimaryBtn>
        </Card>
      </div>
    </div>
  );
}
