import {NextResponse} from 'next/server'
import {getLead,getOffer,getSurvey} from '@/lib/store'
import {buildOfferPdf} from '@/lib/pdf'
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const offer=await getOffer(id);if(!offer)return NextResponse.json({error:'Angebot nicht gefunden.'},{status:404});const lead=await getLead(offer.leadId);if(!lead)return NextResponse.json({error:'Lead nicht gefunden.'},{status:404});const survey=offer.surveyId?await getSurvey(offer.surveyId):undefined;const pdf=await buildOfferPdf(offer,lead,survey);return new Response(pdf,{headers:{'content-type':'application/pdf','content-disposition':`attachment; filename="${offer.number}.pdf"`,'cache-control':'no-store'}})}
