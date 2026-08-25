import {NextResponse} from 'next/server'
import {inflateRawSync} from 'node:zlib'

const cpv:Record<string,string>={'Alle Reinigungsleistungen':'9091','Unterhalts- und Gebäudereinigung':'90911200','Glasreinigung':'90911300','Büroreinigung':'90919200'}
const first=(v:any)=>Array.isArray(v)?String(v[0]||''):String(v||'')
const localized=(v:any)=>String(v?.deu?.[0]||v?.deu||v?.eng?.[0]||v?.eng||'')
const serviceFor=(code:string)=>code==='90911300'?'Glasreinigung':code==='90919200'?'Büroreinigung':'Unterhalts- und Gebäudereinigung'
type Tender={id:string;title:string;buyer:string;city:string;deadline?:string;cpv:string;url:string;score:number;service:string;source:string}

function zipJsonFiles(buffer:Buffer){
 const files:string[]=[];let eocd=-1
 for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){eocd=i;break}
 if(eocd<0)return files
 const entries=buffer.readUInt16LE(eocd+10);let cursor=buffer.readUInt32LE(eocd+16)
 for(let i=0;i<entries&&cursor+46<=buffer.length;i++){
  if(buffer.readUInt32LE(cursor)!==0x02014b50)break
  const method=buffer.readUInt16LE(cursor+10),size=buffer.readUInt32LE(cursor+20),nameLen=buffer.readUInt16LE(cursor+28),extraLen=buffer.readUInt16LE(cursor+30),commentLen=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42),name=buffer.subarray(cursor+46,cursor+46+nameLen).toString('utf8')
  const localName=buffer.readUInt16LE(local+26),localExtra=buffer.readUInt16LE(local+28),start=local+30+localName+localExtra,raw=buffer.subarray(start,start+size)
  if(name.endsWith('.json'))files.push((method===8?inflateRawSync(raw):raw).toString('utf8'))
  cursor+=46+nameLen+extraLen+commentLen
 }
 return files
}

async function germanNotices(location:string,radius:number,wanted:string,now:number):Promise<Tender[]>{
 const days=Array.from({length:14},(_,i)=>new Date(now-(i+1)*86400000).toISOString().slice(0,10))
 const packages=await Promise.all(days.map(async day=>{try{const r=await fetch(`https://oeffentlichevergabe.de/api/notice-exports?pubDay=${day}&format=ocds.zip`,{next:{revalidate:21600}});return r.ok?Buffer.from(await r.arrayBuffer()):null}catch{return null}}))
 const berlin=/berlin/i.test(location),brandenburg=/brandenburg|potsdam/i.test(location),seen=new Set<string>(),out:Tender[]=[]
 for(const pack of packages.filter(Boolean) as Buffer[])for(const raw of zipJsonFiles(pack))try{
  const doc=JSON.parse(raw),release=doc.releases?.[0],t=release?.tender;if(!t||!release?.buyer?.name)continue
  const items=t.items||[],codes=items.flatMap((x:any)=>[x.classification?.id,...(x.additionalClassifications||[]).map((c:any)=>c.id)]).filter(Boolean).map(String)
  const code=codes.find((x:string)=>wanted==='9091'?x.startsWith('9091'):x===wanted);if(!code)continue
  const places=items.map((x:any)=>`${x.deliveryAddress?.region||''} ${x.deliveryAddress?.locality||''} ${x.deliveryLocation?.description||''}`).join(' '),buyerCity=release.buyer.address?.locality||''
  const area=berlin?(places.includes('DE3')||(radius>=25&&places.includes('DE4'))||/Berlin|Potsdam|Brandenburg/i.test(places)):brandenburg?(places.includes('DE4')||/Potsdam|Brandenburg/i.test(places)):new RegExp(location.replace(/[^a-zäöüß0-9 -]/gi,''),'i').test(`${places} ${buyerCity}`)
  if(!area)continue
  const id=String(release.id),title=String(t.title||t.description||'Reinigungsleistung'),key=`${title.toLowerCase()}|${String(release.buyer.name).toLowerCase()}`;if(seen.has(key))continue;seen.add(key)
  const url=t.documents?.[0]?.url||doc.uri||`https://oeffentlichevergabe.de/ui/de/search/details/${id}`
  out.push({id:`de-${id}`,title,buyer:String(release.buyer.name),city:first(items.map((x:any)=>x.deliveryAddress?.locality).filter(Boolean))||buyerCity||location,cpv:code,url,score:88,service:serviceFor(code),source:'Bekanntmachungsservice'})
 }catch{}
 return out
}

async function tedNotices(location:string,radius:number,wanted:string,now:number):Promise<Tender[]>{
 const berlin=/berlin/i.test(location),brandenburg=/brandenburg|potsdam/i.test(location),region=berlin&&radius>=25?'(place-of-performance-subdiv-lot = DE3* OR place-of-performance-subdiv-lot = DE4*)':brandenburg?'place-of-performance-subdiv-lot = DE4*':berlin?'place-of-performance-subdiv-lot = DE3*':'place-of-performance-country-lot = DEU',tedCode=wanted==='9091'?'90910000':wanted
 const query=`main-classification-lot = ${tedCode} AND ${region} AND issue-date >= today(-730)`,response=await fetch('https://api.ted.europa.eu/v3/notices/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({query,fields:['publication-number','notice-title','buyer-name','place-of-performance-city-lot','deadline-receipt-tender-date-lot','main-classification-lot'],limit:250,page:1,scope:'ACTIVE',paginationMode:'PAGE_NUMBER'}),next:{revalidate:1800}})
 if(!response.ok)return []
 const data=await response.json() as any
 return (data.notices||[]).map((n:any)=>{const deadline=first(n['deadline-receipt-tender-date-lot']),code=first(n['main-classification-lot']),title=localized(n['notice-title']),buyer=localized(n['buyer-name']),city=first(n['place-of-performance-city-lot']),url=n.links?.html?.DEU||`https://ted.europa.eu/de/notice/-/detail/${n['publication-number']}`,days=(new Date(deadline).getTime()-now)/86400000,score=Math.max(62,Math.min(98,Math.round(78+(days>14?8:0)+(city?5:0)+(code==='90911200'||code==='90919200'?5:0))));return {id:`ted-${n['publication-number']}`,title,buyer,city,deadline,cpv:code,url,score,service:serviceFor(code),source:'TED'}}).filter((t:Tender)=>t.title&&t.buyer&&t.deadline&&new Date(t.deadline).getTime()>now)
}

export async function POST(req:Request){try{const body=await req.json() as {location?:string;radius?:number;service?:string},location=String(body.location||'Berlin').trim(),radius=Math.max(10,Math.min(300,Number(body.radius)||50)),service=String(body.service||'Alle Reinigungsleistungen'),wanted=cpv[service]||'9091',now=Date.now();const [ted,german]=await Promise.all([tedNotices(location,radius,wanted,now),germanNotices(location,radius,wanted,now)]),seen=new Set<string>(),tenders=[...german,...ted].filter(t=>{const key=`${t.title.toLowerCase().replace(/\W/g,'')}|${t.buyer.toLowerCase().replace(/\W/g,'')}`;if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>a.deadline&&b.deadline?new Date(a.deadline).getTime()-new Date(b.deadline).getTime():a.deadline?-1:b.deadline?1:b.score-a.score).slice(0,75);return NextResponse.json({tenders,sources:['TED','Bekanntmachungsservice'],queryArea:`${location} + ${radius} km`})}catch(e:any){return NextResponse.json({error:`Ausschreibungen konnten nicht geladen werden. ${e?.message||''}`.trim()},{status:502})}}

