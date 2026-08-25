import {notFound} from 'next/navigation'
import PublicOfferAcceptance from '@/components/PublicOfferAcceptance'
import {getSelfServiceRequest} from '@/lib/selfService'

const money=(value:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(value)

export default async function Page({params}:{params:Promise<{token:string}>}){
 const {token}=await params
 const row=await getSelfServiceRequest(token)
 if(!row)notFound()
 const groups=[...new Set(row.lvItems.map(item=>item.groupId))]
 return <main className="publicShell"><article className="publicCard offerPublic">
  <header className="publicBrand"><img src="/lupenrein-logo.png" alt="LUPENREIN Service GmbH"/><div><b>{row.offerNumber}</b><span>Leistungsverzeichnis zum Angebot</span></div></header>
  <div className="offerHero"><span>Persönliches Reinigungsangebot</span><h1>{row.answers.company}</h1><p>{row.answers.address}</p></div>
  <div className="offerUtility"><a className="secondary" href={`/api/public/offers/${token}/pdf`}>PDF mit LV herunterladen / drucken</a></div>
  <section className="lvDocument">
   <div className="lvDocumentTitle"><div><span>Leistungsumfang</span><h2>LEISTUNGSVERZEICHNIS</h2></div><b>{row.answers.serviceTypes.join(' · ')}</b></div>
   <div className="lvObjectSummary"><div><span>Auftraggeber</span><b>{row.answers.company}</b></div><div><span>Reinigungsobjekt</span><b>{row.answers.address}</b></div><div><span>Fläche</span><b>ca. {row.answers.areaSqm.toLocaleString('de-DE')} m²</b></div></div>
   <div className="lvTableWrap"><table className="lvTable"><thead><tr><th>Bereich</th><th>Reinigungsrhythmus</th><th>Tätigkeit</th></tr></thead><tbody>
    {groups.flatMap(groupId=>{const items=row.lvItems.filter(item=>item.groupId===groupId);return items.map((item,index)=><tr key={item.id}>{index===0&&<th scope="rowgroup" rowSpan={items.length}>{item.groupLabel}</th>}<td className="lvRhythm">{item.frequency.custom||item.frequency.preset}</td><td><div className="lvTask"><span aria-hidden="true"/><div><b>{item.activityLabel}</b>{item.shortText&&<p>{item.shortText}</p>}</div></div></td></tr>)})}
   </tbody></table></div>
  </section>
  <p className="standardClause"><b>Ausführungshinweis</b>Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV).</p>
  <section className="priceBox"><h2>Ihr Preis</h2>{row.pricing.monthlyNet>0&&<div><span>Monatliche Pauschale netto</span><b>{money(row.pricing.monthlyNet)}</b></div>}{row.pricing.oneTimeNet>0&&<div><span>Einmalige Leistung netto</span><b>{money(row.pricing.oneTimeNet)}</b></div>}<small>zzgl. gesetzlicher Umsatzsteuer · gültig bis {new Date(row.validUntil).toLocaleDateString('de-DE')} · Mindestlaufzeit bei laufender Reinigung: 12 Monate</small></section>
  <PublicOfferAcceptance token={token} accepted={row.status==='accepted'}/>
 </article></main>
}

