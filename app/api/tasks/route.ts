import {NextResponse} from 'next/server'
import {createTask,getTasks} from '@/lib/store'
export async function GET(){return NextResponse.json(await getTasks())}
export async function POST(req:Request){try{const b=await req.json();if(!b.leadId||!b.title||!b.type||!b.dueAt)return NextResponse.json({error:'Pflichtfelder fehlen.'},{status:400});return NextResponse.json(await createTask(b),{status:201})}catch(e:any){return NextResponse.json({error:e.message||'Fehler'},{status:500})}}
