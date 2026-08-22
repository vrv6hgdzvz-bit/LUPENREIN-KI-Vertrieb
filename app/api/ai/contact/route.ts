import {NextResponse} from 'next/server'
import {getLead} from '@/lib/store'
function fallback(l:any){return `Guten Tag ${l.contact&&l.contact!=='Noch offen'?l.contact:'liebes Team'},\n\nwir unterstützen Unternehmen in Berlin und Brandenburg bei professioneller ${l.service}. Bei ${l.company} könnte dieses Thema aufgrund Ihrer Tätigkeit im Bereich ${l.sector} interessant sein.\n\nGerne würden wir unverbindlich prüfen, ob wir Sie bei der Reinigung Ihrer Flächen unterstützen können. Falls grundsätzlich Bedarf besteht, können wir einen kurzen Telefontermin oder eine Vor-Ort-Besichtigung vereinbaren.\n\nFreundliche Grüße\nLUPENREIN Service GmbH`}
export async function POST(req:Request){
  const {leadId}=await req.json();const l=await getLead(String(leadId));if(!l)return NextResponse.json({error:'Lead nicht gefunden'},{status:404})
  const key=process.env.OPENAI_API_KEY
  if(!key)return NextResponse.json({text:fallback(l),mode:'local-preview'})
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5-mini',input:`Erstelle eine kurze, seriöse B2B-Erstkontakt-E-Mail auf Deutsch für LUPENREIN Service GmbH. Keine erfundenen Tatsachen, kein aggressiver Verkauf. Unternehmen: ${l.company}; Branche: ${l.sector}; Ort: ${l.city}; empfohlene Leistung: ${l.service}; Ansprechpartner: ${l.contact}. Gib nur den E-Mail-Text aus.`})})
    if(!r.ok)throw new Error('AI request failed')
    const j:any=await r.json(); const text=j.output_text||fallback(l); return NextResponse.json({text,mode:'ai'})
  }catch{return NextResponse.json({text:fallback(l),mode:'fallback'})}
}
