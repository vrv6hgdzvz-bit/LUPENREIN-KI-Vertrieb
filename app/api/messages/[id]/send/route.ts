import {NextResponse} from 'next/server'
import {createActivity,getMessage,updateLead,updateMessage} from '@/lib/store'
import {deliverMessage} from '@/lib/communication'
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;const m=await getMessage(id);if(!m)return NextResponse.json({error:'Nachricht nicht gefunden.'},{status:404})
  if(m.status!=='Freigegeben')return NextResponse.json({error:'Die Nachricht muss vor dem Versand freigegeben werden.'},{status:409})
  if(!m.to)return NextResponse.json({error:'Empfängeradresse fehlt.'},{status:400})
  try{const d=await deliverMessage({to:m.to,subject:m.subject,body:m.body});const now=new Date().toISOString();const u=await updateMessage(id,{status:'Gesendet',provider:d.provider,sentAt:now});await updateLead(m.leadId,{status:'Kontaktiert'});await createActivity({leadId:m.leadId,type:'E-Mail',direction:'ausgehend',content:`${m.subject}\n\n${m.body}`,outcome:d.provider==='webhook'?'Über Versand-Connector gesendet':'Versand in Vorschau markiert'});return NextResponse.json({message:u,delivery:d})}catch(e:any){return NextResponse.json({error:e?.message||'Versand fehlgeschlagen.'},{status:502})}
}
