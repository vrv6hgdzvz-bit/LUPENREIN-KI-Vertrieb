import Link from 'next/link'

const items = [
  ['⌂','Dashboard','/'], ['⌕','Lead-Finder','/lead-finder'], ['◈','Website-Besucher','/website-visitors'], ['◎','Leads','/leads'], ['▦','Pipeline','/pipeline'], ['◌','Kundenanfragen','/self-service-requests'], ['✉','Nachrichten','/messages'], ['✓','Aufgaben','/tasks'], ['▤','Besichtigungen','/surveys'], ['€','Angebote','/offers'], ['◆','Kunden','/customers'], ['↗','KPIs','/analytics'], ['◉','Betrieb & Agent','/operations'], ['⚙','Einstellungen','/settings']
]
export function Sidebar(){
  return <aside className="sidebar">
    <div className="brand"><img className="brandLogo" src="/lupenrein-logo.png" alt="LUPENREIN Service GmbH"/><div className="brandText"><strong>LUPENREIN</strong><span>KI Vertrieb</span></div></div>
    <nav>{items.map(([icon,label,href])=><Link className="navItem" href={href} key={href}><span>{icon}</span>{label}</Link>)}</nav>
    <div className="sidebarCard"><span className="eyebrow">EINSATZGEBIET</span><strong>Berlin + 50 km</strong><small>Lead-Suche aktiv</small></div>
    <div className="sidebarFoot">LUPENREIN Service GmbH<br/><span>Interne Vertriebssoftware</span></div>
  </aside>
}

