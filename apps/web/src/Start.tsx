import React from 'react';

export default function Start({ onStart }:{ onStart: (numBots: number) => void }) {
  const options = [1,2,3,4,5,6,7,8];
  return (
    <div style={{ fontFamily:'system-ui', padding:24, display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
      <h1>Welcome to Poker Practice</h1>
      <div>Select number of bot opponents</div>
      <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
        {options.map(n => (
          <button key={n} onClick={() => onStart(n)} style={{ padding:'8px 12px', borderRadius:8 }}>{n} bot{n>1?'s':''}</button>
        ))}
      </div>
    </div>
  );
}
