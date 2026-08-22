import {NextResponse} from 'next/server'
import {updateTask} from '@/lib/store'
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const item=await updateTask(id,await req.json());return item?NextResponse.json(item):NextResponse.json({error:'Nicht gefunden'},{status:404})}
