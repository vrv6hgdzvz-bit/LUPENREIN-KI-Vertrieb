import WebsiteVisitorActions from '@/components/WebsiteVisitorActions'
import {getWebsiteVisitors} from '@/lib/store'

const fmt=(v:string)=>new Intl.DateTimeFormat('de-DE',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))
export default async function WebsiteVisitorsPage(){
 const rows=await getWebsiteVisitors();const newRows=rows.filter(x=>x.status==='Neu');const hot=rows.filter(x=>x.intentScore>=70)
 return <><div className="pageHead"><div><span className="eyebrow">B2B-WEBSITE-ERKENNUNG</span><h2>Website-Besucher</h2><p>Erkannte Unternehmen nach Interesse priorisieren und mit einem Klick ins CRM übernehmen.</p></div></div>
 <div className="requestStats"><span><b>{rows.length}</b>erkannte Firmen</span><span><b>{newRows.length}</b>neu</span><span><b>{hot.length}</b>hohes Interesse</span><span><b>{rows.filter(x=>x.status==='Übernommen').length}</b>übernommen</span></div>
 {!process.env.WEBSITE_VISITOR_WEBHOOK_SECRET&&<div className="modeBanner demo"><b>VERBINDUNG AUSSTEHEND</b><span>Die App-Seite ist vorbereitet. Für echte Firmenbesuche muss noch der Erkennungsdienst mit eurer Webseite verbunden werden.</span></div>}
 <section className="panel"><div className="panelHead"><div><span className="eyebrow">KAUFABSICHT</span><h3>Erkannte Unternehmen</h3></div></div>{rows.length?<div className="visitorTable"><div className="visitorHead"><span>Unternehmen</span><span>Besuchte Seiten</span><span>Letzter Besuch</span><span>Interesse</span><span>Aktion</span></div>{rows.map(row=><div className="visitorRow" key={row.id}><span><b>{row.company}</b><small>{[row.industry,row.city,row.domain].filter(Boolean).join(' · ')}</small></span><span><b>{row.pages.length} Seiten · {row.visits} Besuch(e)</b><small>{row.pages.slice(0,2).map(x=>x.title||x.url).join(' · ')||'Keine Seitendetails'}</small></span><span>{fmt(row.lastSeenAt)}</span><span><i className={`intentScore ${row.intentScore>=70?'hot':''}`}>{row.intentScore}</i></span><span><WebsiteVisitorActions id={row.id} status={row.status}/></span></div>)}</div>:<div className="finderEmpty"><div className="finderIcon">◈</div><h3>Noch keine Firmen erkannt</h3><p>Sobald der Tracking-Anbieter verbunden ist und ein Unternehmen eure Webseite besucht, erscheint es automatisch hier. Privatpersonen werden nicht namentlich angezeigt.</p></div>}</section></>
}

