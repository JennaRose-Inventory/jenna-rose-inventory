import { useState, useEffect, useRef } from "react";
import {
  collection, addDoc, getDocs, getDoc, setDoc, deleteDoc, updateDoc,
  query, orderBy, doc,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { itemsData } from "./data/items.js";
import { kitchenItemsData, kitchenSuppliersDefault } from "./data/kitchenItems.js";
import { countKey } from "./utils/helpers.js";
import { STRINGS } from "./utils/lang.js";
import { loadSuppliers, saveSuppliers } from "./utils/suppliers.js";
import { isOwner, getDept, setDept, deptLabel, loadKitchenSuppliers, saveKitchenSuppliers } from "./utils/department.js";
import { Icon } from "./components/UI.jsx";
import { checkOrderDayAlerts, syncSuppliersToServer } from "./utils/notifications.js";
import Toast from "./components/Toast.jsx";

import CountPage       from "./pages/CountPage.jsx";
import OverviewPage    from "./pages/OverviewPage.jsx";
import HistoryPage     from "./pages/HistoryPage.jsx";
import DashboardPage   from "./pages/DashboardPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import ManagePage      from "./pages/ManagePage.jsx";

const MAX_HISTORY        = 14;
const ITEMS_STORAGE_KEY  = "jr_items_v1";
const KITEMS_STORAGE_KEY = "jr_items_kitchen_v1";

// ── Persist frontend items ────────────────────────────────────────────────────
function loadItems() {
  try {
    const saved = localStorage.getItem(ITEMS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const savedMap = {};
      parsed.forEach(i => {
        savedMap[`${i.category}||${i.name}`] = i;
        if (i._origName) savedMap[`${i.category}||${i._origName}`] = i;
      });
      const merged = itemsData.map(item => {
        const key = `${item.category}||${item.name}`;
        return savedMap[key] ? { ...item, ...savedMap[key] } : item;
      });
      parsed.forEach(item => {
        const key  = `${item.category}||${item.name}`;
        const orig = `${item.category}||${item._origName}`;
        const inBase = itemsData.find(i =>
          `${i.category}||${i.name}` === key ||
          `${i.category}||${i.name}` === orig
        );
        if (!inBase) merged.push(item);
      });
      return merged;
    }
  } catch {}
  return [...itemsData];
}
function persistItems(items) {
  try { localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ── Persist kitchen items ─────────────────────────────────────────────────────
function loadKitchenItems() {
  try {
    const saved = localStorage.getItem(KITEMS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const savedMap = {};
      parsed.forEach(i => {
        savedMap[`${i.category}||${i.name}`] = i;
        if (i._origName) savedMap[`${i.category}||${i._origName}`] = i;
      });
      const merged = kitchenItemsData.map(item => {
        const key = `${item.category}||${item.name}`;
        return savedMap[key] ? { ...item, ...savedMap[key] } : item;
      });
      parsed.forEach(item => {
        const key = `${item.category}||${item.name}`;
        const inBase = kitchenItemsData.find(i => `${i.category}||${i.name}` === key);
        if (!inBase) merged.push(item);
      });
      return merged;
    }
  } catch {}
  return [...kitchenItemsData];
}
function persistKitchenItems(items) {
  try { localStorage.setItem(KITEMS_STORAGE_KEY, JSON.stringify(items)); } catch {}
}

// ── Network hook ──────────────────────────────────────────────────────────────
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online",  on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online",  on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

// ── Name setup screen ─────────────────────────────────────────────────────────
function NameSetup({ onDone, t, lang, onToggleLang }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight:"100dvh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)", padding:"36px 28px", width:"100%", maxWidth:"340px", textAlign:"center" }}>
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"16px" }}>
          <button onClick={onToggleLang} style={{ fontSize:"12px", fontWeight:600, color:"var(--text-muted)", background:"var(--surface2)", border:"1.5px solid var(--border)", borderRadius:"var(--radius-full)", padding:"4px 12px", cursor:"pointer" }}>
            {lang === "en" ? "🇨🇳 中文" : "🇬🇧 EN"}
          </button>
        </div>
        <div style={{ width:56, height:56, borderRadius:"16px", background:"var(--brand)", margin:"0 auto 18px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Icon name="coffee" size={26} color="#fff" strokeWidth={1.5} />
        </div>
        <div style={{ fontWeight:700, fontSize:"20px", color:"var(--text-primary)", marginBottom:"4px", letterSpacing:"-0.03em" }}>Jenna Rose</div>
        <div style={{ fontSize:"13px", color:"var(--text-muted)", marginBottom:"28px" }}>{t.namePrompt}</div>
        <input autoFocus placeholder={t.namePlaceholder} value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onDone(name.trim()); }}
          style={{ width:"100%", padding:"13px 16px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"15px", color:"var(--text-primary)", textAlign:"center", fontWeight:600, boxSizing:"border-box", marginBottom:"12px", letterSpacing:"-0.01em" }}
        />
        <button onClick={() => { if (name.trim()) onDone(name.trim()); }} disabled={!name.trim()}
          style={{ width:"100%", padding:"13px", borderRadius:"var(--radius-sm)", background:"var(--brand)", color:"#fff", fontSize:"14px", fontWeight:600, opacity: name.trim() ? 1 : 0.35, transition:"opacity 0.15s", letterSpacing:"-0.01em", boxShadow:"var(--shadow-sm)", border:"none" }}>
          {t.nameConfirm}
        </button>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang]               = useState(() => localStorage.getItem("jr_lang") || "en");
  const [userName, setUserName]       = useState(() => localStorage.getItem("jr_user") || "");
  const [dept, setDeptState]          = useState(() => getDept()); // null = not chosen yet
  // Frontend state
  const [suppliers, setSuppliers]     = useState(() => loadSuppliers());
  const [items, setItemsState]        = useState(() => loadItems());
  // Kitchen state
  const [kSuppliers, setKSuppliers]   = useState(() => loadKitchenSuppliers() ?? kitchenSuppliersDefault);
  const [kItems, setKItemsState]      = useState(() => loadKitchenItems());
  // Shared state
  const [page, setPage]               = useState("Count");
  const [counts, setCounts]           = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [freshMap, setFreshMap]       = useState({});
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const isOnline = useOnline();
  const t = STRINGS[lang];
  const owner     = isOwner(userName);
  const isKitchen = dept === "kitchen";

  // Active department data
  const activeItems     = isKitchen ? kItems     : items;
  const activeSuppliers = isKitchen ? kSuppliers : suppliers;

  const allCategories = [...new Set([
    ...activeItems.map((i) => i.category),
    ...Object.keys(activeSuppliers),
  ])];

  const NAV = [
    { id:"Count",       iconName:"count",    label:t.navCount    },
    { id:"Overview",    iconName:"overview", label:t.navOverview },
    { id:"History",     iconName:"history",  label:t.navHistory  },
    { id:"Dashboard",   iconName:"stats",    label:t.navStats    },
    { id:"Predictions", iconName:"ai",       label:t.navAI       },
    { id:"Manage",      iconName:"manage",   label:t.navManage   },
  ];

  // setItems wrappers — route to correct department
  function setItems(updated) {
    const val = typeof updated === "function" ? updated(items) : updated;
    persistItems(val); setItemsState(val);
  }
  function setKItems(updated) {
    const val = typeof updated === "function" ? updated(kItems) : updated;
    persistKitchenItems(val); setKItemsState(val);
  }
  function setActiveItems(updated) { isKitchen ? setKItems(updated) : setItems(updated); }

  function handleUpdateSuppliers(updated) {
    if (isKitchen) {
      saveKitchenSuppliers(updated); setKSuppliers(updated);
      // Kitchen suppliers stay local only — no Firestore sync needed
    } else {
      saveSuppliers(updated); setSuppliers(updated);
      syncSuppliersToServer(updated); // only frontend goes to Firestore
    }
  }

  function switchDept(d) {
    setDept(d); setDeptState(d);
    setCounts({});
    setPage("Count");
    todayDocIdRef.current = null; // reset so next save creates new record for new dept
  }

  // Refs to avoid stale closures
  const reloadHistoryRef = useRef(null);
  const todayDocIdRef    = useRef(null);

  function setHistoryAndRef(docs) {
    const todayStr = new Date().toLocaleDateString("en-GB");
    // Find today's doc matching current dept
    const currentDept = getDept() || "frontend";
    const todayDoc = docs.find(d =>
      d.date === todayStr &&
      (d.department === currentDept || (!d.department && currentDept === "frontend"))
    );
    todayDocIdRef.current = todayDoc?.docId ?? null;
    setHistoryData(docs);
  }

  function clearAllCounts() { setCounts({}); }
  function toggleLang() {
    const next = lang === "en" ? "zh" : "en";
    setLang(next);
    localStorage.setItem("jr_lang", next);
    syncSuppliersToServer(activeSuppliers);
  }
  function handleNameDone(name) { localStorage.setItem("jr_user", name); setUserName(name); }

  useEffect(() => { loadAll(); }, []);

  // Auto-refresh via ref to avoid stale closure — fix #2
  useEffect(() => {
    reloadHistoryRef.current = reloadHistory;
  });
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      reloadHistoryRef.current?.();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

  async function loadAll() {
    let loadedHistory = [];
    try {
      const q = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      loadedHistory = snap.docs.map((d) => ({ ...d.data(), docId: d.id }));
      setHistoryAndRef(loadedHistory);
    } catch { setHistoryData([]); }

    // Load FRONTEND suppliers from Firestore (source of truth for frontend only)
    // Kitchen suppliers stay in localStorage only
    try {
      const suppSnap = await getDocs(collection(db, "config"));
      const suppDoc  = suppSnap.docs.find(d => d.id === "suppliers");
      if (suppDoc) {
        const raw = suppDoc.data();
        // Strip meta fields (prefixed with _)
        const serverSuppliers = Object.fromEntries(
          Object.entries(raw).filter(([k]) => !k.startsWith("_"))
        );
        // Only apply if it looks like frontend suppliers (has known frontend categories)
        const isFrontend = Object.keys(serverSuppliers).some(k =>
          ["RV Bakery", "千层蛋糕", "Bo 8 Tea", "Yeli", "Global Coffee Resources",
           "Fine Roastery", "Goldenlita", "TS Mart", "Thermalnator", "旺明",
           "水果", "Kivory", "散货", "茶包", "H&S", "果汁", "Kombucha"].includes(k)
        );
        if (isFrontend && Object.keys(serverSuppliers).length > 0) {
          saveSuppliers(serverSuppliers);
          setSuppliers(serverSuppliers);
        }
      }
    } catch {}

    // Load fresh dates from Firestore
    try {
      const freshSnap = await getDocs(collection(db, "freshDates"));
      const map = {};
      freshSnap.docs.forEach(d => {
        // doc ID uses __ instead of || (Firestore doesn't allow ||)
        map[d.id.replace(/__/g, "||")] = d.data().date;
      });
      setFreshMap(map);
    } catch {}

    setCounts({});
    setLoading(false);
    // Check order day low stock alerts after load
    setTimeout(() => {
      checkOrderDayAlerts({
        items:       loadedHistory[0]?.items ?? loadItems(),
        suppliers:   loadSuppliers(),
        historyData: loadedHistory,
        lang:        localStorage.getItem("jr_lang") || "en",
      });
    }, 1500);
  }

  async function reloadHistory() {
    try {
      const q = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.docs.length > MAX_HISTORY) {
        const toDelete = snap.docs.slice(MAX_HISTORY);
        await Promise.all(toDelete.map((d) => deleteDoc(doc(db, "inventoryHistory", d.id))));
      }
      const finalSnap = snap.docs.length > MAX_HISTORY
        ? await getDocs(query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc")))
        : snap;
      const docs = finalSnap.docs.map((d) => ({ ...d.data(), docId: d.id }));
      // Update todayDocIdRef for current dept
      const todayStr     = new Date().toLocaleDateString("en-GB");
      const currentDept  = getDept() || "frontend";
      const todayDoc     = docs.find(d =>
        d.date === todayStr &&
        (d.department === currentDept || (!d.department && currentDept === "frontend"))
      );
      todayDocIdRef.current = todayDoc?.docId ?? null;
      setHistoryData(docs);
    } catch (err) { console.error(err); }
  }

  async function updateRecord(docId, updatedItems) {
    try {
      await updateDoc(doc(db, "inventoryHistory", docId), { items: updatedItems });
      await reloadHistory();
      showToast(t.appSub === "库存系统" ? "已更新 ✓" : "Updated ✓", "success");
    } catch (err) {
      console.error(err);
      showToast(t.appSub === "库存系统" ? "更新失败" : "Update failed", "error");
    }
  }

  async function deleteRecord(docId) {
    try {
      await deleteDoc(doc(db, "inventoryHistory", docId));
      await reloadHistory();
      showToast(t.appSub === "库存系统" ? "记录已删除" : "Record deleted", "info");
    } catch (err) {
      console.error(err);
      showToast(t.appSub === "库存系统" ? "删除失败" : "Delete failed", "error");
    }
  }

  async function saveFreshDate(category, name) {
    const key     = `${category}__${name}`;
    const dateStr = new Date().toLocaleDateString("en-GB");
    try {
      await setDoc(doc(db, "freshDates", key), { date: dateStr, category, name });
      setFreshMap(prev => ({ ...prev, [`${category}||${name}`]: dateStr }));
      showToast(t.appSub === "库存系统" ? `${name} 收货日已记录 ✓` : `${name} restock date saved ✓`, "success");
    } catch (err) {
      console.error("saveFreshDate error:", err);
      showToast(t.appSub === "库存系统" ? "保存失败" : "Save failed", "error");
    }
  }

  async function saveInventory(selectedDay) {
    if (!isOnline) {
      showToast(t.appSub === "库存系统" ? "无网络连接，无法保存" : "No internet connection", "error");
      return;
    }
    try {
      const now      = new Date();
      const todayStr = now.toLocaleDateString("en-GB");
      const isZH     = t.appSub === "库存系统";
      const timeStr  = now.toLocaleTimeString("en-GB", { hour:"2-digit", minute:"2-digit" });
      const existingDocId = todayDocIdRef.current;

      if (existingDocId) {
        // ── Merge into existing today's record ──
        const existingDocRef  = doc(db, "inventoryHistory", existingDocId);
        const existingDocSnap = await getDoc(existingDocRef);
        const existingMap = {};
        if (existingDocSnap.exists()) {
          (existingDocSnap.data().items ?? []).forEach(i => {
            existingMap[`${i.category}||${i.name}`] = i.stock;
          });
        }
        const mergedItems = activeItems.map((item) => {
          const key      = `${item.category}||${item.name}`;
          const newStock = counts[countKey(item)];
          const hasNew   = newStock !== undefined && newStock !== "";
          return { ...item, stock: hasNew ? newStock : (existingMap[key] ?? "") };
        });
        await updateDoc(doc(db, "inventoryHistory", existingDocId), {
          items: mergedItems, time: timeStr, savedBy: userName || "—", selectedDay,
        });
        showToast(isZH ? "已合并更新 ✓" : "Merged ✓", "success");
      } else {
        // ── No record today — create new ──
        const itemsToSave = activeItems.map(item => ({ ...item, stock: counts[countKey(item)] ?? "" }));
        const newDocRef = await addDoc(collection(db, "inventoryHistory"), {
          date: todayStr, time: timeStr, createdAt: now,
          savedBy: userName || "—", selectedDay, department: dept,
          items: itemsToSave,
        });
        todayDocIdRef.current = newDocRef.id;
        showToast(t.savedOk, "success");
      }
      setCounts({});
      await reloadHistory();
    } catch (err) {
      console.error("[SAVE ERROR]", err);
      showToast(t.saveFailed, "error");
    }
  }

  function showToast(message, type = "success") { setToast({ message, type, key: Date.now() }); }
  function handleCountChange(item, value) { setCounts((prev) => ({ ...prev, [countKey(item)]: value })); }

  const todayDate    = new Date().toLocaleDateString("en-GB");

  if (!userName) return <NameSetup onDone={handleNameDone} t={t} lang={lang} onToggleLang={toggleLang} />;

  // After name, owner can always see dept select, others only if no dept set yet
  if (!dept) {
    return (
      <div style={{ minHeight:"100dvh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
        <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)", padding:"36px 28px", width:"100%", maxWidth:"340px", textAlign:"center" }}>
          <div style={{ fontWeight:700, fontSize:"18px", color:"var(--text-primary)", marginBottom:"6px", letterSpacing:"-0.02em" }}>
            {t.appSub === "库存系统" ? `你好，${userName}` : `Hi, ${userName}`}
          </div>
          <div style={{ fontSize:"13px", color:"var(--text-muted)", marginBottom:"28px" }}>
            {t.appSub === "库存系统" ? "你在哪个部门？" : "Which department are you in?"}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <button onClick={() => switchDept("frontend")} style={{ padding:"18px", borderRadius:"var(--radius-lg)", background:"var(--brand)", color:"#fff", fontSize:"16px", fontWeight:700, border:"none", cursor:"pointer", boxShadow:"var(--shadow-md)" }}>
              ☕ {t.appSub === "库存系统" ? "前台" : "Front of House"}
            </button>
            <button onClick={() => switchDept("kitchen")} style={{ padding:"18px", borderRadius:"var(--radius-lg)", background:"#2d5016", color:"#fff", fontSize:"16px", fontWeight:700, border:"none", cursor:"pointer", boxShadow:"var(--shadow-md)" }}>
              🍳 {t.appSub === "库存系统" ? "厨房" : "Kitchen"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filter history strictly by department
  // frontend: records with department="frontend" OR old records with no department field
  // kitchen: ONLY records with department="kitchen"
  const deptHistory = historyData.filter(r => {
    if (dept === "kitchen")  return r.department === "kitchen";
    if (dept === "frontend") return r.department === "frontend" || !r.department;
    return false;
  });

  // Today's records filtered by dept
  const todayRecords = deptHistory.filter(r => r.date === todayDate);
  const todayRecord  = todayRecords[0] ?? null;

  if (loading) {
    return (
      <div style={{ minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"14px", background:"var(--bg)" }}>
        <div style={{ width:32, height:32, border:"2.5px solid var(--border)", borderTopColor:"var(--brand-mid)", borderRadius:"50%", animation:"spin 0.65s linear infinite" }} />
        <div style={{ fontSize:"13px", color:"var(--text-faint)", fontWeight:500 }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100dvh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Offline banner */}
      {!isOnline && (
        <div style={{ background:"var(--amber-600)", color:"#fff", fontSize:"12px", fontWeight:600, textAlign:"center", padding:"7px 16px", letterSpacing:"0.01em" }}>
          {t.appSub === "库存系统" ? "📵 无网络连接 — 数据将无法保存" : "📵 No internet — changes won't be saved"}
        </div>
      )}

      {/* Top header */}
      <div style={{ position:"sticky", top:0, zIndex:200, background:"rgba(255,255,255,0.88)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderBottom:"1px solid var(--border)", padding:"0 16px", height:"var(--top-h)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ width:34, height:34, borderRadius:"10px", background: isKitchen ? "#2d5016" : "var(--brand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontSize:"16px" }}>{isKitchen ? "🍳" : "☕"}</span>
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:"14px", color:"var(--text-primary)", lineHeight:1.2, letterSpacing:"-0.02em" }}>Jenna Rose</div>
            <div style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"1px" }}>
              <Icon name="user" size={10} color="var(--brand-light)" strokeWidth={1.8} />
              <span style={{ fontSize:"10px", color:"var(--brand-light)", fontWeight:600 }}>{userName}</span>
              <span style={{ fontSize:"10px", color:"var(--text-faint)" }}>·</span>
              <span style={{ fontSize:"10px", color: isKitchen ? "#4a7c20" : "var(--brand-light)", fontWeight:600 }}>
                {isKitchen ? (t.appSub === "库存系统" ? "厨房" : "Kitchen") : (t.appSub === "库存系统" ? "前台" : "Front")}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          {/* Dept switcher — owners only */}
          {owner && (
            <button onClick={() => switchDept(isKitchen ? "frontend" : "kitchen")} style={{
              display:"flex", alignItems:"center", gap:"4px",
              padding:"5px 10px", borderRadius:"var(--radius-full)",
              border:`1.5px solid ${isKitchen ? "#4a7c20" : "var(--brand-pale)"}`,
              background: isKitchen ? "#eaf3e0" : "var(--brand-ghost)",
              fontSize:"11px", fontWeight:600,
              color: isKitchen ? "#2d5016" : "var(--brand)",
            }}>
              {isKitchen ? "☕" : "🍳"} {isKitchen ? (t.appSub === "库存系统" ? "切前台" : "Front") : (t.appSub === "库存系统" ? "切厨房" : "Kitchen")}
            </button>
          )}
          <button onClick={toggleLang} style={{ display:"flex", alignItems:"center", gap:"5px", padding:"5px 10px", borderRadius:"var(--radius-full)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"11px", fontWeight:600, color:"var(--text-secondary)", letterSpacing:"0.01em" }}>
            <Icon name="globe" size={12} color="var(--text-muted)" strokeWidth={1.6} />
            {lang === "en" ? "EN" : "中文"}
          </button>
          <div style={{ fontSize:"11px", color:"var(--text-faint)", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--radius-full)", padding:"4px 10px", fontWeight:500 }}>
            {new Date().toLocaleDateString("en-GB", { weekday:"short", day:"2-digit", month:"short" })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex:1, padding:"16px 14px", paddingBottom:`calc(var(--nav-h) + 16px)`, overflowY:"auto" }}>
        {page === "Count"       && <CountPage       t={t} items={activeItems} counts={counts} onCountChange={handleCountChange} onSave={saveInventory} onClearCounts={clearAllCounts} historyData={deptHistory} todayRecord={todayRecord} todayCount={todayRecords.length} suppliers={activeSuppliers} freshMap={freshMap} onFreshDate={saveFreshDate} />}
        {page === "Overview"    && <OverviewPage    t={t} historyData={deptHistory} suppliers={activeSuppliers} onDeleteRecord={deleteRecord} onUpdateRecord={updateRecord} freshMap={freshMap} onFreshDate={saveFreshDate} items={activeItems} />}
        {page === "History"     && <HistoryPage     t={t} historyData={deptHistory} suppliers={activeSuppliers} freshMap={freshMap} />}
        {page === "Dashboard"   && <DashboardPage   t={t} historyData={deptHistory} items={activeItems} isLoading={loading} suppliers={activeSuppliers} />}
        {page === "Predictions" && <PredictionsPage t={t} historyData={deptHistory} items={activeItems} isLoading={loading} suppliers={activeSuppliers} />}
        {page === "Manage"      && <ManagePage      t={t} items={activeItems} setItems={setActiveItems} allCategories={allCategories} onToast={showToast} userName={userName} onChangeName={(n) => { localStorage.setItem("jr_user", n); setUserName(n); }} suppliers={activeSuppliers} onUpdateSuppliers={handleUpdateSuppliers} freshMap={freshMap} />}
      </div>

      {/* Bottom nav */}
      <nav style={{ position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)", width:"100%", maxWidth:"480px", height:"var(--nav-h)", background:"rgba(255,255,255,0.92)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", borderTop:"1px solid var(--border)", display:"flex", zIndex:150, paddingBottom:"env(safe-area-inset-bottom)" }}>
        {NAV.map(({ id, iconName, label }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", background:"none", border:"none", color: active ? "var(--brand)" : "var(--text-faint)", fontSize:"9.5px", fontWeight: active ? 600 : 400, letterSpacing:"0.02em", position:"relative", transition:"color 0.15s", paddingTop:"2px" }}>
              {active && <div style={{ position:"absolute", top:0, left:"28%", right:"28%", height:"2px", background:"var(--brand)", borderRadius:"0 0 2px 2px" }} />}
              <div style={{ padding:"5px 10px", borderRadius:"var(--radius-sm)", background: active ? "var(--brand-ghost)" : "transparent", transition:"background 0.15s", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <Icon name={iconName} size={19} color={active ? "var(--brand)" : "var(--text-faint)"} strokeWidth={active ? 2 : 1.5} />
              </div>
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
