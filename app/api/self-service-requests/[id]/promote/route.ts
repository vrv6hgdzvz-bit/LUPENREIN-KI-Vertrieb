import {NextResponse} from 'next/server'
import {createActivity,createCustomerObject,createLead,createOffer,createSurvey,createTask,getActivities,getLead,getOffers,getSurveys,getTasks,updateLead,updateOffer} from '@/lib/store'
import {listSelfServiceRequests,updateSelfServiceRequest} from '@/lib/selfService'

const visits=(frequency:string)=>({'1× pro Woche':1,'2× pro Woche':2,'3× pro Woche':3,'5× pro Woche':5,'6× pro Woche':6,'täglich':6}[frequency]||0)

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params
  const row=(await listSelfServiceRequests()).find(x=>x.id===id)
  if(!row)return NextResponse.json({error:'Kundenanfrage nicht gefunden.'},{status:404})
  const marker=`Self-Service:${row.id}`
  let lead=row.crmSync?.leadId?await getLead(row.crmSync.leadId):undefined
  if(!lead)lead=await createLead({company:row.answers.company,city:row.answers.address||'Berlin',sector:row.answers.objectType||'Interessent',score:90,service:row.answers.serviceTypes.join(', ')||'Reinigung',status:row.status==='accepted'?'Kunde':row.status==='offered'?'Angebot':'Qualifiziert',contact:row.answers.contactName||'Noch offen',email:row.answers.email,phone:row.answers.phone,website:'',address:row.answers.address,source:'Self-Service',sourceId:marker,reason:'Öffentliche Kundenanfrage mit automatisch erzeugtem Leistungsverzeichnis.',potential:'hoch'})
  else await updateLead(lead.id,{status:row.status==='accepted'?'Kunde':row.status==='offered'?'Angebot':'Qualifiziert',email:row.answers.email,phone:row.answers.phone,contact:row.answers.contactName||lead.contact,service:row.answers.serviceTypes.join(', ')||lead.service})

  let survey=(await getSurveys(lead.id)).find(x=>x.notes?.includes(marker))
  if(!survey)survey=await createSurvey({leadId:lead.id,status:'Kalkuliert',objectName:row.answers.company,objectType:row.answers.objectType,address:row.answers.address,areaSqm:row.answers.areaSqm,frequencyPerWeek:visits(row.answers.frequency),hoursPerVisit:row.pricing.internal.hoursPerVisit,workers:1,windowAreaSqm:row.answers.glassAreaSqm,restrooms:row.answers.restrooms,kitchens:row.answers.kitchens,floorType:row.answers.floorTypes.join(', '),accessWindow:row.answers.timeWindow,startDate:row.answers.desiredStart,notes:`Automatisch übernommen aus ${marker}. Zugang: ${row.answers.access}. Wünsche: ${row.answers.specialRequests}`})

  let offer=(await getOffers()).find(x=>x.leadId===lead.id&&x.notes?.includes(marker))
  if(!offer)offer=await createOffer({leadId:lead.id,surveyId:survey.id,title:`Reinigungsangebot · ${row.answers.objectType}`,validUntil:row.validUntil,items:row.offerItems,serviceSpecification:{version:1,items:row.lvItems},notes:`Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV). ${marker}`})
  if(row.status==='accepted')offer=(await updateOffer(offer.id,{status:'Angenommen'}))||offer
  else if(row.status==='offered')offer=(await updateOffer(offer.id,{status:'Versendet'}))||offer

  const activities=await getActivities(lead.id)
  if(!activities.some(x=>x.content.includes(marker)))await createActivity({leadId:lead.id,type:'Status',direction:'eingehend',content:`Kundenanfrage ins CRM übernommen (${marker}).`,outcome:row.status==='accepted'?'Gewonnen':'Interessent'})

  let customerObjectId=row.crmSync?.customerObjectId
  if(row.status==='accepted'){
   const customer=await createCustomerObject({leadId:lead.id,offerId:offer.id,surveyId:survey.id,status:row.answers.desiredStart&&new Date(row.answers.desiredStart)<=new Date()?'Aktiv':'Geplant',objectName:row.answers.company,objectType:row.answers.objectType,address:row.answers.address,service:row.answers.serviceTypes.join(', '),startDate:row.answers.desiredStart,areaSqm:row.answers.areaSqm,frequencyPerWeek:visits(row.answers.frequency),monthlyRevenue:row.pricing.monthlyNet,oneTimeRevenue:row.pricing.oneTimeNet,contractTermMonths:12,noticePeriodMonths:3,notes:`Automatisch aus angenommenem ${marker} angelegt.`})
   customerObjectId=customer.id
  }

  const taskTitle=row.status==='accepted'?'Auftragsstart abstimmen':`Kundenanfrage nachfassen: ${row.answers.company}`
  const tasks=await getTasks()
  if(!tasks.some(x=>x.leadId===lead.id&&x.note?.includes(marker)))await createTask({leadId:lead.id,title:taskTitle,type:row.status==='accepted'?'Sonstiges':'Follow-up',dueAt:new Date(Date.now()+86400000).toISOString(),note:`${marker} · Kontakt aufnehmen und nächsten Schritt abstimmen.`})

  const crmSync={leadId:lead.id,surveyId:survey.id,offerId:offer.id,customerObjectId,syncedAt:new Date().toISOString()}
  await updateSelfServiceRequest(row.id,{crmSync})
  return NextResponse.json({crmSync,links:{lead:`/leads/${lead.id}`,offer:`/offers/${offer.id}`,customer:customerObjectId?`/customers/${customerObjectId}`:undefined}})
 }catch(e:any){return NextResponse.json({error:e?.message||'CRM-Übernahme fehlgeschlagen.'},{status:500})}
}

