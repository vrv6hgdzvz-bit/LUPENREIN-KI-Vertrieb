import {NextResponse} from 'next/server'
import {createSelfServiceRequest} from '@/lib/selfService'
import {allowPublicRequest,clientIp,normalizeQuestionnaire,requirePublicBackend} from '@/lib/publicSelfServiceGuard'

export async function POST(req:Request){
 try{
  requirePublicBackend()
  const contentLength=Number(req.headers.get('content-length')||0)
  if(contentLength>65536)return NextResponse.json({error:'Die Anfrage ist zu groß.'},{status:413})
  const ip=clientIp(req.headers)
  if(!allowPublicRequest('questionnaire',ip))return NextResponse.json({error:'Zu viele Anfragen. Bitte versuchen Sie es später erneut.'},{status:429})
  const answers=normalizeQuestionnaire(await req.json())
  const row=await createSelfServiceRequest(answers)
  if(row.pricing.reviewMode==='review')return NextResponse.json({mode:'review',requestId:row.id,message:'Vielen Dank. Ihre Anfrage wird fachlich geprüft. Wir melden uns mit dem finalen Angebot.'},{status:201})
  return NextResponse.json({mode:'instant',offerUrl:`/angebot/${row.offerToken}`,requestId:row.id},{status:201})
 }catch(e:any){
  const message=e?.message||'Anfrage konnte nicht gespeichert werden.'
  const clientError=message.startsWith('Bitte ')
  return NextResponse.json({error:message},{status:clientError?400:500})
 }
}
