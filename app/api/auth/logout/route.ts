import {NextResponse} from 'next/server'
export async function POST(){
  const r=NextResponse.json({ok:true})
  for(const name of ['lr_session','lr_access_token','lr_refresh_token'])r.cookies.set(name,'',{httpOnly:true,maxAge:0,path:'/'})
  return r
}
