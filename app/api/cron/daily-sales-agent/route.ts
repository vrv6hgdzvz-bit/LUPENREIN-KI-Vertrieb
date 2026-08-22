import {NextResponse} from 'next/server'
import {adminConfigured,adminRest} from '@/lib/supabaseAdmin'
import {buildSalesRecommendations} from '@/lib/agent'
import type {Lead,Message,Task} from '@/lib/types'

export const dynamic='force-dynamic'
function auth(req:Request){const secret=process.env.CRON_SECRET;return Boolean(secret&&req.headers.get('authorization')===`Bearer ${secret}`)}
function lead(x:any):Lead{return {id:String(x.id),company:x.company,city:x.city,sector:x.sector,score:Number(x.score||0),service:x.service,status:x.status,contact:x.contact||'',email:x.email||'',phone:x.phone||'',website:x.website||'',address:x.address||'',source:x.source||undefined,sourceId:x.source_id||undefined,reason:x.reason||'',potential:x.potential||'mittel',analysis:x.analysis||undefined,createdAt:x.created_at,updatedAt:x.updated_at||undefined}}
function msg(x:any):Message{return {id:String(x.id),leadId:String(x.lead_id),subject:x.subject,body:x.body,to:x.to_email,status:x.status,provider:x.provider||'preview',aiMode:x.ai_mode||'local',sentAt:x.sent_at||undefined,gmailDraftId:x.gmail_draft_id||undefined,gmailMessageId:x.gmail_message_id||undefined,replyText:x.reply_text||undefined,replyIntent:x.reply_intent||undefined,replySummary:x.reply_summary||undefined,followUpAt:x.follow_up_at||undefined,createdAt:x.created_at,updatedAt:x.updated_at||undefined}}
function task(x:any):Task{return {id:String(x.id),leadId:String(x.lead_id),title:x.title,type:x.type,dueAt:x.due_at,status:x.status,note:x.note||undefined,createdAt:x.created_at,completedAt:x.completed_at||undefined}}
export async function GET(req:Request){
 if(!auth(req))return NextResponse.json({error:'Nicht autorisiert.'},{status:401})
 if(!adminConfigured)return NextResponse.json({error:'Service Role fehlt.'},{status:503})
 const p=await adminRest('profiles?select=user_id,role&role=neq.read_only');if(!p.ok)return NextResponse.json({error:'Profile konnten nicht geladen werden.'},{status:500})
 const profiles=await p.json() as any[];let users=0,created=0,reviewed=0
 for(const profile of profiles){
  const owner=encodeURIComponent(profile.user_id)
  const [lr,mr,tr]=await Promise.all([adminRest(`leads?owner_id=eq.${owner}&select=*`),adminRest(`messages?owner_id=eq.${owner}&select=*`),adminRest(`tasks?owner_id=eq.${owner}&status=eq.Offen&select=*`)])
  if(!lr.ok||!mr.ok||!tr.ok)continue
  const leads=(await lr.json() as any[]).map(lead),messages=(await mr.json() as any[]).map(msg),tasks=(await tr.json() as any[]).map(task)
  const recs=buildSalesRecommendations(leads,messages,tasks);let count=0
  for(const rec of recs){
   if(tasks.some(t=>t.leadId===rec.leadId&&t.title===rec.taskTitle&&t.status==='Offen'))continue
   const ins=await adminRest('tasks',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({owner_id:profile.user_id,lead_id:rec.leadId,title:rec.taskTitle,type:rec.taskType,due_at:rec.dueAt,status:'Offen',note:`KI-Vertriebsagent: ${rec.reason}`})});if(ins.ok){count++;created++}
  }
  const now=new Date().toISOString();const summary=`${leads.length} Leads geprüft, ${count} Aufgaben vorbereitet.`
  await adminRest('agent_runs',{method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({owner_id:profile.user_id,status:'Erfolgreich',leads_reviewed:leads.length,tasks_created:count,hot_leads:leads.filter(l=>l.score>=85).length,summary,started_at:now,finished_at:now})})
  reviewed+=leads.length;users++
 }
 return NextResponse.json({ok:true,users,leadsReviewed:reviewed,tasksCreated:created,timestamp:new Date().toISOString()})
}
