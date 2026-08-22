import {NextResponse} from 'next/server'
import {createLead,getLeads,normalize} from '@/lib/store'
import type {FinderCandidate} from '@/lib/types'

export async function POST(req:Request){
  const body=await req.json() as {candidates?:FinderCandidate[]}
  const candidates=body.candidates??[]
  if(!Array.isArray(candidates)||!candidates.length)return NextResponse.json({error:'Keine Leads ausgewählt.'},{status:400})

  const before=await getLeads()
  let imported=0, duplicates=0
  for(const c of candidates){
    const exists=before.some(l=>(l.sourceId&&l.sourceId===c.sourceId)||(normalize(l.company)===normalize(c.company)&&normalize(l.city)===normalize(c.city)))
    if(exists){duplicates++;continue}
    await createLead({
      company:c.company, city:c.city, sector:c.sector, score:c.score, service:c.service,
      status:'Neu', contact:'Noch offen', email:'', phone:c.phone||'', website:c.website||'',
      address:c.address||'', source:c.source, sourceId:c.sourceId, reason:c.reason, potential:c.potential
    })
    before.push({id:'temp',createdAt:new Date().toISOString(),company:c.company,city:c.city,sector:c.sector,score:c.score,service:c.service,status:'Neu',contact:'',email:'',phone:c.phone||'',website:c.website,address:c.address,source:c.source,sourceId:c.sourceId,reason:c.reason,potential:c.potential})
    imported++
  }
  return NextResponse.json({imported,duplicates})
}
