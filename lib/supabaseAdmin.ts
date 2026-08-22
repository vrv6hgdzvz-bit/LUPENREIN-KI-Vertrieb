import 'server-only'
const base=()=>String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,'')
const key=()=>String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '')
export const adminConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&(process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY))
export async function adminRest(path:string,init:RequestInit={}){
 if(!adminConfigured)throw new Error('Supabase Secret/Service Role ist nicht konfiguriert.')
 const headers=new Headers(init.headers);headers.set('apikey',key());headers.set('Authorization',`Bearer ${key()}`);headers.set('Content-Type','application/json')
 return fetch(`${base()}/rest/v1/${path}`,{...init,headers,cache:'no-store'})
}
