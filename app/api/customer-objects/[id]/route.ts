import {NextResponse} from 'next/server'
import {getCustomerObject,updateCustomerObject} from '@/lib/store'
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const item=await getCustomerObject(id);return item?NextResponse.json({object:item}):NextResponse.json({error:'Nicht gefunden.'},{status:404})}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){const {id}=await params;const body=await req.json();const item=await updateCustomerObject(id,body);return item?NextResponse.json({object:item}):NextResponse.json({error:'Update fehlgeschlagen.'},{status:404})}
