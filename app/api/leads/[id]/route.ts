import {NextResponse} from 'next/server'
import {getLead,updateLead} from '@/lib/store'
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const l=await getLead(id);return l?NextResponse.json(l):NextResponse.json({error:'Nicht gefunden'},{status:404})}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const l=await updateLead(id,await req.json());return l?NextResponse.json(l):NextResponse.json({error:'Nicht gefunden'},{status:404})}
