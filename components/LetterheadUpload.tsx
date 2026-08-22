'use client'

import {useEffect,useState} from 'react'

function sizeLabel(bytes:number){if(!bytes)return '';if(bytes<1024*1024)return `${Math.max(1,Math.round(bytes/1024))} KB`;return `${(bytes/1024/1024).toFixed(1)} MB`}

export default function LetterheadUpload(){
 const [file,setFile]=useState<File|null>(null)
 const [status,setStatus]=useState<{configured:boolean;mime?:string;size?:number}|null>(null)
 const [busy,setBusy]=useState(false)
 const [notice,setNotice]=useState('')

 async function refresh(){
  const r=await fetch('/api/settings/letterhead',{cache:'no-store'})
  const j=await r.json()
  if(r.ok)setStatus(j)
 }
 useEffect(()=>{refresh()},[])

 async function upload(){
  if(!file)return
  setBusy(true);setNotice('')
  const form=new FormData();form.set('file',file)
  const r=await fetch('/api/settings/letterhead',{method:'POST',body:form})
  const j=await r.json();setBusy(false)
  if(!r.ok){setNotice(j.error||'Upload fehlgeschlagen.');return}
  setStatus(j);setFile(null);setNotice('Briefkopf gespeichert. Neue Angebots-PDFs verwenden ihn automatisch.')
 }
 async function remove(){
  if(!confirm('Briefkopf wirklich entfernen?'))return
  setBusy(true);setNotice('')
  const r=await fetch('/api/settings/letterhead',{method:'DELETE'});const j=await r.json();setBusy(false)
  if(!r.ok){setNotice(j.error||'Entfernen fehlgeschlagen.');return}
  setStatus({configured:false});setNotice('Briefkopf entfernt.')
 }

 return <section className="panel letterheadPanel">
  <div className="panelHead"><div><span className="eyebrow">ANGEBOTS-PDF</span><h3>Original-Briefkopf</h3></div>{status?.configured&&<span className="letterheadActive">AKTIV</span>}</div>
  <p>PDF, PNG oder JPG hochladen. Die Vorlage wird als Hintergrund für Angebots-PDFs und Gmail-Anhänge verwendet.</p>
  {status?.configured&&<div className="letterheadStatus"><b>Briefkopf hinterlegt</b><span>{status.mime?.replace('application/','').replace('image/','').toUpperCase()} {status.size?`· ${sizeLabel(status.size)}`:''}</span></div>}
  <label className="letterheadFile">Datei auswählen<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
  {file&&<small className="letterheadSelected">Ausgewählt: {file.name} · {sizeLabel(file.size)}</small>}
  <div className="letterheadActions"><button className="primary" disabled={busy||!file} onClick={upload}>{busy?'Speichere …':'Briefkopf hochladen'}</button>{status?.configured&&<button className="secondary" disabled={busy} onClick={remove}>Entfernen</button>}</div>
  {notice&&<p className="actionNotice">{notice}</p>}
 </section>
}
