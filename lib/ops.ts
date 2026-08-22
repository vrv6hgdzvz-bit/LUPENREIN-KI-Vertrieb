import 'server-only'
import {promises as fs} from 'fs'
import path from 'path'
import type {AgentRun,AuditEvent,UserProfile,UserRole} from './types'
import {getSupabaseUser,supabaseConfigured,supabaseRest} from './supabase'

const auditFile=path.join(process.cwd(),'data','audit.json')
const agentFile=path.join(process.cwd(),'data','agent-runs.json')
async function read<T>(f:string):Promise<T[]>{try{return JSON.parse(await fs.readFile(f,'utf8'))}catch{return []}}
async function write<T>(f:string,v:T[]){await fs.writeFile(f,JSON.stringify(v,null,2),'utf8')}

export async function getProfile():Promise<UserProfile|null>{
  if(!supabaseConfigured)return {userId:'local',email:process.env.APP_LOGIN_EMAIL||'admin@lupenrein.local',displayName:'LUPENREIN Admin',role:'admin',createdAt:new Date(0).toISOString()}
  const user=await getSupabaseUser();if(!user)return null
  const r=await supabaseRest(`profiles?user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`)
  if(!r.ok)return {userId:user.id,email:user.email,displayName:user.email,role:'sales',createdAt:new Date().toISOString()}
  const rows=await r.json() as any[];const x=rows[0]
  return x?{userId:x.user_id,email:x.email||user.email,displayName:x.display_name||user.email,role:(x.role||'sales') as UserRole,createdAt:x.created_at,updatedAt:x.updated_at||undefined}:{userId:user.id,email:user.email,displayName:user.email,role:'sales',createdAt:new Date().toISOString()}
}

export async function addAudit(action:string,entityType:string,entityId:string|undefined,summary:string,metadata?:Record<string,unknown>){
  const now=new Date().toISOString()
  if(!supabaseConfigured){const all=await read<AuditEvent>(auditFile);const item:AuditEvent={id:String(Date.now()),action,entityType,entityId,summary,metadata,createdAt:now};all.unshift(item);await write(auditFile,all.slice(0,500));return item}
  const user=await getSupabaseUser();if(!user)return null
  const r=await supabaseRest('audit_logs?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,action,entity_type:entityType,entity_id:entityId||null,summary,metadata:metadata||{}})});if(!r.ok)return null;const x=(await r.json())[0];return {id:String(x.id),action:x.action,entityType:x.entity_type,entityId:x.entity_id||undefined,summary:x.summary,metadata:x.metadata||{},createdAt:x.created_at} as AuditEvent
}
export async function getAudit(limit=30):Promise<AuditEvent[]>{
  if(!supabaseConfigured)return (await read<AuditEvent>(auditFile)).slice(0,limit)
  const user=await getSupabaseUser();if(!user)return []
  const r=await supabaseRest(`audit_logs?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=created_at.desc&limit=${limit}`);if(!r.ok)return []
  return ((await r.json()) as any[]).map(x=>({id:String(x.id),action:x.action,entityType:x.entity_type,entityId:x.entity_id||undefined,summary:x.summary,metadata:x.metadata||{},createdAt:x.created_at}))
}
export async function addAgentRun(input:Omit<AgentRun,'id'>):Promise<AgentRun>{
  if(!supabaseConfigured){const all=await read<AgentRun>(agentFile);const item:AgentRun={...input,id:String(Date.now())};all.unshift(item);await write(agentFile,all.slice(0,100));return item}
  const user=await getSupabaseUser();if(!user)throw new Error('Nicht angemeldet.')
  const r=await supabaseRest('agent_runs?select=*',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({owner_id:user.id,status:input.status,leads_reviewed:input.leadsReviewed,tasks_created:input.tasksCreated,hot_leads:input.hotLeads,summary:input.summary,started_at:input.startedAt,finished_at:input.finishedAt||null})});if(!r.ok)throw new Error('Agent-Lauf konnte nicht gespeichert werden.');const x=(await r.json())[0];return {id:String(x.id),status:x.status,leadsReviewed:x.leads_reviewed,tasksCreated:x.tasks_created,hotLeads:x.hot_leads,summary:x.summary,startedAt:x.started_at,finishedAt:x.finished_at||undefined}
}
export async function getAgentRuns(limit=10):Promise<AgentRun[]>{
  if(!supabaseConfigured)return (await read<AgentRun>(agentFile)).slice(0,limit)
  const user=await getSupabaseUser();if(!user)return []
  const r=await supabaseRest(`agent_runs?owner_id=eq.${encodeURIComponent(user.id)}&select=*&order=started_at.desc&limit=${limit}`);if(!r.ok)return []
  return ((await r.json()) as any[]).map(x=>({id:String(x.id),status:x.status,leadsReviewed:x.leads_reviewed,tasksCreated:x.tasks_created,hotLeads:x.hot_leads,summary:x.summary,startedAt:x.started_at,finishedAt:x.finished_at||undefined}))
}
