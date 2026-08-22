import {NextResponse} from 'next/server'
import {signInSupabase,supabaseConfigured} from '@/lib/supabase'

export async function POST(req:Request){
  const {email,password}=await req.json()
  if(supabaseConfigured){
    const session=await signInSupabase(String(email||''),String(password||''))
    if(!session)return NextResponse.json({error:'E-Mail oder Passwort ist falsch.'},{status:401})
    const r=NextResponse.json({ok:true,mode:'supabase'})
    const secure=process.env.NODE_ENV==='production'
    r.cookies.set('lr_access_token',session.access_token,{httpOnly:true,sameSite:'lax',secure,maxAge:session.expires_in||3600,path:'/'})
    r.cookies.set('lr_refresh_token',session.refresh_token,{httpOnly:true,sameSite:'lax',secure,maxAge:60*60*24*30,path:'/'})
    return r
  }
  const ok=email===(process.env.APP_LOGIN_EMAIL||'admin@lupenrein.local')&&password===(process.env.APP_LOGIN_PASSWORD||'lupenrein-demo')
  if(!ok)return NextResponse.json({error:'E-Mail oder Passwort ist falsch.'},{status:401})
  const r=NextResponse.json({ok:true,mode:'local'});r.cookies.set('lr_session','authenticated',{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:60*60*10,path:'/'});return r
}
