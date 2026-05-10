import React, { useState } from 'react';
import Header from './components/Header';
import FactoryOverview from './components/FactoryOverview';
import WorkersPanel from './components/WorkersPanel';
import StationsPanel from './components/StationsPanel';
import EventFeed from './components/EventFeed';
import IngestPanel from './components/IngestPanel';
import './App.css';

const TABS=[{id:'overview',label:'Overview'},{id:'workers',label:'Workers'},{id:'stations',label:'Workstations'},{id:'events',label:'Event Feed'},{id:'ingest',label:'Ingest'}];

export default function App() {
  const [tab,setTab]=useState('overview');
  return (
    <div className="app">
      <Header/>
      <nav className="tab-nav">{TABS.map(t=><button key={t.id} className={`tab-btn ${tab===t.id?'active':''}`} onClick={()=>setTab(t.id)}>{t.label}</button>)}</nav>
      <main className="main-content">
        {tab==='overview'&&<FactoryOverview/>}{tab==='workers'&&<WorkersPanel/>}
        {tab==='stations'&&<StationsPanel/>}{tab==='events'&&<EventFeed/>}{tab==='ingest'&&<IngestPanel/>}
      </main>
    </div>
  );
}
