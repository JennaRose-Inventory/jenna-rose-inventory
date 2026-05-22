import { useState, useEffect } from "react";
import {
  collection, addDoc, getDocs,
  query, orderBy, limit,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { itemsData } from "./data/items.js";
import { countKey } from "./utils/helpers.js";
import Toast from "./components/Toast.jsx";

import CountPage       from "./pages/CountPage.jsx";
import OverviewPage    from "./pages/OverviewPage.jsx";
import HistoryPage     from "./pages/HistoryPage.jsx";
import DashboardPage   from "./pages/DashboardPage.jsx";
import PredictionsPage from "./pages/PredictionsPage.jsx";
import ManagePage      from "./pages/ManagePage.jsx";

const NAV = [
  { id: "Count",       icon: "📋", label: "Count"    },
  { id: "Overview",    icon: "👁",  label: "Overview" },
  { id: "Dashboard",   icon: "📊", label: "Stats"    },
  { id: "Predictions", icon: "🤖", label: "AI"       },
  { id: "History",     icon: "🕐", label: "History"  },
  { id: "Manage",      icon: "⚙️", label: "Manage"   },
];

export default function App() {
  const [page, setPage]               = useState("Count");
  const [items, setItems]             = useState([]);
  const [counts, setCounts]           = useState({});
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [toast, setToast]             = useState(null); // { message, type }

  const allCategories = [...new Set(itemsData.map((i) => i.category))];

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const q1 = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"), limit(1));
      const snap1 = await getDocs(q1);
      setItems(snap1.empty ? itemsData : snap1.docs[0].data().items);
    } catch {
      setItems(itemsData);
    }

    try {
      const q2 = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap2 = await getDocs(q2);
      setHistoryData(snap2.docs.map((d) => d.data()));
    } catch {
      setHistoryData([]);
    }

    setCounts({});
    setLoading(false);
  }

  async function reloadHistory() {
    try {
      const q = query(collection(db, "inventoryHistory"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setHistoryData(snap.docs.map((d) => d.data()));
    } catch { /* silent */ }
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
        items: itemsToSave,
      });
      setCounts({});
      await reloadHistory();
      showToast("Inventory saved successfully!", "success");
    } catch (err) {
      console.error(err);
      showToast("Save failed. Please try again.", "error");
    }
  }

  function showToast(message, type = "success") {
    setToast({ message, type, key: Date.now() });
  }

  function handleCountChange(item, value) {
    setCounts((prev) => ({ ...prev, [countKey(item)]: value }));
  }

  if (loading) {
    return (
      <div style={{
        minHeight: "100dvh", display: "flex",
        alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: "12px",
        background: "var(--bg)",
      }}>
        <div style={{
          width: 36, height: 36,
          border: "3px solid var(--border)",
          borderTopColor: "var(--brown-500)",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading inventory…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", flexDirection: "column" }}>

      {/* ── Toast ── */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onDone={() => setToast(null)}
        />
      )}

      {/* ── Top header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 200,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0 16px",
        height: "var(--top-h)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "var(--shadow-sm)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "20px" }}>☕</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.1 }}>
              Jenna Rose
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Inventory System</div>
          </div>
        </div>
        <div style={{
          fontSize: "11px", color: "var(--text-muted)",
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-full)",
          padding: "3px 10px",
        }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{
        flex: 1,
        padding: "16px 14px",
        paddingBottom: `calc(var(--nav-h) + 16px)`,
        overflowY: "auto",
      }}>
        {page === "Count"       && <CountPage       items={items} counts={counts} onCountChange={handleCountChange} onSave={saveInventory} />}
        {page === "Overview"    && <OverviewPage    historyData={historyData} />}
        {page === "Dashboard"   && <DashboardPage   historyData={historyData} items={items} />}
        {page === "Predictions" && <PredictionsPage historyData={historyData} items={items} />}
        {page === "History"     && <HistoryPage     historyData={historyData} />}
        {page === "Manage"      && (
          <ManagePage
            items={items}
            setItems={setItems}
            allCategories={allCategories}
            onToast={showToast}
          />
        )}
      </div>

      {/* ── Bottom nav ── */}
      <nav style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px",
        height: "var(--nav-h)",
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        zIndex: 150,
        boxShadow: "0 -4px 16px rgba(44,26,14,0.08)",
      }}>
        {NAV.map(({ id, icon, label }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "2px",
                background: "none", border: "none",
                color: active ? "var(--brown-700)" : "var(--text-muted)",
                fontSize: "9px", fontWeight: active ? 700 : 500,
                letterSpacing: "0.03em",
                position: "relative",
                transition: "color 0.15s",
              }}
            >
              {active && (
                <div style={{
                  position: "absolute", top: 0, left: "20%", right: "20%",
                  height: "2px",
                  background: "var(--brown-700)",
                  borderRadius: "0 0 3px 3px",
                }} />
              )}
              <span style={{ fontSize: "18px", lineHeight: 1 }}>{icon}</span>
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
