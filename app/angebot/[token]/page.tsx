import {notFound} from 'next/navigation'
import PublicOfferAcceptance from '@/components/PublicOfferAcceptance'
import {getSelfServiceRequest} from '@/lib/selfService'

const money=(value:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(value)

export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params
 const row=await getSelfServiceRequest(token)
 if(!row)notFound()
 const groups=[...new Set(row.lvItems.map(item=>item.groupId))]
 return <main className="publicShell offerPreviewShell"><article className="offerPublic offerPublicCanvas">
  <div className="offerUtility noPrint"><a className="secondary" href={`/api/public/offers/${token}/pdf`}>PDF mit Angebot und LV herunterladen / drucken</a></div>
  <section className="onlineDocumentPage onlineOfferPage">
   <header className="onlineLetterhead"><img src="/lupenrein-logo.png" alt="LUPENREIN Service GmbH"/><div><b>• Flexibel</b><b>• Zuverlässig</b><b>• Preiswert</b></div></header>
   <div className="onlineOfferAddress"><div><small>LUPENREIN Service GmbH · Metzer Str. 18 · 13595 Berlin</small><b>{row.answers.company}</b>{row.answers.contactName&&<span>z. Hd. {row.answers.contactName}</span>}<span>{row.answers.address}</span></div><div><small>ANGEBOT</small><strong>{row.offerNumber}</strong><dl><dt>Erstellt</dt><dd>{new Date(row.createdAt).toLocaleDateString('de-DE')}</dd><dt>Gültig bis</dt><dd>{new Date(row.validUntil).toLocaleDateString('de-DE')}</dd></dl></div></div>
   <h1>Reinigungsangebot · {row.answers.objectType}</h1>
   <div className="onlineObjectBox"><small>OBJEKT / KALKULATIONSGRUNDLAGE</small><b>{row.answers.company} · {row.answers.address}</b><span>{row.answers.areaSqm.toLocaleString('de-DE')} m² · {row.answers.frequency} · {row.answers.floorTypes.join(', ')||'Bodenarten gemäß Objekt'}</span></div>
   <table className="onlineOfferTable"><thead><tr><th>Leistung</th><th>Menge</th><th>Einzelpreis</th><th>Gesamt</th></tr></thead><tbody>{row.offerItems.map(item=><tr key={item.id}><td><b>{item.service}</b><small>{item.description}</small></td><td>{item.quantity} {item.unit}</td><td>{money(item.unitPrice)}</td><td><b>{money(item.quantity*item.unitPrice)}</b></td></tr>)}</tbody></table>
   <div className="onlineTotals">{row.pricing.oneTimeNet>0&&<><span>Einmalig netto</span><b>{money(row.pricing.oneTimeNet)}</b><span>MwSt. 19%</span><b>{money(row.pricing.oneTimeNet*.19)}</b><strong>Einmalig brutto</strong><strong>{money(row.pricing.oneTimeNet*1.19)}</strong></>}{row.pricing.monthlyNet>0&&<><span>Monatlich netto</span><b>{money(row.pricing.monthlyNet)}</b><span>MwSt. 19%</span><b>{money(row.pricing.monthlyNet*.19)}</b><strong>Monatlich brutto</strong><strong>{money(row.pricing.monthlyNet*1.19)}</strong></>}</div>
   <div className="onlineNotes"><small>HINWEISE & BEDINGUNGEN</small><p>Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV).</p></div><p className="onlineGreeting">Freundliche Grüße<br/><b>LUPENREIN Service GmbH</b></p><footer className="onlinePageFooter">LUPENREIN Service GmbH · Metzer Str. 18 · 13595 Berlin &nbsp;&nbsp;|&nbsp;&nbsp; Telefon: 030 648 22 623 &nbsp;&nbsp;|&nbsp;&nbsp; info@lupenrein-berlin.de</footer>
  </section>
  <section className="onlineDocumentPage onlineLvPage">
   <header className="onlineLetterhead"><img src="/lupenrein-logo.png" alt="LUPENREIN Service GmbH"/><div><b>• Flexibel</b><b>• Zuverlässig</b><b>• Preiswert</b></div></header>
   <section className="lvDocument">
   <div className="lvDocumentTitle"><div><h2>LEISTUNGSVERZEICHNIS</h2><span>{row.answers.company} · {row.answers.address}</span></div><b>LV zu {row.offerNumber}</b></div>
   <div className="lvObjectSummary"><div><span>Auftraggeber</span><b>{row.answers.company}</b></div><div><span>Reinigungsobjekt</span><b>{row.answers.address}</b></div><div><span>Fläche</span><b>ca. {row.answers.areaSqm.toLocaleString('de-DE')} m²</b></div></div>
   <div className="lvTableWrap"><table className="lvTable"><thead><tr><th>Bereich</th><th>Reinigungsrhythmus</th><th>Tätigkeit</th></tr></thead><tbody>
    {groups.flatMap(groupId=>{const items=row.lvItems.filter(item=>item.groupId===groupId);return items.map((item,index)=><tr key={item.id}>{index===0&&<th scope="rowgroup" rowSpan={items.length}>{item.groupLabel}</th>}<td className="lvRhythm">{item.frequency.custom||item.frequency.preset}</td><td><div className="lvTask"><span aria-hidden="true"/><div><b>{item.activityLabel}</b>{item.shortText&&<p>{item.shortText}</p>}</div></div></td></tr>)})}
   </tbody></table></div>
   <p className="standardClause"><b>Ausführungshinweis</b>Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV).</p>
   </section><footer className="onlinePageFooter">LUPENREIN Service GmbH · Metzer Str. 18 · 13595 Berlin &nbsp;&nbsp;|&nbsp;&nbsp; Telefon: 030 648 22 623 &nbsp;&nbsp;|&nbsp;&nbsp; info@lupenrein-berlin.de</footer>
  </section>
  <section className="onlineDecisionCard noPrint"><h2>Wie möchten Sie fortfahren?</h2><PublicOfferAcceptance token={token} status={row.status}/></section>
 </article></main>
}

