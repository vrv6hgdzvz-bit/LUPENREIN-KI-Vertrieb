import {NextRequest,NextResponse} from 'next/server'

function publicPath(pathname:string){return pathname==='/login'||pathname==='/anfrage'||pathname.startsWith('/angebot/')||pathname.startsWith('/api/public/')||pathname.startsWith('/api/auth/')||pathname==='/api/health'||pathname.startsWith('/_next/')||pathname==='/favicon.ico'}
function jwtExpiresSoon(token:string){try{const part=token.split('.')[1];const json=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));return !json.exp||Number(json.exp)*1000<Date.now()+60_000}catch{return true}}
function unauth(req:NextRequest){if(req.nextUrl.pathname.startsWith('/api/'))return NextResponse.json({error:'Nicht angemeldet.'},{status:401});const url=req.nextUrl.clone();url.pathname='/login';url.searchParams.set('next',req.nextUrl.pathname);return NextResponse.redirect(url)}

export async function middleware(req:NextRequest){
 const {pathname}=req.nextUrl;if(publicPath(pathname))return NextResponse.next()
 if(req.cookies.get('lr_session')?.value)return NextResponse.next()
 const access=req.cookies.get('lr_access_token')?.value||'',refresh=req.cookies.get('lr_refresh_token')?.value||''
 if(access&&!jwtExpiresSoon(access))return NextResponse.next()
 const supabase=String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/$/,''),anon=String(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'')
 if(refresh&&supabase&&anon){
  try{
   const r=await fetch(`${supabase}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})})
   if(r.ok){const s=await r.json();const out=NextResponse.next();const secure=process.env.NODE_ENV==='production';out.cookies.set('lr_access_token',s.access_token,{httpOnly:true,sameSite:'lax',secure,maxAge:s.expires_in||3600,path:'/'});if(s.refresh_token)out.cookies.set('lr_refresh_token',s.refresh_token,{httpOnly:true,sameSite:'lax',secure,maxAge:60*60*24*30,path:'/'});return out}
  }catch{}
 }
 return unauth(req)
}
export const config={matcher:['/((?!.*\\..*).*)']}

