import 'server-only'

function configured(){return Boolean(process.env.GMAIL_CLIENT_ID&&process.env.GMAIL_CLIENT_SECRET&&process.env.GMAIL_REFRESH_TOKEN)}
export const gmailConfigured=configured()

async function accessToken(){
 if(!gmailConfigured)throw new Error('Gmail ist für diese Web-App noch nicht autorisiert.')
 const body=new URLSearchParams({client_id:process.env.GMAIL_CLIENT_ID!,client_secret:process.env.GMAIL_CLIENT_SECRET!,refresh_token:process.env.GMAIL_REFRESH_TOKEN!,grant_type:'refresh_token'})
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body,cache:'no-store'})
 if(!r.ok)throw new Error('Gmail-Zugriffstoken konnte nicht erneuert werden.')
 return (await r.json()).access_token as string
}
function enc(v:string){return `=?UTF-8?B?${Buffer.from(v,'utf8').toString('base64')}?=`}
function mime(to:string,subject:string,body:string){return [`To: ${to}`,`Subject: ${enc(subject)}`,'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','',body].join('\r\n')}
function b64url(s:string){return Buffer.from(s,'utf8').toString('base64url')}
async function gmail(path:string,init:RequestInit={}){const token=await accessToken();const r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`,{...init,headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...(init.headers||{})},cache:'no-store'});if(!r.ok)throw new Error(`Gmail API Fehler (${r.status}).`);return r.json()}
export async function createGmailDraft(to:string,subject:string,body:string){const j=await gmail('drafts',{method:'POST',body:JSON.stringify({message:{raw:b64url(mime(to,subject,body))}})});return {draftId:String(j.id),messageId:String(j.message?.id||'')}}
export async function sendGmailDraft(draftId:string){const j=await gmail('drafts/send',{method:'POST',body:JSON.stringify({id:draftId})});return {messageId:String(j.id||'')}}

function wrap64(v:string){return v.match(/.{1,76}/g)?.join('\r\n')||v}
export async function createGmailDraftWithPdf(to:string,subject:string,body:string,filename:string,pdf:Buffer){
 const boundary=`lr_${Date.now()}_${Math.random().toString(16).slice(2)}`
 const raw=[`To: ${to}`,`Subject: ${enc(subject)}`,'MIME-Version: 1.0',`Content-Type: multipart/mixed; boundary="${boundary}"`,'',`--${boundary}`,'Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit','',body,'',`--${boundary}`,`Content-Type: application/pdf; name="${filename}"`,`Content-Disposition: attachment; filename="${filename}"`,'Content-Transfer-Encoding: base64','',wrap64(pdf.toString('base64')),'',`--${boundary}--`,'' ].join('\r\n')
 const j=await gmail('drafts',{method:'POST',body:JSON.stringify({message:{raw:Buffer.from(raw,'utf8').toString('base64url')}})})
 return {draftId:String(j.id),messageId:String(j.message?.id||'')}
}
