import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs, deleteDoc,
  query, orderBy, doc,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { itemsData } from "./data/items.js";
import { countKey } from "./utils/helpers.js";
import { STRINGS } from "./utils/lang.js";
import { loadSuppliers, saveSuppliers } from "./utils/suppliers.js";
import { Icon } from "./components/UI.jsx";
import Toast from "./components/Toast.jsx";

import CountPage       from "./pages/CountPage.jsx";
import OverviewPage    from "./pages/OverviewPage.jsx";
import HistoryPage     from "./pages/HistoryPage.jsx";
import DashboardPage   from "./pages/DashboardPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import ManagePage      from "./pages/ManagePage.jsx";

const MAX_HISTORY = 14;

// ── Name setup screen ─────────────────────────────────────────────────────────
function NameSetup({ onDone, t, lang, onToggleLang }) {
  const [name, setName] = useState("");
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ background: "var(--surface)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: "36px 28px", width: "100%", maxWidth: "340px", textAlign: "center" }}>
        {/* Lang toggle top right */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <button onClick={onToggleLang} style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", background: "var(--surface2)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-full)", padding: "4px 12px", cursor: "pointer" }}>
            {lang === "en" ? "🇨🇳 中文" : "🇬🇧 EN"}
          </button>
        </div>
        <div style={{ width: 56, height: 56, borderRadius: "16px", background: "var(--brand)", margin: "0 auto 18px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="coffee" size={26} color="#fff" strokeWidth={1.5} />
        </div>
        <div style={{ fontWeight: 700, fontSize: "20px", color: "var(--text-primary)", marginBottom: "4px", letterSpacing: "-0.03em" }}>Jenna Rose</div>
        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "28px" }}>{t.namePrompt}</div>
        <input
          autoFocus placeholder={t.namePlaceholder} value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onDone(name.trim()); }}
          style={{ width: "100%", padding: "13px 16px", borderRadius: "var(--radius-sm)", border: "1.5px solid var(--border)", background: "var(--surface2)", fontSize: "15px", color: "var(--text-primary)", textAlign: "center", fontWeight: 600, boxSizing: "border-box", marginBottom: "12px", letterSpacing: "-0.01em" }}
        />
        <button onClick={() => { if (name.trim()) onDone(name.trim()); }} disabled={!name.trim()} style={{ width: "100%", padding: "13px", borderRadius: "var(--radius-sm)", background: "var(--brand)", color: "#fff", fontSize: "14px", fontWeight: 600, opacity: name.trim() ? 1 : 0.35, transition: "opacity 0.15s", letterSpacing: "-0.01em", boxShadow: "var(--shadow-sm)", border: "none" }}>
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
  const [suppliers, setSuppliers]     = useState(() => loadSuppliers());
  const [page, setPage]               = useState("Count");
  const [items, setItems]             = useState([]);
  const [counts, setCounts]           = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null);

  const t = STRINGS[lang];
  // Merge categories from items.js AND supplier names so new suppliers show up in Items tab
  const allCategories = [...new Set([
    ...itemsData.map((i) => i.category),
    ...Object.keys(suppliers),
  ])];

  const NAV = [
    { id: "Count",       iconName: "count",    label: t.navCount    },
    { id: "Overview",    iconName: "overview", label: t.navOverview },
    { id: "History",     iconName: "history",  label: t.navHistory  },
    { id: "Dashboard",   iconName: "stats",    label: t.navStats    },
    { id: "Predictions", iconName: "ai",       label: t.navAI       },
    { id: "Manage",      iconName: "manage",   label: t.navManage   },
  ];

  function toggleLang() {
    const next = lang === "en" ? "zh" : "en";
    setLang(next); localStorage.setItem("jr_lang", next);
  }

  function handleNameDone(name) {
    localStorage.setItem("jr_user", name); setUserName(name);
  }

  function handleUpdateSuppliers(updated) {
    saveSuppliers(updated); setSuppliers(updated);
  }

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      // Always use itemsData as the master item list (category, name, days, type)
      // Firebase history is for stock values only — never override item structure from it
      setItems(itemsData);
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
      const itemsToSave = items.map((item) => ({ ...item, stock: counts[countKey(item)] ?? "" }));
      await addDoc(collection(db, "inventoryHistory"), {
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: new Date(),
        savedBy: userName || "—",
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

  function showToast(message, type = "success") { setToast({ message, type, key: Date.now() }); }
  function handleCountChange(item, value) { setCounts((prev) => ({ ...prev, [countKey(item)]: value })); }

  if (!userName) return <NameSetup onDone={handleNameDone} t={t} lang={lang} onToggleLang={toggleLang} />;

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "14px", background: "var(--bg)" }}>
        <div style={{ width: 32, height: 32, border: "2.5px solid var(--border)", borderTopColor: "var(--brand-mid)", borderRadius: "50%", animation: "spin 0.65s linear infinite" }} />
        <div style={{ fontSize: "13px", color: "var(--text-faint)", fontWeight: 500 }}>{t.loading}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {toast && <Toast key={toast.key} message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── Top header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "rgba(255,255,255,0.88)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px", height: "var(--top-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {/* Left: logo + user */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 34, height: 34, borderRadius: "10px",
            background: "var(--brand)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Icon name="coffee" size={17} color="#fff" strokeWidth={1.6} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
              Jenna Rose
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "1px" }}>
              <Icon name="user" size={10} color="var(--brand-light)" strokeWidth={1.8} />
              <span style={{ fontSize: "10px", color: "var(--brand-light)", fontWeight: 600 }}>{userName}</span>
            </div>
          </div>
        </div>

        {/* Right: lang toggle + date */}
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          <button onClick={toggleLang} style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "5px 10px",
            borderRadius: "var(--radius-full)",
            border: "1.5px solid var(--border)",
            background: "var(--surface2)",
            fontSize: "11px", fontWeight: 600,
            color: "var(--text-secondary)",
            letterSpacing: "0.01em",
          }}>
            <Icon name="globe" size={12} color="var(--text-muted)" strokeWidth={1.6} />
            {lang === "en" ? "EN" : "中文"}
          </button>
          <div style={{
            fontSize: "11px", color: "var(--text-faint)",
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
            padding: "4px 10px", fontWeight: 500,
          }}>
            {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
          </div>
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{ flex: 1, padding: "16px 14px", paddingBottom: `calc(var(--nav-h) + 16px)`, overflowY: "auto" }}>
        {page === "Count"       && <CountPage       t={t} items={items} counts={counts} onCountChange={handleCountChange} onSave={saveInventory} historyData={historyData} />}
        {page === "Overview"    && <OverviewPage    t={t} historyData={historyData} suppliers={suppliers} />}
        {page === "History"     && <HistoryPage     t={t} historyData={historyData} />}
        {page === "Dashboard"   && <DashboardPage   t={t} historyData={historyData} items={items} />}
        {page === "Predictions" && <PredictionsPage t={t} historyData={historyData} items={items} />}
        {page === "Manage"      && <ManagePage      t={t} items={items} setItems={setItems} allCategories={allCategories} onToast={showToast} userName={userName} onChangeName={(n) => { localStorage.setItem("jr_user", n); setUserName(n); }} suppliers={suppliers} onUpdateSuppliers={handleUpdateSuppliers} />}
      </div>

      {/* ── Bottom nav ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px", height: "var(--nav-h)",
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        display: "flex", zIndex: 150,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {NAV.map(({ id, iconName, label }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => setPage(id)} style={{
              flex: 1,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "4px",
              background: "none", border: "none",
              color: active ? "var(--brand)" : "var(--text-faint)",
              fontSize: "9.5px", fontWeight: active ? 600 : 400,
              letterSpacing: "0.02em",
              position: "relative",
              transition: "color 0.15s",
              paddingTop: "2px",
            }}>
              {/* Active pill indicator */}
              {active && (
                <div style={{
                  position: "absolute", top: 0, left: "28%", right: "28%",
                  height: "2px",
                  background: "var(--brand)",
                  borderRadius: "0 0 2px 2px",
                }} />
              )}
              {/* Active icon background */}
              <div style={{
                padding: "5px 10px",
                borderRadius: "var(--radius-sm)",
                background: active ? "var(--brand-ghost)" : "transparent",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon
                  name={iconName}
                  size={19}
                  color={active ? "var(--brand)" : "var(--text-faint)"}
                  strokeWidth={active ? 2 : 1.5}
                />
              </div>
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
