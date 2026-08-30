import {headers} from 'next/headers'
import {NextResponse} from 'next/server'
import {allowPublicRequest,clientIp,decideOfferAtomic} from '@/lib/publicSelfServiceGuard'

const REASONS:Record<string,string>={price:'Der Preis ist zu hoch',competitor:'Anderen Anbieter gewählt',scope:'Leistungsumfang passt nicht',timing:'Startzeitpunkt passt nicht',postponed:'Bedarf wurde verschoben',cancelled:'Reinigung wird nicht mehr benötigt',other:'Anderer Grund'}

export async function POST(req:Request,{params}:{params:Promise<{token:string}>}){
 try{
  const {token}=await params,body=await req.json(),reason=String(body.reason||''),reasonLabel=REASONS[reason],details=String(body.details||'').trim()
  if(!reasonLabel)return NextResponse.json({error:'Bitte wählen Sie einen gültigen Ablehnungsgrund.'},{status:400})
  if(details.length>500)return NextResponse.json({error:'Die Anmerkung darf höchstens 500 Zeichen lang sein.'},{status:400})
  const h=await headers(),ip=clientIp(h)
  if(!allowPublicRequest('offer-decision',ip,20))return NextResponse.json({error:'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'},{status:429})
  const result=await decideOfferAtomic(token,'rejected',{reason,reasonLabel,details,ip,userAgent:(h.get('user-agent')||'unbekannt').slice(0,500)})
  if(!result)return NextResponse.json({error:'Angebot ist nicht verfügbar, abgelaufen oder bereits bearbeitet.'},{status:409})
  return NextResponse.json({rejected:true,rejectedAt:result.timestamp})
 }catch(e:any){return NextResponse.json({error:e.message||'Ablehnung konnte nicht gespeichert werden.'},{status:500})}
}
