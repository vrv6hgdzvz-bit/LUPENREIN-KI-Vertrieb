import 'server-only'
import type {Lead,Message,Task,AgentRecommendation,TaskType} from './types'

function plusHours(base:Date,h:number){const d=new Date(base);d.setHours(d.getHours()+h);return d.toISOString()}
function ageDays(iso?:string){if(!iso)return 999;return Math.max(0,(Date.now()-new Date(iso).getTime())/86400000)}

export function buildSalesRecommendations(leads:Lead[],messages:Message[],tasks:Task[],now=new Date()):AgentRecommendation[]{
  const open=tasks.filter(t=>t.status==='Offen')
  const out:AgentRecommendation[]=[]
  for(const lead of leads){
    if(lead.status==='Kunde')continue
    if(open.some(t=>t.leadId===lead.id && new Date(t.dueAt).getTime()<=now.getTime()+48*3600000))continue
    const leadMsgs=messages.filter(m=>m.leadId===lead.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
    const last=leadMsgs[0]
    let taskType:TaskType='Follow-up',taskTitle='',reason='',boost=0,dueAt=plusHours(now,2)
    if(lead.status==='Interessiert'){
      taskType='Anruf';taskTitle=`Interessenten anrufen: ${lead.company}`;reason='Lead ist bereits interessiert und sollte kurzfristig persönlich weiterqualifiziert werden.';boost=35
    }else if(lead.status==='Besichtigung'){
      taskType='Angebot';taskTitle=`Besichtigung nachbereiten: ${lead.company}`;reason='Besichtigungsphase aktiv; Kalkulation bzw. Angebot sollte abgeschlossen werden.';boost=30
    }else if(lead.status==='Angebot'){
      taskType='Follow-up';taskTitle=`Angebot nachfassen: ${lead.company}`;reason='Offenes Angebot in der Pipeline.';boost=25
    }else if(last?.replyIntent==='rückfrage'){
      taskType='Follow-up';taskTitle=`Rückfrage beantworten: ${lead.company}`;reason='Die letzte Antwort enthält eine Rückfrage.';boost=30
    }else if(last?.replyIntent==='später' && last.followUpAt && new Date(last.followUpAt)<=now){
      taskType='Follow-up';taskTitle=`Jetzt wieder melden: ${lead.company}`;reason='Der gewünschte Wiedervorlage-Zeitpunkt ist erreicht.';boost=28
    }else if(lead.score>=85 && ['Neu','Qualifiziert','Kontakt bereit'].includes(lead.status)){
      taskType='Anruf';taskTitle=`Top-Lead qualifizieren: ${lead.company}`;reason=`Hoher Lead-Score (${lead.score}) und noch kein fortgeschrittener Kontakt.`;boost=20
    }else if(lead.status==='Kontaktiert' && ageDays(last?.sentAt||last?.createdAt)>=4){
      taskType='Follow-up';taskTitle=`Kontakt nachfassen: ${lead.company}`;reason='Seit der letzten Kontaktaufnahme sind mindestens vier Tage vergangen.';boost=15
    }else continue
    out.push({leadId:lead.id,company:lead.company,score:lead.score+boost,reason,taskType,taskTitle,dueAt})
  }
  return out.sort((a,b)=>b.score-a.score).slice(0,10)
}
