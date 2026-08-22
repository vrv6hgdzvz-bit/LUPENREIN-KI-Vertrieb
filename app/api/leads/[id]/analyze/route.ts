import {NextResponse} from 'next/server'
import {getLead,updateLead} from '@/lib/store'
import {analyzeLeadWebsite} from '@/lib/analyzer'

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const {id}=await params
  const lead=await getLead(id)
  if(!lead)return NextResponse.json({error:'Lead nicht gefunden.'},{status:404})
  try{
    const analysis=await analyzeLeadWebsite(lead)
    const signalBonus=Math.min(8,analysis.signals.length*2)
    const contactBonus=(analysis.businessEmail&&!lead.email?2:0)+(analysis.businessPhone&&!lead.phone?1:0)
    const score=Math.min(99,Math.max(lead.score,Math.round(lead.score+signalBonus+contactBonus)))
    const service=analysis.recommendedServices[0]||lead.service
    const reason=`${analysis.summary} Empfohlene Leistung: ${service}.`
    const updated=await updateLead(id,{analysis,score,service,reason,email:lead.email||analysis.businessEmail||'',phone:lead.phone||analysis.businessPhone||'',potential:score>=85?'hoch':score>=70?'mittel':'niedrig',status:lead.status==='Neu'?'Qualifiziert':lead.status})
    return NextResponse.json({lead:updated,analysis})
  }catch(error){
    const message=error instanceof Error?error.message:'Website-Analyse fehlgeschlagen.'
    return NextResponse.json({error:message},{status:400})
  }
}
