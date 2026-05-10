export function fmtSeconds(s) { if (!s) return '0m'; const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h===0?`${m}m`:`${h}h ${m}m`; }
export function fmtPct(v) { return `${(v||0).toFixed(1)}%`; }
export function fmtNum(v,d=1) { return (v||0).toFixed(d); }
export function utilColor(pct) { if(pct>=80)return'#00ff88'; if(pct>=60)return'#ffcc00'; if(pct>=40)return'#ff8800'; return'#ff4444'; }
