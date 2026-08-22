import {NextResponse} from 'next/server'
import {getLeads} from '@/lib/store'
import {searchCandidates} from '@/lib/finder'

export async function POST(req:Request){
  try{
    const body=await req.json()
    const sector=String(body.sector||'Büro')
    const limit=Math.min(Math.max(Number(body.limit)||12,1),20)
    const leads=await getLeads()
    const result=await searchCandidates(sector,leads,limit)
    return NextResponse.json(result)
  }catch(error){
    console.error(error)
    return NextResponse.json({error:'Lead-Suche fehlgeschlagen. Bitte API-Konfiguration prüfen.'},{status:500})
  }
}
