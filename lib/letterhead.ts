import 'server-only'
import {getAccessToken,getSupabaseUser} from './supabase'

const bucket='company-assets'
const objectName='offer-letterhead'
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
const anon=()=>String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'')

export type LetterheadAsset={bytes:Uint8Array;mime:string;name:string;size:number}

function storageUrl(userId:string){return `${base()}/storage/v1/object/${bucket}/${encodeURIComponent(userId)}/${objectName}`}

async function auth(){
 const [user,token]=await Promise.all([getSupabaseUser(),getAccessToken()])
 if(!user||!token)throw new Error('Nicht angemeldet.')
 return {user,token}
}

export async function getLetterhead():Promise<LetterheadAsset|null>{
 if(!base()||!anon())return null
 const {user,token}=await auth()
 const r=await fetch(storageUrl(user.id),{headers:{apikey:anon(),Authorization:`Bearer ${token}`},cache:'no-store'})
 if(r.status===404||r.status===400)return null
 if(!r.ok)throw new Error('Briefkopf konnte nicht geladen werden.')
 const bytes=new Uint8Array(await r.arrayBuffer())
 const mime=(r.headers.get('content-type')||'application/pdf').split(';')[0]
 return {bytes,mime,name:r.headers.get('content-disposition')||'Briefkopf',size:bytes.byteLength}
}

export async function uploadLetterhead(file:File){
 if(!base()||!anon())throw new Error('Supabase ist nicht konfiguriert.')
 const allowed=new Set(['application/pdf','image/png','image/jpeg'])
 if(!allowed.has(file.type))throw new Error('Bitte PDF, PNG oder JPG verwenden.')
 if(file.size>10*1024*1024)throw new Error('Der Briefkopf darf maximal 10 MB groß sein.')
 if(file.size<100)throw new Error('Die Datei ist leer oder ungültig.')
 const {user,token}=await auth()
 const r=await fetch(storageUrl(user.id),{
  method:'POST',
  headers:{apikey:anon(),Authorization:`Bearer ${token}`,'Content-Type':file.type,'x-upsert':'true','cache-control':'no-cache'},
  body:Buffer.from(await file.arrayBuffer()),
  cache:'no-store'
 })
 if(!r.ok){let detail='';try{detail=JSON.stringify(await r.json())}catch{};throw new Error(`Briefkopf konnte nicht gespeichert werden.${detail?' '+detail:''}`)}
 return {mime:file.type,name:file.name,size:file.size}
}

export async function deleteLetterhead(){
 if(!base()||!anon())throw new Error('Supabase ist nicht konfiguriert.')
 const {user,token}=await auth()
 const r=await fetch(`${base()}/storage/v1/object/${bucket}`,{
  method:'DELETE',
  headers:{apikey:anon(),Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
  body:JSON.stringify({prefixes:[`${user.id}/${objectName}`]}),
  cache:'no-store'
 })
 if(!r.ok)throw new Error('Briefkopf konnte nicht entfernt werden.')
}
