import {NextResponse} from 'next/server'
import {getCustomerObjects} from '@/lib/store'
export async function GET(req:Request){const u=new URL(req.url);return NextResponse.json({objects:await getCustomerObjects(u.searchParams.get('lead')||undefined)})}
