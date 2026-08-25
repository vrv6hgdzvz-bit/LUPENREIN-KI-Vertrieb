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
  const areaWidth=105,frequencyWidth=100,activityWidth=contentWidth-areaWidth-frequencyWidth
  const columnX=[left,left+areaWidth,left+areaWidth+frequencyWidth,right]
  const pale=rgb(238/255,248/255,252/255)
  const grid=rgb(159/255,178/255,188/255)
  async function lvPage(continued=false){
   await newPage()
   text(page,continued?'LEISTUNGSVERZEICHNIS · FORTSETZUNG':'LEISTUNGSVERZEICHNIS',left,y,bold,continued?12:16,navy)
   rightText(page,`LV zu ${offer.number}`,right,y,bold,8,navy);y-=18
   text(page,`${lead.company} · ${lead.address||lead.city}`,left,y,regular,8,gray);y-=20
   if(!continued&&survey){
    page.drawRectangle({x:left,y:y-34,width:contentWidth,height:38,color:rgb(.973,.988,.994),borderColor:grid,borderWidth:.6})
    text(page,'AUFTRAGGEBER',left+8,y-8,bold,6.5,gray);text(page,lead.company,left+8,y-21,bold,8,navy)
    text(page,'REINIGUNGSOBJEKT',left+145,y-8,bold,6.5,gray);text(page,survey.address,left+145,y-21,bold,8,navy)
    text(page,'FLÄCHE',right-78,y-8,bold,6.5,gray);text(page,`ca. ${survey.areaSqm.toLocaleString('de-DE')} m²`,right-78,y-21,bold,8,navy);y-=48
   }
   page.drawRectangle({x:left,y:y-19,width:contentWidth,height:21,color:navy})
   text(page,'BEREICH',left+7,y-12,bold,7,rgb(1,1,1));text(page,'REINIGUNGSRHYTHMUS',columnX[1]+7,y-12,bold,6.5,rgb(1,1,1));text(page,'TÄTIGKEIT',columnX[2]+7,y-12,bold,7,rgb(1,1,1));y-=19
  }
  await lvPage()
  const groups=[...new Set(lvItems.map(x=>x.groupId))]
  for(const groupId of groups){
   const entries=lvItems.filter(x=>x.groupId===groupId)
   for(let index=0;index<entries.length;index++){
    const entry=entries[index],frequency=entry.frequency.custom||entry.frequency.preset
    const titleRows=wrap(entry.activityLabel,bold,7.8,activityWidth-29)
    const detailRows=wrap(entry.shortText,regular,7.1,activityWidth-29)
    const frequencyRows=wrap(frequency,bold,7.2,frequencyWidth-14)
    const areaRows=index===0?wrap(entry.groupLabel,bold,8,areaWidth-14):[]
    const rowHeight=Math.max(32,14+titleRows.length*9+detailRows.length*8,14+frequencyRows.length*9,14+areaRows.length*9)
    if(y-rowHeight<bottom){await lvPage(true);index--;continue}
    if(index===0)page.drawRectangle({x:left,y:y-rowHeight,width:areaWidth,height:rowHeight,color:pale})
    page.drawRectangle({x:left,y:y-rowHeight,width:contentWidth,height:rowHeight,borderColor:grid,borderWidth:.55})
    for(const x of columnX.slice(1,3))page.drawLine({start:{x,y},end:{x,y:y-rowHeight},thickness:.55,color:grid})
    if(index===0)areaRows.forEach((r,i)=>text(page,r,left+7,y-14-i*9,bold,8,navy))
    frequencyRows.forEach((r,i)=>text(page,r,columnX[1]+7,y-14-i*9,bold,7.2,navy))
    page.drawRectangle({x:columnX[2]+7,y:y-17,width:8,height:8,borderColor:blue,borderWidth:.8})
    titleRows.forEach((r,i)=>text(page,r,columnX[2]+21,y-13-i*9,bold,7.8,navy))
    const detailsStart=y-14-titleRows.length*9
    detailRows.forEach((r,i)=>text(page,r,columnX[2]+21,detailsStart-i*8,regular,7.1,gray))
    y-=rowHeight
   }
  }
  await ensure(48);y-=15;page.drawRectangle({x:left,y:y-30,width:contentWidth,height:34,color:pale});text(page,'AUSFÜHRUNGSHINWEIS',left+10,y-9,bold,7,blue);text(page,'Die angebotenen Leistungen erfolgen gemäß Absprache und beigefügtem Leistungsverzeichnis (LV).',left+10,y-22,regular,8,navy);y-=38
 }

 if(!activeAsset){text(page,`USt-IdNr. ${COMPANY.vatId} · ${COMPANY.register} · ${COMPANY.court}`,left,45,regular,7,gray)}
 doc.setTitle(`Angebot ${offer.number}`);doc.setAuthor(COMPANY.name);doc.setCreator('LUPENREIN KI Vertrieb')
 return Buffer.from(await doc.save())
}

