import {AgentRunner} from '@/components/AgentRunner'
import {getAgentRuns,getAudit,getProfile} from '@/lib/ops'
import {supabaseConfigured} from '@/lib/supabase'

export default async function Operations(){
 const [runs,audit,profile]=await Promise.all([getAgentRuns(8),getAudit(12),getProfile()])
 const env=[['Datenbank / Auth',supabaseConfigured],['OpenAI',Boolean(process.env.OPENAI_API_KEY)],['Google Places',Boolean(process.env.GOOGLE_PLACES_API_KEY)],['Gmail OAuth',Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN)],['Backup-Ziel',Boolean(process.env.DATABASE_URL)]] as const
 return <>
  <div className="pageHead"><div><span className="eyebrow">V10 · LIVE-BETRIEB</span><h2>Betrieb & Agent</h2><p>Produktionsstatus, Rollen, tägliche Priorisierung und Audit-Verlauf.</p></div><AgentRunner/></div>
  <div className="settingsGrid">
   <section className="panel"><h3>Produktionsstatus</h3><div className="opsChecks">{env.map(([name,ok])=><div key={name}><span>{name}</span><b className={ok?'ok':'warn'}>{ok?'BEREIT':'OFFEN'}</b></div>)}</div><p className="dashboardHint">Health-Endpoint: <code>/api/health</code></p></section>
   <section className="panel"><h3>Aktueller Benutzer</h3><p><b>{profile?.displayName||'Nicht angemeldet'}</b><br/><span className="muted">{profile?.email}</span></p><div className="roleBadge">Rolle: {profile?.role||'—'}</div><p className="dashboardHint">Rollen: admin, sales, ops, read_only. Der Agent ist für read_only gesperrt.</p></section>
   <section className="panel"><h3>Automationsregel</h3><p>Der Agent priorisiert Leads und erzeugt Aufgaben. Er versendet keine Akquise-Nachrichten automatisch.</p><div className="toggle"><span>Manuelle Versandfreigabe</span><b>AN</b></div></section>
  </div>
  <div className="grid2">
   <section className="panel"><div className="panelHead"><div><span className="eyebrow">AGENT</span><h3>Letzte Läufe</h3></div></div>{runs.map(r=><div className="taskRow compact" key={r.id}><div><span className="taskType">{r.status}</span><b>{r.tasksCreated} Aufgaben · {r.leadsReviewed} Leads</b><small>{new Date(r.startedAt).toLocaleString('de-DE')} · {r.summary}</small></div></div>)}{!runs.length&&<div className="emptyState">Noch kein Agent-Lauf.</div>}</section>
   <section className="panel"><div className="panelHead"><div><span className="eyebrow">AUDIT</span><h3>Systemverlauf</h3></div></div>{audit.map(a=><div className="taskRow compact" key={a.id}><div><span className="taskType">{a.action}</span><b>{a.summary}</b><small>{new Date(a.createdAt).toLocaleString('de-DE')}</small></div></div>)}{!audit.length&&<div className="emptyState">Noch keine Audit-Ereignisse.</div>}</section>
  </div>
 </>
}
