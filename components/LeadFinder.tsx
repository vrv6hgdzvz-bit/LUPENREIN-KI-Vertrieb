'use client'
import {useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import type {FinderCandidate} from '@/lib/types'

const sectors=['Büro','Arztpraxis','Hotel','Schule','Hausverwaltung','Industrie','Baustelle']

export default function LeadFinder(){
  const router=useRouter()
  const [sector,setSector]=useState('Hausverwaltung')
  const [busy,setBusy]=useState(false)
  const [importing,setImporting]=useState(false)
  const [mode,setMode]=useState<'live'|'demo'|null>(null)
  const [results,setResults]=useState<FinderCandidate[]>([])
  const [selected,setSelected]=useState<Record<string,boolean>>({})
  const [message,setMessage]=useState('')

  const chosen=useMemo(()=>results.filter(r=>selected[r.id]&&!r.duplicate),[results,selected])

  async function search(){
    setBusy(true);setMessage('');setResults([]);setSelected({})
    const r=await fetch('/api/lead-finder/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sector,limit:15})})
    const data=await r.json();setBusy(false)
    if(!r.ok){setMessage(data.error||'Suche fehlgeschlagen.');return}
    setMode(data.mode);setResults(data.candidates)
    const defaults:Record<string,boolean>={}
    data.candidates.forEach((c:FinderCandidate)=>{if(!c.duplicate&&c.score>=80)defaults[c.id]=true})
    setSelected(defaults)
  }

  async function importSelected(){
    if(!chosen.length)return
    setImporting(true);setMessage('')
    const r=await fetch('/api/lead-finder/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({candidates:chosen})})
    const data=await r.json();setImporting(false)
    if(!r.ok){setMessage(data.error||'Import fehlgeschlagen.');return}
    setMessage(`${data.imported} Lead${data.imported===1?'':'s'} übernommen${data.duplicates?`, ${data.duplicates} Dublette(n) übersprungen`:''}.`)
    setResults(prev=>prev.map(x=>chosen.some(c=>c.id===x.id)?{...x,duplicate:true}:x))
    setSelected({});router.refresh()
  }

  return <>
    <section className="finderSearch panel">
      <div className="finderFields">
        <label>Zielgruppe<select value={sector} onChange={e=>setSector(e.target.value)}>{sectors.map(s=><option key={s}>{s}</option>)}</select></label>
        <label>Gebiet<input value="Berlin + 50 km" disabled/></label>
        <label>Max. Treffer<input value="15" disabled/></label>
        <button className="primary finderButton" onClick={search} disabled={busy}>{busy?'Suche läuft …':'Firmen suchen'}</button>
      </div>
      <div className="finderNote"><b>Lead-Finder</b><span>Ermittelt Firmen, bewertet sie für LUPENREIN und markiert bereits vorhandene Datensätze automatisch als Dublette.</span></div>
    </section>

    {mode&&<div className={`modeBanner ${mode==='live'?'live':'demo'}`}><b>{mode==='live'?'● LIVE-SUCHE':'DEMO-MODUS'}</b><span>{mode==='live'?'Ergebnisse stammen aus dem konfigurierten Places-Anbieter.':'Kein GOOGLE_PLACES_API_KEY gesetzt – es werden ausschließlich fiktive Beispieldaten angezeigt.'}</span></div>}
    {message&&<div className="resultMessage">{message}</div>}

    {results.length>0&&<section className="panel finderResults">
      <div className="panelHead"><div><span className="eyebrow">GEFUNDENE UNTERNEHMEN</span><h3>{results.length} Treffer · {sector}</h3></div><button className="primary" disabled={!chosen.length||importing} onClick={importSelected}>{importing?'Übernehme …':`${chosen.length} in Leads übernehmen`}</button></div>
      <div className="finderTable">
        <div className="finderHead"><span></span><span>Unternehmen</span><span>Kontakt</span><span>Empfehlung</span><span>Score</span></div>
        {results.map(c=><div className={`finderRow ${c.duplicate?'duplicate':''}`} key={c.id}>
          <span><input type="checkbox" disabled={c.duplicate} checked={!!selected[c.id]&&!c.duplicate} onChange={e=>setSelected(v=>({...v,[c.id]:e.target.checked}))}/></span>
          <span><b>{c.company}</b><small>{c.address||c.city}</small>{c.duplicate&&<em className="duplicateTag">Bereits im CRM</em>}</span>
          <span><b>{c.phone||'Telefon offen'}</b><small>{c.website?'Website vorhanden':'Website offen'}</small></span>
          <span><b>{c.service}</b><small>{c.potential==='hoch'?'Hohes Potenzial':'Potenzial '+c.potential}</small></span>
          <span className="score">{c.score}</span>
        </div>)}
      </div>
    </section>}

    {!busy&&!results.length&&<section className="panel finderEmpty"><div className="finderIcon">⌕</div><h3>Neue Firmen entdecken</h3><p>Wähle eine Zielgruppe und starte einen Suchlauf. Gute Treffer können anschließend gesammelt in das LUPENREIN CRM übernommen werden.</p></section>}
  </>
}
