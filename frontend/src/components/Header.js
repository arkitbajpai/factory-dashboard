import React,{useState,useEffect}from'react';
export default function Header(){
  const[time,setTime]=useState(new Date());
  useEffect(()=>{const id=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(id);},[]);
  return(
    <header className="header">
      <div className="header-logo">
        <div className="header-logo-mark">F</div>
        <div className="header-title">Factory<span>IQ</span></div>
      </div>
      <div className="header-right">
        <div className="live-badge"><div className="live-dot"/>LIVE</div>
        <div className="header-time">{time.toLocaleTimeString('en-IN',{hour12:false})}</div>
      </div>
    </header>
  );
}
