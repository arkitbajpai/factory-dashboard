import React from 'react';
import{useData}from'../hooks/useData';
import{api}from'../utils/api';
import{fmtSeconds,fmtPct,fmtNum}from'../utils/format';
import{BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,PieChart,Pie,Cell,Legend}from'recharts';

const COLORS=['#00ff88','#00ccff','#ffcc00','#ff8800','#9966ff','#ff4455'];
const TT=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(<div style={{background:'#131920',border:'1px solid #1e2d3d',borderRadius:6,padding:'10px 14px',fontFamily:'JetBrains Mono,monospace',fontSize:12}}>
    <div style={{color:'#8fa3b8',marginBottom:4}}>{label}</div>
    {payload.map((p,i)=><div key={i} style={{color:p.color}}>{p.name}: <strong>{typeof p.value==='number'?p.value.toFixed(1):p.value}</strong></div>)}
  </div>);
};

export default function FactoryOverview(){
  const{data:factory,loading,error}=useData(()=>api.factoryMetrics(),[],30000);
  const{data:workers}=useData(()=>api.workerMetrics(),[],30000);
  const{data:stations}=useData(()=>api.stationMetrics(),[],30000);

  if(loading)return<div className="loading-wrap"><div className="spinner"/><div className="loading-label">Loading…</div></div>;
  if(error)return<div className="error-msg">⚠ {error}</div>;
  if(!factory)return null;

  const wc=(workers||[]).map(w=>({name:w.name.split(' ')[0],util:w.utilization_pct,units:w.units_produced}));
  const sc=(stations||[]).map(s=>({name:s.station_id,units:s.units_produced}));
  const pie=[
    {name:'Working',value:(workers||[]).reduce((a,w)=>a+w.working_seconds,0)},
    {name:'Idle',value:(workers||[]).reduce((a,w)=>a+w.idle_seconds,0)},
    {name:'Absent',value:(workers||[]).reduce((a,w)=>a+w.absent_seconds,0)},
  ];
  const stats=[
    {label:'Total Production',value:factory.total_production_count,sub:'units this shift',accent:'#00ff88'},
    {label:'Avg Utilization',value:fmtPct(factory.average_utilization_pct),sub:'across all workers',accent:'#00ccff'},
    {label:'Avg Rate',value:fmtNum(factory.average_production_rate),sub:'units per hour',accent:'#ffcc00'},
    {label:'Active Time',value:fmtSeconds(factory.total_productive_time_seconds),sub:'total working',accent:'#9966ff'},
    {label:'Shift Duration',value:fmtSeconds(factory.shift_duration_seconds),sub:'event span',accent:'#ff8800'},
    {label:'Total Events',value:factory.total_events,sub:'AI events in MongoDB',accent:'#00ff88'},
  ];

  return(
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Factory <span>Overview</span></div>
          <div style={{color:'var(--text2)',fontFamily:'var(--font-mono)',fontSize:12,marginTop:4}}>Node.js + Express · MongoDB Atlas · React</div>
        </div>
        <button className="btn btn-ghost" onClick={()=>api.refreshSeed().then(()=>window.location.reload())}>↻ Refresh Data</button>
      </div>
      <div className="stat-grid">
        {stats.map(s=><div className="stat-card" key={s.label} style={{'--accent-color':s.accent}}><div className="stat-label">{s.label}</div><div className="stat-value">{s.value}</div><div className="stat-sub">{s.sub}</div></div>)}
      </div>
      <div className="overview-panels">
        <div className="card"><div className="card-title">Worker Utilization %</div>
          <ResponsiveContainer width="100%" height={220}><BarChart data={wc} barSize={28}>
            <XAxis dataKey="name" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
            <YAxis stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}} domain={[0,100]} unit="%"/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="util" name="Utilization %" radius={[4,4,0,0]}>{wc.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
        <div className="card"><div className="card-title">Units by Station</div>
          <ResponsiveContainer width="100%" height={220}><BarChart data={sc} barSize={28}>
            <XAxis dataKey="name" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
            <YAxis stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="units" name="Units" radius={[4,4,0,0]}>{sc.map((_,i)=><Cell key={i} fill={COLORS[(i+2)%COLORS.length]}/>)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
        <div className="card"><div className="card-title">Time Distribution</div>
          <ResponsiveContainer width="100%" height={220}><PieChart>
            <Pie data={pie} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
              {pie.map((_,i)=><Cell key={i} fill={['#00ff88','#ffcc00','#ff4455'][i]}/>)}
            </Pie>
            <Legend formatter={v=><span style={{fontFamily:'JetBrains Mono',fontSize:11,color:'var(--text1)'}}>{v}</span>}/>
            <Tooltip formatter={v=>fmtSeconds(v)} contentStyle={{background:'#131920',border:'1px solid #1e2d3d',borderRadius:6,fontFamily:'JetBrains Mono',fontSize:12}}/>
          </PieChart></ResponsiveContainer>
        </div>
        <div className="card"><div className="card-title">Units per Worker</div>
          <ResponsiveContainer width="100%" height={220}><BarChart data={wc} barSize={28} layout="vertical">
            <XAxis type="number" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}}/>
            <YAxis type="category" dataKey="name" stroke="var(--text2)" tick={{fontFamily:'JetBrains Mono',fontSize:11}} width={60}/>
            <Tooltip content={<TT/>}/>
            <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>{wc.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar>
          </BarChart></ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
