import 'server-only'
import type {FinderCandidate, Lead} from './types'
import {scoreLead} from './scoring'
import {normalize} from './store'

const GOOGLE_URL='https://places.googleapis.com/v1/places:searchText'

const queryBySector:Record<string,string>={
  'Büro':'Büro Unternehmen', 'Arztpraxis':'Arztpraxis', 'Hotel':'Hotel', 'Schule':'Schule',
  'Hausverwaltung':'Hausverwaltung', 'Industrie':'Industrieunternehmen', 'Baustelle':'Bauunternehmen Baustelle'
}

function cityFromAddress(address:string){
  const match=address.match(/\b(?:10|12|13|14)\d{3}\s+([^,]+)/)
  return match?.[1]?.trim() || (/Berlin/i.test(address)?'Berlin':'Berlin + Umland')
}

function isDuplicate(candidate:{sourceId:string,company:string,city:string}, leads:Lead[]){
  return leads.some(l => (l.sourceId && l.sourceId===candidate.sourceId) || (normalize(l.company)===normalize(candidate.company) && normalize(l.city)===normalize(candidate.city)))
}

export async function searchCandidates(sector:string, leads:Lead[], limit=12):Promise<{mode:'live'|'demo', candidates:FinderCandidate[]}> {
  const key=process.env.GOOGLE_PLACES_API_KEY
  if(!key) return {mode:'demo',candidates:demoCandidates(sector,leads).slice(0,limit)}

  const response=await fetch(GOOGLE_URL,{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Goog-Api-Key':key,
      'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.websiteUri,places.nationalPhoneNumber,places.businessStatus'
    },
    body:JSON.stringify({
      textQuery:`${queryBySector[sector] ?? sector} in Berlin Brandenburg`,
      pageSize:Math.min(limit,20),
      languageCode:'de',
      regionCode:'DE',
      locationBias:{circle:{center:{latitude:52.520008,longitude:13.404954},radius:50000}}
    }),
    cache:'no-store'
  })
  if(!response.ok) throw new Error(`Google Places: ${response.status}`)
  const json=await response.json() as {places?:Array<{id:string,displayName?:{text?:string},formattedAddress?:string,websiteUri?:string,nationalPhoneNumber?:string,businessStatus?:string}>}
  const candidates=(json.places??[]).filter(p=>p.businessStatus!=='CLOSED_PERMANENTLY').map((p):FinderCandidate=>{
    const company=p.displayName?.text || 'Unbekanntes Unternehmen'
    const address=p.formattedAddress || ''
    const city=cityFromAddress(address)
    const scored=scoreLead(sector,city,'',p.nationalPhoneNumber||'',p.websiteUri||'')
    return {id:p.id,company,city,address,sector,website:p.websiteUri||'',phone:p.nationalPhoneNumber||'',source:'Google Places',sourceId:p.id,...scored,duplicate:isDuplicate({sourceId:p.id,company,city},leads)}
  })
  return {mode:'live',candidates}
}

function demoCandidates(sector:string,leads:Lead[]):FinderCandidate[]{
  const names:Record<string,string[]>={
    'Büro':['Spreebogen Office Solutions GmbH','Mitte Business Center GmbH','Tempelhof Projektbüro GmbH'],
    'Arztpraxis':['Praxis am Stadtpark','Medicum am Ring','Gesundheitszentrum Nord'],
    'Hotel':['Hotel am Tiergarten','Cityquartier Hotel Berlin','Parkresidenz Potsdam'],
    'Schule':['Freie Bildung Berlin gGmbH','Campus Havel Schule','Bildungszentrum Süd'],
    'Hausverwaltung':['Havel Immobilienverwaltung GmbH','Kiez Objektmanagement GmbH','Brandenburg Hausservice GmbH'],
    'Industrie':['Berlin Technikwerke GmbH','Havel Industrieanlagen GmbH','Nordost Produktion GmbH'],
    'Baustelle':['Spree Bauprojekt GmbH','Hauptstadt Hochbau GmbH','Potsdam Projektbau GmbH']
  }
  return (names[sector]??['Musterunternehmen Berlin GmbH','Beispiel Objekt GmbH']).map((company,i)=>{
    const city=i===2?'Potsdam':'Berlin'
    const sourceId=`demo-${sector}-${i}`
    const scored=scoreLead(sector,city,'',i===0?'+49 30 0000000':'',i<2?'https://example.invalid':'')
    return {id:sourceId,company,city,address:i===2?'14467 Potsdam':'10115 Berlin',sector,website:i<2?'https://example.invalid':'',phone:i===0?'+49 30 0000000':'',source:'Demo Finder',sourceId,...scored,duplicate:isDuplicate({sourceId,company,city},leads)}
  })
}
