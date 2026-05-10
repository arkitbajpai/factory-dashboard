import React,{useState}from'react';
import{useData}from'../hooks/useData';
import{api}from'../utils/api';
import{fmtSeconds,fmtPct,fmtNum,utilColor}from'../utils/format';
import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Cell}from'recharts';

const TC={Assembly:'#00ff88',Welding:'#ff8800','Quality Check':'#00ccff',Packaging:'#9966ff'};
const TS={working:{bg:'rgba(0,255,136,0.1)',color:'#00ff88',label:'WORKING'},idle:{bg:'rgba(255,204,0,0.1)',color:'#ffcc00',label:'IDLE'},absent:{bg:'rgba(255,68,85,0.1)',color:'#ff4455',label:'ABSENT'},product_count:{bg:'rgba(0,204,255,0.1)',color:'#00ccff',label:'PRODUCT'}};

function StationCard({station,selected,onClick}){
  const uc=utilColor(station.utilization_pct),tc=TC[station.type]||'#8fa3b8';
  return(
    <div className={`entity-card ${selected?'selected':''}`} onClick={()=>onClick(station.station_id)}>
      <div className="entity-header">
        <div className="entity-avatar" style={{background:`${tc}15`,color:tc,fontSize:13}}>{station.station_id}</div>
        <div><div className="entity-name">{station.name}</div><div className="entity-meta"><span className="tag" style={{background:`${tc}15`,color:tc}}>{station.type}</span> {station.location}</div></div>
        <div className="entity-id-badge">{station.station_id}</div>
      </div>
      <div className="metric-rows">
        <div className="metric-row"><span className="metric-key">Occupancy</span><span className="metric-val">{fmtSeconds(station.occupancy_seconds)}</span></div>
        <div className="metric-row"><span className="metric-key">Units Produced</span><span className="metric-val" style={{color:'var(--cyan)'}}>{station.units_produced}</span></div>
        <div className="metric-row"><span className="metric-key">Throughput Rate</span><span className="metric-val">{fmtNum(station.throughput_rate)} u/hr</span></div>
        <div className="metric-row"><span className="metric-key">Occupancy Hours</span><span className="metric-val">{fmtNum(station.occupancy_hours,2)} h</span></div>
      </div>
      <div className="util-bar-wrap">
        <div className="util-bar-label"><span className="metric-key">Utilization</span><span className="metric-key" style={{color:uc}}>{fmtPct(station.utilization_pct)}</span></div>
        <div className="util-bar-track"><div className="util-bar-fill" style={{width:`${station.utilization_pct}%`,background:uc}}/></div>
      </div>
    </div>
  );
}

function StationDetail({stationId,stations}){
  const{data:events}=useData(()=>api.timeline({workstation_id:stationId,limit:50}),[stationId],20000);
  const cd=(stations||[]).map(s=>({name:s.station_id,units:s.units_produced}));
  return(
    <div className="card" style={{marginTop:24}}>
      <div className="card-title">Station Comparison</div>
      <ResponsiveContainer width="100%" height={200}><BarChart data={cd} barSize={28}>
        <XAxis dataKey="name" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
        <YAxis stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
        <Tooltip contentStyle={{background:'#131920',border:'1px solid #1e2d3d',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:12}}/>
        <Bar dataKey="units" name="Units" radius={[4,4,0,0]}>{cd.map(d=><Cell key={d.name} fill={d.name===stationId?'#00ff88':'#1a3040'}/>)}</Bar>
      </BarChart></ResponsiveContainer>
      {events?.length>0&&<div style={{marginTop:16}}><div className="card-title">Recent Events — {stationId}</div>
        <div className="event-list" style={{maxHeight:220,overflowY:'auto'}}>
          {events.slice(0,20).map(e=>{const t=TS[e.event_type]||{};return(
            <div key={e._id||e.id} className="event-row">
              <span className="event-ts">{new Date(e.timestamp).toLocaleTimeString('en-IN',{hour12:false})}</span>
              <span className="event-type-badge" style={{background:t.bg,color:t.color}}>{t.label||e.event_type}</span>
              <span className="event-ids">{e.worker_id}</span>
              {e.count>0&&<span className="event-count">×{e.count}</span>}
              <span className="event-conf">{(e.confidence*100).toFixed(0)}%</span>
            </div>
          );})}
        </div>
      </div>}
    </div>
  );
}

export default function StationsPanel(){
  const[selected,setSelected]=useState(null);
  const[filter,setFilter]=useState('all');
  const{data:stations,loading,error}=useData(()=>api.stationMetrics(),[],30000);
  if(loading)return<div className="loading-wrap"><div className="spinner"/><div className="loading-label">Loading…</div></div>;
  if(error)return<div className="error-msg">⚠ {error}</div>;
  const types=['all',...new Set((stations||[]).map(s=>s.type))];
  const filtered=filter==='all'?stations:(stations||[]).filter(s=>s.type===filter);
  return(
    <div>
      <div className="section-header"><div className="section-title">Workstations <span>({(stations||[]).length})</span></div></div>
      <div className="filter-bar">
        {types.map(f=><button key={f} className={`filter-btn ${filter===f?'active':''}`} onClick={()=>setFilter(f)}>{f==='all'?'All Types':f}</button>)}
        {selected&&<button className="filter-btn active" onClick={()=>setSelected(null)}>✕ Clear</button>}
      </div>
      <div className="entity-grid">{(filtered||[]).map(s=><StationCard key={s.station_id} station={s} selected={selected===s.station_id} onClick={id=>setSelected(p=>p===id?null:id)}/>)}</div>
      {selected&&<StationDetail stationId={selected} stations={stations}/>}
    </div>
  );
}
