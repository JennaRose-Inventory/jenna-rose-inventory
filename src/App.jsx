import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, deleteDoc,
  query, orderBy, limit, doc,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { itemsData } from "./data/items.js";
import { countKey } from "./utils/helpers.js";
import { STRINGS } from "./utils/lang.js";
import { loadSuppliers, saveSuppliers } from "./utils/suppliers.js";
import Toast from "./components/Toast.jsx";

import CountPage       from "./pages/CountPage.jsx";
import OverviewPage    from "./pages/OverviewPage.jsx";
import HistoryPage     from "./pages/HistoryPage.jsx";
import DashboardPage   from "./pages/DashboardPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import ManagePage      from "./pages/ManagePage.jsx";

const MAX_HISTORY = 14;

// ── Name setup screen ─────────────────────────────────────────────────────────
function NameSetup({ onDone, t }) {
  const [name, setName] = useState("");
  return (
    <div style={{
      minHeight: "100dvh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        background: "var(--surface)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-lg)",
        padding: "32px 24px",
        width: "100%", maxWidth: "340px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "36px", marginBottom: "12px" }}>☕</div>
        <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)", marginBottom: "6px" }}>
          Jenna Rose
        </div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>
          {t.namePrompt}
        </div>
        <input
          autoFocus
          placeholder={t.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onDone(name.trim()); }}
          style={{
            width: "100%", padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--border)",
            background: "var(--surface2)",
            fontSize: "14px", color: "var(--text-primary)",
            textAlign: "center", fontWeight: 600,
            boxSizing: "border-box",
            marginBottom: "14px",
          }}
        />
        <button
          onClick={() => { if (name.trim()) onDone(name.trim()); }}
          disabled={!name.trim()}
          style={{
            width: "100%", padding: "13px",
            borderRadius: "var(--radius-md)",
            background: "var(--brown-700)",
            color: "#fff", fontSize: "14px", fontWeight: 700,
            opacity: name.trim() ? 1 : 0.4,
            transition: "opacity 0.15s",
            cursor: name.trim() ? "pointer" : "default",
          }}
        >
          {t.nameConfirm}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [lang, setLang]               = useState(() => localStorage.getItem("jr_lang") || "en");
  const [userName, setUserName]       = useState(() => localStorage.getItem("jr_user") || "");
  const [suppliers, setSuppliers]     = useState(() => loadSuppliers());
  const [page, setPage]               = useState("Count");
  const [items, setItems]             = useState([]);
  const [counts, setCounts]           = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null);

  const t = STRINGS[lang];
  const allCategories = [...new Set(itemsData.map((i) => i.category))];

  const NAV = [
    { id: "Count",       icon: "📋", label: t.navCount    },
    { id: "Overview",    icon: "👁",  label: t.navOverview },
    { id: "History",     icon: "🕐", label: t.navHistory  },
    { id: "Dashboard",   icon: "📊", label: t.navStats    },
    { id: "Predictions", icon: "🤖", label: t.navAI       },
    { id: "Manage",      icon: "⚙️", label: t.navManage   },
  ];

  function toggleLang() {
    const next = lang === "en" ? "zh" : "en";
    setLang(next);
    localStorage.setItem("jr_lang", next);
  }

  function handleNameDone(name) {
    localStorage.setItem("jr_user", name);
    setUserName(name);
  }

  function handleUpdateSuppliers(updated) {
    saveSuppliers(updated);
    setSuppliers(updated);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const q1 = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"), limit(1));
      const snap1 = await getDocs(q1);
      setItems(snap1.empty ? itemsData : snap1.docs[0].data().items);
    } catch { setItems(itemsData); }
    try {
      const q2 = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap2 = await getDocs(q2);
      setHistoryData(snap2.docs.map((d) => d.data()));
    } catch { setHistoryData([]); }
    setCounts({});
    setLoading(false);
  }

  async function reloadHistory() {
    try {
      const q = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      if (snap.docs.length > MAX_HISTORY) {
        const toDelete = snap.docs.slice(MAX_HISTORY);
        await Promise.all(toDelete.map((d) => deleteDoc(doc(db, "inventoryHistory", d.id))));
      }
      const q2 = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap2 = await getDocs(q2);
      setHistoryData(snap2.docs.map((d) => d.data()));
    } catch (err) { console.error(err); }
  }

  async function saveInventory() {
    try {
      const itemsToSave = items.map((item) => ({
        ...item,
        stock: counts[countKey(item)] ?? "",
      }));
      await addDoc(collection(db, "inventoryHistory"), {
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: new Date(),
        savedBy: userName || "—",   // ← store who saved
        items: itemsToSave,
      });
      setCounts({});
      await reloadHistory();
      showToast(t.savedOk, "success");
    } catch (err) {
      console.error(err);
      showToast(t.saveFailed, "error");
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type, key: Date.now() });
  }

  function handleCountChange(item, value) {
    setCounts((prev) => ({ ...prev, [countKey(item)]: value }));
  }

  // Show name setup screen if no name yet
  if (!userName) return <NameSetup onDone={handleNameDone} t={t} />;

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "12px", background: "var(--bg)" }}>
        <div style={{ width: 36, height: 36, border: "3px solid var(--border)", borderTopColor: "var(--brown-500)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Top header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px", height: "var(--top-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>☕</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.1 }}>
              {t.appName}
            </div>
            {/* Show who's logged in */}
            <div style={{ fontSize: "10px", color: "var(--brown-400)", fontWeight: 600 }}>
              👤 {userName}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button onClick={toggleLang} style={{
            display: "flex", alignItems: "center", gap: "4px",
            padding: "4px 10px", borderRadius: "var(--radius-full)",
            border: "1.5px solid var(--border)", background: "var(--surface2)",
            fontSize: "11px", fontWeight: 700, color: "var(--brown-700)",
            cursor: "pointer", transition: "all 0.15s",
          }}>
            {lang === "en" ? "🇬🇧 EN" : "🇨🇳 中文"}
          </button>
          <div style={{
            fontSize: "11px", color: "var(--text-muted)",
            background: "var(--surface2)", border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)", padding: "3px 10px",
          }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
        </div>
      </div>

      {/* Page content */}
      <div style={{ flex: 1, padding: "16px 14px", paddingBottom: `calc(var(--nav-h) + 16px)`, overflowY: "auto" }}>
        {page === "Count"       && <CountPage       t={t} items={items} counts={counts} onCountChange={handleCountChange} onSave={saveInventory} />}
        {page === "Overview"    && <OverviewPage    t={t} historyData={historyData} suppliers={suppliers} />}
        {page === "History"     && <HistoryPage     t={t} historyData={historyData} />}
        {page === "Dashboard"   && <DashboardPage   t={t} historyData={historyData} items={items} />}
        {page === "Predictions" && <PredictionsPage t={t} historyData={historyData} items={items} />}
        {page === "Manage"      && <ManagePage      t={t} items={items} setItems={setItems} allCategories={allCategories} onToast={showToast} userName={userName} onChangeName={(n) => { localStorage.setItem("jr_user", n); setUserName(n); }} suppliers={suppliers} onUpdateSuppliers={handleUpdateSuppliers} />}
      </div>

      {/* Bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px", height: "var(--nav-h)",
        background: "var(--surface)", borderTop: "1px solid var(--border)",
        display: "flex", zIndex: 150,
        boxShadow: "0 -4px 16px rgba(44,26,14,0.08)",
      }}>
        {NAV.map(({ id, icon, label }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "2px",
              background: "none", border: "none",
              color: active ? "var(--brown-700)" : "var(--text-muted)",
              fontSize: "9px", fontWeight: active ? 700 : 500,
              letterSpacing: "0.03em", position: "relative", transition: "color 0.15s",
            }}>
              {active && <div style={{ position: "absolute", top: 0, left: "20%", right: "20%", height: "2px", background: "var(--brown-700)", borderRadius: "0 0 3px 3px" }} />}
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
