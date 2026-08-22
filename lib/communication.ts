import 'server-only'
import type {Lead,ReplyIntent} from './types'

export function fallbackDraft(l:Lead){
  const name=l.contact && l.contact!=='Noch offen' ? l.contact : 'liebes Team'
  return {
    subject:`Reinigungsservice für ${l.company}`,
    body:`Guten Tag ${name},\n\nwir unterstützen Unternehmen in Berlin und Brandenburg bei professioneller ${l.service}. Bei ${l.company} könnte dieses Thema aufgrund Ihrer Tätigkeit im Bereich ${l.sector} relevant sein.\n\nGerne würden wir unverbindlich prüfen, ob wir Sie bei der Reinigung Ihrer Flächen unterstützen können. Falls grundsätzlich Bedarf besteht, können wir einen kurzen Telefontermin oder eine Vor-Ort-Besichtigung vereinbaren.\n\nFreundliche Grüße\nLUPENREIN Service GmbH`
  }
}

export async function generateDraft(l:Lead){
  const fallback=fallbackDraft(l); const key=process.env.OPENAI_API_KEY
  if(!key)return {...fallback,mode:'local' as const}
  try{
    const analysis=l.analysis?.summary ? `Website-Analyse: ${l.analysis.summary}. Signale: ${l.analysis.signals.join(', ')}.` : ''
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5-mini',input:`Erstelle für LUPENREIN Service GmbH eine kurze, seriöse B2B-Erstkontakt-E-Mail auf Deutsch. Keine erfundenen Fakten, keine falsche Vertrautheit, keine aggressiven Claims. Unternehmen: ${l.company}; Branche: ${l.sector}; Ort: ${l.city}; Leistung: ${l.service}; Ansprechpartner: ${l.contact||'unbekannt'}. ${analysis}\nAntworte exakt als JSON mit subject und body.`})})
    if(!r.ok)throw new Error('AI')
    const j:any=await r.json(); const raw=String(j.output_text||'').trim(); const cleaned=raw.replace(/^```json\s*/i,'').replace(/```$/,'').trim(); const parsed=JSON.parse(cleaned)
    return {subject:String(parsed.subject||fallback.subject),body:String(parsed.body||fallback.body),mode:'ai' as const}
  }catch{return {...fallback,mode:'local' as const}}
}

function localIntent(text:string):{intent:ReplyIntent;summary:string;followUpDays?:number}{
  const t=text.toLowerCase()
  if(/kein interesse|nicht interessiert|bitte nicht|absehen|kein bedarf/.test(t))return {intent:'kein_interesse',summary:'Der Kontakt signalisiert aktuell kein Interesse.'}
  if(/später|nächste[srn]? (monat|quartal|jahr)|in \d+ (wochen|monaten)|nochmal melden/.test(t))return {intent:'später',summary:'Der Kontakt möchte zu einem späteren Zeitpunkt erneut angesprochen werden.',followUpDays:30}
  if(/interesse|angebot|besichtigung|termin|rufen sie|telefonieren|vor ort/.test(t))return {intent:'interessiert',summary:'Es gibt ein positives Kaufsignal oder Interesse an einem nächsten Schritt.'}
  if(/\?|frage|kosten|preis|wie oft|leistungen/.test(t))return {intent:'rückfrage',summary:'Der Kontakt hat eine Rückfrage, die beantwortet werden sollte.'}
  return {intent:'neutral',summary:'Die Antwort enthält kein eindeutiges Vertriebs-Signal.'}
}

export async function classifyReply(text:string){
  const local=localIntent(text); const key=process.env.OPENAI_API_KEY
  if(!key)return {...local,mode:'local' as const}
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${key}`},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5-mini',input:`Klassifiziere diese B2B-Antwort für einen Gebäudereinigungs-Vertrieb. Erlaubte intent-Werte: interessiert, später, kein_interesse, rückfrage, neutral. Gib nur JSON zurück: {"intent":"...","summary":"kurze deutsche Zusammenfassung","followUpDays": Zahl oder null}. Antwort: ${text}`})})
    if(!r.ok)throw new Error('AI'); const j:any=await r.json(); const raw=String(j.output_text||'').replace(/^```json\s*/i,'').replace(/```$/,'').trim(); const p=JSON.parse(raw)
    const allowed=['interessiert','später','kein_interesse','rückfrage','neutral']
    return {intent:(allowed.includes(p.intent)?p.intent:local.intent) as ReplyIntent,summary:String(p.summary||local.summary),followUpDays:Number(p.followUpDays)||local.followUpDays,mode:'ai' as const}
  }catch{return {...local,mode:'local' as const}}
}

export async function deliverMessage(payload:{to:string;subject:string;body:string}){
  const hook=process.env.EMAIL_SEND_WEBHOOK_URL
  if(!hook)return {ok:true,provider:'preview' as const,externalId:''}
  const r=await fetch(hook,{method:'POST',headers:{'content-type':'application/json','x-lupenrein-token':process.env.EMAIL_SEND_WEBHOOK_TOKEN||''},body:JSON.stringify({...payload,fromName:'LUPENREIN Service GmbH'})})
  if(!r.ok)throw new Error(`Versand-Webhook antwortete mit ${r.status}`)
  let externalId='';try{const j:any=await r.json();externalId=String(j.id||j.messageId||'')}catch{}
  return {ok:true,provider:'webhook' as const,externalId}
}
