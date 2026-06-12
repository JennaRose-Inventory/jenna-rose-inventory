import { useState } from "react";
import { Card } from "../components/UI.jsx";
import { stockColor, isLowStock } from "../utils/helpers.js";

function shortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : dateStr;
}

export default function HistoryPage({ t, historyData, freshMap = {} }) {
  const records = historyData.slice(0, 14);
  const isZH = t.appSub === "库存系统";

  // Build full map: { category: { name: [{ date, stock, savedBy }] } }
  const historyMap = {};
  records.forEach((record) => {
    (record.items ?? []).forEach((item) => {
      if (!historyMap[item.category]) historyMap[item.category] = {};
      if (!historyMap[item.category][item.name]) historyMap[item.category][item.name] = [];
      const s = item.stock;
      if (s !== "" && s !== null && s !== undefined) {
        historyMap[item.category][item.name].push({
          date:    record.date,   // full date for restock comparison
          dateShort: shortDate(record.date),
          stock:   s,
          savedBy: record.savedBy || null,
        });
      }
    });
  });

  const categories = Object.keys(historyMap);
  const [activeTab, setActiveTab] = useState(categories[0] ?? "");
  const [search, setSearch]       = useState("");

  function handleTabChange(cat) { setActiveTab(cat); setSearch(""); }

  const tabItems = historyMap[activeTab] ?? {};
  const filtered = search
    ? Object.fromEntries(
        Object.entries(tabItems).filter(([name]) =>
          name.toLowerCase().includes(search.toLowerCase())
        )
      )
    : tabItems;

  function stockDisplay(val) {
    if (val === "Enough")     return { label:"✓",           color:"var(--green-500)" };
    if (val === "Need Order") return { label:"⚠ Need Order", color:"var(--red-600)"  };
    return { label:String(val), color:stockColor(val) };
  }

  if (categories.length === 0) {
    return (
      <div className="page-enter" style={{ textAlign:"center", padding:"48px 20px", color:"var(--text-muted)", fontSize:"13px" }}>
        {t.noHistory}
      </div>
    );
  }

  return (
    <div className="page-enter" style={{ paddingBottom:"24px" }}>

      {/* Search */}
      <div style={{ position:"relative", marginBottom:"12px" }}>
        <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", fontSize:"13px", opacity:0.35, pointerEvents:"none" }}>⌕</span>
        <input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width:"100%", padding:"9px 12px 9px 32px", borderRadius:"var(--radius-md)", border:"1.5px solid var(--border)", background:"var(--surface)", fontSize:"13px", color:"var(--text-primary)", boxSizing:"border-box", boxShadow:"var(--shadow-xs)" }}
        />
      </div>

      {/* Category tabs */}
      <div style={{ display:"flex", gap:"6px", overflowX:"auto", paddingBottom:"2px", marginBottom:"14px", scrollbarWidth:"none" }}>
        {categories.map((cat) => (
          <button key={cat} onClick={() => handleTabChange(cat)} style={{
            padding:"6px 12px", borderRadius:"var(--radius-full)",
            background: activeTab === cat ? "var(--brand)" : "var(--surface)",
            color: activeTab === cat ? "#fff" : "var(--text-muted)",
            fontSize:"11px", fontWeight: activeTab === cat ? 700 : 500,
            border:`1.5px solid ${activeTab === cat ? "var(--brand)" : "var(--border)"}`,
            whiteSpace:"nowrap", flexShrink:0, transition:"all 0.15s",
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Items */}
      {Object.keys(filtered).length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px 20px", color:"var(--text-muted)", fontSize:"13px" }}>
          {search ? t.noMatch : t.noHistory}
        </div>
      ) : (
        <Card>
          {Object.keys(filtered).map((itemName, idx, arr) => {
            const entries    = filtered[itemName];
            const restockDate = freshMap[`${activeTab}||${itemName}`] ?? null;

            return (
              <div key={idx} style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--border)" : "none" }}>
                {/* Item name + restock date */}
                <div style={{ padding:"10px 14px 4px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ fontWeight:600, fontSize:"12px", color:"var(--text-primary)" }}>
                    {itemName}
                  </div>
                  {restockDate && (
                    <div style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                      <span style={{ fontSize:"9px", color:"var(--text-faint)" }}>
                        {isZH ? "最新收货" : "Last restock"}
                      </span>
                      <span style={{
                        fontSize:"10px", fontWeight:600,
                        color:"var(--brand-mid)",
                        background:"var(--brand-ghost)",
                        border:"1px solid var(--brand-pale)",
                        borderRadius:"var(--radius-full)",
                        padding:"1px 7px",
                      }}>
                        📦 {shortDate(restockDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Stock entries — date | stock */}
                {entries.map((e, i) => {
                  const { label, color } = stockDisplay(e.stock);
                  const low = isLowStock({ stock: e.stock });
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center",
                      padding:"7px 14px 7px 20px",
                      background: i % 2 === 0 ? "transparent" : "var(--surface2)",
                      borderTop:"1px solid var(--border)",
                    }}>
                      {/* Date */}
                      <div style={{ fontSize:"11px", color:"var(--text-faint)", width:"46px", flexShrink:0, fontFamily:"var(--font-mono)" }}>
                        {e.dateShort}
                      </div>
                      {/* Saved by */}
                      <div style={{ flex:1, fontSize:"10px", color:"var(--text-faint)", paddingLeft:"8px" }}>
                        {e.savedBy || ""}
                      </div>
                      {/* Stock */}
                      <div style={{
                        fontSize:"12px", fontWeight:700,
                        fontFamily:"var(--font-mono)",
                        color,
                      }}>
                        {label}
                      </div>
                    </div>
                  );
                })}
                <div style={{ height:"4px" }} />
              </div>
            );
          })}
        </Card>
      )}

      <div style={{ textAlign:"center", fontSize:"10px", color:"var(--text-faint)", padding:"10px 8px 0" }}>
        {t.historyFooter}
      </div>
    </div>
  );
}
