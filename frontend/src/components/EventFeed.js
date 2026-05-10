import React,{useState}from'react';
import{useData}from'../hooks/useData';
import{api}from'../utils/api';

const TS={working:{bg:'rgba(0,255,136,0.12)',color:'#00ff88',label:'WORKING'},idle:{bg:'rgba(255,204,0,0.12)',color:'#ffcc00',label:'IDLE'},absent:{bg:'rgba(255,68,85,0.12)',color:'#ff4455',label:'ABSENT'},product_count:{bg:'rgba(0,204,255,0.12)',color:'#00ccff',label:'PRODUCT'}};

export default function EventFeed(){
  const[fw,setFW]=useState('');const[fs,setFS]=useState('');const[ft,setFT]=useState('');
  const params={limit:150};
  if(fw)params.worker_id=fw;if(fs)params.workstation_id=fs;if(ft)params.event_type=ft;
  const{data:events,loading,error,refetch}=useData(()=>api.recentEvents(params),[fw,fs,ft],15000);
  return(
    <div>
      <div className="section-header"><div className="section-title">Event <span>Feed</span></div><button className="btn btn-ghost" onClick={refetch}>↻ Refresh</button></div>
      <div className="filter-bar">
        <select className="form-select" style={{width:160,padding:'6px 12px'}} value={fw} onChange={e=>setFW(e.target.value)}>
          <option value="">All Workers</option>{['W1','W2','W3','W4','W5','W6'].map(w=><option key={w} value={w}>{w}</option>)}
        </select>
        <select className="form-select" style={{width:180,padding:'6px 12px'}} value={fs} onChange={e=>setFS(e.target.value)}>
          <option value="">All Stations</option>{['S1','S2','S3','S4','S5','S6'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select className="form-select" style={{width:160,padding:'6px 12px'}} value={ft} onChange={e=>setFT(e.target.value)}>
          <option value="">All Types</option><option value="working">Working</option><option value="idle">Idle</option><option value="absent">Absent</option><option value="product_count">Product Count</option>
        </select>
        {(fw||fs||ft)&&<button className="btn btn-ghost" onClick={()=>{setFW('');setFS('');setFT('');}}>✕ Clear</button>}
      </div>
      {loading&&<div className="loading-wrap" style={{padding:40}}><div className="spinner"/></div>}
      {error&&<div className="error-msg">⚠ {error}</div>}
      {!loading&&events&&<>
        <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)',marginBottom:12}}>Showing {events.length} events</div>
        <div className="event-list">{events.map(e=>{const t=TS[e.event_type]||{};return(
          <div key={e._id||e.id} className="event-row">
            <span className="event-ts" style={{width:75}}>{new Date(e.timestamp).toLocaleTimeString('en-IN',{hour12:false})}</span>
            <span className="event-type-badge" style={{background:t.bg,color:t.color}}>{t.label||e.event_type}</span>
            <span className="event-ids" style={{width:32}}>{e.worker_id}</span>
            <span style={{color:'var(--text2)',fontFamily:'var(--font-mono)',fontSize:12}}>→</span>
            <span className="event-ids">{e.workstation_id}</span>
            {e.count>0&&<span className="event-count">×{e.count} units</span>}
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text2)',marginLeft:'auto'}}>conf: {(e.confidence*100).toFixed(0)}%</span>
            <span style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text2)'}}>{e.model_version}</span>
          </div>
        );})}</div>
      </>}
    </div>
  );
}
