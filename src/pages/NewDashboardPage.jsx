import { useMemo, useState, useEffect } from "react";
import { isLowStock, lowStockTrend, buildItemHistoryMap, countKey } from "../utils/helpers.js";
import { subscribeReservations } from "../services/reservationService.js";
import { subscribeReminders }    from "../services/reminderService.js";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt12h(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${((h+11)%12)+1}:${String(m).padStart(2,"0")} ${h>=12?"PM":"AM"}`;
}
function todayStr() {
  const d = new Date(), pad = n => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function minutesUntil(dateStr, timeStr) {
  return Math.round((new Date(`${dateStr}T${timeStr}`) - new Date()) / 60000);
}
function isOverdue(ts) {
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d < new Date();
}
function friendlyCountdown(mins) {
  if (mins <= 0) return "";
  if (mins < 60) return `${mins}分钟后`;
  const h = Math.floor(mins/60), m = mins % 60;
  return m > 0 ? `${h}小时 ${m}分钟后` : `${h}小时后`;
}
function friendlyCountdownEN(mins) {
  if (mins <= 0) return "";
  if (mins < 60) return `in ${mins}min`;
  const h = Math.floor(mins/60), m = mins % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}

// ── Design tokens ──────────────────────────────────────────────────────────────
const R = { pill:"#FCEBEB", text:"#A32D2D" };
const A = { pill:"#FAEEDA", text:"#854F0B" };
const G = { pill:"#E1F5EE", text:"#0F6E56" };
const B = { pill:"#E6F1FB", text:"#185FA5" };

// ── Sub-components ─────────────────────────────────────────────────────────────
function Pill({ label, c }) {
  return <span style={{ fontSize:11, fontWeight:500, padding:"2px 8px", borderRadius:99, background:c.pill, color:c.text, whiteSpace:"nowrap" }}>{label}</span>;
}
function Row({ children, bg }) {
  return <div style={{ padding:"9px 14px", borderTop:"0.5px solid var(--border,#eee)", display:"flex", alignItems:"center", gap:10, background:bg||"transparent" }}>{children}</div>;
}
function Dot({ color }) {
  return <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0, background:color }} />;
}
function Card({ children }) {
  return <div style={{ background:"var(--surface,#fff)", border:"0.5px solid var(--border,#eee)", borderRadius:14, overflow:"hidden", marginBottom:10 }}>{children}</div>;
}
function CardHeader({ icon, title, right }) {
  return (
    <div style={{ padding:"10px 14px 8px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ fontSize:12, fontWeight:500, color:"var(--text-muted,#888)", display:"flex", alignItems:"center", gap:5 }}>
        <span>{icon}</span> {title}
      </div>
      {right}
    </div>
  );
}
function Divider({ label }) {
  return <div style={{ padding:"5px 14px 4px", fontSize:10, fontWeight:500, color:"var(--text-muted,#888)", letterSpacing:.5, borderTop:"0.5px solid var(--border,#eee)", background:"var(--surface2,#f8f8f8)" }}>{label}</div>;
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--surface,#fff)", width:"100%", maxWidth:520, borderRadius:"16px 16px 0 0", padding:"20px 0 32px", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 18px 14px", borderBottom:"0.5px solid var(--border,#eee)" }}>
          <span style={{ fontWeight:600, fontSize:16, color:"var(--text-primary,#111)" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888", lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function NewDashboardPage({ t, historyData=[], items=[], isLoading }) {
  const isZH = t?.appSub === "库存系统";
  const [reservations, setReservations] = useState([]);
  const [reminders,    setReminders]    = useState([]);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [showHealth,       setShowHealth]       = useState(false);

  useEffect(() => { const u = subscribeReservations(setReservations); return u; }, []);
  useEffect(() => { const u = subscribeReminders(setReminders);       return u; }, []);

  // Loading skeleton
  if (isLoading && historyData.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:8 }}>
        {[100,80,120,110,90,80].map((h,i)=>(
          <div key={i} style={{ height:h, borderRadius:14, background:"var(--surface2,#f5f5f5)", animation:"pulse 1.5s ease infinite" }} />
        ))}
      </div>
    );
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const activeItems = items.filter(i=>i.active!==false);
  const latestItems = historyData[0]?.items ?? [];
  const itemHistMap = useMemo(()=>buildItemHistoryMap(historyData.slice(0,14)),[historyData]);

  // Low stock now
  const lowNow = latestItems.filter(isLowStock);

  // Run out soon
  const runOutSoon = useMemo(()=>{
    const result=[];
    latestItems.forEach(item=>{
      if(item.active===false) return;
      const key=countKey(item);
      const entries=itemHistMap[key]??[];
      const n=Number(item.stock);
      if(isNaN(n)||n<=0||entries.length<2) return;
      const nums=entries.map(e=>Number(e.stock)).filter(v=>!isNaN(v)).slice(0,7);
      if(nums.length<2) return;
      const drops=[];
      for(let i=0;i<nums.length-1;i++){const diff=nums[i+1]-nums[i]; if(diff<0) drops.push(Math.abs(diff));}
      if(!drops.length) return;
      const avgDrop=drops.reduce((a,b)=>a+b,0)/drops.length;
      if(avgDrop<=0) return;
      const daysLeft=Math.floor(n/avgDrop);
      if(daysLeft<=3) result.push({name:item.name,category:item.category,stock:n,daysLeft});
    });
    return result.sort((a,b)=>a.daysLeft-b.daysLeft);
  },[latestItems,itemHistMap]);

  // Attention items — urgent = runout ≤1 day, warning = low stock or runout 2-3 days
  const urgentItems = useMemo(()=>{
    const seen=new Set();
    const out=[];
    runOutSoon.filter(r=>r.daysLeft<=1).forEach(r=>{seen.add(r.name);out.push({...r,type:"runout"});});
    lowNow.forEach(item=>{if(!seen.has(item.name)){seen.add(item.name);out.push({name:item.name,category:item.category,stock:item.stock,type:"urgent_low"});}});
    return out;
  },[runOutSoon,lowNow]);

  const warningItems = useMemo(()=>{
    const urgentNames=new Set(urgentItems.map(i=>i.name));
    return runOutSoon.filter(r=>r.daysLeft>=2&&!urgentNames.has(r.name));
  },[runOutSoon,urgentItems]);

  const allAttentionItems = [...urgentItems, ...warningItems];
  const LIMIT = 5;
  const visibleAttention = showAllAttention ? allAttentionItems : allAttentionItems.slice(0, LIMIT);
  const hasMore = allAttentionItems.length > LIMIT;

  // Today reservations
  const today = todayStr();
  const todayRes = reservations
    .filter(r=>r.reservationDate===today&&r.status!=="cancelled"&&r.status!=="completed")
    .sort((a,b)=>a.reservationTime>b.reservationTime?1:-1);
  const totalPax = todayRes.reduce((s,r)=>s+(Number(r.pax)||0),0);
  const nextRes = todayRes.find(r=>minutesUntil(r.reservationDate,r.reservationTime)>0);
  const nextMins = nextRes ? minutesUntil(nextRes.reservationDate,nextRes.reservationTime) : null;

  // Reminders
  const activeRem = reminders.filter(r=>!r.completed);
  const overdueRem = activeRem.filter(r=>isOverdue(r.reminderAt));
  const upcomingRem = activeRem
    .filter(r=>!isOverdue(r.reminderAt))
    .sort((a,b)=>{
      const da=a.reminderAt?.toDate?a.reminderAt.toDate():new Date(a.reminderAt);
      const db2=b.reminderAt?.toDate?b.reminderAt.toDate():new Date(b.reminderAt);
      return da-db2;
    });
  const showRem = [...overdueRem, ...upcomingRem].slice(0,2);

  // Suggested orders
  const suggestedOrders = useMemo(()=>{
    const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const tomorrow=days[new Date(Date.now()+86400000).getDay()];
    const result=[];
    latestItems.forEach(item=>{
      if(item.active===false) return;
      const key=countKey(item);
      const entries=itemHistMap[key]??[];
      const dowNums=entries.filter(e=>e.dow===tomorrow).map(e=>Number(e.stock)).filter(v=>!isNaN(v));
      if(dowNums.length<2) return;
      const avg=dowNums.reduce((a,b)=>a+b,0)/dowNums.length;
      const current=Number(item.stock);
      if(isNaN(current)) return;
      const gap=Math.round(avg)-current;
      if(gap>0) result.push({name:item.name,category:item.category,current,predicted:Math.round(avg),gap});
    });
    return result.sort((a,b)=>b.gap-a.gap).slice(0,5);
  },[latestItems,itemHistMap]);

  // Chronic low
  const chronicLow = useMemo(()=>lowStockTrend(historyData.slice(0,14),5),[historyData]);

  // Health score
  const totalActive = activeItems.length||1;
  const lowCount    = lowNow.length;
  const chronicPenalty = Math.min(chronicLow.length*2,15);
  const healthScore = Math.max(0,Math.round(((totalActive-lowCount)/totalActive)*100-chronicPenalty));
  const healthColor = healthScore>=85?"#1D9E75":healthScore>=60?"#BA7517":"#A32D2D";

  // Health modal items — all low stock items with detail
  const healthLowItems = latestItems.filter(isLowStock).map(item=>{
    const key=countKey(item);
    const entries=itemHistMap[key]??[];
    const chronic=chronicLow.find(c=>c.name===item.name);
    const runout=runOutSoon.find(r=>r.name===item.name);
    return { name:item.name, category:item.category, stock:item.stock, chronicCount:chronic?.count||0, daysLeft:runout?.daysLeft||null };
  }).sort((a,b)=>(b.chronicCount-a.chronicCount)||(a.stock-b.stock));

  const today2 = new Date().toLocaleDateString(isZH?"zh-MY":"en-MY",{weekday:"long",day:"numeric",month:"long"});

  return (
    <div style={{ paddingBottom:24 }}>

      <div style={{ fontSize:11, color:"var(--text-muted,#888)", fontWeight:500, marginBottom:10 }}>{today2}</div>

      {/* ── 1. Need Attention ──────────────────────────────────────────── */}
      <Card>
        <CardHeader
          icon="⚠️"
          title={isZH?"需要注意":"Need attention"}
          right={allAttentionItems.length>0
            ? <Pill label={`${allAttentionItems.length} ${isZH?"项":"items"}`} c={R} />
            : <Pill label={isZH?"一切正常 ✓":"All good ✓"} c={G} />}
        />
        {allAttentionItems.length===0 && (
          <Row><span style={{fontSize:13,color:"var(--text-muted,#888)"}}>{historyData.length===0?(isZH?"暂无数据":"No data yet"):(isZH?"没有低库存货品":"No low stock items")}</span></Row>
        )}
        {urgentItems.length>0&&<Divider label={isZH?"🚨 紧急":"🚨 Urgent"} />}
        {visibleAttention.filter(i=>urgentItems.find(u=>u.name===i.name)).map((item,i)=>(
          <Row key={i} bg="#fff5f5">
            <Dot color="#E24B4A" />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>{item.name}</div>
              <div style={{fontSize:11,color:"var(--text-muted,#888)",marginTop:1}}>
                {item.daysLeft!=null?(isZH?`预计 ${item.daysLeft} 天用完`:`~${item.daysLeft}d left`):item.category}
              </div>
            </div>
            <Pill label={isZH?`库存 ${item.stock}`:`Stock ${item.stock}`} c={R} />
          </Row>
        ))}
        {warningItems.length>0&&visibleAttention.some(i=>warningItems.find(w=>w.name===i.name))&&<Divider label={isZH?"⚠️ 警告":"⚠️ Warning"} />}
        {visibleAttention.filter(i=>warningItems.find(w=>w.name===i.name)).map((item,i)=>(
          <Row key={i}>
            <Dot color="#EF9F27" />
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>{item.name}</div>
              <div style={{fontSize:11,color:"var(--text-muted,#888)",marginTop:1}}>
                {isZH?`预计 ${item.daysLeft} 天用完`:`~${item.daysLeft}d left`}
              </div>
            </div>
            <Pill label={isZH?`库存 ${item.stock}`:`Stock ${item.stock}`} c={A} />
          </Row>
        ))}
        {hasMore&&(
          <div style={{padding:"8px 14px",borderTop:"0.5px solid var(--border,#eee)"}}>
            <button onClick={()=>setShowAllAttention(v=>!v)} style={{fontSize:11,color:"#185FA5",background:"none",border:"none",cursor:"pointer",padding:0}}>
              {showAllAttention?(isZH?"收起 ↑":"Show less ↑"):(isZH?`查看全部 ${allAttentionItems.length} 项 →`:`View all ${allAttentionItems.length} items →`)}
            </button>
          </div>
        )}
      </Card>

      {/* ── 2. Next Reservation ────────────────────────────────────────── */}
      <Card>
        <CardHeader
          icon="📅"
          title={isZH?"下一个预定":"Next reservation"}
          right={nextMins!=null?<Pill label={isZH?friendlyCountdown(nextMins):friendlyCountdownEN(nextMins)} c={B} />:null}
        />
        {nextRes ? (
          <div style={{padding:"4px 14px 14px"}}>
            <div style={{fontSize:19,fontWeight:500,color:"var(--text-primary,#111)"}}>{nextRes.customerName}</div>
            <div style={{fontSize:13,color:"var(--text-muted,#888)",marginTop:2}}>
              {fmt12h(nextRes.reservationTime)} · {nextRes.pax} {isZH?"人":"pax"}
              {nextRes.notes?` · ${nextRes.notes}`:""}
            </div>
            {nextMins!=null&&nextMins>0&&(
              <div style={{fontSize:11,color:"#185FA5",marginTop:6}}>
                ⏰ {isZH?`${friendlyCountdown(nextMins)}开始`:`Starts ${friendlyCountdownEN(nextMins)}`}
              </div>
            )}
          </div>
        ):(
          <Row><span style={{fontSize:13,color:"var(--text-muted,#888)"}}>{isZH?"今天没有即将到来的预定":"No upcoming reservations today"}</span></Row>
        )}
      </Card>

      {/* ── 3. Today's Operations ──────────────────────────────────────── */}
      <Card>
        <CardHeader icon="📋" title={isZH?"今天安排":"Today"} />
        <div style={{padding:"2px 14px 10px",display:"flex",alignItems:"center",gap:6}}>
          <span style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>
            {todayRes.length} {isZH?"个预定":"reservation"}{!isZH&&todayRes.length!==1?"s":""}
          </span>
          <span style={{fontSize:12,color:"var(--text-muted,#888)"}}>·</span>
          <span style={{fontSize:13,color:"var(--text-muted,#888)"}}>{totalPax} {isZH?"人":"pax"}</span>
          {activeRem.length>0&&<><span style={{fontSize:12,color:"var(--text-muted,#888)"}}>·</span><Pill label={`${activeRem.length} ${isZH?"个提醒":"reminder"+(activeRem.length!==1?"s":"")}`} c={overdueRem.length>0?R:A}/></>}
        </div>
        {activeRem.length===0&&(
          <Row><span style={{fontSize:12,color:"var(--text-muted,#888)"}}>{isZH?"没有待处理提醒":"No active reminders"}</span></Row>
        )}
        {showRem.map((r,i)=>{
          const overdue=isOverdue(r.reminderAt);
          const d=r.reminderAt?.toDate?r.reminderAt.toDate():new Date(r.reminderAt);
          const timeStr=d.toLocaleTimeString(isZH?"zh-MY":"en-MY",{hour:"numeric",minute:"2-digit",hour12:true});
          return (
            <Row key={i} bg={overdue?"#FAEEDA":undefined}>
              <span style={{fontSize:13}}>🔔</span>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>{r.title}</div>
                <div style={{fontSize:11,color:overdue?"#854F0B":"var(--text-muted,#888)",marginTop:1}}>{timeStr}{overdue?(isZH?" · 已逾期":" · overdue"):""}</div>
              </div>
              <Pill label={overdue?(isZH?"待处理":"Due"):(isZH?"即将到来":"Upcoming")} c={overdue?A:B} />
            </Row>
          );
        })}
      </Card>

      {/* ── 4. Suggested Orders ────────────────────────────────────────── */}
      {suggestedOrders.length>0&&(
        <Card>
          <CardHeader icon="📦" title={isZH?"建议补货":"Suggested orders"} right={<span style={{fontSize:11,color:"var(--text-muted,#888)"}}>{isZH?"基于历史用量":"Based on history"}</span>} />
          {suggestedOrders.map((item,i)=>(
            <Row key={i}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>{item.name}</div>
                <div style={{fontSize:11,color:"var(--text-muted,#888)",marginTop:1}}>
                  {isZH?`现有 ${item.current} · 预计需要 ${item.predicted}`:`Stock ${item.current} · Need ~${item.predicted}`}
                </div>
              </div>
              <Pill label={isZH?`补 +${item.gap}`:`Order +${item.gap}`} c={G} />
            </Row>
          ))}
        </Card>
      )}

      {/* ── 5. Chronic Low Stock ───────────────────────────────────────── */}
      {chronicLow.length>0&&(
        <Card>
          <CardHeader icon="🔥" title={isZH?"长期低库存":"Frequently low"} right={<span style={{fontSize:11,color:"var(--text-muted,#888)"}}>{isZH?"过去14次记录":"Last 14 counts"}</span>} />
          {chronicLow.slice(0,5).map((item,i)=>(
            <Row key={i}>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:500,color:i===0?"#A32D2D":"var(--text-primary,#111)"}}>{item.name}</div>
                <div style={{fontSize:11,color:"var(--text-muted,#888)",marginTop:1}}>{item.category}</div>
              </div>
              <Pill label={isZH?`${item.count} 次`:`${item.count}× low`} c={i===0?R:A} />
            </Row>
          ))}
        </Card>
      )}

      {/* ── 6. Health Score ────────────────────────────────────────────── */}
      <Card>
        <button onClick={()=>setShowHealth(true)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>
          <CardHeader icon="💚" title={isZH?"库存健康度":"Inventory health"} right={<span style={{fontSize:11,color:"#185FA5"}}>{isZH?"查看详情 →":"Details →"}</span>} />
          <div style={{padding:"4px 14px 14px",display:"flex",alignItems:"center",gap:14}}>
            <div style={{textAlign:"center",flexShrink:0}}>
              <div style={{fontSize:28,fontWeight:500,color:healthColor}}>{healthScore}%</div>
              <div style={{fontSize:10,color:"var(--text-muted,#888)"}}>{isZH?"健康度":"Health"}</div>
            </div>
            <div style={{flex:1,borderLeft:"0.5px solid var(--border,#eee)",paddingLeft:14,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"var(--text-muted,#888)"}}>{isZH?"正常货品":"Healthy items"}</span>
                <span style={{fontWeight:500,color:"#1D9E75"}}>{totalActive-lowCount} {isZH?"项":"items"}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"var(--text-muted,#888)"}}>{isZH?"低库存":"Low stock"}</span>
                <span style={{fontWeight:500,color:lowCount>0?"#A32D2D":"#1D9E75"}}>{lowCount} {isZH?"项":"items"}</span>
              </div>
            </div>
          </div>
        </button>
      </Card>

      {/* ── Health Detail Modal ─────────────────────────────────────────── */}
      {showHealth&&(
        <Modal title={isZH?"低库存详情":"Low Stock Details"} onClose={()=>setShowHealth(false)}>
          {healthLowItems.length===0?(
            <div style={{padding:"24px",textAlign:"center",color:"var(--text-muted,#888)",fontSize:13}}>
              {isZH?"所有货品库存正常 ✓":"All items are healthy ✓"}
            </div>
          ):(
            <>
              <div style={{padding:"10px 18px 6px",fontSize:11,color:"var(--text-muted,#888)"}}>
                {isZH?`共 ${healthLowItems.length} 项需要关注`:`${healthLowItems.length} items need attention`}
              </div>
              {healthLowItems.map((item,i)=>(
                <div key={i} style={{padding:"10px 18px",borderTop:"0.5px solid var(--border,#eee)",display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary,#111)"}}>{item.name}</div>
                    <div style={{fontSize:11,color:"var(--text-muted,#888)",marginTop:2}}>
                      {item.category}
                      {item.chronicCount>0&&<span style={{color:"#A32D2D",marginLeft:6}}>· {isZH?`${item.chronicCount}次低库存`:`${item.chronicCount}× chronic`}</span>}
                      {item.daysLeft!=null&&<span style={{color:"#854F0B",marginLeft:6}}>· {isZH?`约${item.daysLeft}天用完`:`~${item.daysLeft}d left`}</span>}
                    </div>
                  </div>
                  <Pill label={isZH?`库存 ${item.stock}`:`Stock ${item.stock}`} c={R} />
                </div>
              ))}
              <div style={{padding:"12px 18px 0"}}>
                <button onClick={()=>setShowHealth(false)} style={{width:"100%",padding:12,borderRadius:10,background:"#1D9E75",color:"#fff",border:"none",fontSize:14,fontWeight:500,cursor:"pointer"}}>
                  {isZH?"关闭":"Close"}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

    </div>
  );
}
