'use client'
import {useState} from 'react'

const REASONS=[
 ['price','Der Preis ist zu hoch'],
 ['competitor','Anderen Anbieter gewählt'],
 ['scope','Leistungsumfang passt nicht'],
 ['timing','Startzeitpunkt passt nicht'],
 ['postponed','Bedarf wurde verschoben'],
 ['cancelled','Reinigung wird nicht mehr benötigt'],
 ['other','Anderer Grund']
] as const

export default function PublicOfferAcceptance({token,status}:{token:string;status:'offered'|'accepted'|'rejected'|'submitted'|'review'}){
 const [result,setResult]=useState(status),[showReject,setShowReject]=useState(false),[reason,setReason]=useState(''),[details,setDetails]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function accept(){setBusy(true);setError('');const r=await fetch(`/api/public/offers/${token}/accept`,{method:'POST'});const j=await r.json();setBusy(false);if(r.ok)setResult('accepted');else setError(j.error||'Annahme konnte nicht gespeichert werden.')}
 async function reject(){if(!reason){setError('Bitte wählen Sie einen Ablehnungsgrund aus.');return}setBusy(true);setError('');const r=await fetch(`/api/public/offers/${token}/reject`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reason,details})});const j=await r.json();setBusy(false);if(r.ok)setResult('rejected');else setError(j.error||'Ablehnung konnte nicht gespeichert werden.')}
 if(result==='accepted')return <div className="acceptSuccess"><b>✓ Angebot angenommen</b><p>Vielen Dank. Unser Team meldet sich kurzfristig zur Abstimmung des Starts.</p></div>
 if(result==='rejected')return <div className="rejectSuccess"><b>Angebot wurde abgelehnt</b><p>Vielen Dank für Ihre Rückmeldung. Sie hilft uns, unser Angebot zu verbessern.</p></div>
 return <section className="offerDecision"><div className="decisionButtons"><button className="primary publicCta" disabled={busy} onClick={accept}>{busy?'Wird gespeichert …':'Angebot verbindlich annehmen'}</button><button className="rejectButton" disabled={busy} onClick={()=>{setShowReject(value=>!value);setError('')}}>Angebot ablehnen</button></div><p className="legalHint">Bitte wählen Sie, ob Sie das Angebot annehmen oder ablehnen möchten.</p>{showReject&&<div className="rejectPanel"><h3>Warum möchten Sie das Angebot ablehnen?</h3><p>Bitte wählen Sie den zutreffenden Grund aus.</p><div className="rejectReasons">{REASONS.map(([value,label])=><label key={value} className={reason===value?'selected':''}><input type="radio" name="rejectReason" value={value} checked={reason===value} onChange={()=>setReason(value)}/><span>{label}</span></label>)}</div><label className="rejectDetails">Zusätzliche Anmerkung (optional)<textarea maxLength={500} rows={3} value={details} onChange={event=>setDetails(event.target.value)} placeholder="Was können wir beim nächsten Angebot besser machen?"/></label><div className="rejectActions"><button className="secondary" type="button" onClick={()=>setShowReject(false)}>Zurück</button><button className="rejectConfirm" type="button" disabled={busy||!reason} onClick={reject}>{busy?'Wird gespeichert …':'Ablehnung bestätigen'}</button></div></div>}{error&&<p className="actionNotice">{error}</p>}</section>
}

