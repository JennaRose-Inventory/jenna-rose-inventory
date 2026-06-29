import { useState } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { Card, SectionLabel, Select, Input, PrimaryBtn } from "../components/UI.jsx";
import { validateContact } from "../utils/suppliers.js";
import StaffPageComponent from "./StaffPage.jsx";

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
function ItemsSection({ t, items, setItems, allCategories, onToast, suppliers = {} }) {
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
    lowStock: firstActive?.lowStock ?? "",
    freshDays: firstActive?.freshDays ?? "",
  });

  // Add item state
  const [newItem, setNewItem] = useState({ category: allCategories[0] ?? "", name: "", type: "quantity", lowStock: "" });

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
    const origName = updated[idx]._origName ?? editItem.name;
    updated[idx] = { ...updated[idx], name: trimmedName, type: editItem.type, _origName: origName, lowStock: editItem.lowStock, freshDays: editItem.freshDays !== "" ? Number(editItem.freshDays) : 0 };
    setItems(updated);
    setEditItem(p => ({ ...p, name: trimmedName, newName: trimmedName }));
    onToast(isZH ? `"${trimmedName}" 已更新 ✓` : `"${trimmedName}" updated ✓`, "success");
  }

  function addItem() {
    if (!newItem.name.trim()) return;
    if (items.find((i) => i.category === newItem.category && i.name === newItem.name.trim() && i.active !== false)) {
      onToast(t.alreadyExists, "error"); return;
    }
    // Use supplier's days, fall back to existing category items' days, then all days
    const sup = suppliers?.[newItem.category];
    const categoryDays = [...new Set(items.filter(i => i.category === newItem.category && i.active !== false && i.days?.length > 0).flatMap(i => i.days))];
    const supplierDays = (sup?.days?.length > 0 ? sup.days : null) ?? (sup?.orderDays?.length > 0 ? sup.orderDays : null) ?? (categoryDays.length > 0 ? categoryDays : EN_DAYS);
    setItems([...items, { ...newItem, name: newItem.name.trim(), stock: "", active: true, days: supplierDays }]);
    setNewItem((p) => ({ ...p, name: "", lowStock: "" }));
    onToast(t.addedOk(newItem.name), "success");
  }

  function deleteItem() {
    const { category, name } = editItem;
    if (!name) return;
    if (!window.confirm(isZH ? `确定删除 "${name}"？此操作无法撤销。` : `Delete "${name}"? This cannot be undone.`)) return;
    const updated = items.filter((i) => !(i.category === category && i.name === name));
    setItems(updated);
    const next = updated.find((i) => i.active !== false && i.category === category);
    setEditItem(p => ({ ...p, name: next?.name ?? "", newName: next?.name ?? "", type: next?.type ?? "quantity", lowStock: next?.lowStock ?? "", freshDays: next?.freshDays ?? "" }));
    onToast(isZH ? `"${name}" 已删除` : `"${name}" deleted`, "info");
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
            {[...new Set([...allCategories, ...Object.keys(suppliers)])].sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div style={L}>{t.itemName}</div>
        <div style={{ marginBottom: "10px" }}>
          <Input placeholder={t.typeNewItemName} value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
        </div>
        <div style={L}>{t.inputType}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={newItem.type} onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}>
            <option value="quantity">{t.numberCount}</option>
            <option value="status">{t.enoughNeedOrder}</option>
          </Select>
        </div>
        {newItem.type === "quantity" && (
          <>
            <div style={L}>{isZH ? "低库存阈值（留空 = 跟 supplier 设定）" : "Low Stock Threshold (leave blank = supplier default)"}</div>
            <div style={{ marginBottom: "4px" }}>
              <Input
                type="number" inputMode="numeric"
                placeholder={isZH ? "例：5" : "e.g. 5"}
                value={newItem.lowStock ?? ""}
                onChange={(e) => setNewItem(p => ({ ...p, lowStock: e.target.value }))}
              />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "14px" }}>
              {isZH ? "当数量 ≤ 此值时显示红色警告" : "Shows red warning when stock ≤ this value"}
            </div>
          </>
        )}
        {newItem.type !== "quantity" && <div style={{ marginBottom: "14px" }} />}
        <PrimaryBtn onClick={addItem}>{t.addItem}</PrimaryBtn>
      </Accordion>

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
            setEditItem({ category: cat, name: first?.name ?? "", newName: first?.name ?? "", type: first?.type ?? "quantity", lowStock: first?.lowStock ?? "", freshDays: first?.freshDays ?? "" });
          }}>
            {allCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>

        <div style={L}>{t.item}</div>
        <div style={{ marginBottom: "10px" }}>
          <Select value={editItem.name} onChange={(e) => {
            const name = e.target.value;
            const found = items.find((i) => i.category === editItem.category && i.name === name);
            setEditItem(p => ({ ...p, name, newName: name, type: found?.type ?? "quantity", lowStock: found?.lowStock ?? "", freshDays: found?.freshDays ?? "" }));
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
        <div style={{ marginBottom: "10px" }}>
          <Select value={editItem.type} onChange={(e) => setEditItem(p => ({ ...p, type: e.target.value }))}>
            <option value="quantity">{t.numberCount}</option>
            <option value="status">{t.enoughNeedOrder}</option>
          </Select>
        </div>
        {editItem.type === "quantity" && (
          <>
            <div style={L}>{isZH ? "低库存阈值（留空 = 跟 supplier 设定）" : "Low Stock Threshold (leave blank = use supplier default)"}</div>
            <div style={{ marginBottom: "4px" }}>
              <Input
                type="number" inputMode="numeric"
                placeholder={isZH ? "例：5（留空 = 用 supplier 设定）" : "e.g. 5 (blank = supplier default)"}
                value={editItem.lowStock ?? ""}
                onChange={(e) => setEditItem(p => ({ ...p, lowStock: e.target.value }))}
              />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "14px" }}>
              {isZH ? "当数量 ≤ 此值时显示红色警告" : "Shows red warning when stock ≤ this value"}
            </div>
          </>
        )}
        {editItem.type === "quantity" && (
          <>
            <div style={L}>{isZH ? "新鲜天数（0 = 不追踪）" : "Fresh Days (0 = don't track)"}</div>
            <div style={{ marginBottom: "4px" }}>
              <Input
                type="number" inputMode="numeric"
                placeholder={isZH ? "例：5（0 = 不追踪新鲜度）" : "e.g. 5 (0 = no tracking)"}
                value={editItem.freshDays ?? ""}
                onChange={(e) => setEditItem(p => ({ ...p, freshDays: e.target.value }))}
              />
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "14px" }}>
              {isZH ? "收货后超过此天数会在 Overview 显示 🕐 警告" : "Shows 🕐 warning in Overview after this many days since restock"}
            </div>
          </>
        )}
        {editItem.type !== "quantity" && <div style={{ marginBottom: "14px" }} />}
        <div style={{ display: "flex", gap: "8px" }}>
          <PrimaryBtn onClick={saveEditItem} style={{ flex: 2 }}>{isZH ? "保存更改" : "Save Changes"}</PrimaryBtn>
          <PrimaryBtn danger onClick={deleteItem} style={{ flex: 1 }}>{isZH ? "删除" : "Delete"}</PrimaryBtn>
        </div>
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
    const itemDays = items.filter(i => i.category === cat && i.active !== false).flatMap(i => i.days ?? []);
    const existingDays = [...new Set(itemDays)];
    return {
      type:      s.type      ?? "copy",
      contact:   s.contact   ?? "",
      lang:      s.lang      ?? "zh",
      days:      s.days?.length > 0 ? s.days : existingDays,
      orderDays: s.orderDays ?? s.days ?? [],  // when to send order notification
      lowStock:  s.lowStock  ?? "",
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
    name: "", type: "group", contact: "", lang: "zh", days: [], orderDays: [], lowStock: "",
  });
  const [renameTo, setRenameTo] = useState("");
  const [renaming, setRenaming] = useState(false);

  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  const typeLabel = {
    group: isZH ? "WhatsApp Group 链接" : "WhatsApp Group Link",
    phone: isZH ? "WhatsApp 号码"       : "WhatsApp Phone Number",
    copy:  isZH ? "仅复制（无链接）"    : "Copy only (no link)",
  };

  function handleCatChange(cat) {
    setSelCat(cat);
    setForm(buildForm(cat));
    setRenameTo("");
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
        type:      form.type,
        contact:   (form.contact ?? "").trim(),
        lang:      form.lang ?? "zh",
        days,
        orderDays: form.orderDays ?? days,
        lowStock:  form.lowStock ?? "",
      },
    };
    onUpdateSuppliers(updated);
    // Sync Count days for all items in this category
    syncItemDays(selCat, days);
    onToast(isZH ? `"${selCat}" 已更新 ✓` : `"${selCat}" updated ✓`, "success");
  }

  function handleDelete() {
    if (!window.confirm(isZH ? `确定删除 "${selCat}" 供应商？此操作也会同时隐藏该供应商下所有项目。` : `Delete supplier "${selCat}"? All items under this supplier will also be archived.`)) return;
    // Remove supplier
    const updated = { ...suppliers };
    delete updated[selCat];
    onUpdateSuppliers(updated);
    // Archive all items under this supplier
    const archivedItems = items.map(i => i.category === selCat ? { ...i, active: false } : i);
    setItems(archivedItems);
    const remaining = Object.keys(updated);
    const next = remaining[0] ?? "";
    setSelCat(next);
    if (next) setForm(buildForm(next));
    onToast(isZH ? `"${selCat}" 已删除，相关项目已隐藏` : `"${selCat}" deleted and items archived`, "info");
  }

  async function handleRename() {
    const newName = renameTo.trim();
    if (!newName) { onToast(isZH ? "请输入新名称" : "Enter a new name", "error"); return; }
    if (newName === selCat) { onToast(isZH ? "名称没有变化" : "Name unchanged", "error"); return; }
    if (suppliers[newName]) { onToast(isZH ? `"${newName}" 已存在` : `"${newName}" already exists`, "error"); return; }
    setRenaming(true);
    try {
      // 1. Rename in suppliers object
      const updatedSuppliers = { ...suppliers, [newName]: suppliers[selCat] };
      delete updatedSuppliers[selCat];
      onUpdateSuppliers(updatedSuppliers);

      // 2. Rename category in all items
      setItems(prev => prev.map(i => i.category === selCat ? { ...i, category: newName } : i));

      // 3. Update category order in Firestore
      const orderSnap = await getDoc(doc(db, "config", "category_order"));
      if (orderSnap.exists()) {
        const order = (orderSnap.data().order ?? []).map(c => c === selCat ? newName : c);
        await setDoc(doc(db, "config", "category_order"), { order });
      }

      // 4. Update history records in Firestore
      const histSnap = await getDocs(collection(db, "inventoryHistory"));
      await Promise.all(histSnap.docs.map(async d => {
        const its = d.data().items ?? [];
        if (its.some(i => i.category === selCat)) {
          await updateDoc(doc(db, "inventoryHistory", d.id), {
            items: its.map(i => i.category === selCat ? { ...i, category: newName } : i),
          });
        }
      }));

      // 5. Update fresh dates in Firestore
      const freshSnap = await getDocs(collection(db, "freshDates"));
      await Promise.all(freshSnap.docs.map(async d => {
        if (d.data().category === selCat) {
          const data = d.data();
          await setDoc(doc(db, "freshDates", `${newName}__${data.name}`), { ...data, category: newName });
          await deleteDoc(doc(db, "freshDates", d.id));
        }
      }));

      setSelCat(newName);
      setRenameTo("");
      onToast(isZH ? `已改名为 "${newName}" ✓` : `Renamed to "${newName}" ✓`, "success");
    } catch (e) {
      onToast(isZH ? "改名失败，请重试" : "Rename failed, please retry", "error");
    }
    setRenaming(false);
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
      [name]: { type: newSupplier.type, contact: newSupplier.contact.trim(), lang: newSupplier.lang, days, orderDays: newSupplier.orderDays ?? days, lowStock: newSupplier.lowStock ?? "" },
    };
    onUpdateSuppliers(updated);
    if (days.length > 0) syncItemDays(name, days);
    setNewSupplier({ name: "", type: "group", contact: "", lang: "zh", days: [], orderDays: [], lowStock: "" });
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

        <div style={L}>{isZH ? "点货日" : "Counting Days"}</div>
        <DayPicker value={newSupplier.days} onChange={(day) => toggleDay(day, setNewSupplier)} />

        <div style={L}>{isZH ? "下单提醒日" : "Order Reminder Day"}</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "6px" }}>
          {isZH ? "这一天有低库存时会发通知提醒下单" : "Get notified on this day if stock is low"}
        </div>
        <DayPicker value={newSupplier.orderDays ?? []} onChange={(day) => {
          setNewSupplier(p => {
            const current = p.orderDays ?? [];
            const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
            return { ...p, orderDays: next };
          });
        }} />

        <div style={L}>{isZH ? "默认低库存阈值" : "Default Low Stock Threshold"}</div>
        <div style={{ marginBottom: "4px" }}>
          <Input
            type="number" inputMode="numeric"
            placeholder={isZH ? "例：5（留空 = 系统默认 ≤3）" : "e.g. 5 (blank = system default ≤3)"}
            value={newSupplier.lowStock ?? ""}
            onChange={(e) => setNewSupplier(p => ({ ...p, lowStock: e.target.value }))}
          />
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "14px" }}>
          {isZH ? "item 没设个别阈值时，会用这个数值" : "Used when individual item has no threshold set"}
        </div>

        <PrimaryBtn onClick={handleAddSupplier}>{isZH ? "添加供应商" : "Add Supplier"}</PrimaryBtn>
      </Accordion>

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

        <div style={L}>{isZH ? "点货日" : "Counting Days"}</div>
        <DayPicker value={form.days ?? []} onChange={(day) => toggleDay(day, setForm)} />

        <div style={L}>{isZH ? "下单提醒日（哪天要下单给 supplier）" : "Order Reminder Day (when to place order)"}</div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "6px" }}>
          {isZH ? "这一天有低库存时会发通知提醒下单" : "Get notified on this day if stock is low"}
        </div>
        <DayPicker value={form.orderDays ?? form.days ?? []} onChange={(day) => {
          setForm(p => {
            const current = p.orderDays ?? p.days ?? [];
            const next = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
            return { ...p, orderDays: next };
          });
        }} />

        <div style={L}>{isZH ? "默认低库存阈值（给旗下所有 item 用）" : "Default Low Stock Threshold (for all items)"}</div>
        <div style={{ marginBottom: "4px" }}>
          <Input
            type="number" inputMode="numeric"
            placeholder={isZH ? "例：5（留空 = 系统默认 ≤3）" : "e.g. 5 (blank = system default ≤3)"}
            value={form.lowStock ?? ""}
            onChange={(e) => setForm(p => ({ ...p, lowStock: e.target.value }))}
          />
        </div>
        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginBottom: "14px" }}>
          {isZH ? "item 没设个别阈值时，会用这个数值" : "Used when individual item has no threshold set"}
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <PrimaryBtn onClick={handleSave} style={{ flex: 2 }}>{isZH ? "保存更改" : "Save Changes"}</PrimaryBtn>
          <PrimaryBtn danger onClick={handleDelete} style={{ flex: 1 }}>{isZH ? "删除" : "Delete"}</PrimaryBtn>
        </div>

        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid var(--border)" }}>
          <div style={L}>{isZH ? "改供应商名称" : "Rename Supplier"}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Input
              value={renameTo}
              onChange={(e) => setRenameTo(e.target.value)}
              placeholder={selCat}
              style={{ flex: 1 }}
            />
            <PrimaryBtn onClick={handleRename} disabled={renaming} style={{ flexShrink: 0 }}>
              {renaming ? "…" : (isZH ? "改名" : "Rename")}
            </PrimaryBtn>
          </div>
          <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "5px" }}>
            {isZH ? "会同步更新所有点货记录和货品" : "Updates all records and items automatically"}
          </div>
        </div>
      </Accordion>

    </div>
  );
}

// ── Account section ───────────────────────────────────────────────────────────
import { getNotifPermission, isNotifEnabled, setNotifEnabled, requestPermission, unsubscribe } from "../utils/notifications.js";
function AccountSection({ t, userName, onChangeName, onToast }) {
  const isZH = t.appSub === "库存系统";
  const [newName, setNewName] = useState(userName || "");
  const [notifOn,  setNotifOn]  = useState(() => isNotifEnabled());
  const [permission, setPermission] = useState(() => getNotifPermission());
  const L = { fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, marginBottom: "5px" };

  async function handleToggleNotif() {
    if (!notifOn) {
      const result = await requestPermission(userName);
      setPermission(getNotifPermission());
      if (result.granted) {
        setNotifOn(true);
        if (result.pushFailed) {
          onToast(isZH ? "通知已开启（仅限 app 内）" : "Notifications on (in-app only)", "info");
        } else {
          onToast(isZH ? "通知已开启 ✓ 关闭 app 也能收到" : "Notifications enabled ✓ Works in background!", "success");
        }
      } else {
        onToast(isZH ? "请在浏览器设置里允许通知" : "Please allow notifications in browser settings", "error");
      }
    } else {
      await unsubscribe();
      setNotifOn(false);
      onToast(isZH ? "通知已关闭" : "Notifications disabled", "info");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Name */}
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

      {/* Notifications */}
      <Card style={{ padding: "14px" }}>
        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", marginBottom: "4px" }}>
          🔔 {isZH ? "低库存通知" : "Low Stock Notifications"}
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.5 }}>
          {isZH
            ? "当下单日到来且有货品低库存时，系统会发出提醒通知。"
            : "Get notified when it's an order day and items are low on stock."}
        </div>

        {permission === "unsupported" ? (
          <div style={{ fontSize: "12px", color: "var(--text-faint)", padding: "10px", background: "var(--surface2)", borderRadius: "var(--radius-sm)", textAlign: "center" }}>
            {isZH ? "此浏览器不支持通知功能" : "Notifications not supported in this browser"}
          </div>
        ) : permission === "denied" ? (
          <div style={{ fontSize: "12px", color: "var(--amber-600)", padding: "10px", background: "var(--amber-50)", border: "1px solid var(--amber-100)", borderRadius: "var(--radius-sm)" }}>
            {isZH
              ? "通知权限已被拒绝。请在浏览器设置 → 网站设置 → 通知 里手动允许。"
              : "Notifications blocked. Go to browser Settings → Site Settings → Notifications to allow."}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {notifOn
                ? (isZH ? "✓ 通知已开启" : "✓ Notifications on")
                : (isZH ? "通知已关闭" : "Notifications off")}
            </div>
            {/* Toggle switch */}
            <button onClick={handleToggleNotif} style={{
              width: 44, height: 26, borderRadius: 99, border: "none",
              background: notifOn ? "var(--brand)" : "var(--border2)",
              position: "relative", cursor: "pointer", transition: "background 0.2s",
              flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 3,
                left: notifOn ? 21 : 3,
                width: 20, height: 20, borderRadius: "50%",
                background: "#fff", transition: "left 0.2s",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
              }} />
            </button>
          </div>
        )}

        <div style={{ fontSize: "10px", color: "var(--text-faint)", marginTop: "10px", lineHeight: 1.5 }}>
          {isZH
            ? "💡 iPhone 用户需要先将 app 加入主屏幕（PWA）才能收到通知。"
            : "💡 iPhone users need to add this app to Home Screen (PWA) first."}
        </div>
      </Card>
    </div>
  );
}

// ── Main ManagePage ────────────────────────────────────────────────────────────
export default function ManagePage({ t, items, setItems, allCategories, onToast, userName, onChangeName, suppliers, onUpdateSuppliers, freshMap, isAdmin = false, onLogout, onSetPage }) {
  const isZH = t.appSub === "库存系统";
  const TABS = [
    { id: "items",    label: isZH ? "项目"   : "Items"     },
    { id: "supplier", label: isZH ? "供应商" : "Suppliers" },
    { id: "account",  label: isZH ? "账户"   : "Account"   },
    ...(isAdmin ? [{ id: "staff", label: isZH ? "员工" : "Staff" }] : []),
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
        <ItemsSection t={t} items={items} setItems={setItems} allCategories={allCategories} onToast={onToast} suppliers={suppliers} />
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
          {/* Logout */}
          <div style={{ marginTop:"16px" }}>
            <button onClick={onLogout} style={{ width:"100%", padding:"12px", borderRadius:"var(--radius-md)", background:"var(--red-50)", color:"var(--red-600)", border:"1px solid var(--red-100)", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
              {isZH ? "退出登入" : "Sign Out"}
            </button>
          </div>
          {/* Debug — Admin only */}
          {isAdmin && (
            <div style={{ marginTop:"10px" }}>
              <button onClick={() => onSetPage?.("Debug")} style={{ width:"100%", padding:"10px", borderRadius:"var(--radius-md)", background:"var(--surface2)", color:"var(--text-faint)", border:"1px dashed var(--border)", fontSize:"12px", fontWeight:500, cursor:"pointer", letterSpacing:"0.01em" }}>
                🛠 {isZH ? "开发调试" : "Debug Tools"}
              </button>
            </div>
          )}
        </>
      )}
      {activeTab === "staff" && isAdmin && (
        <>
          <SectionLabel>👥 {isZH ? "员工管理" : "Staff"}</SectionLabel>
          <StaffPageComponent t={t} onToast={onToast} />
        </>
      )}
    </div>
  );
}
