import {NextResponse} from 'next/server'
import {createActivity,getActivities,getLead} from '@/lib/store'
import {ACTIVITY_TYPES} from '@/lib/types'

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  return NextResponse.json(await getActivities(id))
}
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  if(!await getLead(id))return NextResponse.json({error:'Lead nicht gefunden.'},{status:404})
  const b=await req.json()
  if(!ACTIVITY_TYPES.includes(b.type)||!String(b.content||'').trim())return NextResponse.json({error:'Typ und Inhalt sind erforderlich.'},{status:400})
  const direction=['intern','eingehend','ausgehend'].includes(b.direction)?b.direction:'intern'
  const item=await createActivity({leadId:id,type:b.type,direction,content:String(b.content).trim(),outcome:String(b.outcome||'').trim()})
  return NextResponse.json(item,{status:201})
}
