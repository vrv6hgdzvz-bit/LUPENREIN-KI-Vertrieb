import {NextResponse} from 'next/server'
import {createActivity,createOffer,getLead,getOffers,updateLead} from '@/lib/store'
import type {OfferItem} from '@/lib/types'
export async function GET(){return NextResponse.json({offers:await getOffers()})}
export async function POST(req:Request){
 try{const body=await req.json();const lead=await getLead(String(body.leadId||''));if(!lead)return NextResponse.json({error:'Lead nicht gefunden.'},{status:404})
 const raw=Array.isArray(body.items)?body.items:[];const items:OfferItem[]=raw.filter((x:any)=>x.service&&Number(x.quantity)>0&&Number(x.unitPrice)>=0).map((x:any,i:number)=>({id:String(x.id||i+1),service:String(x.service),description:String(x.description||''),quantity:Number(x.quantity),unit:String(x.unit||'Pauschale'),unitPrice:Number(x.unitPrice),billing:x.billing==='monatlich'?'monatlich':'einmalig'}))
 if(!items.length)return NextResponse.json({error:'Mindestens eine Angebotsposition ist erforderlich.'},{status:400})
 const validUntil=body.validUntil||new Date(Date.now()+14*86400000).toISOString().slice(0,10);const serviceSpecification={version:1,items:Array.isArray(body.serviceSpecification?.items)?body.serviceSpecification.items:[]};const offer=await createOffer({leadId:lead.id,surveyId:body.surveyId?String(body.surveyId):undefined,title:String(body.title||`Reinigungsangebot für ${lead.company}`),validUntil,items,serviceSpecification,notes:String(body.notes||'')});await updateLead(lead.id,{status:'Angebot'});await createActivity({leadId:lead.id,type:'Angebot',direction:'intern',content:`Angebot ${offer.number} erstellt: ${offer.title}`,outcome:'Entwurf'});return NextResponse.json({offer},{status:201})
 }catch(e:any){return NextResponse.json({error:e?.message||'Angebot konnte nicht erstellt werden.'},{status:500})}}

