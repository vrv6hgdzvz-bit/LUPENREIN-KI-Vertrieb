'use client'

import {useState} from 'react'

export function Topbar(){
  const [busy,setBusy]=useState(false)

  async function logout(){
    if(busy)return
    setBusy(true)
    try{
      await fetch('/api/auth/logout',{method:'POST'})
    }finally{
      window.location.href='/login'
    }
  }

  return <header className="topbar">
    <div><span className="eyebrow">LUPENREIN SERVICE GMBH</span><h1>KI Vertrieb</h1></div>
    <div className="topActions">
      <div className="topBrandMark">L</div>
      <button className="ghost">⌕ Suche</button>
      <button className="notify">●</button>
      <div className="avatar">LR</div>
      <button className="ghost" onClick={logout} disabled={busy} aria-label="Abmelden">{busy?'Abmeldung …':'Abmelden'}</button>
    </div>
  </header>
}
