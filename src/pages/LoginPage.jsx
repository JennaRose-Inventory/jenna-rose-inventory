import { useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase.js";
import { Icon } from "../components/UI.jsx";

export default function LoginPage({ onLogin, lang, onToggleLang }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const isZH = lang === "zh";

  async function handleLogin() {
    if (!username.trim() || !password.trim()) {
      setError(isZH ? "请填写用户名和密码" : "Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const q = query(
        collection(db, "staff"),
        where("username", "==", username.trim().toLowerCase()),
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setError(isZH ? "用户名或密码错误" : "Invalid username or password");
        setLoading(false);
        return;
      }
      const staffDoc  = snap.docs[0];
      const staffData = staffDoc.data();

      if (!staffData.active) {
        setError(isZH ? "账号已被停用，请联系管理员" : "Account disabled. Contact your manager.");
        setLoading(false);
        return;
      }

      if (staffData.password !== password) {
        setError(isZH ? "用户名或密码错误" : "Invalid username or password");
        setLoading(false);
        return;
      }

      // Login success
      onLogin({
        docId:    staffDoc.id,
        username: staffData.username,
        name:     staffData.name,
        dept:     staffData.dept ?? null,
        isAdmin:  staffData.isAdmin ?? false,
      });
    } catch (err) {
      console.error(err);
      setError(isZH ? "网络错误，请重试" : "Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100dvh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px" }}>
      <div style={{ background:"var(--surface)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border)", boxShadow:"var(--shadow-lg)", padding:"36px 28px", width:"100%", maxWidth:"340px" }}>

        {/* Lang toggle */}
        <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:"16px" }}>
          <button onClick={onToggleLang} style={{ fontSize:"12px", fontWeight:600, color:"var(--text-muted)", background:"var(--surface2)", border:"1.5px solid var(--border)", borderRadius:"var(--radius-full)", padding:"4px 12px", cursor:"pointer" }}>
            {lang === "en" ? "🇨🇳 中文" : "🇬🇧 EN"}
          </button>
        </div>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ width:56, height:56, borderRadius:"16px", background:"var(--brand)", margin:"0 auto 14px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon name="coffee" size={26} color="#fff" strokeWidth={1.5} />
          </div>
          <div style={{ fontWeight:700, fontSize:"20px", color:"var(--text-primary)", letterSpacing:"-0.03em" }}>Jenna Rose</div>
          <div style={{ fontSize:"12px", color:"var(--text-muted)", marginTop:"4px" }}>
            {isZH ? "请登入" : "Sign in to continue"}
          </div>
        </div>

        {/* Username */}
        <div style={{ marginBottom:"12px" }}>
          <div style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", marginBottom:"5px" }}>
            {isZH ? "用户名" : "Username"}
          </div>
          <input
            autoFocus
            placeholder={isZH ? "输入用户名" : "Enter username"}
            value={username}
            onChange={e => { setUsername(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width:"100%", padding:"11px 14px", borderRadius:"var(--radius-sm)", border:`1.5px solid ${error ? "var(--red-500)" : "var(--border)"}`, background:"var(--surface2)", fontSize:"14px", color:"var(--text-primary)", boxSizing:"border-box", letterSpacing:"-0.01em" }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom:"18px" }}>
          <div style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", marginBottom:"5px" }}>
            {isZH ? "密码" : "Password"}
          </div>
          <div style={{ position:"relative" }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder={isZH ? "输入密码" : "Enter password"}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{ width:"100%", padding:"11px 40px 11px 14px", borderRadius:"var(--radius-sm)", border:`1.5px solid ${error ? "var(--red-500)" : "var(--border)"}`, background:"var(--surface2)", fontSize:"14px", color:"var(--text-primary)", boxSizing:"border-box", letterSpacing:"-0.01em" }}
            />
            <button onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:"14px", color:"var(--text-faint)", padding:"2px" }}>
              {showPw ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize:"12px", color:"var(--red-600)", background:"var(--red-50)", border:"1px solid var(--red-100)", borderRadius:"var(--radius-sm)", padding:"8px 12px", marginBottom:"14px", textAlign:"center" }}>
            {error}
          </div>
        )}

        {/* Login button */}
        <button onClick={handleLogin} disabled={loading} style={{ width:"100%", padding:"13px", borderRadius:"var(--radius-sm)", background:"var(--brand)", color:"#fff", fontSize:"14px", fontWeight:600, border:"none", opacity: loading ? 0.6 : 1, cursor: loading ? "default" : "pointer", letterSpacing:"-0.01em" }}>
          {loading ? (isZH ? "验证中..." : "Signing in...") : (isZH ? "登入" : "Sign In")}
        </button>

      </div>
    </div>
  );
}
