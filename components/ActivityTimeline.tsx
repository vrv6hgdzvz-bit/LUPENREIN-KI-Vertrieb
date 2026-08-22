'use client'
import {FormEvent,useState} from 'react'
import {useRouter} from 'next/navigation'
import {ACTIVITY_TYPES,type Activity} from '@/lib/types'

export default function ActivityTimeline({leadId,items}:{leadId:string;items:Activity[]}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState('')
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setBusy(true);setError('');const form=e.currentTarget;const f=new FormData(form)
    const r=await fetch(`/api/leads/${leadId}/activities`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:f.get('type'),direction:f.get('direction'),content:f.get('content'),outcome:f.get('outcome')})})
    setBusy(false);if(!r.ok){const j=await r.json();setError(j.error||'Speichern fehlgeschlagen.');return}form.reset();router.refresh()
  }
  return <section className="panel activityPanel"><div className="activityHeader"><div><span className="eyebrow">KONTAKTVERLAUF</span><h3>Aktivitäten & Notizen</h3></div><span className="activityCount">{items.length} Einträge</span></div>
    <form className="activityForm" onSubmit={submit}><div className="activityFields"><label>Typ<select name="type" defaultValue="Notiz">{ACTIVITY_TYPES.map(x=><option key={x}>{x}</option>)}</select></label><label>Richtung<select name="direction" defaultValue="intern"><option value="intern">Intern</option><option value="ausgehend">Ausgehend</option><option value="eingehend">Eingehend</option></select></label><label>Ergebnis<input name="outcome" placeholder="z. B. Rückruf nächste Woche"/></label></div><label>Notiz<textarea name="content" rows={3} required placeholder="Was ist passiert? Gespräch, Rückmeldung, nächster Schritt …"/></label>{error&&<p className="errorText">{error}</p>}<button className="primary" disabled={busy}>{busy?'Speichern …':'Aktivität speichern'}</button></form>
    <div className="timeline">{items.length===0?<div className="emptyTimeline">Noch keine Aktivitäten. Lege die erste Notiz oder einen Kontaktversuch an.</div>:items.map(a=><article className="timelineItem" key={a.id}><div className="timelineDot"/><div><div className="timelineMeta"><strong>{a.type}</strong><span>{a.direction}</span><time>{new Date(a.createdAt).toLocaleString('de-DE')}</time></div><p>{a.content}</p>{a.outcome&&<small>Ergebnis: {a.outcome}</small>}</div></article>)}</div>
  </section>
}
