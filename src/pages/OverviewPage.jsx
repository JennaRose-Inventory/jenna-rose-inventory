import { useState } from "react";
import { createPortal } from "react-dom";
import { Card, SectionLabel } from "../components/UI.jsx";
import { shortDate, stockColor, isLowStock, daysSinceRestock, isFreshAlert, getAppDate } from "../utils/helpers.js";
import { buildWhatsAppUrl } from "../utils/suppliers.js";

// ── Build message with quantities ─────────────────────────────────────────────
function buildMessageWithQty(category, selectedItems, qtys, lang) {
  const lines = selectedItems.map((name) => {
    const qty = qtys[name] ? `${qtys[name]} ` : "";
    return `${qty}${name}`;
  }).join("\n");
  if (lang === "zh") return `你好，我想订以下货品：\n${lines}\n请确认，谢谢 🙏`;
  return `Hi, I'd like to order the following:\n${lines}\nPlease confirm, thank you 🙏`;
}

const WA_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.826L.057 23.927a.5.5 0 0 0 .609.61l6.102-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.886 0-3.655-.523-5.166-1.432l-.371-.22-3.844.924.942-3.844-.241-.389A9.96 9.96 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
  </svg>
);
const COPY_ICON = (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ── Order Modal ───────────────────────────────────────────────────────────────
function OrderModal({ category, items, latestMap, onClose, t, supplier }) {
  const isZH = t.appSub === "库存系统";
  const lowItems = items.filter((item) => isLowStock({ stock: latestMap[`${category}||${item.name}`] }));
  const defaultSelected = new Set((lowItems.length > 0 ? lowItems : items).map((i) => i.name));
  const [selected, setSelected] = useState(defaultSelected);
  const [qtys, setQtys] = useState({});
  const [copied, setCopied] = useState(false);

  function toggle(name) {
    setSelected((prev) => { const next = new Set(prev); next.has(name) ? next.delete(name) : next.add(name); return next; });
  }
  function selectAll() { setSelected(new Set(items.map((i) => i.name))); }
  function clearAll()  { setSelected(new Set()); }

  const selectedList = items.map((i) => i.name).filter((n) => selected.has(n));
  const message  = buildMessageWithQty(category, selectedList, qtys, supplier?.lang ?? "zh");
  const waResult = supplier ? buildWhatsAppUrl(supplier, selectedList) : null;

  async function handleSend() {
    if (!selectedList.length) return;
    try { await navigator.clipboard.writeText(message); } catch {}
    if (!waResult) { setCopied(true); setTimeout(() => setCopied(false), 2500); return; }
    if (waResult.type === "group") { setCopied(true); setTimeout(() => { window.open(waResult.url, "_blank"); onClose(); }, 400); return; }
    if (waResult.type === "phone") { window.open(waResult.url, "_blank"); onClose(); }
  }

  const btnLabel = !selectedList.length
    ? (isZH ? "请选择项目" : "Select items")
    : waResult?.type === "group" ? (isZH ? "复制 & 打开 WhatsApp" : "Copy & Open WhatsApp")
    : waResult?.type === "phone" ? (isZH ? "发送 WhatsApp" : "Send WhatsApp")
    : copied ? (isZH ? "已复制 ✓" : "Copied ✓")
    : (isZH ? "复制订单" : "Copy Order");

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9998 }} />
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", background:"var(--surface)", borderRadius:"20px 20px 0 0", boxShadow:"0 -8px 32px rgba(0,0,0,0.2)", zIndex:9999, maxHeight:"88dvh", display:"flex", flexDirection:"column" }}>
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px", flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:"var(--border2)" }} />
        </div>
        <div style={{ padding:"4px 18px 12px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"15px", color:"var(--text-primary)" }}>{category}</div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
              {supplier?.type === "copy" ? (isZH ? "复制后粘贴到 WeChat/WhatsApp" : "Copy then paste") : "WhatsApp"}
              {" · "}<span style={{ color:"var(--brand-mid)", fontWeight:600 }}>{selectedList.length} {isZH ? "项已选" : "selected"}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize:"20px", color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", padding:"6px", lineHeight:1 }}>✕</button>
        </div>
        <div style={{ display:"flex", gap:"8px", padding:"10px 18px 6px", flexShrink:0 }}>
          <button onClick={selectAll} style={{ fontSize:"11px", color:"var(--brand-mid)", fontWeight:600, background:"var(--brand-ghost)", border:"none", borderRadius:99, padding:"4px 14px", cursor:"pointer" }}>{isZH ? "全选" : "All"}</button>
          <button onClick={clearAll}  style={{ fontSize:"11px", color:"var(--text-muted)", fontWeight:600, background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:99, padding:"4px 14px", cursor:"pointer" }}>{isZH ? "清除" : "Clear"}</button>
          <div style={{ flex:1 }} />
          <span style={{ fontSize:"10px", color:"var(--text-faint)", alignSelf:"center" }}>{isZH ? "勾选 → 填数量" : "Check → qty"}</span>
        </div>
        <div style={{ overflowY:"auto", flex:1 }}>
          {items.map((item, idx) => {
            const val = latestMap[`${category}||${item.name}`];
            const low = isLowStock({ stock: val });
            const isSel = selected.has(item.name);
            return (
              <div key={idx} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"10px 18px", background: isSel ? "var(--brand-ghost)" : "transparent", borderBottom:"1px solid var(--border)", transition:"background 0.12s" }}>
                <div onClick={() => toggle(item.name)} style={{ width:22, height:22, borderRadius:6, flexShrink:0, border:`2px solid ${isSel ? "var(--brand)" : "var(--border2)"}`, background: isSel ? "var(--brand)" : "transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.12s", cursor:"pointer" }}>
                  {isSel && <span style={{ color:"#fff", fontSize:"12px", fontWeight:700 }}>✓</span>}
                </div>
                <div onClick={() => toggle(item.name)} style={{ flex:1, fontSize:"13px", color: low ? "var(--red-600)" : "var(--text-primary)", fontWeight: low ? 600 : 400, cursor:"pointer" }}>
                  {low && "! "}{item.name}
                  {val !== undefined && val !== "" && (
                    <span style={{ marginLeft:"6px", fontSize:"10px", color:stockColor(val), fontFamily:"var(--font-mono)", fontWeight:700 }}>
                      ({val === "Need Order" ? "⚠" : val === "Enough" ? "✓" : val})
                    </span>
                  )}
                </div>
                {isSel && (
                  <input type="number" inputMode="numeric" value={qtys[item.name] ?? ""} placeholder={isZH ? "数量" : "qty"}
                    onChange={(e) => setQtys((p) => ({ ...p, [item.name]: e.target.value }))}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width:"58px", padding:"5px 6px", textAlign:"center", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--brand-pale)", fontSize:"13px", fontWeight:700, background:"var(--surface)", color:"var(--brand)", flexShrink:0 }}
                  />
                )}
              </div>
            );
          })}
        </div>
        {selectedList.length > 0 && (
          <div style={{ margin:"10px 18px 0", flexShrink:0, padding:"10px 12px", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--radius-md)", fontSize:"11px", color:"var(--text-secondary)", whiteSpace:"pre-line", lineHeight:1.7, maxHeight:"72px", overflowY:"auto", fontFamily:"var(--font-mono)" }}>
            {message}
          </div>
        )}
        <div style={{ padding:"12px 18px 28px", flexShrink:0 }}>
          <button onClick={handleSend} disabled={!selectedList.length} style={{ width:"100%", padding:"14px", borderRadius:"var(--radius-lg)", background: copied ? "var(--green-600)" : !selectedList.length ? "var(--border2)" : waResult ? "#25D366" : "var(--brand)", color:"#fff", fontSize:"14px", fontWeight:700, border:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", transition:"background 0.2s", cursor: selectedList.length ? "pointer" : "default", boxShadow: selectedList.length ? "0 4px 16px rgba(0,0,0,0.15)" : "none" }}>
            {waResult ? WA_ICON : "📋"} {btnLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// STATUS categories — must match CountPage
const STATUS_CATEGORIES = ["TS Mart", "Thermalnator", "旺明"];

// ── Edit Record Modal ─────────────────────────────────────────────────────────
function EditRecordModal({ record, onClose, onSave, onDelete, t }) {
  const isZH = t.appSub === "库存系统";
  const [editedItems, setEditedItems] = useState(
    (record.items ?? []).map(i => ({ ...i }))
  );
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  function updateStock(idx, val) {
    setEditedItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], stock: val };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    await onSave(record.docId, editedItems);
    setSaving(false);
    onClose();
  }

  async function handleDelete() {
    if (!window.confirm(isZH ? "确定删除这条记录？" : "Delete this record?")) return;
    setDeleting(true);
    await onDelete(record.docId);
    setDeleting(false);
    onClose();
  }

  // Fix #3: detect status by category name, not just item.type field
  function isStatusItem(item) {
    return STATUS_CATEGORIES.includes(item.category) || item.type === "status";
  }

  const grouped = editedItems.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, _idx: idx });
    return acc;
  }, {});

  return createPortal(
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:9998 }} />
      <div style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", background:"var(--surface)", borderRadius:"20px 20px 0 0", boxShadow:"0 -8px 32px rgba(0,0,0,0.2)", zIndex:9999, maxHeight:"90dvh", display:"flex", flexDirection:"column" }}>
        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px", flexShrink:0 }}>
          <div style={{ width:36, height:4, borderRadius:99, background:"var(--border2)" }} />
        </div>
        {/* Header */}
        <div style={{ padding:"4px 18px 12px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:"15px", color:"var(--text-primary)" }}>
              {isZH ? "修改记录" : "Edit Record"}
            </div>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>
              {record.date} · {record.savedBy || "—"}
            </div>
          </div>
          <button onClick={onClose} style={{ fontSize:"20px", color:"var(--text-muted)", background:"none", border:"none", cursor:"pointer", padding:"6px" }}>✕</button>
        </div>
        {/* Item list */}
        <div style={{ overflowY:"auto", flex:1 }}>
          {Object.keys(grouped).map((cat) => (
            <div key={cat}>
              <div style={{ padding:"8px 18px 4px", fontSize:"10px", fontWeight:700, color:"var(--text-faint)", textTransform:"uppercase", letterSpacing:"0.07em", background:"var(--surface2)", borderBottom:"1px solid var(--border)" }}>
                {cat}
              </div>
              {grouped[cat].map((item) => {
                const isEmpty = item.stock === "" || item.stock === null || item.stock === undefined;
                return (
                  <div key={item._idx} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"9px 18px", borderBottom:"1px solid var(--border)" }}>
                    <div style={{ flex:1, fontSize:"12px", color:"var(--text-primary)" }}>{item.name}</div>
                    {isStatusItem(item) ? (
                      <select value={item.stock ?? ""} onChange={(e) => updateStock(item._idx, e.target.value)}
                        style={{ padding:"5px 8px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", fontSize:"12px", background:"var(--surface2)" }}>
                        <option value="">—</option>
                        <option value="Enough">{isZH ? "充足" : "Enough"}</option>
                        <option value="Need Order">{isZH ? "需要订货" : "Need Order"}</option>
                      </select>
                    ) : (
                      <input type="number" inputMode="numeric"
                        value={item.stock ?? ""}
                        onChange={(e) => updateStock(item._idx, e.target.value)}
                        style={{ width:"64px", padding:"5px 8px", textAlign:"center", borderRadius:"var(--radius-sm)", border:`1.5px solid ${isEmpty ? "var(--border)" : "var(--brand-light)"}`, fontSize:"13px", fontWeight:600, background:"var(--surface2)", color:"var(--text-primary)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        {/* Buttons */}
        <div style={{ padding:"12px 18px 28px", flexShrink:0, display:"flex", gap:"10px" }}>
          <button onClick={handleDelete} disabled={deleting} style={{ flex:1, padding:"13px", borderRadius:"var(--radius-md)", background:"var(--red-50)", color:"var(--red-600)", border:"1.5px solid var(--red-100)", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
            {deleting ? "..." : (isZH ? "删除记录" : "Delete")}
          </button>
          <button onClick={handleSave} disabled={saving} style={{ flex:2, padding:"13px", borderRadius:"var(--radius-md)", background:"var(--brand)", color:"#fff", border:"none", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
            {saving ? "..." : (isZH ? "保存更改" : "Save Changes")}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ── Main Overview Page ────────────────────────────────────────────────────────
export default function OverviewPage({ t, historyData, suppliers, onDeleteRecord, onUpdateRecord, freshMap = {}, onFreshDate, items = [], supplierFreshMap = {} }) {
  const [orderModal, setOrderModal] = useState(null);
  const [editModal,  setEditModal]  = useState(null);
  const isZH = t.appSub === "库存系统";

  // Show latest 3 records (regardless of date) — sorted desc, pick latest per date
  const dateMap = {};
  historyData.forEach((rec) => {
    if (!rec.date) return;
    if (!dateMap[rec.date]) dateMap[rec.date] = rec; // first = latest per date
  });

  // Get latest 3 unique dates
  const uniqueDates = Object.keys(dateMap).sort((a, b) => {
    // Sort DD/MM/YYYY descending
    const [da,ma,ya] = a.split("/").map(Number);
    const [db,mb,yb] = b.split("/").map(Number);
    return new Date(yb,mb-1,db) - new Date(ya,ma-1,da);
  }).slice(0, 3);

  const dayRecords = uniqueDates.map(d => dateMap[d]);

  if (dayRecords.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign:"center", padding:"48px 20px", color:"var(--text-muted)", fontSize:"13px" }}>
        {t.noSavedYet.split("\n").map((line, i) => <div key={i}>{line}</div>)}
      </div>
    );
  }

  // Build lookup maps
  const recordMaps = dayRecords.map((rec) => {
    const map = {};
    (rec?.items ?? []).forEach((item) => { map[`${item.category}||${item.name}`] = item.stock; });
    return map;
  });

  // ── Split items into today's and past ───────────────────────────────────────
  // Use app date boundary (6am) — consistent with Count page and saveInventory
  const appDate    = getAppDate(); // DD/MM/YYYY
  const [appDD, appMM, appYYYY] = appDate.split("/").map(Number);
  const appDateObj = new Date(appYYYY, appMM - 1, appDD);
  const todayDayEN = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][appDateObj.getDay()];

  // Today's items — scheduled for today's day of week
  const todayItems = items.filter(i =>
    i.active !== false && (i.days ?? []).includes(todayDayEN)
  );

  // Build a set of active item keys from current items config
  const activeItemKeys = new Set(items.filter(i => i.active !== false).map(i => `${i.category}||${i.name}`));

  // Past items — appeared in ANY of the 3 records but NOT scheduled for today
  const todayKeys   = new Set(todayItems.map(i => `${i.category}||${i.name}`));
  const pastSeenKeys = new Set(todayKeys);
  const pastItems   = [];
  dayRecords.forEach(rec => {
    (rec?.items ?? []).forEach(item => {
      const key   = `${item.category}||${item.name}`;
      const stock = item.stock;
      const hasFilled = stock !== "" && stock !== null && stock !== undefined;
      const itemScheduled = (item.days ?? []).length > 0;
      const stockNum = Number(stock);
      const worthShowing = hasFilled && (stockNum !== 0 || itemScheduled);
      // Check active status from current items config (not history snapshot)
      if (!pastSeenKeys.has(key) && activeItemKeys.has(key) && worthShowing) {
        pastSeenKeys.add(key);
        pastItems.push({ category: item.category, name: item.name });
      }
    });
  });

  function buildGrouped(itemList) {
    return itemList.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }

  const todayGrouped = buildGrouped(todayItems);
  const pastGrouped  = buildGrouped(pastItems);

  const colW = "46px";

  function valDisplay(val) {
    if (val === undefined || val === null || val === "") return "—";
    if (val === "Need Order") return "⚠";
    if (val === "Enough") return "✓";
    return String(val);
  }

  const lowCount = Object.values(recordMaps[0] ?? {}).filter(v => isLowStock({ stock: v })).length;

  const orderModalItems = orderModal
    ? ([...Object.values(todayGrouped), ...Object.values(pastGrouped)].flat().filter(i => i.category === orderModal.category))
    : [];

  function renderGroups(groupedItems) {
    return Object.keys(groupedItems).map((category) => {
      const supplier = suppliers?.[category] ?? null;
      return (
        <div key={category} style={{ marginBottom:"16px" }}>
          <div style={{ display:"flex", alignItems:"center", padding:"0 2px", marginBottom:"6px" }}>
            <div style={{ flex:1, display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:"10.5px", fontWeight:700, letterSpacing:"0.07em", textTransform:"uppercase", color:"var(--text-faint)" }}>
                {category}
              </span>
              {supplierFreshMap[category] && (() => {
                const d = supplierFreshMap[category];
                const [dd,mm,yy] = d.split("/").map(Number);
                const now = new Date();
                const isToday = dd===now.getDate()&&mm===now.getMonth()+1&&yy===now.getFullYear();
                const yest = new Date(); yest.setDate(yest.getDate()-1);
                const isYest = dd===yest.getDate()&&mm===yest.getMonth()+1&&yy===yest.getFullYear();
                const label = isToday?(isZH?"今天收货":"Today"):isYest?(isZH?"昨天收货":"Yesterday"):`${dd}/${mm}`;
                return (
                  <span style={{ fontSize:"9px", fontWeight:500, padding:"1px 6px", borderRadius:99, background:isToday?"#E1F5EE":"var(--surface2)", color:isToday?"#0F6E56":"var(--text-muted)", border:`1px solid ${isToday?"#9FE1CB":"var(--border)"}` }}>
                    📦 {label}
                  </span>
                );
              })()}
            </div>
            {supplier && (
              <div style={{ display:"flex", gap:"5px" }}>
                {dayRecords.map((rec, i) => (
                  <button key={i}
                    onClick={() => setOrderModal({ category, latestMap: recordMaps[i] })}
                    style={{
                      display:"flex", alignItems:"center", gap:"4px",
                      padding:"3px 9px", borderRadius:99,
                      background: supplier.type === "copy" ? "var(--surface2)" : i === 0 ? "#f0faf4" : "#f5f5f5",
                      border: `1px solid ${supplier.type === "copy" ? "var(--border)" : i === 0 ? "#a7d7b8" : "#d4d4d4"}`,
                      fontSize:"10px", fontWeight:600,
                      color: supplier.type === "copy" ? "var(--text-secondary)" : i === 0 ? "#1a7f37" : "#666",
                      cursor:"pointer", opacity: i === 1 ? 0.75 : 1,
                    }}>
                    {supplier.type === "copy" ? COPY_ICON : WA_ICON}
                    {i === 0 ? (isZH ? "今天" : "Latest") : `D-${i}`}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Card>
            {groupedItems[category].map((item, idx) => {
              const key        = `${item.category}||${item.name}`;
              const latestVal  = recordMaps[0]?.[key];
              const low        = isLowStock({ stock: latestVal });
              const itemConfig = items.find(i => i.category === item.category && i.name === item.name);
              const freshDays  = itemConfig?.freshDays ?? 0;
              const daysOld    = freshDays > 0 ? daysSinceRestock(key, freshMap) : null;
              const freshWarn  = freshDays > 0 && daysOld !== null && daysOld >= freshDays;
              const hasRestockDate = !!freshMap[key]; // show restock badge whenever date exists
              return (
                <div key={idx} style={{ borderBottom: idx < groupedItems[category].length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div style={{ display:"flex", alignItems:"center", padding:"9px 14px", background: freshWarn ? "rgba(251,191,36,0.06)" : "transparent" }}>
                    <div style={{ flex:1, fontSize:"12px", color:"var(--text-primary)", paddingRight:"6px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                        {freshWarn && <span style={{ fontSize:"11px", lineHeight:1 }}>🕐</span>}
                        {item.name}
                        {low && <span style={{ fontSize:"11px", lineHeight:1 }}>⚠️</span>}
                      </div>
                      {freshDays > 0 && hasRestockDate && (
                        <div style={{ marginTop:"3px" }}>
                          <span style={{
                            fontSize:"10px", fontWeight:600,
                            color: freshWarn ? "var(--amber-600)" : "var(--text-faint)",
                            background: freshWarn ? "var(--amber-50)" : "var(--surface2)",
                            border: `1px solid ${freshWarn ? "var(--amber-100)" : "var(--border)"}`,
                            borderRadius: "var(--radius-full)", padding: "1px 7px",
                          }}>
                            {freshWarn
                              ? (isZH ? `已放 ${daysOld} 天 ⚠️` : `${daysOld}d old ⚠️`)
                              : (() => {
                                  // Format restock date with 6am buffer awareness
                                  const restockDateStr = freshMap[key];
                                  if (!restockDateStr) return "";
                                  const [dd, mm] = restockDateStr.split("/");
                                  const appToday = getAppDate();
                                  const [tdd, tmm] = appToday.split("/");
                                  if (dd === tdd && mm === tmm) {
                                    return isZH ? "今天收货" : "Restocked today";
                                  }
                                  // Check if yesterday (app date - 1)
                                  const appYest = new Date(new Date().setDate(new Date().getDate() - (new Date().getHours() < 6 ? 2 : 1)));
                                  const yDD = String(appYest.getDate()).padStart(2,"0");
                                  const yMM = String(appYest.getMonth()+1).padStart(2,"0");
                                  if (dd === yDD && mm === yMM) {
                                    return isZH ? "昨天收货" : "Restocked yesterday";
                                  }
                                  return isZH ? `收货 ${dd}/${mm}` : `Restocked ${dd}/${mm}`;
                                })()}
                          </span>
                        </div>
                      )}
                    </div>
                    {dayRecords.map((_, i) => {
                      const val      = recordMaps[i]?.[key];
                      const isNum    = val !== undefined && val !== "" && !isNaN(Number(val));
                      const isLatest = i === 0;
                      const color    = isLatest ? stockColor(val, itemConfig, suppliers) : "var(--text-faint)";
                      return (
                        <div key={i} style={{ width:colW, textAlign:"center", marginLeft:"6px", display:"flex", alignItems:"center", justifyContent:"center" }}>
                          <span style={{ fontSize: isLatest ? "13px" : "11px", fontWeight: isLatest ? 600 : 400, fontFamily: isNum ? "var(--font-mono)" : "inherit", color, opacity: isLatest ? 1 : 0.5 }}>
                            {valDisplay(val)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      );
    });
  }

  return (
    <div className="page-enter">

      {/* Order modal */}
      {orderModal && (
        <OrderModal
          category={orderModal.category}
          items={orderModalItems}
          latestMap={orderModal.latestMap}
          onClose={() => setOrderModal(null)}
          t={t}
          supplier={suppliers?.[orderModal.category] ?? null}
        />
      )}

      {/* Edit record modal */}
      {editModal && (
        <EditRecordModal
          record={editModal}
          onClose={() => setEditModal(null)}
          onSave={onUpdateRecord}
          onDelete={onDeleteRecord}
          t={t}
        />
      )}

      {/* Low stock banner */}
      {lowCount > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:"10px", background:"var(--red-50)", border:"1px solid #fca5a5", borderRadius:"var(--radius-md)", padding:"10px 14px", marginBottom:"14px" }}>
          <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--red-500)", flexShrink:0 }} />
          <div style={{ flex:1, fontSize:"12px", color:"var(--red-700)", fontWeight:600 }}>
            {isZH ? `${lowCount} 项库存不足` : `${lowCount} item${lowCount > 1 ? "s" : ""} low on stock`}
          </div>
          <div style={{ fontSize:"10px", color:"var(--red-500)" }}>{isZH ? "以红色标注 ↓" : "marked below ↓"}</div>
        </div>
      )}

      {/* Date header row */}
      <div style={{ display:"flex", alignItems:"flex-end", padding:"0 14px 8px 14px" }}>
        <div style={{ flex:1 }} />
        {dayRecords.map((rec, i) => (
          <div key={i} style={{ width:colW, textAlign:"center", marginLeft:"6px" }}>
            <div style={{ fontSize:"11px", fontWeight:600, color: i === 0 ? "var(--brand-soft)" : "var(--text-faint)" }}>
              {shortDate(rec.date)}
            </div>
            <div style={{ fontSize:"9px", color: i === 0 ? "var(--brand-light)" : "var(--text-faint)", fontWeight:500 }}>
              {i === 0 ? t.latest : `D-${i}`}
            </div>
            {rec.savedBy && <div style={{ fontSize:"9px", color:"var(--text-faint)" }}>{rec.savedBy}</div>}
            <button onClick={() => setEditModal(rec)} style={{
              marginTop:"4px", fontSize:"10px", fontWeight:600,
              color:"var(--brand-mid)", background:"var(--brand-ghost)",
              border:"1px solid var(--brand-pale)", borderRadius:"var(--radius-full)",
              padding:"3px 10px", cursor:"pointer", display:"inline-block",
            }}>
              {isZH ? "修改" : "edit"}
            </button>
          </div>
        ))}
      </div>

      {/* Today's items */}
      {renderGroups(todayGrouped)}

      {/* Past items separator + groups */}
      {Object.keys(pastGrouped).length > 0 && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:"8px", margin:"8px 2px 12px" }}>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
            <span style={{ fontSize:"10px", color:"var(--text-faint)", fontWeight:500, whiteSpace:"nowrap" }}>
              {isZH ? "过去点货" : "Previous days"}
            </span>
            <div style={{ flex:1, height:"1px", background:"var(--border)" }} />
          </div>
          {renderGroups(pastGrouped)}
        </>
      )}
    </div>
  );
}
