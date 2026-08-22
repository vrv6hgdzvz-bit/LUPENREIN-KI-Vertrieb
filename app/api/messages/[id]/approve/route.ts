import {NextResponse} from 'next/server'
import {getMessage,updateMessage,createActivity} from '@/lib/store'
export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const m=await getMessage(id);if(!m)return NextResponse.json({error:'Nachricht nicht gefunden.'},{status:404});const u=await updateMessage(id,{status:'Freigegeben'});await createActivity({leadId:m.leadId,type:'E-Mail',direction:'intern',content:`E-Mail freigegeben: ${m.subject}`,outcome:'Versand freigegeben'});return NextResponse.json({message:u})}
