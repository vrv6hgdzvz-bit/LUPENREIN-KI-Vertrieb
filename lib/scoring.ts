const baseBySector:Record<string,number>={Hausverwaltung:88,Arztpraxis:86,Hotel:82,Büro:80,Industrie:78,Baustelle:80,Schule:84}
const serviceBySector:Record<string,string>={Hausverwaltung:'Unterhalts- & Glasreinigung',Arztpraxis:'Unterhaltsreinigung',Hotel:'Unterhalts- & Grundreinigung',Büro:'Büro- & Glasreinigung',Industrie:'Industriereinigung',Baustelle:'Bauendreinigung',Schule:'Unterhalts- & Grundreinigung'}

export function scoreLead(sector:string, city:string, email:string, phone:string, website=''){
  let score=baseBySector[sector] ?? 70
  if(/berlin|potsdam|brandenburg/i.test(city)) score+=4
  if(email) score+=3
  if(phone) score+=2
  if(website) score+=2
  score=Math.min(99,score)
  const service=serviceBySector[sector] ?? 'Gebäudereinigung'
  const potential: 'hoch'|'mittel'|'niedrig' = score>=85?'hoch':score>=70?'mittel':'niedrig'
  const contactNote = email&&phone ? 'Kontaktwege sind vollständig vorhanden.' : website||phone ? 'Erste Kontakt- oder Webdaten sind vorhanden.' : 'Kontaktdaten sollten ergänzt werden.'
  return {score,service,potential, reason:`${sector} im Einsatzgebiet mit erkennbarem gewerblichen Reinigungsbedarf. ${contactNote}`}
}
