import {headers} from 'next/headers'
import {NextResponse} from 'next/server'
import {allowPublicRequest,clientIp,decideOfferAtomic} from '@/lib/publicSelfServiceGuard'

export async function POST(_:Request,{params}:{params:Promise<{token:string}>}){
 try{
  const {token}=await params,h=await headers(),ip=clientIp(h)
  if(!allowPublicRequest('offer-decision',ip,20))return NextResponse.json({error:'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'},{status:429})
  const result=await decideOfferAtomic(token,'accepted',{ip,userAgent:(h.get('user-agent')||'unbekannt').slice(0,500)})
  if(!result)return NextResponse.json({error:'Angebot ist nicht verfügbar, abgelaufen oder bereits bearbeitet.'},{status:409})
  return NextResponse.json({accepted:true,acceptedAt:result.timestamp})
 }catch(e:any){return NextResponse.json({error:e.message||'Annahme konnte nicht gespeichert werden.'},{status:500})}
}
