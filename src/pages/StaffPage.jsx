import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase.js";
import { Card } from "../components/UI.jsx";

const DEPTS = ["frontend", "kitchen"];

export default function StaffPage({ t, onToast }) {
  const isZH = t.appSub === "库存系统";
  const [staff, setStaff]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [form, setForm]         = useState({ name:"", username:"", password:"", dept:"frontend" });
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    try {
      const snap = await getDocs(collection(db, "staff"));
      setStaff(snap.docs.map(d => ({ ...d.data(), docId: d.id })));
    } catch { setStaff([]); }
    setLoading(false);
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      onToast(isZH ? "请填写所有栏位" : "Please fill all fields", "error"); return;
    }
    // Check duplicate username
    if (staff.find(s => s.username === form.username.trim().toLowerCase())) {
      onToast(isZH ? "用户名已存在" : "Username already exists", "error"); return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "staff"), {
        name:     form.name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password.trim(),
        dept:     form.dept,
        active:   true,
        isAdmin:  false,
        createdAt: new Date(),
      });
      onToast(isZH ? "员工已添加 ✓" : "Staff added ✓", "success");
      setForm({ name:"", username:"", password:"", dept:"frontend" });
      setShowAdd(false);
      await loadStaff();
    } catch { onToast(isZH ? "添加失败" : "Failed", "error"); }
    setSaving(false);
  }

  async function toggleActive(staffMember) {
    try {
      await updateDoc(doc(db, "staff", staffMember.docId), { active: !staffMember.active });
      onToast(
        staffMember.active
          ? (isZH ? "已停用" : "Disabled")
          : (isZH ? "已启用" : "Enabled"),
        "info"
      );
      await loadStaff();
    } catch { onToast(isZH ? "操作失败" : "Failed", "error"); }
  }

  async function handleDelete(staffMember) {
    if (!window.confirm(isZH ? `确定删除 ${staffMember.name}？` : `Delete ${staffMember.name}?`)) return;
    try {
      await deleteDoc(doc(db, "staff", staffMember.docId));
      onToast(isZH ? "已删除" : "Deleted", "info");
      await loadStaff();
    } catch { onToast(isZH ? "删除失败" : "Failed", "error"); }
  }

  async function resetPassword(staffMember, newPw) {
    if (!newPw.trim()) return;
    try {
      await updateDoc(doc(db, "staff", staffMember.docId), { password: newPw.trim() });
      onToast(isZH ? "密码已重置 ✓" : "Password reset ✓", "success");
    } catch { onToast(isZH ? "失败" : "Failed", "error"); }
  }

  if (loading) return <div style={{ textAlign:"center", padding:"32px", color:"var(--text-faint)" }}>...</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>

      {/* Staff list */}
      {staff.length === 0 ? (
        <div style={{ textAlign:"center", padding:"32px", color:"var(--text-faint)", fontSize:"13px" }}>
          {isZH ? "还没有员工账号" : "No staff accounts yet"}
        </div>
      ) : (
        <Card>
          {staff.map((s, idx) => (
            <StaffRow
              key={s.docId}
              staff={s}
              isLast={idx === staff.length - 1}
              isZH={isZH}
              onToggle={() => toggleActive(s)}
              onDelete={() => handleDelete(s)}
              onResetPw={(pw) => resetPassword(s, pw)}
            />
          ))}
        </Card>
      )}

      {/* Add staff */}
      {showAdd ? (
        <Card style={{ padding:"14px" }}>
          <div style={{ fontWeight:600, fontSize:"13px", color:"var(--text-primary)", marginBottom:"14px" }}>
            {isZH ? "添加员工" : "Add Staff"}
          </div>
          {[
            { label: isZH ? "真实名字" : "Full Name", key:"name", placeholder: isZH ? "例：Amy" : "e.g. Amy" },
            { label: isZH ? "用户名（登入用）" : "Username", key:"username", placeholder: isZH ? "例：amy（小写）" : "e.g. amy" },
            { label: isZH ? "密码" : "Password", key:"password", placeholder: isZH ? "设一个密码" : "Set a password", type:"password" },
          ].map(({ label, key, placeholder, type }) => (
            <div key={key} style={{ marginBottom:"10px" }}>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", fontWeight:600, marginBottom:"5px" }}>{label}</div>
              <input
                type={type || "text"}
                placeholder={placeholder}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                style={{ width:"100%", padding:"10px 12px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"13px", boxSizing:"border-box" }}
              />
            </div>
          ))}
          <div style={{ marginBottom:"14px" }}>
            <div style={{ fontSize:"11px", color:"var(--text-muted)", fontWeight:600, marginBottom:"5px" }}>
              {isZH ? "部门" : "Department"}
            </div>
            <select value={form.dept} onChange={e => setForm(p => ({ ...p, dept: e.target.value }))}
              style={{ width:"100%", padding:"10px 12px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"13px" }}>
              <option value="frontend">{isZH ? "前台" : "Front of House"}</option>
              <option value="kitchen">{isZH ? "厨房" : "Kitchen"}</option>
            </select>
          </div>
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:"11px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"13px", fontWeight:600, color:"var(--text-secondary)", cursor:"pointer" }}>
              {isZH ? "取消" : "Cancel"}
            </button>
            <button onClick={handleAdd} disabled={saving} style={{ flex:2, padding:"11px", borderRadius:"var(--radius-sm)", background:"var(--brand)", color:"#fff", fontSize:"13px", fontWeight:600, border:"none", cursor:"pointer" }}>
              {saving ? "..." : (isZH ? "添加" : "Add")}
            </button>
          </div>
        </Card>
      ) : (
        <button onClick={() => setShowAdd(true)} style={{ width:"100%", padding:"13px", borderRadius:"var(--radius-md)", background:"var(--brand-ghost)", color:"var(--brand)", border:"1.5px dashed var(--brand-pale)", fontSize:"13px", fontWeight:600, cursor:"pointer" }}>
          + {isZH ? "添加员工" : "Add Staff"}
        </button>
      )}
    </div>
  );
}

function StaffRow({ staff, isLast, isZH, onToggle, onDelete, onResetPw }) {
  const [expanded, setExpanded] = useState(false);
  const [newPw, setNewPw]       = useState("");

  return (
    <div style={{ borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
      <div style={{ display:"flex", alignItems:"center", padding:"12px 14px", gap:"10px" }}>
        {/* Avatar */}
        <div style={{ width:34, height:34, borderRadius:"50%", background: staff.active ? "var(--brand-ghost)" : "var(--surface2)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:"14px", fontWeight:700, color: staff.active ? "var(--brand)" : "var(--text-faint)" }}>
          {staff.name?.[0]?.toUpperCase() ?? "?"}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:600, fontSize:"13px", color: staff.active ? "var(--text-primary)" : "var(--text-faint)", display:"flex", alignItems:"center", gap:"6px" }}>
            {staff.name}
            {staff.isAdmin && <span style={{ fontSize:"9px", background:"var(--brand)", color:"#fff", borderRadius:"var(--radius-full)", padding:"1px 6px" }}>Admin</span>}
            {!staff.active && <span style={{ fontSize:"9px", background:"var(--red-100)", color:"var(--red-600)", borderRadius:"var(--radius-full)", padding:"1px 6px" }}>{isZH ? "已停用" : "Disabled"}</span>}
          </div>
          <div style={{ fontSize:"10px", color:"var(--text-faint)", marginTop:"1px" }}>
            @{staff.username} · {staff.dept === "kitchen" ? (isZH ? "厨房" : "Kitchen") : (isZH ? "前台" : "Front")}
          </div>
        </div>
        <button onClick={() => setExpanded(p => !p)} style={{ fontSize:"11px", color:"var(--text-muted)", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:"var(--radius-full)", padding:"4px 10px", cursor:"pointer" }}>
          {expanded ? (isZH ? "收起" : "Close") : (isZH ? "管理" : "Manage")}
        </button>
      </div>

      {expanded && (
        <div style={{ padding:"0 14px 14px", display:"flex", flexDirection:"column", gap:"8px" }}>
          {/* Reset password */}
          <div style={{ display:"flex", gap:"8px" }}>
            <input type="password" placeholder={isZH ? "新密码" : "New password"} value={newPw}
              onChange={e => setNewPw(e.target.value)}
              style={{ flex:1, padding:"8px 10px", borderRadius:"var(--radius-sm)", border:"1.5px solid var(--border)", background:"var(--surface2)", fontSize:"12px" }}
            />
            <button onClick={() => { onResetPw(newPw); setNewPw(""); }} style={{ padding:"8px 12px", borderRadius:"var(--radius-sm)", background:"var(--brand-ghost)", color:"var(--brand)", border:"1px solid var(--brand-pale)", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>
              {isZH ? "重置密码" : "Reset PW"}
            </button>
          </div>
          {/* Toggle + Delete */}
          <div style={{ display:"flex", gap:"8px" }}>
            <button onClick={onToggle} style={{ flex:1, padding:"9px", borderRadius:"var(--radius-sm)", background: staff.active ? "var(--amber-50)" : "var(--green-50)", color: staff.active ? "var(--amber-600)" : "var(--green-700)", border:`1px solid ${staff.active ? "var(--amber-100)" : "var(--green-100)"}`, fontSize:"12px", fontWeight:600, cursor:"pointer" }}>
              {staff.active ? (isZH ? "停用" : "Disable") : (isZH ? "启用" : "Enable")}
            </button>
            <button onClick={onDelete} style={{ flex:1, padding:"9px", borderRadius:"var(--radius-sm)", background:"var(--red-50)", color:"var(--red-600)", border:"1px solid var(--red-100)", fontSize:"12px", fontWeight:600, cursor:"pointer" }}>
              {isZH ? "删除" : "Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
