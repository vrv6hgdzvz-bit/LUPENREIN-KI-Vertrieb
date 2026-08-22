import {NextResponse} from 'next/server'
import {supabaseConfigured} from '@/lib/supabase'

export const dynamic='force-dynamic'
export async function GET(){
  const checks={
    app:true,
    supabase:supabaseConfigured,
    openai:Boolean(process.env.OPENAI_API_KEY),
    places:Boolean(process.env.GOOGLE_PLACES_API_KEY),
    gmail:Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN),
    cronSecret:Boolean(process.env.CRON_SECRET),
    backupDatabase:Boolean(process.env.DATABASE_URL)
  }
  const productionReady=checks.supabase&&checks.openai&&checks.places
  return NextResponse.json({status:'ok',version:'1.0.1',productionReady,checks,timestamp:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})
}
