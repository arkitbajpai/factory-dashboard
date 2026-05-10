import React,{useState}from'react';
import{useData}from'../hooks/useData';
import{api}from'../utils/api';
import{fmtSeconds,fmtPct,fmtNum,utilColor}from'../utils/format';
import{LineChart,Line,XAxis,YAxis,Tooltip,ResponsiveContainer}from'recharts';

const TS={working:{bg:'rgba(0,255,136,0.1)',color:'#00ff88',label:'WORKING'},idle:{bg:'rgba(255,204,0,0.1)',color:'#ffcc00',label:'IDLE'},absent:{bg:'rgba(255,68,85,0.1)',color:'#ff4455',label:'ABSENT'},product_count:{bg:'rgba(0,204,255,0.1)',color:'#00ccff',label:'PRODUCT'}};

function WorkerCard({worker,selected,onClick}){
  const uc=utilColor(worker.utilization_pct);
  const initials=worker.name.split(' ').map(n=>n[0]).join('').slice(0,2);
  return(
    <div className={`entity-card ${selected?'selected':''}`} onClick={()=>onClick(worker.worker_id)}>
      <div className="entity-header">
        <div className="entity-avatar" style={{background:'rgba(0,255,136,0.07)',color:uc}}>{initials}</div>
        <div><div className="entity-name">{worker.name}</div><div className="entity-meta">{worker.role} · {worker.shift} Shift</div></div>
        <div className="entity-id-badge">{worker.worker_id}</div>
      </div>
      <div className="metric-rows">
        <div className="metric-row"><span className="metric-key">Active Time</span><span className="metric-val">{fmtSeconds(worker.working_seconds)}</span></div>
        <div className="metric-row"><span className="metric-key">Idle Time</span><span className="metric-val" style={{color:'#ffcc00'}}>{fmtSeconds(worker.idle_seconds)}</span></div>
        <div className="metric-row"><span className="metric-key">Units Produced</span><span className="metric-val" style={{color:'var(--cyan)'}}>{worker.units_produced}</span></div>
        <div className="metric-row"><span className="metric-key">Units / Hour</span><span className="metric-val">{fmtNum(worker.units_per_hour)}</span></div>
      </div>
      <div className="util-bar-wrap">
        <div className="util-bar-label"><span className="metric-key">Utilization</span><span className="metric-key" style={{color:uc}}>{fmtPct(worker.utilization_pct)}</span></div>
        <div className="util-bar-track"><div className="util-bar-fill" style={{width:`${worker.utilization_pct}%`,background:uc}}/></div>
      </div>
    </div>
  );
}

function WorkerDetail({workerId}){
  const{data:events,loading}=useData(()=>api.timeline({worker_id:workerId,limit:80}),[workerId],15000);
  if(loading)return<div className="loading-wrap" style={{padding:40}}><div className="spinner"/></div>;
  if(!events?.length)return<div className="empty-state">No events found</div>;
  const hm={};
  events.forEach(e=>{
    const h=new Date(e.timestamp).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:false});
    if(!hm[h])hm[h]={time:h,working:0,idle:0,units:0};
    if(e.event_type==='working')hm[h].working++;
    if(e.event_type==='idle')hm[h].idle++;
    if(e.event_type==='product_count')hm[h].units+=e.count;
  });
  const cd=Object.values(hm).slice(-20).reverse();
  return(
    <div className="card" style={{marginTop:24}}>
      <div className="card-title">Timeline — {workerId}</div>
      <ResponsiveContainer width="100%" height={180}><LineChart data={cd}>
        <XAxis dataKey="time" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:10}}/>
        <YAxis stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:10}}/>
        <Tooltip contentStyle={{background:'#131920',border:'1px solid #1e2d3d',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:12}}/>
        <Line type="monotone" dataKey="working" stroke="#00ff88" dot={false} strokeWidth={2} name="Working"/>
        <Line type="monotone" dataKey="idle" stroke="#ffcc00" dot={false} strokeWidth={2} name="Idle"/>
        <Line type="monotone" dataKey="units" stroke="#00ccff" dot={false} strokeWidth={2} name="Units"/>
      </LineChart></ResponsiveContainer>
      <div style={{marginTop:16}}><div className="card-title">Recent Events</div>
        <div className="event-list" style={{maxHeight:260,overflowY:'auto'}}>
          {events.slice(0,30).map(e=>{const t=TS[e.event_type]||{};return(
            <div key={e._id||e.id} className="event-row">
              <span className="event-ts">{new Date(e.timestamp).toLocaleTimeString('en-IN',{hour12:false})}</span>
              <span className="event-type-badge" style={{background:t.bg,color:t.color}}>{t.label||e.event_type}</span>
              <span className="event-ids">{e.workstation_id}</span>
              {e.count>0&&<span className="event-count">×{e.count}</span>}
              <span className="event-conf">{(e.confidence*100).toFixed(0)}%</span>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

export default function WorkersPanel(){
  const[selected,setSelected]=useState(null);
  const[filter,setFilter]=useState('all');
  const{data:workers,loading,error}=useData(()=>api.workerMetrics(),[],30000);
  if(loading)return<div className="loading-wrap"><div className="spinner"/><div className="loading-label">Loading…</div></div>;
  if(error)return<div className="error-msg">⚠ {error}</div>;
  const filtered=filter==='all'?workers:(workers||[]).filter(w=>w.shift.toLowerCase().startsWith(filter));
  return(
    <div>
      <div className="section-header"><div className="section-title">Workers <span>({(workers||[]).length})</span></div></div>
      <div className="filter-bar">
        {['all','morning','afternoon'].map(f=><button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f==='all'?'All Shifts':f.charAt(0).toUpperCase()+f.slice(1)+' Shift'}</button>)}
        {selected&&<button className="filter-btn active" onClick={()=>setSelected(null)}>✕ Clear</button>}
      </div>
      <div className="entity-grid">{(filtered||[]).map(w=><WorkerCard key={w.worker_id} worker={w} selected={selected===w.worker_id} onClick={id=>setSelected(s=>s===id?null:id)}/>)}</div>
      {selected&&<WorkerDetail workerId={selected}/>}
    </div>
  );
}
