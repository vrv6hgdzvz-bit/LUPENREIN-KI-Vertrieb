import 'server-only'
import {lookup} from 'node:dns/promises'
import {isIP} from 'node:net'
import type {Lead, WebsiteAnalysis} from './types'

const serviceSignals:Array<[RegExp,string,string]> = [
  [/büro|office|kanzlei|cowork|geschäftsstelle/i,'Büroflächen erkannt','Büro- & Unterhaltsreinigung'],
  [/praxis|medizin|arzt|zahnarzt|therapie|klinik/i,'Medizinischer Betrieb erkannt','Unterhaltsreinigung'],
  [/hotel|zimmer|rezeption|gäste|übernacht/i,'Hotel-/Beherbergungsbetrieb erkannt','Unterhalts- & Grundreinigung'],
  [/schule|campus|kita|bildung|unterricht/i,'Bildungsstandort erkannt','Unterhalts- & Grundreinigung'],
  [/immobil|hausverwaltung|objektmanagement|liegenschaft|property/i,'Objekt-/Immobilienverwaltung erkannt','Unterhalts- & Glasreinigung'],
  [/produktion|werk|industrie|fertigung|logistik|lager/i,'Industrie-/Produktionsumfeld erkannt','Industriereinigung'],
  [/bauprojekt|baustelle|hochbau|tiefbau|projektentwicklung|neubau/i,'Bau-/Projektumfeld erkannt','Bauendreinigung'],
  [/glas|fassade|fenster/i,'Glas-/Fassadenflächen wahrscheinlich relevant','Glasreinigung'],
  [/standort|filiale|niederlassung|objekte|immobilien|häuser/i,'Hinweis auf mehrere Standorte oder Objekte','Unterhaltsreinigung']
]

function stripHtml(html:string){
  return html
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;|&#160;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ')
    .trim()
}

function firstMatch(html:string,re:RegExp){return html.match(re)?.[1]?.trim()||''}
function privateIpv4(ip:string){const p=ip.split('.').map(Number);return p[0]===10||p[0]===127||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||p[0]===0}
function privateIp(ip:string){
  if(isIP(ip)===4)return privateIpv4(ip)
  const v=ip.toLowerCase(); return v==='::1'||v==='::'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe80:')||v.startsWith('::ffff:127.')||v.startsWith('::ffff:10.')||v.startsWith('::ffff:192.168.')
}
async function safeUrl(raw:string){
  const u=new URL(raw.startsWith('http')?raw:`https://${raw}`)
  if(!['http:','https:'].includes(u.protocol))throw new Error('Nur HTTP/HTTPS erlaubt.')
  if(['localhost','0.0.0.0'].includes(u.hostname)||u.hostname.endsWith('.local'))throw new Error('Lokale Ziele sind nicht erlaubt.')
  if(isIP(u.hostname)&&privateIp(u.hostname))throw new Error('Private Netzwerkziele sind nicht erlaubt.')
  const addresses=await lookup(u.hostname,{all:true})
  if(!addresses.length||addresses.some(a=>privateIp(a.address)))throw new Error('Website-Ziel ist nicht öffentlich erreichbar.')
  return u
}

function localAnalysis(lead:Lead,html:string,text:string):WebsiteAnalysis{
  const title=firstMatch(html,/<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g,' ').slice(0,180)
  const signals:string[]=[]; const services:string[]=[]
  for(const [re,signal,service] of serviceSignals){if(re.test(text)){if(!signals.includes(signal))signals.push(signal);if(!services.includes(service))services.push(service)}}
  const mailto=[...html.matchAll(/mailto:([^"'?#\s>]+)/gi)].map(x=>decodeURIComponent(x[1])).find(x=>x.includes('@'))||''
  const phone=[...html.matchAll(/tel:([^"'?#\s>]+)/gi)].map(x=>decodeURIComponent(x[1]).replace(/\s+/g,' '))[0]||''
  if(/berlin|brandenburg|potsdam/i.test(text))signals.unshift('Standortbezug Berlin/Brandenburg erkannt')
  const fallbackService=lead.service||'Gebäudereinigung'
  if(!services.length)services.push(fallbackService)
  const confidence=Math.min(95,55+signals.length*7+(mailto?5:0)+(phone?4:0))
  const summary=signals.length
    ? `Die Website liefert ${signals.length} verwertbare Vertriebssignale. Besonders relevant: ${signals.slice(0,3).join(', ')}.`
    : `Die Website konnte technisch gelesen werden, liefert aber nur wenige eindeutige Hinweise auf den konkreten Reinigungsbedarf.`
  return {analyzedAt:new Date().toISOString(),mode:'local',title,summary,signals:signals.slice(0,8),recommendedServices:services.slice(0,4),businessEmail:mailto||undefined,businessPhone:phone||undefined,confidence}
}

async function aiEnhance(lead:Lead,base:WebsiteAnalysis,text:string):Promise<WebsiteAnalysis>{
  const key=process.env.OPENAI_API_KEY
  if(!key)return base
  try{
    const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${key}`},body:JSON.stringify({model:process.env.AI_MODEL||'gpt-5-mini',input:`Analysiere den folgenden öffentlich sichtbaren Website-Text eines potenziellen B2B-Kunden für LUPENREIN Service GmbH. Erfinde nichts. Antworte ausschließlich als kompaktes JSON mit den Feldern summary (string), signals (string[]), recommendedServices (string[]), confidence (0-100). Geeignete Leistungen sind: Unterhaltsreinigung, Büroreinigung, Glasreinigung, Bauendreinigung, Industriereinigung, Grundreinigung. Unternehmen: ${lead.company}; Branche: ${lead.sector}; Ort: ${lead.city}. Website-Text: ${text.slice(0,10000)}`})})
    if(!r.ok)return base
    const j:any=await r.json(); const raw=String(j.output_text||'').replace(/^```json\s*|```$/g,'').trim(); const parsed=JSON.parse(raw)
    return {...base,mode:'ai',summary:String(parsed.summary||base.summary),signals:Array.isArray(parsed.signals)?parsed.signals.slice(0,8).map(String):base.signals,recommendedServices:Array.isArray(parsed.recommendedServices)?parsed.recommendedServices.slice(0,4).map(String):base.recommendedServices,confidence:Math.max(0,Math.min(100,Number(parsed.confidence)||base.confidence))}
  }catch{return base}
}

export async function analyzeLeadWebsite(lead:Lead){
  if(!lead.website)throw new Error('Für diesen Lead ist noch keine Website hinterlegt.')
  const url=await safeUrl(lead.website)
  const r=await fetch(url,{headers:{'user-agent':'LUPENREIN-KI-Vertrieb/1.0 (+business website analysis)','accept':'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(10000),cache:'no-store'})
  if(!r.ok)throw new Error(`Website antwortet mit Status ${r.status}.`)
  const contentType=r.headers.get('content-type')||''
  if(!contentType.includes('text/html')&&!contentType.includes('application/xhtml+xml'))throw new Error('Die URL liefert keine HTML-Website.')
  const html=(await r.text()).slice(0,800000)
  const text=stripHtml(html).slice(0,30000)
  if(text.length<80)throw new Error('Die Website enthält zu wenig auswertbaren Text.')
  const base=localAnalysis(lead,html,text)
  return aiEnhance(lead,base,text)
}
