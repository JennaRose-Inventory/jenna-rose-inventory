import {
  useState,
  useEffect,
} from "react";

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";

import { db } from "./firebase.js";
import { itemsData } from "./data/items.js";

export default function App() {
  const [page, setPage] = useState("Count");
  const [selectedDay, setSelectedDay] = useState("Monday");
  const [search, setSearch] = useState("");

  // items = master list (structure, days, active). Stock from here is REFERENCE only.
  const [items, setItems] = useState([]);

  // counts = what staff keys in TODAY. Always starts empty ("").
  const [counts, setCounts] = useState({});

  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newItem, setNewItem] = useState({
    category: "RV Bakery",
    name: "",
    type: "quantity",
  });

  const [editItem, setEditItem] = useState({ category: "RV Bakery", name: "", type: "quantity" });
  const [archiveSelect, setArchiveSelect] = useState({ category: "RV Bakery", name: "" });

  const days = [
    "Monday","Tuesday","Wednesday",
    "Thursday","Friday","Saturday","Sunday",
  ];

  // All real categories from items.js
  const allCategories = [
    ...new Set(itemsData.map((i) => i.category)),
  ];

  useEffect(() => {
    loadItems();
    loadHistory();
  }, []);

  // Load master item list (structure only). Stock value is ignored for input.
  async function loadItems() {
    try {
      const q = query(
        collection(db, "inventoryHistory"),
        orderBy("createdAt", "desc"),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Use saved items for structure (active, days, category, name, type)
        // but do NOT prefill counts
        setItems(snapshot.docs[0].data().items);
      } else {
        setItems(itemsData);
      }
    } catch (error) {
      console.log(error);
      setItems(itemsData);
    }

    // Always start counts empty
    setCounts({});

    // Seed Manage dropdowns with first active item
    const sourceList = (() => {
      try { return itemsData; } catch { return []; }
    })();
    const firstActive = sourceList.find((i) => i.active !== false);
    if (firstActive) {
      setEditItem({ category: firstActive.category, name: firstActive.name, type: firstActive.type });
      setArchiveSelect({ category: firstActive.category, name: firstActive.name });
    }

    setLoading(false);
  }

  async function loadHistory() {
    try {
      const q = query(
        collection(db, "inventoryHistory"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      setHistoryData(snapshot.docs.map((doc) => doc.data()));
    } catch (error) {
      console.log(error);
    }
  }

  // count key: unique per item using category+name
  function countKey(item) {
    return `${item.category}||${item.name}`;
  }

  function updateCount(item, value) {
    setCounts((prev) => ({
      ...prev,
      [countKey(item)]: value,
    }));
  }

  async function saveInventory() {
    try {
      // Merge counts into items for saving to Firebase
      const itemsToSave = items.map((item) => ({
        ...item,
        stock: counts[countKey(item)] ?? "",
      }));

      await addDoc(collection(db, "inventoryHistory"), {
        date: new Date().toLocaleDateString("en-GB"),
        createdAt: new Date(),
        items: itemsToSave,
      });

      alert("Inventory Saved ✅");

      // Reset counts to empty after saving
      setCounts({});
      loadHistory();
    } catch (error) {
      console.log(error);
      alert("Save Failed ❌");
    }
  }

  function addItem() {
    if (!newItem.name.trim()) return;
    setItems([
      ...items,
      { ...newItem, stock: "", active: true, days },
    ]);
    setNewItem({ category: "RV Bakery", name: "", type: "quantity" });
  }

  function archiveItem(index) {
    const updated = [...items];
    updated[index].active = false;
    setItems(updated);
  }

  const activeItems = items.filter(
    (item) => item.active && item.days.includes(selectedDay)
  );

  const groupedItems = activeItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // History map
  const historyMap = {};
  historyData.forEach((record) => {
    record.items.forEach((item) => {
      if (!historyMap[item.category]) historyMap[item.category] = {};
      if (!historyMap[item.category][item.name])
        historyMap[item.category][item.name] = [];
      historyMap[item.category][item.name].push({
        date: record.date,
        stock: item.stock !== "" && item.stock !== null && item.stock !== undefined
          ? item.stock
          : "-",
      });
    });
  });

  const filteredHistory = Object.keys(historyMap).reduce((acc, category) => {
    const filtered = Object.keys(historyMap[category]).filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[category] = {};
      filtered.forEach((name) => {
        acc[category][name] = historyMap[category][name];
      });
    }
    return acc;
  }, {});

  const todayDate = new Date().toLocaleDateString("en-GB");

  const latestRecord = historyData[0];
  const overviewSource = latestRecord?.items ?? [];
  const overviewGrouped = overviewSource
    .filter((item) => item.active !== false)
    .reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f1eb",
        padding: "10px",
        paddingBottom: "100px",
        fontFamily: "sans-serif",
      }}
    >
      <h2 style={{ color: "#4b2e2e", fontSize: "20px", marginBottom: "10px" }}>
        ☕ Jenna Rose
      </h2>

      {/* NAV */}
      <div style={{ display: "flex", gap: "6px", overflowX: "auto", marginBottom: "15px" }}>
        {["Count", "Overview", "History", "Manage"].map((nav) => (
          <button
            key={nav}
            onClick={() => setPage(nav)}
            style={{
              padding: "6px 10px",
              border: "none",
              borderRadius: "8px",
              background: page === nav ? "#6f4e37" : "white",
              color: page === nav ? "white" : "#4b2e2e",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {nav}
          </button>
        ))}
      </div>

      {/* COUNT */}
      {page === "Count" && (
        <>
          {/* Day selector */}
          <div style={{ display: "flex", gap: "5px", overflowX: "auto", marginBottom: "15px" }}>
            {days.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                style={{
                  padding: "6px 10px",
                  border: "none",
                  borderRadius: "8px",
                  background: selectedDay === day ? "#6f4e37" : "white",
                  color: selectedDay === day ? "white" : "#4b2e2e",
                  fontSize: "11px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>

          {Object.keys(groupedItems).map((category) => (
            <div key={category} style={{ marginBottom: "15px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  color: "#6f4e37",
                  fontSize: "13px",
                }}
              >
                {category}
              </div>

              <div style={{ background: "white", borderRadius: "10px", overflow: "hidden" }}>
                {groupedItems[category].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "6px 10px",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div style={{ flex: 1, fontSize: "12px" }}>{item.name}</div>

                    {item.type === "quantity" ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={counts[countKey(item)] ?? ""}
                        placeholder="-"
                        onChange={(e) => updateCount(item, e.target.value)}
                        style={{
                          width: "52px",
                          padding: "4px",
                          fontSize: "12px",
                          textAlign: "center",
                          border: "1px solid #ccc",
                          borderRadius: "6px",
                        }}
                      />
                    ) : (
                      <select
                        value={counts[countKey(item)] ?? ""}
                        onChange={(e) => updateCount(item, e.target.value)}
                        style={{ fontSize: "11px" }}
                      >
                        <option value="">-</option>
                        <option value="Enough">Enough</option>
                        <option value="Need Order">Order</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={saveInventory}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "10px",
              background: "#6f4e37",
              color: "white",
              marginTop: "15px",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            Save
          </button>
        </>
      )}

      {/* OVERVIEW */}
      {page === "Overview" && (() => {
        // Take last 3 saved records (most recent first)
        const records = historyData.slice(0, 3);

        if (records.length === 0) {
          return (
            <div style={{ fontSize: "12px", color: "#999", padding: "10px" }}>
              No saved inventory yet. Fill in Count and press Save first.
            </div>
          );
        }

        // Build a lookup: record index → { "category||name": stock }
        const recordMaps = records.map((rec) => {
          const map = {};
          (rec.items ?? []).forEach((item) => {
            map[`${item.category}||${item.name}`] = item.stock;
          });
          return map;
        });

        // Collect all unique active items across all 3 records, preserving category order
        const seenKeys = new Set();
        const allItems = [];
        records.forEach((rec) => {
          (rec.items ?? []).forEach((item) => {
            const key = `${item.category}||${item.name}`;
            if (!seenKeys.has(key) && item.active !== false) {
              seenKeys.add(key);
              allItems.push({ category: item.category, name: item.name });
            }
          });
        });

        // Group by category
        const grouped = allItems.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        }, {});

        function valColor(val) {
          if (val === undefined || val === null || val === "") return "#bbb";
          if (val === "Need Order") return "#c0392b";
          if (val === "Enough") return "#2e7d32";
          const n = Number(val);
          if (!isNaN(n)) {
            if (n <= 2) return "#c0392b";
            if (n <= 6) return "#e67e22";
            return "#2e7d32";
          }
          return "#555";
        }

        function valDisplay(val) {
          if (val === undefined || val === null || val === "") return "-";
          return String(val);
        }

        // Short date label: "22/05" from "22/05/2025"
        function shortDate(dateStr) {
          if (!dateStr) return "-";
          const parts = dateStr.split("/");
          return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dateStr;
        }

        const colWidth = "36px";

        return (
          <>
            {/* Header row with dates */}
            <div style={{
              display: "flex",
              alignItems: "center",
              padding: "0 10px 8px 10px",
              marginBottom: "2px",
            }}>
              <div style={{ flex: 1 }} />
              {records.map((rec, i) => (
                <div key={i} style={{
                  width: colWidth,
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: i === 0 ? "#6f4e37" : "#999",
                  marginLeft: "6px",
                  lineHeight: "13px",
                }}>
                  {shortDate(rec.date)}
                  {i === 0 && (
                    <div style={{ fontSize: "9px", color: "#aaa", fontWeight: "normal" }}>latest</div>
                  )}
                </div>
              ))}
            </div>

            {Object.keys(grouped).map((category) => (
              <div key={category} style={{ marginBottom: "14px" }}>
                <div style={{
                  fontWeight: "bold",
                  marginBottom: "5px",
                  color: "#6f4e37",
                  fontSize: "13px",
                }}>
                  {category}
                </div>

                <div style={{ background: "white", borderRadius: "10px", overflow: "hidden" }}>
                  {grouped[category].map((item, index) => {
                    const key = `${item.category}||${item.name}`;
                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <div style={{ flex: 1, fontSize: "11px", color: "#333", paddingRight: "6px" }}>
                          {item.name}
                        </div>
                        {recordMaps.map((rmap, i) => {
                          const val = rmap[key];
                          const display = valDisplay(val);
                          return (
                            <div key={i} style={{
                              width: colWidth,
                              textAlign: "center",
                              fontSize: "11px",
                              fontWeight: i === 0 ? "bold" : "normal",
                              color: valColor(val),
                              marginLeft: "6px",
                              opacity: i === 0 ? 1 : 0.65,
                            }}>
                              {display}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        );
      })()}

      {/* HISTORY */}
      {page === "History" && (
        <>
          <input
            placeholder="Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              borderRadius: "10px",
              border: "1px solid #ccc",
              fontSize: "12px",
              boxSizing: "border-box",
            }}
          />

          {Object.keys(filteredHistory).map((category) => (
            <div key={category} style={{ marginBottom: "15px" }}>
              <div
                style={{
                  fontWeight: "bold",
                  marginBottom: "6px",
                  color: "#6f4e37",
                  fontSize: "13px",
                }}
              >
                {category}
              </div>

              <div style={{ background: "white", borderRadius: "10px", overflow: "hidden" }}>
                {Object.keys(filteredHistory[category]).map((itemName, index) => (
                  <div
                    key={index}
                    style={{ padding: "8px 10px", borderBottom: "1px solid #eee" }}
                  >
                    <div
                      style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "4px" }}
                    >
                      {itemName}
                    </div>
                    <div style={{ fontSize: "10px", color: "#666", lineHeight: "16px" }}>
                      {filteredHistory[category][itemName].map((record, i) => (
                        <div key={i}>
                          {record.date} {" → "} {record.stock}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* MANAGE */}
      {page === "Manage" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

          {/* ── SECTION 1: Change item type ── */}
          <div style={{ background: "white", padding: "12px", borderRadius: "10px" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "10px", color: "#4b2e2e" }}>
              ✏️ Change Input Type
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px" }}>
              Switch an item between number count and Enough / Need Order.
            </div>

            {/* Step 1: pick category */}
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Category</div>
            <select
              value={editItem.category}
              onChange={(e) => {
                const cat = e.target.value;
                const first = items.find((i) => i.active && i.category === cat);
                setEditItem({ category: cat, name: first?.name ?? "", type: first?.type ?? "quantity" });
              }}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Step 2: pick item from that category */}
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Item</div>
            <select
              value={editItem.name}
              onChange={(e) => {
                const name = e.target.value;
                const found = items.find((i) => i.category === editItem.category && i.name === name);
                setEditItem((prev) => ({ ...prev, name, type: found?.type ?? "quantity" }));
              }}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {items
                .filter((i) => i.active && i.category === editItem.category)
                .map((i) => (
                  <option key={i.name} value={i.name}>{i.name}</option>
                ))}
            </select>

            {/* Step 3: pick type */}
            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Input type</div>
            <select
              value={editItem.type}
              onChange={(e) => setEditItem((prev) => ({ ...prev, type: e.target.value }))}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              <option value="quantity">Number count</option>
              <option value="status">Enough / Need Order</option>
            </select>

            <button
              onClick={() => {
                const idx = items.findIndex(
                  (i) => i.category === editItem.category && i.name === editItem.name
                );
                if (idx === -1) return;
                const updated = [...items];
                updated[idx] = { ...updated[idx], type: editItem.type };
                setItems(updated);
                alert(`✅ "${editItem.name}" updated to ${editItem.type === "quantity" ? "Number count" : "Enough / Need Order"}`);
              }}
              style={{ width: "100%", padding: "10px", border: "none", borderRadius: "10px", background: "#6f4e37", color: "white", fontSize: "12px", cursor: "pointer" }}
            >
              Save Change
            </button>
          </div>

          {/* ── SECTION 2: Add new item ── */}
          <div style={{ background: "white", padding: "12px", borderRadius: "10px" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "10px", color: "#4b2e2e" }}>
              ➕ Add New Item
            </div>

            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Category</div>
            <select
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value, name: "" })}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Item name</div>
            <input
              placeholder="Type new item name..."
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc", boxSizing: "border-box" }}
            />

            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Input type</div>
            <select
              value={newItem.type}
              onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              <option value="quantity">Number count</option>
              <option value="status">Enough / Need Order</option>
            </select>

            <button
              onClick={addItem}
              style={{ width: "100%", padding: "10px", border: "none", borderRadius: "10px", background: "#6f4e37", color: "white", fontSize: "12px", cursor: "pointer" }}
            >
              Add Item
            </button>
          </div>

          {/* ── SECTION 3: Archive item ── */}
          <div style={{ background: "white", padding: "12px", borderRadius: "10px" }}>
            <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "10px", color: "#4b2e2e" }}>
              🗃️ Archive Item
            </div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px" }}>
              Archived items will no longer appear on Count or Overview.
            </div>

            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Category</div>
            <select
              value={archiveSelect.category}
              onChange={(e) => {
                const cat = e.target.value;
                const first = items.find((i) => i.active && i.category === cat);
                setArchiveSelect({ category: cat, name: first?.name ?? "" });
              }}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>Item</div>
            <select
              value={archiveSelect.name}
              onChange={(e) => setArchiveSelect((prev) => ({ ...prev, name: e.target.value }))}
              style={{ width: "100%", padding: "8px", marginBottom: "10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #ccc" }}
            >
              {items
                .filter((i) => i.active && i.category === archiveSelect.category)
                .map((i) => (
                  <option key={i.name} value={i.name}>{i.name}</option>
                ))}
            </select>

            <button
              onClick={() => {
                if (!archiveSelect.name) return;
                if (!window.confirm(`Archive "${archiveSelect.name}"? It will be hidden from Count and Overview.`)) return;
                const idx = items.findIndex(
                  (i) => i.category === archiveSelect.category && i.name === archiveSelect.name
                );
                if (idx !== -1) archiveItem(idx);
                const next = items.find((i) => i.active && i.category === archiveSelect.category && i.name !== archiveSelect.name);
                setArchiveSelect((prev) => ({ ...prev, name: next?.name ?? "" }));
              }}
              style={{ width: "100%", padding: "10px", border: "none", borderRadius: "10px", background: "#c0392b", color: "white", fontSize: "12px", cursor: "pointer" }}
            >
              Archive Item
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
