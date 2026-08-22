import 'server-only'
import type {Lead,Offer,SiteSurvey} from './types'
import {COMPANY} from './company'

function ascii(s:string){return String(s||'').replace(/€/g,'EUR').replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/Ä/g,'Ae').replace(/Ö/g,'Oe').replace(/Ü/g,'Ue').replace(/ß/g,'ss').replace(/[–—]/g,'-').replace(/[^\x00-\x7F]/g,'')}
function esc(s:string){return ascii(s).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}
function wrap(s:string,max=88){const words=ascii(s).split(/\s+/);const out:string[]=[];let line='';for(const w of words){if((line+' '+w).trim().length>max){if(line)out.push(line);line=w}else line=(line+' '+w).trim()}if(line)out.push(line);return out}
function money(n:number){return new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' EUR'}

export function buildOfferPdf(offer:Offer,lead:Lead,survey?:SiteSurvey){
 const lines:string[]=[COMPANY.name,COMPANY.tagline,`${COMPANY.street} · ${COMPANY.zip} ${COMPANY.city}`,`Tel. ${COMPANY.phone} · ${COMPANY.email}`,'',`ANGEBOT ${offer.number}`,'',`An: ${lead.company}`]
 if(lead.contact)lines.push(`z. Hd. ${lead.contact}`)
 lines.push(lead.address||lead.city,'',offer.title,'')
 if(survey)lines.push(`Objekt: ${survey.objectName} · ${survey.address}`,`${survey.areaSqm} m2 · ${survey.frequencyPerWeek}x/Woche · Boden: ${survey.floorType}`,'')
 lines.push('Leistungen:')
 offer.items.forEach((i,idx)=>{lines.push(`${idx+1}. ${i.service} | ${i.quantity} ${i.unit} | ${money(i.unitPrice)} | ${i.billing}`);if(i.description)lines.push(...wrap('   '+i.description,84))})
 lines.push('')
 if(offer.subtotalOneTime>0){const vat=offer.subtotalOneTime*offer.vatRate/100;lines.push(`Einmalig netto: ${money(offer.subtotalOneTime)}`,`MwSt. ${offer.vatRate}%: ${money(vat)}`,`Einmalig brutto: ${money(offer.subtotalOneTime+vat)}`,'')}
 if(offer.subtotalMonthly>0){const vat=offer.subtotalMonthly*offer.vatRate/100;lines.push(`Monatlich netto: ${money(offer.subtotalMonthly)}`,`MwSt. ${offer.vatRate}%: ${money(vat)}`,`Monatlich brutto: ${money(offer.subtotalMonthly+vat)}`,'')}
 lines.push(`Gueltig bis: ${new Date(offer.validUntil).toLocaleDateString('de-DE')}`)
 if(offer.notes)lines.push('',...wrap(offer.notes,88))
 lines.push('',`USt-IdNr.: ${COMPANY.vatId} · ${COMPANY.register} · ${COMPANY.court}`)
 const pages:string[][]=[];for(let i=0;i<lines.length;i+=48)pages.push(lines.slice(i,i+48))
 const objects:string[]=[];const pageIds:number[]=[];let nextId=4
 for(let p=0;p<pages.length;p++){pageIds.push(nextId);nextId+=2}
 const fontId=nextId
 objects[1]='<< /Type /Catalog /Pages 2 0 R >>'
 objects[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
 pages.forEach((pg,idx)=>{const pageId=pageIds[idx],contentId=pageId+1;const cmds=['BT','/F1 10 Tf','40 800 Td'];for(const line of pg)cmds.push(`(${esc(line)}) Tj`,'0 -15 Td');cmds.push('ET');const stream=cmds.join('\n');objects[pageId]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`;objects[contentId]=`<< /Length ${Buffer.byteLength(stream,'ascii')} >>\nstream\n${stream}\nendstream`})
 objects[fontId]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
 let pdf='%PDF-1.4\n';const offsets:number[]=[0]
 for(let i=1;i<objects.length;i++){if(!objects[i])continue;offsets[i]=Buffer.byteLength(pdf,'ascii');pdf+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
 const xref=Buffer.byteLength(pdf,'ascii');pdf+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)pdf+=`${String(offsets[i]||0).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
 return Buffer.from(pdf,'ascii')
}
