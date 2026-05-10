import React,{useState}from'react';
import{api}from'../utils/api';

const W=['W1','W2','W3','W4','W5','W6'],S=['S1','S2','S3','S4','S5','S6'],T=['working','idle','absent','product_count'];

export default function IngestPanel(){
  const[form,setForm]=useState({timestamp:new Date().toISOString().slice(0,19)+'Z',worker_id:'W1',workstation_id:'S1',event_type:'working',confidence:'0.95',count:'0'});
  const[loading,setLoading]=useState(false);const[seedLoading,setSeedLoading]=useState(false);
  const[toast,setToast]=useState(null);const[seedStatus,setSeedStatus]=useState(null);const[response,setResponse]=useState(null);

  const showToast=(msg,type='ok')=>{setToast({msg,type});setTimeout(()=>setToast(null),3500)};
  const handleSubmit=async()=>{
    setLoading(true);setResponse(null);
    try{const res=await api.ingestEvent({...form,confidence:parseFloat(form.confidence),count:parseInt(form.count,10)});setResponse(res);showToast(`Event ${res.status==='inserted'?'ingested':'skipped (duplicate)'}`);}
    catch(e){showToast(e.message,'error');}finally{setLoading(false);setForm(f=>({...f,timestamp:new Date().toISOString().slice(0,19)+'Z'}));}
  };
  const handleRefreshSeed=async()=>{setSeedLoading(true);try{const res=await api.refreshSeed();setSeedStatus(res);showToast(`Refreshed: ${res.events_inserted} events`);}catch(e){showToast(e.message,'error');}finally{setSeedLoading(false);}};
  const handleSeedStatus=async()=>{try{setSeedStatus(await api.seedStatus());}catch(e){showToast(e.message,'error');}};

  const endpoints=[
    {method:'POST',path:'/api/events/ingest',desc:'Ingest a single event'},
    {method:'POST',path:'/api/events/ingest/batch',desc:'Ingest batch of events'},
    {method:'GET',path:'/api/metrics/factory',desc:'Factory-level metrics'},
    {method:'GET',path:'/api/metrics/workers',desc:'Per-worker metrics (?worker_id=)'},
    {method:'GET',path:'/api/metrics/workstations',desc:'Per-station metrics (?station_id=)'},
    {method:'GET',path:'/api/metrics/timeline',desc:'Event timeline'},
    {method:'POST',path:'/api/seed/refresh',desc:'Evaluator — refresh dummy data'},
    {method:'GET',path:'/api/seed/status',desc:'Evaluator — event counts'},
    {method:'GET',path:'/api/health',desc:'Health check'},
  ];

  return(
    <div>
      <div className="section-header"><div className="section-title">Event <span>Ingest</span></div></div>
      <div className="card" style={{marginBottom:24}}>
        <div className="card-title">Seed Data Controls (Evaluators)</div>
        <p style={{color:'var(--text1)',fontSize:13,marginBottom:16,lineHeight:1.7}}>Clears all events in MongoDB and regenerates realistic 8-hour shift data. Call <code style={{background:'var(--bg0)',padding:'2px 6px',borderRadius:4,fontFamily:'JetBrains Mono,monospace',fontSize:12}}>POST /api/seed/refresh</code> directly or use the button.</p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <button className="btn btn-primary" onClick={handleRefreshSeed} disabled={seedLoading}>{seedLoading?'…':'↺'} Refresh Seed Data</button>
          <button className="btn btn-ghost" onClick={handleSeedStatus}>Check Status</button>
        </div>
        {seedStatus&&<div style={{marginTop:16,background:'var(--bg0)',border:'1px solid var(--border)',borderRadius:6,padding:14,fontFamily:'JetBrains Mono,monospace',fontSize:12}}><pre style={{color:'var(--text0)',margin:0}}>{JSON.stringify(seedStatus,null,2)}</pre></div>}
      </div>

      <div className="card" style={{marginBottom:24}}>
        <div className="card-title">Ingest Single Event</div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Timestamp</label><input className="form-input" value={form.timestamp} onChange={e=>setForm(f=>({...f,timestamp:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Worker ID</label><select className="form-select" value={form.worker_id} onChange={e=>setForm(f=>({...f,worker_id:e.target.value}))}>{W.map(w=><option key={w} value={w}>{w}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Workstation ID</label><select className="form-select" value={form.workstation_id} onChange={e=>setForm(f=>({...f,workstation_id:e.target.value}))}>{S.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Event Type</label><select className="form-select" value={form.event_type} onChange={e=>setForm(f=>({...f,event_type:e.target.value}))}>{T.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Confidence</label><input className="form-input" type="number" min="0" max="1" step="0.01" value={form.confidence} onChange={e=>setForm(f=>({...f,confidence:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Count</label><input className="form-input" type="number" min="0" value={form.count} onChange={e=>setForm(f=>({...f,count:e.target.value}))}/></div>
        </div>
        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>{loading?'Sending…':'→ Ingest Event'}</button>
        {response&&<div style={{marginTop:16,background:'var(--bg0)',border:'1px solid var(--border)',borderRadius:6,padding:14,fontFamily:'JetBrains Mono,monospace',fontSize:12}}><pre style={{color:'var(--green)',margin:0}}>{JSON.stringify(response,null,2)}</pre></div>}
      </div>

      <div className="card">
        <div className="card-title">API Reference — Node.js + MongoDB Atlas</div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {endpoints.map(r=>(
            <div key={r.path} style={{display:'flex',gap:12,alignItems:'baseline',flexWrap:'wrap'}}>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:10,fontWeight:700,color:r.method==='GET'?'var(--cyan)':'var(--green)',minWidth:40}}>{r.method}</span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text0)',minWidth:260}}>{r.path}</span>
              <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text2)'}}>{r.desc}</span>
            </div>
          ))}
        </div>
      </div>
      {toast&&<div className={`toast ${toast.type==='error'?'error':''}`}>{toast.type==='error'?'⚠ ':'✓ '}{toast.msg}</div>}
    </div>
  );
}
