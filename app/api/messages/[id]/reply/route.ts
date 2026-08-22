import {NextResponse} from 'next/server'
import {classifyReply} from '@/lib/communication'
import {createActivity,createTask,getMessage,updateLead,updateMessage} from '@/lib/store'
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const {text}=await req.json();const m=await getMessage(id);if(!m)return NextResponse.json({error:'Nachricht nicht gefunden.'},{status:404});if(!String(text||'').trim())return NextResponse.json({error:'Antworttext fehlt.'},{status:400})
  const c=await classifyReply(String(text));const followUpAt=c.followUpDays?new Date(Date.now()+c.followUpDays*86400000).toISOString():undefined
  const u=await updateMessage(id,{status:'Beantwortet',replyText:String(text),replyIntent:c.intent,replySummary:c.summary,followUpAt})
  if(c.intent==='interessiert')await updateLead(m.leadId,{status:'Interessiert'});if(c.intent==='rückfrage')await updateLead(m.leadId,{status:'Interessiert'})
  await createActivity({leadId:m.leadId,type:'E-Mail',direction:'eingehend',content:String(text),outcome:c.summary})
  if(followUpAt)await createTask({leadId:m.leadId,title:c.intent==='später'?'Erneut Kontakt aufnehmen':'E-Mail Follow-up',type:'Follow-up',dueAt:followUpAt,note:c.summary})
  if(c.intent==='interessiert')await createTask({leadId:m.leadId,title:'Interessenten anrufen / Termin abstimmen',type:'Anruf',dueAt:new Date(Date.now()+24*3600000).toISOString(),note:c.summary})
  return NextResponse.json({message:u,classification:c})
}
