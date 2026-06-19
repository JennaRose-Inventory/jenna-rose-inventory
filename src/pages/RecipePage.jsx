import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { collection, getDocs, setDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase.js";

const T = {
  en: { search:"Search code or name…", ingredients:"Ingredients", steps:"Steps", notes:"Notes",
        edit:"Edit", save:"Save", cancel:"Cancel", done:"Done", delete:"Delete",
        addDrink:"Add drink", addCat:"Add category", addTab:"Add tab",
        deleteSelected:"Delete selected", selectAll:"Select all", deselectAll:"Deselect all",
        loading:"Loading…", noResults:(q)=>`No results for "${q}"`,
        confirmDelete:(n)=>`Delete ${n} drink${n>1?"s":""}?`, confirm:"Confirm",
        tabName:"Tab name", catName:"Category name", name:"Name", code:"Code",
        image:"Photo / Emoji", category:"Category", addIngr:"+ Add ingredient",
        addStep:"+ Add step", item:"Item", qty:"Amount", notesHint:"Notes (optional)",
        uploading:"Uploading…", noCategory:"No category yet — add one first",
        editTabs:"Edit tabs", manageTabs:"Manage Tabs",
      },
  zh: { search:"搜索代码或名称…", ingredients:"材料", steps:"步骤", notes:"备注",
        edit:"编辑", save:"保存", cancel:"取消", done:"完成", delete:"删除",
        addDrink:"新增饮品", addCat:"新增分类", addTab:"新建标签",
        deleteSelected:"删除所选", selectAll:"全选", deselectAll:"取消全选",
        loading:"加载中…", noResults:(q)=>`没有找到"${q}"`,
        confirmDelete:(n)=>`删除 ${n} 个饮品？`, confirm:"确认",
        tabName:"标签名称", catName:"分类名称", name:"名称", code:"代码",
        image:"图片 / Emoji", category:"分类", addIngr:"+ 添加材料",
        addStep:"+ 添加步骤", item:"材料", qty:"用量", notesHint:"备注（可选）",
        uploading:"上传中…", noCategory:"还没有分类，请先添加",
        editTabs:"编辑标签", manageTabs:"管理标签",
      },
};

const DEFAULT_GROUPS = [{ id:"grp_coffee", name:"Coffee", order:0 }];
const DEFAULT_CATS = [
  { id:"cat_signature", name:"Signature",      group:"grp_coffee", order:0 },
  { id:"cat_classic",   name:"Classic Italian", group:"grp_coffee", order:1 },
  { id:"cat_latte",     name:"Latte",           group:"grp_coffee", order:2 },
  { id:"cat_dirty",     name:"Dirty",           group:"grp_coffee", order:3 },
  { id:"cat_frappe",    name:"Frappe",          group:"grp_coffee", order:4 },
];
const SEED_RECIPES = [
  { id:"E1",  code:"E1",  name:"Sicilian Summer",            catId:"cat_signature", groupId:"grp_coffee", image:"🍋", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Honey",qty:""},{item:"Lemon",qty:""},{item:"Sparkling water",qty:""}], steps:[], notes:"" },
  { id:"E2",  code:"E2",  name:"Yuzu Spark Americano",       catId:"cat_signature", groupId:"grp_coffee", image:"🟡", ingredients:[{item:"Yuzu syrup",qty:""},{item:"Espresso",qty:"2 shots"},{item:"Sparkling water",qty:""}], steps:[], notes:"" },
  { id:"E3",  code:"E3",  name:"Sunlit Americano",           catId:"cat_signature", groupId:"grp_coffee", image:"🍊", ingredients:[{item:"Orange",qty:""},{item:"Lime",qty:""},{item:"Espresso",qty:"2 shots"}], steps:[], notes:"" },
  { id:"E4",  code:"E4",  name:"Cappuccino Brulee",          catId:"cat_signature", groupId:"grp_coffee", image:"🔥", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Steamed milk",qty:""},{item:"Milk foam",qty:"Thick"},{item:"Brulee sugar",qty:"1 tsp"}], steps:[], notes:"" },
  { id:"E5",  code:"E5",  name:"Pistachio Einspänner Latte", catId:"cat_signature", groupId:"grp_coffee", image:"🍵", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Pistachio syrup",qty:""},{item:"Heavy cream",qty:""},{item:"Milk",qty:""}], steps:[], notes:"" },
  { id:"E6",  code:"E6",  name:"Cloud Einspänner Latte",     catId:"cat_signature", groupId:"grp_coffee", image:"☁️", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Heavy cream",qty:""},{item:"Milk",qty:""}], steps:[], notes:"" },
  { id:"E7",  code:"E7",  name:"Affogato Deluxe",            catId:"cat_signature", groupId:"grp_coffee", image:"🍨", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Vanilla ice cream",qty:"2 scoops"},{item:"Wafer",qty:"1 pc"}], steps:[], notes:"Serve immediately." },
  { id:"E8",  code:"E8",  name:"Shakerato",          catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Ice",qty:"Full cup"}], steps:[], notes:"" },
  { id:"E9",  code:"E9",  name:"Americano",          catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Hot/cold water",qty:"150ml"}], steps:[], notes:"" },
  { id:"E10", code:"E10", name:"Cappuccino",         catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Steamed milk",qty:"100ml"},{item:"Milk foam",qty:"Thick layer"}], steps:[], notes:"" },
  { id:"E11", code:"E11", name:"Caramel Machiatto",  catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Steamed milk",qty:"150ml"},{item:"Vanilla syrup",qty:""},{item:"Caramel drizzle",qty:""}], steps:[], notes:"" },
  { id:"E12", code:"E12", name:"Mocha",              catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Chocolate sauce",qty:""},{item:"Steamed milk",qty:"150ml"}], steps:[], notes:"" },
  { id:"E13", code:"E13", name:"Belgium Dark Mocha", catId:"cat_classic", groupId:"grp_coffee", image:"☕", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Dark chocolate sauce",qty:""},{item:"Steamed milk",qty:"150ml"}], steps:[], notes:"" },
  { id:"E14", code:"E14", name:"Classic Latte",      catId:"cat_latte", groupId:"grp_coffee", image:"🥛", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Steamed milk",qty:"200ml"}], steps:[], notes:"No sugar." },
  { id:"E15", code:"E15", name:"Oat Latte",          catId:"cat_latte", groupId:"grp_coffee", image:"🥛", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Oat milk",qty:"200ml"}], steps:[], notes:"" },
  { id:"E16", code:"E16", name:"Coconut Latte",      catId:"cat_latte", groupId:"grp_coffee", image:"🥛", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Coconut milk",qty:""}], steps:[], notes:"" },
  { id:"E17", code:"E17", name:"Rose Latte",         catId:"cat_latte", groupId:"grp_coffee", image:"🌹", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Rose syrup",qty:""},{item:"Steamed milk",qty:""}], steps:[], notes:"" },
  { id:"E18", code:"E18", name:"Hazelnut Latte",     catId:"cat_latte", groupId:"grp_coffee", image:"🥛", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Hazelnut syrup",qty:""},{item:"Steamed milk",qty:""}], steps:[], notes:"" },
  { id:"E19", code:"E19", name:"Spanish Latte",      catId:"cat_latte", groupId:"grp_coffee", image:"🥛", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Condensed milk",qty:""},{item:"Steamed milk",qty:""}], steps:[], notes:"" },
  { id:"E20", code:"E20", name:"Camellia Tea Latte", catId:"cat_latte", groupId:"grp_coffee", image:"🌸", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Camellia tea",qty:""},{item:"Steamed milk",qty:""}], steps:[], notes:"" },
  { id:"E21", code:"E21", name:"JR Dirty",       catId:"cat_dirty", groupId:"grp_coffee", image:"💧", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Fresh milk",qty:""},{item:"Ice",qty:"Full cup"}], steps:[], notes:"Don't stir — layered look is the point." },
  { id:"E22", code:"E22", name:"Oat Dirty",      catId:"cat_dirty", groupId:"grp_coffee", image:"💧", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Oat milk",qty:""},{item:"Ice",qty:"Full cup"}], steps:[], notes:"" },
  { id:"E23", code:"E23", name:"Coconut Dirty",  catId:"cat_dirty", groupId:"grp_coffee", image:"💧", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Coconut milk",qty:""},{item:"Ice",qty:"Full cup"}], steps:[], notes:"" },
  { id:"E24", code:"E24", name:"Latte Frappe",           catId:"cat_frappe", groupId:"grp_coffee", image:"🧊", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Milk",qty:""},{item:"Ice",qty:"1 cup"}], steps:[], notes:"" },
  { id:"E25", code:"E25", name:"Caramel Latte Frappe",   catId:"cat_frappe", groupId:"grp_coffee", image:"🧊", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Caramel syrup",qty:""},{item:"Milk",qty:""},{item:"Ice",qty:"1 cup"}], steps:[], notes:"" },
  { id:"E26", code:"E26", name:"Hazelnut Latte Frappe",  catId:"cat_frappe", groupId:"grp_coffee", image:"🧊", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Hazelnut syrup",qty:""},{item:"Milk",qty:""},{item:"Ice",qty:"1 cup"}], steps:[], notes:"" },
  { id:"E27", code:"E27", name:"Dark Mocha Frappe",      catId:"cat_frappe", groupId:"grp_coffee", image:"🧊", ingredients:[{item:"Espresso",qty:"2 shots"},{item:"Dark chocolate sauce",qty:""},{item:"Milk",qty:""},{item:"Ice",qty:"1 cup"}], steps:[], notes:"" },
];

function isUrl(v) { return v && (v.startsWith("http")||v.startsWith("/")||v.startsWith("data:")); }

// ── Shared modal shell ─────────────────────────────────────────────────────────
function Modal({ title, onClose, footer, children, maxWidth = 440 }) {
  return createPortal(
    <div style={{ position:"fixed", inset:0, zIndex:700, background:"rgba(28,20,16,0.45)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={onClose}>
      <div style={{ background:"var(--surface)", borderRadius:24, width:"100%", maxWidth, maxHeight:"88dvh", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 60px rgba(28,20,16,0.25)" }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontWeight:700, fontSize:16, color:"var(--text-primary)", letterSpacing:"-0.02em" }}>{title}</span>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:"50%", border:"none", background:"var(--surface3)", color:"var(--text-muted)", fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ overflowY:"auto", padding:"16px 20px", flex:1 }}>{children}</div>
        {footer && <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border)", flexShrink:0 }}>{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ── Image uploader ─────────────────────────────────────────────────────────────
function ImageUploader({ value, onChange, t }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  async function handleFile(e) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setError("");
    try {
      const sRef = storageRef(storage, `recipes/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      onChange(await getDownloadURL(sRef));
    } catch(err) {
      console.error(err);
      setError(err.code || err.message || "Upload failed");
    }
    setUploading(false);
    e.target.value = "";
  }
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center" }}>
      <input type="file" accept="image/*" ref={fileRef} style={{ display:"none" }} onChange={handleFile} />
      <div onClick={() => fileRef.current?.click()} style={{ width:72, height:72, borderRadius:16, border:"1.5px dashed var(--border2)", background:"var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", overflow:"hidden", flexShrink:0 }}>
        {uploading ? <span style={{ fontSize:11, color:"var(--text-faint)" }}>{t.uploading}</span>
          : isUrl(value) ? <img src={value} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          : <span style={{ fontSize:32 }}>{value || "☕"}</span>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4 }}>{t.image}</div>
        <input value={isUrl(value) ? "" : (value||"")} onChange={e => onChange(e.target.value)} placeholder="emoji or tap photo to upload"
          style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, color:"var(--text-primary)", fontFamily:"inherit" }} />
        {error && <div style={{ fontSize:11, color:"var(--red-600)", marginTop:4, wordBreak:"break-all" }}>{error}</div>}
      </div>
    </div>
  );
}

// ── Edit / Add recipe modal ────────────────────────────────────────────────────
function RecipeModal({ recipe, groups, categories, onSave, onDelete, onClose, t }) {
  const isNew = !recipe?.id;
  const initGrp = recipe?.groupId || groups[0]?.id || "";
  const initCat = recipe?.catId   || categories.filter(c => c.group === initGrp)[0]?.id || "";
  const [form, setForm] = useState({
    id: recipe?.id||"", code: recipe?.code||"", name: recipe?.name||"",
    groupId: initGrp, catId: initCat, image: recipe?.image||"☕",
    ingredients: (recipe?.ingredients||[]).map(i=>({...i})),
    steps: [...(recipe?.steps||[])], notes: recipe?.notes||"",
  });
  const [confirmDel, setConfirmDel] = useState(false);
  const grpCats = categories.filter(c => c.group === form.groupId);

  function setIngr(i, f, v) { setForm(p => ({ ...p, ingredients: p.ingredients.map((r,j)=>j===i?{...r,[f]:v}:r) })); }
  function addIngr()   { setForm(p => ({ ...p, ingredients:[...p.ingredients,{item:"",qty:""}] })); }
  function delIngr(i)  { setForm(p => ({ ...p, ingredients:p.ingredients.filter((_,j)=>j!==i) })); }
  function setStep(i,v){ setForm(p => ({ ...p, steps:p.steps.map((s,j)=>j===i?v:s) })); }
  function addStep()   { setForm(p => ({ ...p, steps:[...p.steps,""] })); }
  function delStep(i)  { setForm(p => ({ ...p, steps:p.steps.filter((_,j)=>j!==i) })); }
  function handleSave(){ onSave({ ...form, id: form.id||form.code||`r_${Date.now()}` }); }

  return (
    <Modal title={isNew ? t.addDrink : `${t.edit} · ${form.code}`} onClose={onClose}
      footer={
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={btnStyle("ghost")}>{t.cancel}</button>
          <button onClick={handleSave} style={{ ...btnStyle("brand"), flex:2 }}>{t.save}</button>
        </div>
      }>
      {/* Image + code + name */}
      <ImageUploader value={form.image} onChange={v => setForm(p=>({...p,image:v}))} t={t} />
      <div style={{ display:"grid", gridTemplateColumns:"80px 1fr", gap:8, marginTop:12 }}>
        <div><FL>{t.code}</FL><FI value={form.code} set={v=>setForm(p=>({...p,code:v}))} placeholder="E1" /></div>
        <div><FL>{t.name}</FL><FI value={form.name} set={v=>setForm(p=>({...p,name:v}))} /></div>
      </div>

      {/* Group + Category */}
      <FL style={{ marginTop:12 }}>{t.category}</FL>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:6 }}>
        {groups.map(g => (
          <Pill key={g.id} active={form.groupId===g.id}
            onClick={() => setForm(p=>({ ...p, groupId:g.id, catId:categories.filter(c=>c.group===g.id)[0]?.id||"" }))}>
            {g.name}
          </Pill>
        ))}
      </div>
      {grpCats.length === 0
        ? <div style={{ fontSize:12, color:"var(--text-faint)", padding:"6px 0" }}>{t.noCategory}</div>
        : <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {grpCats.map(c => (
              <Pill key={c.id} active={form.catId===c.id} soft onClick={() => setForm(p=>({...p,catId:c.id}))}>{c.name}</Pill>
            ))}
          </div>
      }

      {/* Ingredients */}
      <SL style={{ marginTop:16 }}>{t.ingredients}</SL>
      {form.ingredients.map((ingr, i) => (
        <div key={i} style={{ display:"flex", gap:6, marginBottom:6, alignItems:"center" }}>
          <FI value={ingr.item} set={v=>setIngr(i,"item",v)} placeholder={t.item} style={{ flex:2 }} />
          <FI value={ingr.qty}  set={v=>setIngr(i,"qty",v)}  placeholder={t.qty}  style={{ flex:1 }} />
          <XBtn onClick={()=>delIngr(i)} />
        </div>
      ))}
      <DashBtn onClick={addIngr}>{t.addIngr}</DashBtn>

      {/* Steps */}
      <SL style={{ marginTop:14 }}>{t.steps}</SL>
      {form.steps.map((step, i) => (
        <div key={i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
          <div style={{ width:22, height:22, borderRadius:"50%", background:"var(--brand)", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:8 }}>{i+1}</div>
          <textarea value={step} onChange={e=>setStep(i,e.target.value)} rows={2}
            style={{ flex:1, padding:"8px 10px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, color:"var(--text-primary)", resize:"none", fontFamily:"inherit" }} />
          <XBtn onClick={()=>delStep(i)} />
        </div>
      ))}
      <DashBtn onClick={addStep}>{t.addStep}</DashBtn>

      {/* Notes */}
      <SL style={{ marginTop:14 }}>{t.notes}</SL>
      <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
        placeholder={t.notesHint}
        style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, resize:"none", fontFamily:"inherit", color:"var(--text-primary)" }} />

      {/* Delete */}
      {!isNew && (
        <div style={{ marginTop:16 }}>
          {confirmDel
            ? <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>onDelete(recipe.id)} style={{ ...btnStyle("danger"), flex:1 }}>{t.confirm}</button>
                <button onClick={()=>setConfirmDel(false)} style={{ ...btnStyle("ghost"), flex:1 }}>{t.cancel}</button>
              </div>
            : <button onClick={()=>setConfirmDel(true)} style={btnStyle("danger-ghost")}>{t.delete}</button>
          }
        </div>
      )}
    </Modal>
  );
}

// ── Manage tabs modal ──────────────────────────────────────────────────────────
function ManageTabsModal({ groups, categories, onSave, onClose, t }) {
  const [grps, setGrps] = useState(groups.map(g=>({...g})));
  const [cats, setCats] = useState(categories.map(c=>({...c})));
  const [activeGrp, setActiveGrp] = useState(groups[0]?.id||"");
  const [newGrp, setNewGrp] = useState("");
  const [newCat, setNewCat] = useState("");

  const grpCats = cats.filter(c => c.group === activeGrp);

  function addGrp() {
    if (!newGrp.trim()) return;
    const id = "grp_"+Date.now();
    setGrps(g => [...g, { id, name:newGrp.trim(), order:g.length }]);
    setActiveGrp(id); setNewGrp("");
  }
  function addCat() {
    if (!newCat.trim()) return;
    setCats(c => [...c, { id:"cat_"+Date.now(), name:newCat.trim(), group:activeGrp, order:grpCats.length }]);
    setNewCat("");
  }

  return (
    <Modal title={t.manageTabs} onClose={onClose}
      footer={<button onClick={()=>onSave(grps,cats)} style={btnStyle("brand")}>{t.done}</button>}>

      {/* Tabs row */}
      <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>Tabs</div>
      <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:4 }}>
        {grps.map((g,i) => (
          <div key={g.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
            <button onClick={()=>setActiveGrp(g.id)}
              style={{ width:10, height:10, borderRadius:"50%", border:"none", padding:0, cursor:"pointer", background: activeGrp===g.id ? "var(--brand)" : "var(--border2)", flexShrink:0 }} />
            <input value={g.name} onChange={e=>setGrps(v=>v.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
              style={{ flex:1, ...inputStyle }} />
            <XBtn onClick={()=>{ setGrps(v=>v.filter(x=>x.id!==g.id)); if(activeGrp===g.id) setActiveGrp(grps[0]?.id||""); }} />
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:20 }}>
        <input value={newGrp} onChange={e=>setNewGrp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGrp()}
          placeholder={t.tabName} style={{ flex:1, ...inputStyle, border:"1.5px dashed var(--border2)" }} />
        <button onClick={addGrp} style={{ ...btnStyle("soft"), width:"auto", flexShrink:0 }}>{t.addTab}</button>
      </div>

      {/* Categories for active tab */}
      {activeGrp && <>
        <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.05em" }}>
          Categories · {grps.find(g=>g.id===activeGrp)?.name}
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:4 }}>
          {grpCats.map(c => (
            <div key={c.id} style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={c.name} onChange={e=>setCats(v=>v.map(x=>x.id===c.id?{...x,name:e.target.value}:x))}
                style={{ flex:1, ...inputStyle }} />
              <XBtn onClick={()=>setCats(v=>v.filter(x=>x.id!==c.id))} />
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <input value={newCat} onChange={e=>setNewCat(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCat()}
            placeholder={t.catName} style={{ flex:1, ...inputStyle, border:"1.5px dashed var(--border2)" }} />
          <button onClick={addCat} style={{ ...btnStyle("soft"), width:"auto", flexShrink:0 }}>{t.addCat}</button>
        </div>
      </>}
    </Modal>
  );
}

// ── Detail view ────────────────────────────────────────────────────────────────
function RecipeDetail({ recipe, categories, lang, onBack, onEdit }) {
  const t = T[lang];
  const cat = categories.find(c => c.id === recipe.catId);
  return (
    <div style={{ margin:"-16px -14px", background:"#f0e8dc", minHeight:"100dvh" }}>
      {/* Hero image */}
      <div style={{ position:"relative", width:"100%", paddingBottom:"72%", background:"#ddd0be", overflow:"hidden" }}>
        {isUrl(recipe.image)
          ? <img src={recipe.image} alt={recipe.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:80, filter:"drop-shadow(0 4px 24px rgba(0,0,0,0.4))" }}>{recipe.image||"☕"}</span>
            </div>}
        {/* Gradient overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(61,25,8,0.15) 0%, rgba(61,25,8,0.0) 40%, rgba(61,25,8,0.82) 100%)" }} />
        {/* Back button */}
        <button onClick={onBack} style={{ position:"absolute", top:16, left:16, width:38, height:38, borderRadius:12, border:"none", background:"rgba(26,14,6,0.55)", backdropFilter:"blur(12px)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="#f5ede0" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        {/* Edit button */}
        <button onClick={onEdit} style={{ position:"absolute", top:16, right:16, display:"flex", alignItems:"center", gap:5, padding:"7px 13px", borderRadius:20, border:"none", background:"rgba(26,14,6,0.55)", backdropFilter:"blur(12px)", color:"#f5ede0", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          <svg viewBox="0 0 24 24" width={11} height={11} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          {t.edit}
        </button>
        {/* Name overlay */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"0 20px 20px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"rgba(200,149,106,0.8)", letterSpacing:"0.18em", textTransform:"uppercase", marginBottom:5 }}>{recipe.code} · {cat?.name}</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#f5ede0", letterSpacing:"-0.02em", lineHeight:1.2 }}>{recipe.name}</div>
        </div>
      </div>

      {/* Content card */}
      <div style={{ padding:"22px 18px 32px" }}>
        {/* Ingredients */}
        {recipe.ingredients?.length > 0 && (
          <DarkSection title={t.ingredients}>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {recipe.ingredients.map((ingr, i) => (
                <div key={i} style={{ background:"#fff", borderRadius:12, padding:"8px 12px", border:"1px solid #e4d8ca" }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#2a1a0d" }}>{ingr.item}</div>
                  {ingr.qty && <div style={{ fontSize:11, color:"#b07840", marginTop:2 }}>{ingr.qty}</div>}
                </div>
              ))}
            </div>
          </DarkSection>
        )}

        {/* Steps */}
        {recipe.steps?.length > 0 && (
          <DarkSection title={t.steps}>
            {recipe.steps.map((step, i) => (
              <div key={i} style={{ display:"flex", gap:12, marginBottom: i<recipe.steps.length-1 ? 16 : 0 }}>
                <div style={{ width:24, height:24, borderRadius:"50%", background:"#c8956a", color:"#1a0e06", fontSize:11, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:2 }}>{i+1}</div>
                <div style={{ flex:1 }}>
                  {i < recipe.steps.length-1 && <div style={{ position:"absolute", marginLeft:11, marginTop:26, width:2, height:16, background:"rgba(200,149,106,0.2)" }} />}
                  <span style={{ fontSize:14, color:"#3d2314", lineHeight:1.6 }}>{step}</span>
                </div>
              </div>
            ))}
          </DarkSection>
        )}

        {recipe.notes && (
          <div style={{ background:"#fff8ed", borderRadius:14, border:"1px solid #f0dcb8", padding:"12px 14px", display:"flex", gap:10, marginTop:4 }}>
            <span style={{ fontSize:15 }}>💡</span>
            <span style={{ fontSize:13, color:"#8a5a20", lineHeight:1.55 }}>{recipe.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Recipe card ────────────────────────────────────────────────────────────────
function RecipeCard({ recipe, editMode, selected, onSelect, onTap }) {
  return (
    <button onClick={() => editMode ? onSelect(recipe.id) : onTap(recipe)}
      style={{ background:"#fff", border: selected ? "2px solid #b07840" : "1px solid #e4d8ca", borderRadius:18, overflow:"hidden", cursor:"pointer", textAlign:"left", display:"flex", flexDirection:"column", width:"100%", boxShadow: selected ? "0 0 0 3px rgba(176,120,64,0.2)" : "0 2px 10px rgba(61,35,20,0.1)", transition:"all 0.15s" }}>
      <div style={{ position:"relative", width:"100%", paddingBottom:"115%", background:"#e8ddd0" }}>
        {isUrl(recipe.image)
          ? <img src={recipe.image} alt={recipe.name} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover" }} />
          : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:38 }}>{recipe.image||"☕"}</span>
            </div>}
        {/* Gradient overlay */}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 35%, rgba(61,25,8,0.78) 100%)" }} />
        {/* Code badge */}
        <div style={{ position:"absolute", top:8, left:8, background:"rgba(255,248,240,0.88)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.5)", color:"#3d2314", fontSize:9, fontWeight:800, padding:"3px 7px", borderRadius:8, letterSpacing:"0.1em" }}>{recipe.code}</div>
        {/* Select checkmark */}
        {editMode && (
          <div style={{ position:"absolute", top:8, right:8, width:22, height:22, borderRadius:"50%", background: selected ? "#c8956a" : "rgba(26,14,6,0.6)", border: selected ? "none" : "1.5px solid rgba(200,149,106,0.4)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            {selected && <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="#1a0e06" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
        )}
        {/* Name overlay at bottom */}
        <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"8px 10px 10px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#f5ede0", lineHeight:1.25, textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>{recipe.name}</div>
        </div>
      </div>
    </button>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function RecipePage({ lang = "en" }) {
  const t = T[lang];
  const [groups,     setGroups]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [recipes,    setRecipes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeGrp,  setActiveGrp]  = useState(null);
  const [search,     setSearch]     = useState("");
  const [selected,   setSelected]   = useState(null);   // detail view
  const [editing,    setEditing]    = useState(false);  // recipe edit modal
  const [addingNew,  setAddingNew]  = useState(false);
  const [mngTabs,    setMngTabs]    = useState(false);
  const [editMode,   setEditMode]   = useState(false);  // bulk select mode
  const [selIds,     setSelIds]     = useState(new Set());
  const [confirmBulkDel, setConfirmBulkDel] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const gSnap = await getDocs(collection(db,"recipeGroups"));
      let grps = gSnap.empty ? DEFAULT_GROUPS : gSnap.docs.map(d=>d.data()).sort((a,b)=>(a.order||0)-(b.order||0));
      if (gSnap.empty) await Promise.all(DEFAULT_GROUPS.map((g,i)=>setDoc(doc(db,"recipeGroups",g.id),{...g,order:i})));
      setGroups(grps); setActiveGrp(grps[0]?.id||null);

      const cSnap = await getDocs(collection(db,"recipeCategories"));
      let cats;
      if (cSnap.empty) {
        cats = DEFAULT_CATS;
        await Promise.all(DEFAULT_CATS.map((c,i)=>setDoc(doc(db,"recipeCategories",c.id),{...c,order:i})));
      } else {
        cats = cSnap.docs.map(d=>d.data()).sort((a,b)=>(a.order||0)-(b.order||0));
        const isNew = cats.every(c=>c.group?.startsWith("grp_"));
        if (!isNew) {
          cats = DEFAULT_CATS;
          await Promise.all(DEFAULT_CATS.map((c,i)=>setDoc(doc(db,"recipeCategories",c.id),{...c,order:i})));
        }
      }
      setCategories(cats);

      const rSnap = await getDocs(collection(db,"recipes"));
      if (rSnap.empty) {
        await Promise.all(SEED_RECIPES.map(r=>setDoc(doc(db,"recipes",r.id),r)));
        setRecipes(SEED_RECIPES);
      } else {
        let data = rSnap.docs.map(d=>d.data());
        const CAT_MAP = {"Classic Italian":"cat_classic","Latte":"cat_latte","Frappe":"cat_frappe","Dirty":"cat_dirty","Special":"cat_signature","Signature":"cat_signature"};
        const needsMigration = data.some(r=>!r.catId&&r.category);
        if (needsMigration) {
          data = data.map(r => {
            if (r.catId) return r;
            const updated = {...r, catId:CAT_MAP[r.category]||"cat_classic", groupId:"grp_coffee", name:r.name||r.nameEN||""};
            setDoc(doc(db,"recipes",updated.id),updated);
            return updated;
          });
        }
        data.sort((a,b)=>{
          const na=parseInt((a.code||"").replace(/\D/g,""),10)||0;
          const nb=parseInt((b.code||"").replace(/\D/g,""),10)||0;
          return na-nb;
        });
        setRecipes(data);
      }
    } catch(err) { console.error(err); setRecipes(SEED_RECIPES); }
    setLoading(false);
  }

  async function handleSaveRecipe(form) {
    try {
      await setDoc(doc(db,"recipes",form.id),form);
      setRecipes(prev=>prev.find(r=>r.id===form.id)?prev.map(r=>r.id===form.id?form:r):[...prev,form]);
      if (form.groupId) setActiveGrp(form.groupId);
      setSelected(form); setEditing(false); setAddingNew(false);
    } catch(err) { console.error(err); }
  }

  async function handleDeleteRecipe(id) {
    try {
      await deleteDoc(doc(db,"recipes",id));
      setRecipes(prev=>prev.filter(r=>r.id!==id));
      setEditing(false); setSelected(null);
    } catch(err) { console.error(err); }
  }

  async function handleBulkDelete() {
    try {
      const batch = writeBatch(db);
      selIds.forEach(id => batch.delete(doc(db,"recipes",id)));
      await batch.commit();
      setRecipes(prev=>prev.filter(r=>!selIds.has(r.id)));
      setSelIds(new Set()); setEditMode(false); setConfirmBulkDel(false);
    } catch(err) { console.error(err); }
  }

  async function handleSaveTabs(grps, cats) {
    try {
      await Promise.all(grps.map((g,i)=>setDoc(doc(db,"recipeGroups",g.id),{...g,order:i})));
      await Promise.all(cats.map((c,i)=>setDoc(doc(db,"recipeCategories",c.id),{...c,order:i})));
      setGroups(grps); setCategories(cats); setMngTabs(false);
      if (!grps.find(g=>g.id===activeGrp)) setActiveGrp(grps[0]?.id||null);
    } catch(err) { console.error(err); }
  }

  function toggleSel(id) {
    setSelIds(prev => { const s=new Set(prev); s.has(id)?s.delete(id):s.add(id); return s; });
  }

  const q = search.trim().toLowerCase();
  const searchResults = q ? recipes.filter(r=>r.code?.toLowerCase().startsWith(q)||r.name?.toLowerCase().includes(q)) : null;

  if (loading) return (
    <div style={{ margin:"-16px -14px", background:"#f0e8dc", display:"flex", alignItems:"center", justifyContent:"center", height:"60dvh", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:36 }}>☕</div>
      <div style={{ width:28, height:28, border:"2.5px solid #ddd0c0", borderTopColor:"#b07840", borderRadius:"50%", animation:"spin 0.65s linear infinite" }} />
    </div>
  );

  // Detail view
  if (selected) return (
    <>
      <RecipeDetail recipe={selected} categories={categories} lang={lang} onBack={()=>{setSelected(null);setEditing(false);}} onEdit={()=>setEditing(true)} />
      {editing && <RecipeModal recipe={selected} groups={groups} categories={categories} onSave={handleSaveRecipe} onDelete={handleDeleteRecipe} onClose={()=>setEditing(false)} t={t} />}
    </>
  );

  const activeCats = categories.filter(c=>c.group===activeGrp);
  const activeCatIds = new Set(activeCats.map(c=>c.id));
  const groupRecipes = searchResults || recipes;

  return (
    <div style={{ margin:"-16px -14px", background:"#f0e8dc", minHeight:"100dvh", padding:"16px 14px 8px" }}>


      {/* Header row */}
      <div style={{ display:"flex", gap:8, marginBottom:16, alignItems:"center" }}>
        <div style={{ position:"relative", flex:1 }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="#b09070" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
            style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search}
            style={{ width:"100%", boxSizing:"border-box", padding:"11px 11px 11px 34px", borderRadius:14, border:"1.5px solid #ddd0c0", background:"#fff", fontSize:13, color:"#2a1a0d", fontFamily:"inherit", outline:"none" }} />
          {search && <button onClick={()=>setSearch("")} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#b09070", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>}
        </div>
        <button onClick={()=>{ setEditMode(e=>!e); setSelIds(new Set()); setConfirmBulkDel(false); }}
          style={{ width:42, height:42, borderRadius:13, border:`1.5px solid ${editMode?"#b07840":"#ddd0c0"}`, background: editMode?"rgba(176,120,64,0.1)":"#fff", color: editMode?"#b07840":"#b09070", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>

      {/* Edit toolbar */}
      {editMode && (
        <div style={{ background:"rgba(176,120,64,0.08)", border:"1.5px solid rgba(176,120,64,0.2)", borderRadius:14, padding:"10px 12px", marginBottom:14, display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <button onClick={()=>setAddingNew(true)} style={dkBtn("gold-sm")}>+ {t.addDrink}</button>
          <button onClick={()=>setMngTabs(true)} style={dkBtn("ghost-sm")}>{t.editTabs}</button>
          <div style={{ flex:1 }} />
          {selIds.size > 0 && (
            confirmBulkDel
              ? <>
                  <button onClick={handleBulkDelete} style={dkBtn("danger-sm")}>{t.confirm} ({selIds.size})</button>
                  <button onClick={()=>setConfirmBulkDel(false)} style={dkBtn("ghost-sm")}>{t.cancel}</button>
                </>
              : <>
                  <button onClick={()=>setSelIds(new Set(groupRecipes.map(r=>r.id)))} style={dkBtn("ghost-sm")}>{t.selectAll}</button>
                  <button onClick={()=>setConfirmBulkDel(true)} style={dkBtn("danger-sm")}>{t.delete} ({selIds.size})</button>
                </>
          )}
        </div>
      )}

      {/* Group tabs */}
      {!searchResults && (
        <div style={{ display:"flex", gap:6, overflowX:"auto", marginBottom:20, scrollbarWidth:"none", paddingBottom:2 }}>
          {groups.map(g => (
            <button key={g.id} onClick={()=>setActiveGrp(g.id)}
              style={{ padding:"8px 20px", borderRadius:20, border:"none", background: activeGrp===g.id ? "#3d2314" : "#fff", color: activeGrp===g.id ? "#f5ede0" : "#7a5540", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, letterSpacing:"0.01em", boxShadow: activeGrp===g.id ? "0 2px 12px rgba(61,35,20,0.3)" : "0 1px 4px rgba(0,0,0,0.06)", transition:"all 0.15s" }}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Recipe grid */}
      {searchResults ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
          {searchResults.length===0 && <div style={{ gridColumn:"1/-1", textAlign:"center", color:"#b09070", fontSize:14, paddingTop:32 }}>{t.noResults(search)}</div>}
          {searchResults.map(r=><RecipeCard key={r.id} recipe={r} editMode={editMode} selected={selIds.has(r.id)} onSelect={toggleSel} onTap={setSelected} />)}
        </div>
      ) : (
        <>
          {activeCats.map(cat => {
            const items = recipes.filter(r=>r.catId===cat.id);
            if (!items.length) return null;
            return (
              <div key={cat.id} style={{ marginBottom:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#b07840", letterSpacing:"0.12em", textTransform:"uppercase" }}>{cat.name}</span>
                  <div style={{ flex:1, height:1, background:"rgba(176,120,64,0.2)" }} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                  {items.map(r=><RecipeCard key={r.id} recipe={r} editMode={editMode} selected={selIds.has(r.id)} onSelect={toggleSel} onTap={setSelected} />)}
                </div>
              </div>
            );
          })}
          {(() => {
            const orphans = recipes.filter(r=>r.groupId===activeGrp&&!activeCatIds.has(r.catId));
            if (!orphans.length) return null;
            return (
              <div style={{ marginBottom:28 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:"#b07840", letterSpacing:"0.12em", textTransform:"uppercase" }}>Other</span>
                  <div style={{ flex:1, height:1, background:"rgba(176,120,64,0.2)" }} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
                  {orphans.map(r=><RecipeCard key={r.id} recipe={r} editMode={editMode} selected={selIds.has(r.id)} onSelect={toggleSel} onTap={setSelected} />)}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* Modals */}
      {(editing||addingNew) && (
        <RecipeModal
          recipe={addingNew ? {groupId:activeGrp, catId:activeCats[0]?.id||""} : selected}
          groups={groups} categories={categories}
          onSave={handleSaveRecipe} onDelete={handleDeleteRecipe}
          onClose={()=>{setEditing(false);setAddingNew(false);}} t={t} />
      )}
      {mngTabs && <ManageTabsModal groups={groups} categories={categories} onSave={handleSaveTabs} onClose={()=>setMngTabs(false)} t={t} />}
      {confirmBulkDel && (
        <Modal title={t.confirmDelete(selIds.size)} onClose={()=>setConfirmBulkDel(false)}
          footer={<div style={{display:"flex",gap:8}}><button onClick={()=>setConfirmBulkDel(false)} style={btnStyle("ghost")}>{t.cancel}</button><button onClick={handleBulkDelete} style={{...btnStyle("danger"),flex:1}}>{t.confirm}</button></div>}>
          <div style={{ color:"var(--text-secondary)", fontSize:14 }}>This cannot be undone.</div>
        </Modal>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ background:"var(--surface)", borderRadius:16, border:"1px solid var(--border)", padding:"14px 16px", marginBottom:12 }}>
      <div style={{ fontWeight:700, fontSize:11, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}
function DarkSection({ title, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:10, fontWeight:700, color:"#b07840", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:10 }}>{title}</div>
      {children}
    </div>
  );
}
function dkBtn(variant) {
  const base = { borderRadius:8, fontWeight:600, cursor:"pointer", border:"none", fontSize:12, padding:"6px 12px", width:"auto" };
  if (variant==="gold-sm")   return {...base, background:"#3d2314", color:"#f5ede0"};
  if (variant==="ghost-sm")  return {...base, background:"#fff", color:"#5c3a20", border:"1px solid #ddd0c0"};
  if (variant==="danger-sm") return {...base, background:"#fff0f0", color:"#dc2626", border:"1px solid #fcd0d0"};
  return base;
}
function Pill({ children, active, soft, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:"5px 12px", borderRadius:20, border:"none", background: active ? (soft?"var(--brand-ghost)":"var(--brand)") : "var(--surface2)", color: active ? (soft?"var(--brand)":"#fff") : "var(--text-secondary)", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.12s" }}>
      {children}
    </button>
  );
}
function FL({ children, style }) {
  return <div style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", marginBottom:4, letterSpacing:"0.03em", ...style }}>{children}</div>;
}
function SL({ children, style }) {
  return <div style={{ fontWeight:700, fontSize:11, color:"var(--text-secondary)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6, ...style }}>{children}</div>;
}
function FI({ value, set, placeholder, style }) {
  return <input value={value} onChange={e=>set(e.target.value)} placeholder={placeholder}
    style={{ flex:1, padding:"9px 11px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, color:"var(--text-primary)", fontFamily:"inherit", width:"100%", boxSizing:"border-box", ...style }} />;
}
function XBtn({ onClick }) {
  return <button onClick={onClick} style={{ width:28, height:28, borderRadius:8, border:"none", background:"var(--surface3)", color:"var(--text-muted)", fontSize:15, cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>;
}
function DashBtn({ onClick, children }) {
  return <button onClick={onClick} style={{ width:"100%", padding:"8px", borderRadius:8, border:"1.5px dashed var(--border2)", background:"transparent", color:"var(--text-muted)", fontSize:12, cursor:"pointer", marginTop:2 }}>{children}</button>;
}
const inputStyle = { padding:"9px 11px", borderRadius:8, border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:13, color:"var(--text-primary)", fontFamily:"inherit", width:"100%", boxSizing:"border-box" };
function btnStyle(variant) {
  const base = { borderRadius:10, fontWeight:600, cursor:"pointer", border:"none", fontSize:13, padding:"10px 16px", display:"block", width:"100%", textAlign:"center" };
  if (variant==="brand")        return {...base, background:"var(--brand)", color:"#fff"};
  if (variant==="brand-sm")     return {...base, padding:"6px 12px", fontSize:12, width:"auto", background:"var(--brand)", color:"#fff", borderRadius:8};
  if (variant==="soft")         return {...base, background:"var(--brand-ghost)", color:"var(--brand)", border:"none"};
  if (variant==="soft-sm")      return {...base, padding:"6px 12px", fontSize:12, width:"auto", background:"var(--surface)", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:8};
  if (variant==="ghost")        return {...base, background:"none", color:"var(--text-secondary)", border:"1.5px solid var(--border)"};
  if (variant==="ghost-sm")     return {...base, padding:"6px 12px", fontSize:12, width:"auto", background:"none", color:"var(--text-secondary)", border:"1.5px solid var(--border)", borderRadius:8};
  if (variant==="danger")       return {...base, background:"var(--red-600)", color:"#fff"};
  if (variant==="danger-sm")    return {...base, padding:"6px 12px", fontSize:12, width:"auto", background:"var(--red-100)", color:"var(--red-600)", borderRadius:8};
  if (variant==="danger-ghost") return {...base, background:"var(--red-50)", color:"var(--red-600)", border:"1.5px solid var(--red-100)"};
  return base;
}
