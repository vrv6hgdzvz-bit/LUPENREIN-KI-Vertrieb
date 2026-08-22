'use client'
import {useState} from 'react'
import {useRouter} from 'next/navigation'
export function AgentRunner(){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState('');const router=useRouter()
 async function run(){setBusy(true);setMsg('');try{const r=await fetch('/api/agent/run',{method:'POST'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Agent konnte nicht ausgeführt werden.');setMsg(`${j.tasksCreated} neue Vertriebsaufgaben vorbereitet.`);router.refresh()}catch(e:any){setMsg(e.message)}finally{setBusy(false)}}
 return <div className="agentRunner"><button className="primary" disabled={busy} onClick={run}>{busy?'Agent analysiert…':'Vertriebs-Agent jetzt starten'}</button>{msg&&<small>{msg}</small>}</div>
}
