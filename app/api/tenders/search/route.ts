import {NextResponse} from 'next/server'

const cpv:Record<string,string>={'Alle Reinigungsleistungen':'90910000','Unterhalts- und Gebäudereinigung':'90911200','Glasreinigung':'90911300','Büroreinigung':'90919200'}
const first=(v:any)=>Array.isArray(v)?String(v[0]||''):String(v||'')
const localized=(v:any)=>String(v?.deu?.[0]||v?.deu||v?.eng?.[0]||v?.eng||'')

export async function POST(req:Request){
 try{
  const body=await req.json() as {location?:string;radius?:number;service?:string}
  const location=String(body.location||'Berlin').trim(),radius=Math.max(10,Math.min(300,Number(body.radius)||50)),service=String(body.service||'Alle Reinigungsleistungen')
  const berlin=/berlin/i.test(location),brandenburg=/brandenburg|potsdam/i.test(location)
  const region=berlin&&radius>=25?'(place-of-performance-subdiv-lot = DE3* OR place-of-performance-subdiv-lot = DE4*)':brandenburg?'place-of-performance-subdiv-lot = DE4*':berlin?'place-of-performance-subdiv-lot = DE3*':'place-of-performance-country-lot = DEU'
  const query=`main-classification-lot = ${cpv[service]||'90910000'} AND ${region} AND issue-date >= today(-730)`
  const response=await fetch('https://api.ted.europa.eu/v3/notices/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,fields:['publication-number','notice-title','buyer-name','place-of-performance-city-lot','deadline-receipt-tender-date-lot','main-classification-lot'],limit:250,page:1,scope:'ACTIVE',paginationMode:'PAGE_NUMBER'}),next:{revalidate:1800}})
  if(!response.ok)throw new Error(`TED antwortet mit ${response.status}`)
  const data=await response.json() as any,now=Date.now()
  const tenders=(data.notices||[]).map((n:any)=>{const deadline=first(n['deadline-receipt-tender-date-lot']),code=first(n['main-classification-lot']),title=localized(n['notice-title']),buyer=localized(n['buyer-name']),city=first(n['place-of-performance-city-lot']),url=n.links?.html?.DEU||`https://ted.europa.eu/de/notice/-/detail/${n['publication-number']}`;const days=(new Date(deadline).getTime()-now)/86400000,score=Math.max(62,Math.min(98,Math.round(78+(days>14?8:0)+(city?5:0)+(code==='90911200'||code==='90919200'?5:0))));return {id:`ted-${n['publication-number']}`,title,buyer,city,deadline,cpv:code,url,score,service:code==='90911300'?'Glasreinigung':code==='90919200'?'Büroreinigung':'Unterhalts- und Gebäudereinigung',source:'TED'}}).filter((t:any)=>t.title&&t.buyer&&t.deadline&&new Date(t.deadline).getTime()>now).sort((a:any,b:any)=>new Date(a.deadline).getTime()-new Date(b.deadline).getTime()).slice(0,50)
  return NextResponse.json({tenders,source:'TED',queryArea:`${location} + ${radius} km`})
 }catch(e:any){return NextResponse.json({error:`Ausschreibungen konnten nicht geladen werden. ${e?.message||''}`.trim()},{status:502})}
}

