import type {Lead, Offer, CustomerObject} from './types'

type SegmentRow={name:string;leads:number;customers:number;conversion:number;monthlyRevenue:number}
function segment(leads:Lead[],objects:CustomerObject[],key:(l:Lead)=>string):SegmentRow[]{
 const map=new Map<string,{leads:Set<string>;customers:Set<string>;monthly:number}>()
 for(const l of leads){const name=key(l)||'Unbekannt';if(!map.has(name))map.set(name,{leads:new Set(),customers:new Set(),monthly:0});map.get(name)!.leads.add(l.id)}
 for(const o of objects){const l=leads.find(x=>x.id===o.leadId);if(!l)continue;const name=key(l)||'Unbekannt';if(!map.has(name))map.set(name,{leads:new Set(),customers:new Set(),monthly:0});const m=map.get(name)!;m.customers.add(l.id);m.monthly+=o.monthlyRevenue}
 return [...map].map(([name,v])=>({name,leads:v.leads.size,customers:v.customers.size,conversion:v.leads.size?Math.round(v.customers.size/v.leads.size*100):0,monthlyRevenue:Math.round(v.monthly*100)/100})).sort((a,b)=>b.conversion-a.conversion||b.monthlyRevenue-a.monthlyRevenue)
}
export function performanceReport(leads:Lead[],offers:Offer[],objects:CustomerObject[]){
 const customers=new Set(objects.map(o=>o.leadId));const accepted=offers.filter(o=>o.status==='Angenommen');const recurring=objects.filter(o=>o.status!=='Beendet').reduce((s,o)=>s+o.monthlyRevenue,0);const oneTime=objects.reduce((s,o)=>s+o.oneTimeRevenue,0);const wonLeads=leads.filter(l=>customers.has(l.id));const avgWon=wonLeads.length?Math.round(wonLeads.reduce((s,l)=>s+l.score,0)/wonLeads.length):0
 const bySector=segment(leads,objects,l=>l.sector);const byService=segment(leads,objects,l=>l.service);const bySource=segment(leads,objects,l=>l.source||'Manuell')
 const eligible=[...bySector.map(x=>({...x,kind:'Branche'})),...byService.map(x=>({...x,kind:'Leistung'}))].filter(x=>x.leads>=3).sort((a,b)=>b.conversion-a.conversion||b.monthlyRevenue-a.monthlyRevenue)
 const best=eligible[0]
 const insight=best?`${best.kind} „${best.name}“ hat aktuell ${best.conversion}% Conversion bei ${best.leads} Leads. Das ist ein belastbares Signal für die Priorisierung, sollte aber weiterhin zusammen mit Lead-Qualität und Objektpotenzial betrachtet werden.`:'Noch zu wenig Abschlussdaten für ein belastbares Lernsignal. Ab mindestens 3 Leads je Segment zeigt V9 erste Conversion-Muster.'
 return {customers:customers.size,accepted:accepted.length,mrr:Math.round(recurring*100)/100,oneTime:Math.round(oneTime*100)/100,avgWon,leadToCustomer:leads.length?Math.round(customers.size/leads.length*100):0,offerWinRate:offers.length?Math.round(accepted.length/offers.length*100):0,bySector,byService,bySource,insight}
}
