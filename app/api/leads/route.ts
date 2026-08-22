import {NextResponse} from 'next/server'
import {createLead,getLeads} from '@/lib/store'
import {scoreLead} from '@/lib/scoring'
export async function GET(){ return NextResponse.json(await getLeads()) }
export async function POST(req:Request){
  const b=await req.json(); if(!b.company||!b.city||!b.sector)return NextResponse.json({error:'Pflichtfelder fehlen'},{status:400})
  const s=scoreLead(b.sector,b.city,b.email||'',b.phone||'',b.website||'')
  const lead=await createLead({company:b.company,city:b.city,sector:b.sector,contact:b.contact||'Noch offen',email:b.email||'',phone:b.phone||'',website:b.website||'',address:b.address||'',source:'Manuell',status:'Neu',...s})
  return NextResponse.json(lead,{status:201})
}
