import {getLeads,getTasks} from '@/lib/store'
import {TaskBoard} from '@/components/TaskBoard'
export default async function TasksPage(){const [tasks,leads]=await Promise.all([getTasks(),getLeads()]);return <><section className="hero"><div><span className="eyebrow">V6 · FOLLOW-UP</span><h2>Aufgaben & Termine</h2><p>Alle nächsten Schritte aus Leads, Antworten, Besichtigungen und Angeboten an einem Ort.</p></div></section><TaskBoard initialTasks={tasks} leads={leads}/></>}
