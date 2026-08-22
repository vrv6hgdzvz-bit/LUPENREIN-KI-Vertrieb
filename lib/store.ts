import 'server-only'
import {promises as fs} from 'fs'
import path from 'path'
import type {Activity, ActivityDirection, ActivityType, Lead, LeadStatus, Message, MessageStatus, ReplyIntent, Task, TaskType, TaskStatus, Offer, OfferItem, OfferStatus, SiteSurvey, SurveyStatus, CustomerObject, CustomerObjectStatus} from './types'
import {getSupabaseUser,supabaseConfigured,supabaseRest} from './supabase'

const file = path.join(process.cwd(),'data','leads.json')
const activityFile = path.join(process.cwd(),'data','activities.json')
const messageFile = path.join(process.cwd(),'data','messages.json')

async function readAll(): Promise<Lead[]> { return JSON.parse(await fs.readFile(file,'utf8')) }
async function writeAll(leads: Lead[]) { await fs.writeFile(file, JSON.stringify(leads,null,2),'utf8') }
async function readActivities(): Promise<Activity[]> {
  try{return JSON.parse(await fs.readFile(activityFile,'utf8'))}catch{return []}
}
async function writeActivities(items:Activity[]){await fs.writeFile(activityFile,JSON.stringify(items,null,2),'utf8')}
async function readMessages():Promise<Message[]>{try{return JSON.parse(await fs.readFile(messageFile,'utf8'))}catch{return []}}
async function writeMessages(items:Message[]){await fs.writeFile(messageFile,JSON.stringify(items,null,2),'utf8')}

function fromDb(x:any):Lead{
  return {id:String(x.id),company:x.company,city:x.city,sector:x.sector,score:x.score,service:x.service,status:x.status,contact:x.contact||'',email:x.email||'',phone:x.phone||'',website:x.website||'',address:x.address||'',source:x.source||undefined,sourceId:x.source_id||undefined,reason:x.reason||'',potential:x.potential||'mittel',analysis:x.analysis||undefined,createdAt:x.created_at,updatedAt:x.updated_at}
}
function toDb(input:Partial<Lead>){
  const out:any={}
  const map:any={company:'company',city:'city',sector:'sector',score:'score',service:'service',status:'status',contact:'contact',email:'email',phone:'phone',website:'website',address:'address',source:'source',sourceId:'source_id',reason:'reason',potential:'potential',analysis:'analysis'}
  for(const [k,v] of Object.entries(input))if(k in map)out[map[k]]=v
  return out
}

export async function getLeads(){
  if(!supabaseConfigured)return readAll()
  const user=await getSupabaseUser(); if(!user)return []
  const r=await supabaseRest(`leads?select=*&owner_id=eq.${encodeURIComponent(user.id)}&order=score.desc,created_at.desc`)
  if(!r.ok)throw new Error('Leads konnten nicht aus Supabase geladen werden.')
  return ((await r.json()) as any[]).map(fromDb)
}
export async function getLead(id:string){
  if(!supabaseConfigured)return (await readAll()).find(x=>x.id===id)
  const user=await getSupabaseUser(); if(!user)return undefined
  const r=await supabaseRest(`leads?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`)
  if(!r.ok)return undefined
  const rows=await r.json() as any[]; return rows[0]?fromDb(rows[0]):undefined
}
export async function createLead(input: Omit<Lead,'id'|'createdAt'>){
  if(!supabaseConfigured){
    const leads=await readAll(); const duplicate=leads.find(x=>(input.sourceId&&x.sourceId===input.sourceId)||(normalize(x.company)===normalize(input.company)&&normalize(x.city)===normalize(input.city)))
    if(duplicate)return duplicate
    const id=String(Math.max(0,...leads.map(x=>Number(x.id)||0))+1); const lead:Lead={...input,id,createdAt:new Date().toISOString()}; leads.unshift(lead);await writeAll(leads);return lead
  }
  const user=await getSupabaseUser(); if(!user)throw new Error('Nicht angemeldet.')
  const existing=(await getLeads()).find(x=>(input.sourceId&&x.sourceId===input.sourceId)||(normalize(x.company)===normalize(input.company)&&normalize(x.city)===normalize(input.city)))
  if(existing)return existing
  const r=await supabaseRest('leads?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({...toDb(input),owner_id:user.id})})
  if(!r.ok)throw new Error('Lead konnte nicht gespeichert werden.')
  return fromDb((await r.json())[0])
}
export async function updateLead(id:string,patch:Partial<Pick<Lead,'status'|'score'|'reason'|'service'|'potential'|'analysis'|'email'|'phone'|'contact'>>){
  if(!supabaseConfigured){const leads=await readAll();const i=leads.findIndex(x=>x.id===id);if(i<0)return null;leads[i]={...leads[i],...patch,status:(patch.status??leads[i].status) as LeadStatus,updatedAt:new Date().toISOString()};await writeAll(leads);return leads[i]}
  const user=await getSupabaseUser(); if(!user)return null
  const r=await supabaseRest(`leads?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({...toDb(patch),updated_at:new Date().toISOString()})})
  if(!r.ok)return null; const rows=await r.json() as any[];return rows[0]?fromDb(rows[0]):null
}

function activityFromDb(x:any):Activity{return {id:String(x.id),leadId:String(x.lead_id),type:x.type,direction:x.direction,content:x.content,outcome:x.outcome||'',createdAt:x.created_at}}
export async function getActivities(leadId:string):Promise<Activity[]>{
  if(!supabaseConfigured)return (await readActivities()).filter(x=>x.leadId===leadId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
  const user=await getSupabaseUser();if(!user)return []
  const r=await supabaseRest(`activities?lead_id=eq.${encodeURIComponent(leadId)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`)
  if(!r.ok)return [];return ((await r.json()) as any[]).map(activityFromDb)
}
export async function createActivity(input:{leadId:string;type:ActivityType;direction:ActivityDirection;content:string;outcome?:string}){
  if(!supabaseConfigured){const items=await readActivities();const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:Activity={id,...input,createdAt:new Date().toISOString()};items.unshift(item);await writeActivities(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const r=await supabaseRest('activities?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,type:input.type,direction:input.direction,content:input.content,outcome:input.outcome||null})})
  if(!r.ok)throw new Error('Aktivität konnte nicht gespeichert werden.');return activityFromDb((await r.json())[0])
}
export function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9äöüß]/gi,'').trim()}


function messageFromDb(x:any):Message{return {id:String(x.id),leadId:String(x.lead_id),subject:x.subject,body:x.body,to:x.to_email,status:x.status,provider:x.provider||'preview',aiMode:x.ai_mode||'local',sentAt:x.sent_at||undefined,gmailDraftId:x.gmail_draft_id||undefined,gmailMessageId:x.gmail_message_id||undefined,replyText:x.reply_text||undefined,replyIntent:x.reply_intent||undefined,replySummary:x.reply_summary||undefined,followUpAt:x.follow_up_at||undefined,createdAt:x.created_at,updatedAt:x.updated_at}}
export async function getMessages():Promise<Message[]>{
  if(!supabaseConfigured)return (await readMessages()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
  const user=await getSupabaseUser();if(!user)return []
  const r=await supabaseRest(`messages?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`);if(!r.ok)return []
  return ((await r.json()) as any[]).map(messageFromDb)
}
export async function getMessage(id:string):Promise<Message|undefined>{
  if(!supabaseConfigured)return (await readMessages()).find(x=>x.id===id)
  const user=await getSupabaseUser();if(!user)return undefined
  const r=await supabaseRest(`messages?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);if(!r.ok)return undefined
  const rows=await r.json() as any[];return rows[0]?messageFromDb(rows[0]):undefined
}
export async function createMessage(input:{leadId:string;subject:string;body:string;to:string;aiMode:'ai'|'local'}){
  if(!supabaseConfigured){const items=await readMessages();const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:Message={id,...input,status:'Entwurf',provider:'preview',createdAt:new Date().toISOString()};items.unshift(item);await writeMessages(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const r=await supabaseRest('messages?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,subject:input.subject,body:input.body,to_email:input.to,status:'Entwurf',provider:'preview',ai_mode:input.aiMode})})
  if(!r.ok)throw new Error('Nachricht konnte nicht gespeichert werden.');return messageFromDb((await r.json())[0])
}
export async function updateMessage(id:string,patch:{subject?:string;body?:string;to?:string;status?:MessageStatus;provider?:'preview'|'webhook'|'gmail';sentAt?:string;gmailDraftId?:string;gmailMessageId?:string;replyText?:string;replyIntent?:ReplyIntent;replySummary?:string;followUpAt?:string}){
  if(!supabaseConfigured){const items=await readMessages();const i=items.findIndex(x=>x.id===id);if(i<0)return null;items[i]={...items[i],...patch,updatedAt:new Date().toISOString()};await writeMessages(items);return items[i]}
  const user=await getSupabaseUser();if(!user)return null
  const db:any={};const map:any={subject:'subject',body:'body',to:'to_email',status:'status',provider:'provider',sentAt:'sent_at',gmailDraftId:'gmail_draft_id',gmailMessageId:'gmail_message_id',replyText:'reply_text',replyIntent:'reply_intent',replySummary:'reply_summary',followUpAt:'follow_up_at'};for(const [k,v] of Object.entries(patch))if(k in map)db[map[k]]=v;db.updated_at=new Date().toISOString()
  const r=await supabaseRest(`messages?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(db)});if(!r.ok)return null;const rows=await r.json() as any[];return rows[0]?messageFromDb(rows[0]):null
}

// V6 Tasks / Follow-ups
const taskFile = path.join(process.cwd(),'data','tasks.json')
async function readTasks():Promise<Task[]>{try{return JSON.parse(await fs.readFile(taskFile,'utf8'))}catch{return []}}
async function writeTasks(items:Task[]){await fs.writeFile(taskFile,JSON.stringify(items,null,2),'utf8')}
function taskFromDb(x:any):Task{return {id:String(x.id),leadId:String(x.lead_id),title:x.title,type:x.type,dueAt:x.due_at,status:x.status,note:x.note||'',createdAt:x.created_at,completedAt:x.completed_at||undefined}}
export async function getTasks(opts?:{status?:TaskStatus;dueBefore?:string}):Promise<Task[]>{
  if(!supabaseConfigured){let items=await readTasks();if(opts?.status)items=items.filter(x=>x.status===opts.status);if(opts?.dueBefore)items=items.filter(x=>x.dueAt<=opts.dueBefore!);return items.sort((a,b)=>a.dueAt.localeCompare(b.dueAt))}
  const user=await getSupabaseUser();if(!user)return []
  let q=`tasks?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=due_at.asc`
  if(opts?.status)q+=`&status=eq.${encodeURIComponent(opts.status)}`
  if(opts?.dueBefore)q+=`&due_at=lte.${encodeURIComponent(opts.dueBefore)}`
  const r=await supabaseRest(q);if(!r.ok)return [];return ((await r.json()) as any[]).map(taskFromDb)
}
export async function createTask(input:{leadId:string;title:string;type:TaskType;dueAt:string;note?:string}){
  if(!supabaseConfigured){const items=await readTasks();const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:Task={id,...input,status:'Offen',createdAt:new Date().toISOString()};items.push(item);await writeTasks(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const r=await supabaseRest('tasks?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,title:input.title,type:input.type,due_at:input.dueAt,note:input.note||null,status:'Offen'})});if(!r.ok)throw new Error('Aufgabe konnte nicht gespeichert werden.');return taskFromDb((await r.json())[0])
}
export async function updateTask(id:string,patch:{status?:TaskStatus;dueAt?:string;title?:string;note?:string}){
  const completedAt=patch.status==='Erledigt'?new Date().toISOString():undefined
  if(!supabaseConfigured){const items=await readTasks();const i=items.findIndex(x=>x.id===id);if(i<0)return null;items[i]={...items[i],...patch,completedAt:completedAt??items[i].completedAt};await writeTasks(items);return items[i]}
  const user=await getSupabaseUser();if(!user)return null
  const db:any={};if(patch.status)db.status=patch.status;if(patch.dueAt)db.due_at=patch.dueAt;if(patch.title)db.title=patch.title;if(patch.note!==undefined)db.note=patch.note;if(completedAt)db.completed_at=completedAt
  const r=await supabaseRest(`tasks?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(db)});if(!r.ok)return null;const rows=await r.json() as any[];return rows[0]?taskFromDb(rows[0]):null
}

// V7 Offers / Umsatzstrecke
const offerFile = path.join(process.cwd(),'data','offers.json')
async function readOffers():Promise<Offer[]>{try{return JSON.parse(await fs.readFile(offerFile,'utf8'))}catch{return []}}
async function writeOffers(items:Offer[]){await fs.writeFile(offerFile,JSON.stringify(items,null,2),'utf8')}
function offerFromDb(x:any):Offer{return {id:String(x.id),leadId:String(x.lead_id),surveyId:x.survey_id?String(x.survey_id):undefined,number:x.number,title:x.title,status:x.status,validUntil:x.valid_until,items:x.items||[],notes:x.notes||'',subtotalOneTime:Number(x.subtotal_one_time||0),subtotalMonthly:Number(x.subtotal_monthly||0),vatRate:Number(x.vat_rate||19),sentAt:x.sent_at||undefined,acceptedAt:x.accepted_at||undefined,declinedAt:x.declined_at||undefined,gmailDraftId:x.gmail_draft_id||undefined,createdAt:x.created_at,updatedAt:x.updated_at||undefined}}
function offerTotals(items:OfferItem[]){let one=0,monthly=0;for(const i of items){const value=Number(i.quantity||0)*Number(i.unitPrice||0);if(i.billing==='monatlich')monthly+=value;else one+=value}return {one:Math.round(one*100)/100,monthly:Math.round(monthly*100)/100}}
function offerNumber(id:string){return `LR-${new Date().getFullYear()}-${String(id).padStart(4,'0')}`}
export async function getOffers():Promise<Offer[]>{
  if(!supabaseConfigured)return (await readOffers()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
  const user=await getSupabaseUser();if(!user)return []
  const r=await supabaseRest(`offers?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`);if(!r.ok)return []
  return ((await r.json()) as any[]).map(offerFromDb)
}
export async function getOffer(id:string):Promise<Offer|undefined>{
  if(!supabaseConfigured)return (await readOffers()).find(x=>x.id===id)
  const user=await getSupabaseUser();if(!user)return undefined
  const r=await supabaseRest(`offers?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);if(!r.ok)return undefined
  const rows=await r.json() as any[];return rows[0]?offerFromDb(rows[0]):undefined
}
export async function createOffer(input:{leadId:string;surveyId?:string;title:string;validUntil:string;items:OfferItem[];notes?:string}){
  const totals=offerTotals(input.items);const now=new Date().toISOString()
  if(!supabaseConfigured){const items=await readOffers();const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:Offer={id,leadId:input.leadId,surveyId:input.surveyId,number:offerNumber(id),title:input.title,status:'Entwurf',validUntil:input.validUntil,items:input.items,notes:input.notes||'',subtotalOneTime:totals.one,subtotalMonthly:totals.monthly,vatRate:19,createdAt:now};items.unshift(item);await writeOffers(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const number=`LR-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
  const r=await supabaseRest('offers?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,survey_id:input.surveyId||null,number,title:input.title,status:'Entwurf',valid_until:input.validUntil,items:input.items,notes:input.notes||null,subtotal_one_time:totals.one,subtotal_monthly:totals.monthly,vat_rate:19})});if(!r.ok)throw new Error('Angebot konnte nicht gespeichert werden.');return offerFromDb((await r.json())[0])
}
export async function updateOffer(id:string,patch:{status?:OfferStatus;title?:string;validUntil?:string;items?:OfferItem[];notes?:string;gmailDraftId?:string}){
  const totals=patch.items?offerTotals(patch.items):null;const now=new Date().toISOString()
  const stamps:any={};if(patch.status==='Versendet')stamps.sentAt=now;if(patch.status==='Angenommen')stamps.acceptedAt=now;if(patch.status==='Abgelehnt')stamps.declinedAt=now
  if(!supabaseConfigured){const items=await readOffers();const i=items.findIndex(x=>x.id===id);if(i<0)return null;items[i]={...items[i],...patch,...stamps,...(totals?{subtotalOneTime:totals.one,subtotalMonthly:totals.monthly}:{}),updatedAt:now};await writeOffers(items);return items[i]}
  const user=await getSupabaseUser();if(!user)return null
  const db:any={updated_at:now};if(patch.status)db.status=patch.status;if(patch.title)db.title=patch.title;if(patch.validUntil)db.valid_until=patch.validUntil;if(patch.items){db.items=patch.items;db.subtotal_one_time=totals?.one;db.subtotal_monthly=totals?.monthly}if(patch.notes!==undefined)db.notes=patch.notes;if(patch.gmailDraftId!==undefined)db.gmail_draft_id=patch.gmailDraftId;if(stamps.sentAt)db.sent_at=stamps.sentAt;if(stamps.acceptedAt)db.accepted_at=stamps.acceptedAt;if(stamps.declinedAt)db.declined_at=stamps.declinedAt
  const r=await supabaseRest(`offers?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(db)});if(!r.ok)return null;const rows=await r.json() as any[];return rows[0]?offerFromDb(rows[0]):null
}


// V8 Objektbesichtigungen / Kalkulationsgrundlage
const surveyFile = path.join(process.cwd(),'data','surveys.json')
async function readSurveys():Promise<SiteSurvey[]>{try{return JSON.parse(await fs.readFile(surveyFile,'utf8'))}catch{return []}}
async function writeSurveys(items:SiteSurvey[]){await fs.writeFile(surveyFile,JSON.stringify(items,null,2),'utf8')}
function surveyFromDb(x:any):SiteSurvey{return {id:String(x.id),leadId:String(x.lead_id),status:x.status||'Entwurf',objectName:x.object_name||'',objectType:x.object_type||'',address:x.address||'',areaSqm:Number(x.area_sqm||0),frequencyPerWeek:Number(x.frequency_per_week||0),hoursPerVisit:Number(x.hours_per_visit||0),workers:Number(x.workers||1),windowAreaSqm:Number(x.window_area_sqm||0),restrooms:Number(x.restrooms||0),kitchens:Number(x.kitchens||0),floorType:x.floor_type||'',accessWindow:x.access_window||'',startDate:x.start_date||undefined,notes:x.notes||'',createdAt:x.created_at,updatedAt:x.updated_at||undefined}}
export async function getSurveys(leadId?:string):Promise<SiteSurvey[]>{
  if(!supabaseConfigured){let items=await readSurveys();if(leadId)items=items.filter(x=>x.leadId===leadId);return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  const user=await getSupabaseUser();if(!user)return []
  let q=`surveys?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`;if(leadId)q+=`&lead_id=eq.${encodeURIComponent(leadId)}`
  const r=await supabaseRest(q);if(!r.ok)return [];return ((await r.json()) as any[]).map(surveyFromDb)
}
export async function getSurvey(id:string):Promise<SiteSurvey|undefined>{
  if(!supabaseConfigured)return (await readSurveys()).find(x=>x.id===id)
  const user=await getSupabaseUser();if(!user)return undefined
  const r=await supabaseRest(`surveys?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);if(!r.ok)return undefined;const rows=await r.json() as any[];return rows[0]?surveyFromDb(rows[0]):undefined
}
export async function createSurvey(input:Omit<SiteSurvey,'id'|'createdAt'|'status'> & {status?:SurveyStatus}){
  const now=new Date().toISOString();const status=input.status||'Entwurf'
  if(!supabaseConfigured){const items=await readSurveys();const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:SiteSurvey={...input,id,status,createdAt:now};items.unshift(item);await writeSurveys(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const r=await supabaseRest('surveys?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,status,object_name:input.objectName,object_type:input.objectType,address:input.address,area_sqm:input.areaSqm,frequency_per_week:input.frequencyPerWeek,hours_per_visit:input.hoursPerVisit,workers:input.workers,window_area_sqm:input.windowAreaSqm,restrooms:input.restrooms,kitchens:input.kitchens,floor_type:input.floorType,access_window:input.accessWindow,start_date:input.startDate||null,notes:input.notes||null})});if(!r.ok)throw new Error('Besichtigung konnte nicht gespeichert werden.');return surveyFromDb((await r.json())[0])
}
export async function updateSurvey(id:string,patch:Partial<Omit<SiteSurvey,'id'|'leadId'|'createdAt'>>){
  const now=new Date().toISOString()
  if(!supabaseConfigured){const items=await readSurveys();const i=items.findIndex(x=>x.id===id);if(i<0)return null;items[i]={...items[i],...patch,updatedAt:now};await writeSurveys(items);return items[i]}
  const user=await getSupabaseUser();if(!user)return null
  const map:any={status:'status',objectName:'object_name',objectType:'object_type',address:'address',areaSqm:'area_sqm',frequencyPerWeek:'frequency_per_week',hoursPerVisit:'hours_per_visit',workers:'workers',windowAreaSqm:'window_area_sqm',restrooms:'restrooms',kitchens:'kitchens',floorType:'floor_type',accessWindow:'access_window',startDate:'start_date',notes:'notes'};const db:any={updated_at:now};for(const [k,v] of Object.entries(patch))if(k in map)db[map[k]]=v
  const r=await supabaseRest(`surveys?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(db)});if(!r.ok)return null;const rows=await r.json() as any[];return rows[0]?surveyFromDb(rows[0]):null
}


// V9 Kundenobjekte / Vertrags- und Umsatzbasis
const customerObjectFile = path.join(process.cwd(),'data','customer-objects.json')
async function readCustomerObjects():Promise<CustomerObject[]>{try{return JSON.parse(await fs.readFile(customerObjectFile,'utf8'))}catch{return []}}
async function writeCustomerObjects(items:CustomerObject[]){await fs.writeFile(customerObjectFile,JSON.stringify(items,null,2),'utf8')}
function customerObjectFromDb(x:any):CustomerObject{return {id:String(x.id),leadId:String(x.lead_id),offerId:String(x.offer_id),surveyId:x.survey_id?String(x.survey_id):undefined,status:x.status||'Geplant',objectName:x.object_name||'',objectType:x.object_type||'',address:x.address||'',service:x.service||'',startDate:x.start_date||undefined,areaSqm:Number(x.area_sqm||0),frequencyPerWeek:Number(x.frequency_per_week||0),monthlyRevenue:Number(x.monthly_revenue||0),oneTimeRevenue:Number(x.one_time_revenue||0),contractTermMonths:Number(x.contract_term_months||0),noticePeriodMonths:Number(x.notice_period_months||0),notes:x.notes||'',createdAt:x.created_at,updatedAt:x.updated_at||undefined}}
export async function getCustomerObjects(leadId?:string):Promise<CustomerObject[]>{
  if(!supabaseConfigured){let items=await readCustomerObjects();if(leadId)items=items.filter(x=>x.leadId===leadId);return items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
  const user=await getSupabaseUser();if(!user)return []
  let q=`customer_objects?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc`;if(leadId)q+=`&lead_id=eq.${encodeURIComponent(leadId)}`
  const r=await supabaseRest(q);if(!r.ok)return [];return ((await r.json()) as any[]).map(customerObjectFromDb)
}
export async function getCustomerObject(id:string):Promise<CustomerObject|undefined>{
  if(!supabaseConfigured)return (await readCustomerObjects()).find(x=>x.id===id)
  const user=await getSupabaseUser();if(!user)return undefined
  const r=await supabaseRest(`customer_objects?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`);if(!r.ok)return undefined;const rows=await r.json() as any[];return rows[0]?customerObjectFromDb(rows[0]):undefined
}
export async function createCustomerObject(input:Omit<CustomerObject,'id'|'createdAt'>){
  const now=new Date().toISOString()
  if(!supabaseConfigured){const items=await readCustomerObjects();const existing=items.find(x=>x.offerId===input.offerId);if(existing)return existing;const id=String(Math.max(0,...items.map(x=>Number(x.id)||0))+1);const item:CustomerObject={...input,id,createdAt:now};items.unshift(item);await writeCustomerObjects(items);return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const existing=(await getCustomerObjects(input.leadId)).find(x=>x.offerId===input.offerId);if(existing)return existing
  const r=await supabaseRest('customer_objects?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,lead_id:input.leadId,offer_id:input.offerId,survey_id:input.surveyId||null,status:input.status,object_name:input.objectName,object_type:input.objectType,address:input.address,service:input.service,start_date:input.startDate||null,area_sqm:input.areaSqm,frequency_per_week:input.frequencyPerWeek,monthly_revenue:input.monthlyRevenue,one_time_revenue:input.oneTimeRevenue,contract_term_months:input.contractTermMonths,notice_period_months:input.noticePeriodMonths,notes:input.notes||null})});if(!r.ok)throw new Error('Kundenobjekt konnte nicht gespeichert werden.');return customerObjectFromDb((await r.json())[0])
}
export async function updateCustomerObject(id:string,patch:Partial<Omit<CustomerObject,'id'|'leadId'|'offerId'|'createdAt'>>){
  const now=new Date().toISOString()
  if(!supabaseConfigured){const items=await readCustomerObjects();const i=items.findIndex(x=>x.id===id);if(i<0)return null;items[i]={...items[i],...patch,updatedAt:now};await writeCustomerObjects(items);return items[i]}
  const user=await getSupabaseUser();if(!user)return null
  const map:any={status:'status',surveyId:'survey_id',objectName:'object_name',objectType:'object_type',address:'address',service:'service',startDate:'start_date',areaSqm:'area_sqm',frequencyPerWeek:'frequency_per_week',monthlyRevenue:'monthly_revenue',oneTimeRevenue:'one_time_revenue',contractTermMonths:'contract_term_months',noticePeriodMonths:'notice_period_months',notes:'notes'};const db:any={updated_at:now};for(const [k,v] of Object.entries(patch))if(k in map)db[map[k]]=v
  const r=await supabaseRest(`customer_objects?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(db)});if(!r.ok)return null;const rows=await r.json() as any[];return rows[0]?customerObjectFromDb(rows[0]):null
}
