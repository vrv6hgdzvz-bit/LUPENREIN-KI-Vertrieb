'use client'
import {useState} from 'react'

export default function WebsiteVisitorActions({id,status}:{id:string;status:string}){
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
 async function promote(){setBusy(true);setMessage('');const r=await fetch(`/api/website-visitors/${id}/promote`,{method:'POST'});const j=await r.json();setBusy(false);if(!r.ok){setMessage(j.error||'Übernahme nicht möglich.');return}setMessage('Als Lead übernommen.');location.reload()}
 if(status==='Übernommen')return <span className="visitorDone">✓ Im CRM</span>
 return <div className="visitorAction"><button className="primary" disabled={busy} onClick={promote}>{busy?'Wird übernommen…':'Als Lead übernehmen'}</button>{message&&<small>{message}</small>}</div>
}

