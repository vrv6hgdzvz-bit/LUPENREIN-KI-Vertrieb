import 'server-only'
import {cookies} from 'next/headers'

export const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))
const url = () => String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
const anon = () => String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')

export type SessionUser = {id:string,email:string}

export async function getAccessToken(){
  const jar=await cookies()
  return jar.get('lr_access_token')?.value||''
}

export async function getSupabaseUser(): Promise<SessionUser|null>{
  if(!supabaseConfigured)return null
  const token=await getAccessToken(); if(!token)return null
  const r=await fetch(`${url()}/auth/v1/user`,{headers:{apikey:anon(),Authorization:`Bearer ${token}`},cache:'no-store'})
  if(!r.ok)return null
  const j=await r.json()
  return {id:String(j.id),email:String(j.email||'')}
}

export async function supabaseRest(path:string, init:RequestInit={}){
  if(!supabaseConfigured)throw new Error('Supabase ist nicht konfiguriert.')
  const token=await getAccessToken(); if(!token)throw new Error('Nicht angemeldet.')
  const headers=new Headers(init.headers)
  headers.set('apikey',anon())
  headers.set('Authorization',`Bearer ${token}`)
  headers.set('Content-Type','application/json')
  return fetch(`${url()}/rest/v1/${path}`,{...init,headers,cache:'no-store'})
}

export async function signInSupabase(email:string,password:string){
  const r=await fetch(`${url()}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:anon(),'Content-Type':'application/json'},body:JSON.stringify({email,password}),cache:'no-store'})
  if(!r.ok)return null
  return r.json() as Promise<{access_token:string;refresh_token:string;expires_in:number;user:{id:string;email:string}}>
}
