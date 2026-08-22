import {NextResponse} from 'next/server'
import {getSurvey,updateSurvey} from '@/lib/store'
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const current=await getSurvey(id);if(!current)return NextResponse.json({error:'Besichtigung nicht gefunden.'},{status:404});const survey=await updateSurvey(id,await req.json());return NextResponse.json({survey})}
