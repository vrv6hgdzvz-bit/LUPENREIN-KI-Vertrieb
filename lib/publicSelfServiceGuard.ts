import 'server-only'
import {adminConfigured,adminRest} from './supabaseAdmin'
import {SERVICE_TYPES,type QuestionnaireAnswers} from './selfService'

const text=(value:unknown,max:number)=>String(value??'').trim().slice(0,max)
const boundedNumber=(value:unknown,max:number)=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(max,n)):0}
const serviceTypes=new Set<string>(SERVICE_TYPES)
const buckets=new Map<string,{count:number;reset:number}>()

export function requirePublicBackend(){
 if(process.env.NODE_ENV==='production'&&!adminConfigured)throw new Error('Supabase ist für den öffentlichen Self-Service nicht konfiguriert.')
}

export function clientIp(headers:Headers){return (headers.get('x-forwarded-for')||headers.get('x-real-ip')||'unknown').split(',')[0].trim().slice(0,80)}

export function allowPublicRequest(scope:string,ip:string,limit=8,windowMs=60*60*1000){
 const key=`${scope}:${ip}`,now=Date.now(),current=buckets.get(key)
 if(!current||current.reset<=now){buckets.set(key,{count:1,reset:now+windowMs});return true}
 if(current.count>=limit)return false
 current.count+=1;return true
}

export function normalizeQuestionnaire(b:any):QuestionnaireAnswers{
 const company=text(b.company,160),email=text(b.email,254).toLowerCase(),address=text(b.address,300),areaSqm=boundedNumber(b.areaSqm,100000)
 if(company.length<2||address.length<5||areaSqm<=0||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Bitte füllen Sie Unternehmen, gültige E-Mail, Adresse und Fläche vollständig aus.')
 const chosen=(Array.isArray(b.serviceTypes)?b.serviceTypes:[]).map((x:unknown)=>text(x,80)).filter((x:string)=>serviceTypes.has(x)).slice(0,5)
 if(!chosen.length)throw new Error('Bitte wählen Sie mindestens eine gültige Leistung aus.')
 const list=(value:unknown,maxItems:number,maxLen:number)=>(Array.isArray(value)?value:[]).map(x=>text(x,maxLen)).filter(Boolean).slice(0,maxItems)
 const soil=String(b.soilLevel),materials=String(b.materials)
 return {company,contactName:text(b.contactName,120),email,phone:text(b.phone,50),objectType:text(b.objectType,120),address,areaSqm,serviceTypes:chosen,weekdays:list(b.weekdays,7,20),frequency:text(b.frequency,40),timeWindow:text(b.timeWindow,100),floorTypes:list(b.floorTypes,20,80),areas:list(b.areas,30,100),restrooms:boundedNumber(b.restrooms,1000),kitchens:boundedNumber(b.kitchens,1000),glassAreaSqm:boundedNumber(b.glassAreaSqm,100000),staircases:boundedNumber(b.staircases,500),elevators:boundedNumber(b.elevators,500),specialAreas:text(b.specialAreas,1000),soilLevel:(['leicht','normal','stark'].includes(soil)?soil:'normal') as QuestionnaireAnswers['soilLevel'],materials:(['LUPENREIN','Kunde','gemischt'].includes(materials)?materials:'LUPENREIN') as QuestionnaireAnswers['materials'],access:text(b.access,500),specialRequests:text(b.specialRequests,1500),desiredStart:text(b.desiredStart,40)||undefined}
}

type Decision='accepted'|'rejected'
export async function decideOfferAtomic(token:string,decision:Decision,meta:{ip:string;userAgent:string;reason?:string;reasonLabel?:string;details?:string}){
 requirePublicBackend();if(!adminConfigured)return undefined
 const lookup=await adminRest(`self_service_requests?offer_token=eq.${encodeURIComponent(token)}&status=eq.offered&select=id,offer_number,valid_until,responses&limit=1`)
 if(!lookup.ok)throw new Error('Angebot konnte nicht geladen werden.')
 const rows=await lookup.json() as any[],row=rows[0];if(!row)return undefined
 if(String(row.valid_until||'')<new Date().toISOString().slice(0,10))return undefined
 const timestamp=new Date().toISOString(),company=String(row.responses?.company||'Kunde'),body:any={status:decision,updated_at:timestamp}
 if(decision==='accepted'){body.accepted_at=timestamp;body.acceptance={ip:meta.ip,userAgent:meta.userAgent,timestamp};body.internal_activity={type:'Angebotsannahme',text:`Angebot ${row.offer_number} wurde online angenommen.`,createdAt:timestamp};body.follow_up_task={title:`Neukundenkontakt: ${company}`,status:'Offen',dueAt:new Date(Date.now()+86400000).toISOString()}}
 else{body.rejected_at=timestamp;body.rejection={reason:meta.reason,reasonLabel:meta.reasonLabel,details:meta.details||undefined,ip:meta.ip,userAgent:meta.userAgent,timestamp};body.internal_activity={type:'Angebotsablehnung',text:`Angebot ${row.offer_number} wurde online abgelehnt: ${meta.reasonLabel}${meta.details?` – ${meta.details}`:''}`,createdAt:timestamp};body.follow_up_task={title:`Ablehnungsgrund prüfen: ${company}`,status:'Offen',dueAt:new Date(Date.now()+86400000).toISOString()}}
 const patch=await adminRest(`self_service_requests?id=eq.${encodeURIComponent(row.id)}&status=eq.offered`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(body)})
 if(!patch.ok)throw new Error(decision==='accepted'?'Annahme konnte nicht gespeichert werden.':'Ablehnung konnte nicht gespeichert werden.')
 const changed=await patch.json() as any[];return changed[0]?{timestamp}:undefined
}
