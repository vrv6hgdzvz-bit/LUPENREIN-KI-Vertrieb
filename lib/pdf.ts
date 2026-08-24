import 'server-only'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {PDFDocument,PDFFont,PDFPage,StandardFonts,rgb} from 'pdf-lib'
import type {Lead,Offer,SiteSurvey} from './types'
import {COMPANY} from './company'
import {getLetterhead,LetterheadAsset} from './letterhead'

const A4:[number,number]=[595.28,841.89]
const blue=rgb(20/255,159/255,232/255)
const navy=rgb(10/255,53/255,80/255)
const gray=rgb(90/255,105/255,114/255)
const line=rgb(220/255,228/255,233/255)

function safe(s:unknown){return String(s??'').replace(/€/g,'EUR').replace(/[–—]/g,'-').replace(/×/g,'x').replace(/[^\x20-\xFF]/g,'')}
function money(n:number){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' EUR'}
function date(v:string){const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString('de-DE')}
function wrap(text:string,font:PDFFont,size:number,maxWidth:number){
 const words=safe(text).split(/\s+/).filter(Boolean);const rows:string[]=[];let current=''
 for(const word of words){const test=current?`${current} ${word}`:word;if(font.widthOfTextAtSize(test,size)<=maxWidth)current=test;else{if(current)rows.push(current);current=word}}
 if(current)rows.push(current);return rows.length?rows:['']
}
function text(page:PDFPage,value:string,x:number,y:number,font:PDFFont,size=9,color=navy){page.drawText(safe(value),{x,y,font,size,color})}
function rightText(page:PDFPage,value:string,right:number,y:number,font:PDFFont,size=9,color=navy){const clean=safe(value);page.drawText(clean,{x:right-font.widthOfTextAtSize(clean,size),y,font,size,color})}

async function makePage(doc:PDFDocument,asset:LetterheadAsset|null,templateDoc:PDFDocument|null,image:any|null){
 if(asset?.mime==='application/pdf'&&templateDoc){const [copied]=await doc.copyPages(templateDoc,[0]);return doc.addPage(copied)}
 const page=doc.addPage(A4)
 if(image)page.drawImage(image,{x:0,y:0,width:page.getWidth(),height:page.getHeight()})
 return page
}

export async function buildOfferPdf(offer:Offer,lead:Lead,survey?:SiteSurvey){
 const asset=await getLetterhead().catch(()=>null)
 const doc=await PDFDocument.create()
 const regular=await doc.embedFont(StandardFonts.Helvetica)
 const bold=await doc.embedFont(StandardFonts.HelveticaBold)
 let templateDoc:PDFDocument|null=null;let backgroundImage:any|null=null;let standardLogo:any|null=null
 try{
  if(asset?.mime==='application/pdf')templateDoc=await PDFDocument.load(asset.bytes,{ignoreEncryption:true})
  else if(asset?.mime==='image/png')backgroundImage=await doc.embedPng(asset.bytes)
  else if(asset?.mime==='image/jpeg')backgroundImage=await doc.embedJpg(asset.bytes)
 }catch{}
 const activeAsset=(templateDoc||backgroundImage)?asset:null
 if(!activeAsset){
  try{standardLogo=await doc.embedPng(await readFile(path.join(process.cwd(),'public','lupenrein-logo.png')))}catch{}
 }
 let page=await makePage(doc,activeAsset,templateDoc,backgroundImage)
 let y=655
 const bottom=125
 const left=62
 const right=505
 const contentWidth=right-left

 function fallbackBrand(){
  if(activeAsset)return
  if(standardLogo){
   const maxW=150,maxH=70;const scale=Math.min(maxW/standardLogo.width,maxH/standardLogo.height)
   page.drawImage(standardLogo,{x:left,y:755,width:standardLogo.width*scale,height:standardLogo.height*scale})
   text(page,COMPANY.tagline,235,790,regular,8.5,gray)
   text(page,`${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city}`,235,776,regular,8,gray)
   text(page,`${COMPANY.phone} · ${COMPANY.email}`,235,762,regular,8,gray)
  }else{
   text(page,COMPANY.name,left,785,bold,17,blue)
   text(page,COMPANY.tagline,left,766,regular,9,gray)
   text(page,`${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city}`,left,752,regular,8,gray)
  }
  page.drawLine({start:{x:left,y:738},end:{x:right,y:738},thickness:1,color:line})
  text(page,`${COMPANY.name} · ${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city} · ${COMPANY.phone} · ${COMPANY.email}`,left,58,regular,7,gray)
 }
 fallbackBrand()

 async function newPage(){page=await makePage(doc,activeAsset,templateDoc,backgroundImage);fallbackBrand();y=665}
 async function ensure(height:number){if(y-height<bottom)await newPage()}
 function rowRule(pos:number){page.drawLine({start:{x:left,y:pos},end:{x:right,y:pos},thickness:.6,color:line})}

 text(page,`${COMPANY.name} · ${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city}`,left,y,regular,7,gray);y-=24
 text(page,lead.company,left,y,bold,10,navy);y-=14
 if(lead.contact){text(page,`z. Hd. ${lead.contact}`,left,y,regular,9,navy);y-=13}
 const address=lead.address||lead.city;if(address){for(const r of wrap(address,regular,9,250)){text(page,r,left,y,regular,9,navy);y-=12}}
 const metaX=365
 text(page,'ANGEBOT',metaX,655,bold,8,blue);text(page,offer.number,metaX,638,bold,12,navy)
 text(page,'Erstellt',metaX,614,regular,7,gray);text(page,date(offer.createdAt),metaX+55,614,bold,8,navy)
 text(page,'Gültig bis',metaX,600,regular,7,gray);text(page,date(offer.validUntil),metaX+55,600,bold,8,navy)
 y=Math.min(y-18,552)
 text(page,offer.title,left,y,bold,16,navy);y-=24

 if(survey){
  await ensure(52);page.drawRectangle({x:left,y:y-38,width:contentWidth,height:42,color:rgb(.965,.98,.988),borderColor:line,borderWidth:.7})
  text(page,'OBJEKT / KALKULATIONSGRUNDLAGE',left+10,y-8,bold,7,blue)
  text(page,`${survey.objectName} · ${survey.address}`,left+10,y-22,bold,8,navy)
  text(page,`${survey.areaSqm.toLocaleString('de-DE')} m² · ${survey.frequencyPerWeek}x/Woche · ${survey.floorType}`,left+10,y-34,regular,8,gray);y-=54
 }

 async function tableHeader(){await ensure(28);text(page,'LEISTUNG',left,y,bold,7,gray);text(page,'MENGE',300,y,bold,7,gray);rightText(page,'EINZELPREIS',430,y,bold,7,gray);rightText(page,'GESAMT',right,y,bold,7,gray);y-=8;rowRule(y);y-=12}
 await tableHeader()
 for(const item of offer.items){
  const descRows=item.description?wrap(item.description,regular,7.5,250):[]
  const quantityRows=wrap(`${item.quantity} ${item.unit}`,regular,7.5,75)
  const rowHeight=Math.max(34,24+Math.max(descRows.slice(0,3).length,quantityRows.length-1)*10)
  if(y-rowHeight<bottom){await newPage();text(page,`Angebot ${offer.number} · ${lead.company}`,left,y,bold,8,gray);y-=26;await tableHeader()}
  text(page,item.service,left,y,bold,8.5,navy)
  descRows.slice(0,3).forEach((r,i)=>text(page,r,left,y-12-i*10,regular,7.5,gray))
  quantityRows.forEach((r,i)=>text(page,r,300,y-i*10,regular,7.5,navy))
  rightText(page,money(item.unitPrice),430,y,regular,8,navy)
  rightText(page,money(item.quantity*item.unitPrice),right,y,bold,8,navy)
  y-=rowHeight;rowRule(y+7);y-=7
 }
 y-=8

 const totals:{label:string;value:string;strong?:boolean}[]=[]
 if(offer.subtotalOneTime>0){const vat=offer.subtotalOneTime*offer.vatRate/100;totals.push({label:'Einmalig netto',value:money(offer.subtotalOneTime)},{label:`MwSt. ${offer.vatRate}%`,value:money(vat)},{label:'Einmalig brutto',value:money(offer.subtotalOneTime+vat),strong:true})}
 if(offer.subtotalMonthly>0){const vat=offer.subtotalMonthly*offer.vatRate/100;totals.push({label:'Monatlich netto',value:money(offer.subtotalMonthly)},{label:`MwSt. ${offer.vatRate}%`,value:money(vat)},{label:'Monatlich brutto',value:money(offer.subtotalMonthly+vat),strong:true})}
 await ensure(totals.length*15+28)
 for(const t of totals){const f=t.strong?bold:regular;text(page,t.label,340,y,f,t.strong?9:8,t.strong?navy:gray);text(page,t.value,455,y,f,t.strong?9:8,t.strong?navy:gray);y-=15;if(t.strong)y-=6}

 if(offer.notes){
  const notes=wrap(offer.notes,regular,8,contentWidth)
  await ensure(30+notes.length*11);y-=8;text(page,'HINWEISE & BEDINGUNGEN',left,y,bold,7,blue);y-=15
  for(const r of notes){text(page,r,left,y,regular,8,gray);y-=11}
 }
 await ensure(60);y-=18
 text(page,'Freundliche Grüße',left,y,regular,9,navy);y-=16;text(page,COMPANY.name,left,y,bold,9,navy)

 const lvItems=offer.serviceSpecification?.items||[]
 if(lvItems.length){
  await newPage();text(page,'LEISTUNGSVERZEICHNIS (LV)',left,y,bold,16,navy);y-=20;text(page,`Anlage zu Angebot ${offer.number} · ${lead.company}`,left,y,regular,8,gray);y-=25
  const groups=[...new Set(lvItems.map(x=>x.groupId))]
  for(const groupId of groups){
   const entries=lvItems.filter(x=>x.groupId===groupId);if(y-35-entries.length*38<bottom){await newPage();text(page,'LEISTUNGSVERZEICHNIS (FORTSETZUNG)',left,y,bold,12,navy);y-=28}
   text(page,entries[0].groupLabel,left,y,bold,11,blue);y-=12;rowRule(y);y-=15
   for(const entry of entries){if(y-34<bottom){await newPage();text(page,entries[0].groupLabel,left,y,bold,11,blue);y-=22}const frequency=entry.frequency.custom||entry.frequency.preset;text(page,entry.activityLabel,left,y,bold,8.5,navy);text(page,frequency,410,y,bold,8,navy);y-=11;for(const row of wrap(entry.shortText,regular,7.5,330).slice(0,2)){text(page,row,left,y,regular,7.5,gray);y-=9}y-=8;rowRule(y+4)}y-=14
  }
  await ensure(42);text(page,'Ausführungshinweis',left,y,bold,8,blue);y-=13;for(const row of wrap('Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV).',regular,8,contentWidth)){text(page,row,left,y,regular,8,gray);y-=11}
 }

 if(!activeAsset){text(page,`USt-IdNr. ${COMPANY.vatId} · ${COMPANY.register} · ${COMPANY.court}`,left,45,regular,7,gray)}
 doc.setTitle(`Angebot ${offer.number}`);doc.setAuthor(COMPANY.name);doc.setCreator('LUPENREIN KI Vertrieb')
 return Buffer.from(await doc.save())
}

