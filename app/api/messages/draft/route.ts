import {NextResponse} from 'next/server'
import {createActivity,createMessage,getLead,updateLead} from '@/lib/store'
import {generateDraft} from '@/lib/communication'
export async function POST(req:Request){
  const {leadId}=await req.json();const lead=await getLead(String(leadId));if(!lead)return NextResponse.json({error:'Lead nicht gefunden.'},{status:404})
  if(!lead.email)return NextResponse.json({error:'Für diesen Lead ist noch keine E-Mail-Adresse hinterlegt.'},{status:400})
  const d=await generateDraft(lead);const msg=await createMessage({leadId:lead.id,subject:d.subject,body:d.body,to:lead.email,aiMode:d.mode})
  if(lead.status==='Neu'||lead.status==='Qualifiziert')await updateLead(lead.id,{status:'Kontakt bereit'})
  await createActivity({leadId:lead.id,type:'E-Mail',direction:'intern',content:`E-Mail-Entwurf erstellt: ${d.subject}`,outcome:'Wartet auf Freigabe'})
  return NextResponse.json({message:msg})
}
