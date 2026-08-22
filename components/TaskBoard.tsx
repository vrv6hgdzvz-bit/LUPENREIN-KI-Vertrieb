'use client'
import {useState} from 'react'
import type {Lead,Task} from '@/lib/types'
export function TaskBoard({initialTasks,leads}:{initialTasks:Task[];leads:Lead[]}){
 const [tasks,setTasks]=useState(initialTasks);const [busy,setBusy]=useState('')
 async function done(id:string){setBusy(id);const r=await fetch(`/api/tasks/${id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status:'Erledigt'})});if(r.ok)setTasks(x=>x.map(t=>t.id===id?{...t,status:'Erledigt'}:t));setBusy('')}
 const open=tasks.filter(t=>t.status==='Offen');const closed=tasks.filter(t=>t.status==='Erledigt').slice(0,8)
 const name=(id:string)=>leads.find(l=>l.id===id)?.company||`Lead ${id}`
 return <div className="taskGrid"><section className="panel"><div className="panelHead"><div><span className="eyebrow">HEUTE & DEMNÄCHST</span><h3>Offene Aufgaben</h3></div><b>{open.length}</b></div>{open.length===0?<div className="emptyState">Keine offenen Aufgaben.</div>:open.map(t=><div className="taskRow" key={t.id}><div><span className="taskType">{t.type}</span><b>{t.title}</b><small>{name(t.leadId)} · {new Date(t.dueAt).toLocaleString('de-DE',{dateStyle:'medium',timeStyle:'short'})}</small>{t.note&&<p>{t.note}</p>}</div><button className="secondary" disabled={busy===t.id} onClick={()=>done(t.id)}>✓ Erledigt</button></div>)}</section><section className="panel"><span className="eyebrow">VERLAUF</span><h3>Zuletzt erledigt</h3>{closed.length===0?<div className="emptyState">Noch keine erledigten Aufgaben.</div>:closed.map(t=><div className="taskRow compact" key={t.id}><div><b>{t.title}</b><small>{name(t.leadId)}</small></div><span>✓</span></div>)}</section></div>
}
