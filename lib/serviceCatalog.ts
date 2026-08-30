export const SERVICE_FREQUENCIES = ['täglich','5x/Woche','3x/Woche','2x/Woche','1x/Woche','14-tägig','monatlich','quartalsweise','jährlich','nach Bedarf','freie Eingabe'] as const

export type ServiceCatalogActivity={id:string;label:string;shortText:string;icon?:string}
export type ServiceCatalogGroup={id:string;label:string;icon:string;description:string;activities:ServiceCatalogActivity[]}

export const SERVICE_CATALOG:ServiceCatalogGroup[]=[
 {id:'unterhaltsreinigung',label:'Unterhaltsreinigung',icon:'🧹',description:'Regelmäßige Werterhaltung und Sauberkeit',activities:[
  {id:'boeden',label:'Böden reinigen',shortText:'Bodenflächen saugen bzw. feucht wischen',icon:'🧽'},
  {id:'oberflaechen',label:'Oberflächen reinigen',shortText:'Frei zugängliche Oberflächen feucht abwischen',icon:'✨'},
  {id:'abfall',label:'Abfallbehälter leeren',shortText:'Abfallbehälter leeren und Einleger erneuern',icon:'🗑️'},
  {id:'sanitaer',label:'Sanitärbereiche reinigen',shortText:'WC, Urinale, Waschbecken und Armaturen hygienisch reinigen',icon:'🚻'},
  {id:'kueche',label:'Küche / Sozialraum',shortText:'Arbeitsflächen, Spülen und Außenflächen reinigen',icon:'☕'},
  {id:'kontaktflaechen',label:'Kontaktflächen',shortText:'Türgriffe, Schalter und häufig berührte Flächen reinigen',icon:'🚪'}]},
 {id:'bueroreinigung',label:'Büroreinigung',icon:'🏢',description:'Arbeitsplätze und Gemeinschaftsflächen',activities:[
  {id:'schreibtische',label:'Schreibtische',shortText:'Freigeräumte Schreibtisch- und Ablageflächen reinigen',icon:'🖥️'},
  {id:'buero-boeden',label:'Büroböden',shortText:'Teppich saugen bzw. Hartboden feucht wischen',icon:'🧹'},
  {id:'technik',label:'Bürotechnik außen',shortText:'Monitore, Telefone und Technik äußerlich entstauben',icon:'☎️'},
  {id:'besprechung',label:'Besprechungsräume',shortText:'Tische, Stühle und Präsentationsflächen reinigen',icon:'👥'}]},
 {id:'glasreinigung',label:'Glasreinigung',icon:'🪟',description:'Glasflächen, Rahmen und Falze',activities:[
  {id:'glas-innen',label:'Glasflächen innen',shortText:'Innenliegende Glasflächen streifenfrei reinigen',icon:'✨'},
  {id:'glas-aussen',label:'Glasflächen außen',shortText:'Außenliegende Glasflächen streifenfrei reinigen',icon:'✨'},
  {id:'rahmen',label:'Rahmen und Falze',shortText:'Fensterrahmen und zugängliche Falze reinigen',icon:'🪟'},
  {id:'glaswaende',label:'Glastrennwände',shortText:'Glastrennwände und Glastüren reinigen',icon:'🚪'}]},
 {id:'baureinigung',label:'Baureinigung / Bauendreinigung',icon:'🏗️',description:'Reinigung während und nach Bauarbeiten',activities:[
  {id:'baugrob',label:'Baugrobreinigung',shortText:'Bauschutt, Verpackungen und grobe Verschmutzungen entfernen',icon:'🧱'},
  {id:'baufein',label:'Baufeinreinigung',shortText:'Baustaub und haftende Verschmutzungen beseitigen',icon:'✨'},
  {id:'bauend',label:'Bauendreinigung',shortText:'Bezugsfertige Endreinigung aller vereinbarten Flächen',icon:'🏠'},
  {id:'schutzfolien',label:'Schutzfolien entfernen',shortText:'Etiketten, Folien und Kleberückstände entfernen',icon:'🏷️'}]},
 {id:'industriereinigung',label:'Industriereinigung',icon:'🏭',description:'Produktions-, Lager- und Maschinenumfeld',activities:[
  {id:'produktion',label:'Produktionsflächen',shortText:'Produktionsflächen nach Objektvorgabe reinigen',icon:'⚙️'},
  {id:'lager',label:'Lagerflächen',shortText:'Lager- und Verkehrsflächen reinigen',icon:'📦'},
  {id:'maschinen',label:'Maschinenumfeld',shortText:'Zugängliches Maschinenumfeld oberflächlich reinigen',icon:'🔧'},
  {id:'industrie-boeden',label:'Industrieböden',shortText:'Industrieböden manuell oder maschinell reinigen',icon:'🧼'}]},
 {id:'grundreinigung',label:'Grundreinigung',icon:'🫧',description:'Intensive periodische Reinigung',activities:[
  {id:'boden-grund',label:'Bodengrundreinigung',shortText:'Haftende Verschmutzungen und alte Pflegerückstände entfernen',icon:'🧼'},
  {id:'beschichtung',label:'Bodenbeschichtung',shortText:'Geeignete Bodenflächen mit Pflegefilm beschichten',icon:'✨'},
  {id:'intensiv-sanitaer',label:'Sanitär intensiv',shortText:'Kalk, Urinstein und haftende Rückstände entfernen',icon:'🚻'}]},
 {id:'teppich-polster',label:'Teppich- & Polsterreinigung',icon:'🛋️',description:'Textile Bodenbeläge und Möbel',activities:[
  {id:'teppich',label:'Teppichreinigung',shortText:'Teppichflächen fasertief im vereinbarten Verfahren reinigen',icon:'🧶'},
  {id:'polster',label:'Polsterreinigung',shortText:'Polstermöbel materialgerecht reinigen',icon:'🛋️'},
  {id:'flecken',label:'Fleckendetachur',shortText:'Geeignete Flecken punktuell vorbehandeln',icon:'🎯'}]},
 {id:'schule-kita',label:'Schul- & Kitareinigung',icon:'🏫',description:'Hygiene in Bildungs- und Betreuungseinrichtungen',activities:[
  {id:'gruppenraeume',label:'Klassen- / Gruppenräume',shortText:'Böden, Mobiliar und Kontaktflächen reinigen',icon:'🧸'},
  {id:'kinder-sanitaer',label:'Sanitärbereiche',shortText:'Sanitäranlagen hygienisch und kindgerecht reinigen',icon:'🚻'},
  {id:'spielbereiche',label:'Spielbereiche',shortText:'Zugängliche Spiel- und Aufenthaltsflächen reinigen',icon:'🧩'}]},
 {id:'hausmeister',label:'Hausmeisterservice',icon:'🛠️',description:'Kontrolle, Pflege und kleine Dienste',activities:[
  {id:'kontrollgang',label:'Kontrollgänge',shortText:'Objektzustand kontrollieren und Auffälligkeiten melden',icon:'👁️'},
  {id:'aussenanlage',label:'Außenanlagen',shortText:'Zugängliche Außenflächen sauber halten',icon:'🌿'},
  {id:'kleinreparatur',label:'Kleinreparaturen',shortText:'Vereinbarte einfache Kleinreparaturen durchführen',icon:'🔧'}]},
 {id:'winterdienst',label:'Winterdienst',icon:'❄️',description:'Verkehrssicherung bei Schnee und Eis',activities:[
  {id:'raeumen',label:'Schnee räumen',shortText:'Vereinbarte Verkehrsflächen von Schnee räumen',icon:'🌨️'},
  {id:'streuen',label:'Streudienst',shortText:'Vereinbarte Flächen bei Glätte abstumpfend streuen',icon:'🧂'},
  {id:'kontrolle',label:'Wetterkontrolle',shortText:'Wetterlage prüfen und Einsätze dokumentieren',icon:'🌡️'}]}
]

