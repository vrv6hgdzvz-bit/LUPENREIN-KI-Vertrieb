import {NextResponse} from 'next/server'
import {deleteLetterhead,getLetterhead,uploadLetterhead} from '@/lib/letterhead'

export const dynamic='force-dynamic'

export async function GET(){
 try{
  const asset=await getLetterhead()
  return NextResponse.json(asset?{configured:true,mime:asset.mime,size:asset.size}:{configured:false})
 }catch(e:any){return NextResponse.json({error:e?.message||'Briefkopf konnte nicht geprüft werden.'},{status:500})}
}

export async function POST(req:Request){
 try{
  const form=await req.formData()
  const file=form.get('file')
  if(!(file instanceof File))return NextResponse.json({error:'Bitte eine Datei auswählen.'},{status:400})
  const saved=await uploadLetterhead(file)
  return NextResponse.json({configured:true,...saved})
 }catch(e:any){return NextResponse.json({error:e?.message||'Briefkopf konnte nicht gespeichert werden.'},{status:400})}
}

export async function DELETE(){
 try{await deleteLetterhead();return NextResponse.json({configured:false})}
 catch(e:any){return NextResponse.json({error:e?.message||'Briefkopf konnte nicht entfernt werden.'},{status:500})}
}
