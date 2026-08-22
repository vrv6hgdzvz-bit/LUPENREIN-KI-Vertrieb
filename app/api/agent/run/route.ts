import {NextResponse} from 'next/server'
import {buildSalesRecommendations} from '@/lib/agent'
import {getLeads,getMessages,getTasks,createTask} from '@/lib/store'
import {addAgentRun,addAudit,getProfile} from '@/lib/ops'

export async function POST(){
  const startedAt=new Date().toISOString()
  try{
    const profile=await getProfile()
    if(!profile)return NextResponse.json({error:'Nicht angemeldet.'},{status:401})
    if(profile.role==='read_only')return NextResponse.json({error:'Nur-Lese-Benutzer dürfen den Agenten nicht ausführen.'},{status:403})
    const [leads,messages,tasks]=await Promise.all([getLeads(),getMessages(),getTasks({status:'Offen'})])
    const recs=buildSalesRecommendations(leads,messages,tasks)
    let created=0
    for(const rec of recs){
      const duplicate=tasks.some(t=>t.leadId===rec.leadId&&t.status==='Offen'&&t.title===rec.taskTitle)
      if(duplicate)continue
      await createTask({leadId:rec.leadId,title:rec.taskTitle,type:rec.taskType,dueAt:rec.dueAt,note:`KI-Vertriebsagent: ${rec.reason}`})
      created++
    }
    const finishedAt=new Date().toISOString()
    const summary=`${leads.length} Leads geprüft, ${recs.filter(r=>r.score>=100).length} besonders priorisiert, ${created} neue Aufgaben vorbereitet.`
    const run=await addAgentRun({status:'Erfolgreich',leadsReviewed:leads.length,tasksCreated:created,hotLeads:leads.filter(l=>l.score>=85).length,summary,startedAt,finishedAt})
    await addAudit('agent.run','agent_run',run.id,summary,{recommendations:recs.length})
    return NextResponse.json({ok:true,run,recommendations:recs,tasksCreated:created})
  }catch(e:any){
    const finishedAt=new Date().toISOString();const summary=e?.message||'Unbekannter Fehler beim Agentenlauf.'
    try{await addAgentRun({status:'Fehler',leadsReviewed:0,tasksCreated:0,hotLeads:0,summary,startedAt,finishedAt})}catch{}
    return NextResponse.json({error:summary},{status:500})
  }
}
