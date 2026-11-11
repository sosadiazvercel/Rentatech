import 'server-only';
import {pool,transaction} from './db';
import {initialMail,type MailPayload} from '@/lib/lead-email';

export function emailConfigured(){return Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);}

// Persist the exact payload before HTTP; never hold a database lock during sending.
async function sendMail(id:string){
 const row=await transaction(async db=>{
  const row=(await db.query(`SELECT n.*,q.number,q.snapshot FROM notification_outbox n LEFT JOIN quote q ON q.id=n.quote_id WHERE n.id=$1 FOR UPDATE OF n`,[id])).rows[0];
  if(!row||['sent','superseded'].includes(row.status)||(row.locked_until&&new Date(row.locked_until).getTime()>Date.now()))return;
  if(!emailConfigured()){
   await db.query("UPDATE notification_outbox SET status='not_configured',last_error='Falta configurar RESEND_API_KEY y EMAIL_FROM.' WHERE id=$1",[id]);return;
  }
  if(row.status==='review_required'||(row.attempts>0&&row.attempted_at&&Date.now()-new Date(row.attempted_at).getTime()>23*3600000)){
   await db.query("UPDATE notification_outbox SET status='review_required',last_error='Revisa el historial del proveedor antes de intentar otro envío.' WHERE id=$1",[id]);return;
  }
  const payload:MailPayload=row.payload??initialMail(row.snapshot.request,row.number,row.kind==='initial_admin',row.snapshot);
  await db.query("UPDATE notification_outbox SET payload=$2,status='sending',attempts=attempts+1,attempted_at=COALESCE(attempted_at,now()),locked_until=now()+interval '60 seconds' WHERE id=$1",[id,JSON.stringify(payload)]);
  return {...row,payload};
 });
 if(!row)return;
 const db=pool();
 try{
  const attachment=row.attachment_id?(await db.query('SELECT filename,data FROM lead_attachment WHERE id=$1',[row.attachment_id])).rows[0]:null;
  const response=await fetch('https://api.resend.com/emails',{
   method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`quote/${id}`},
   body:JSON.stringify({from:process.env.EMAIL_FROM,...row.payload,reply_to:(process.env.EMAIL_REPLY_TO||'jorgesosadiaz@sosadiazbros.com'),...(attachment?{attachments:[{filename:attachment.filename,content:attachment.data.toString('base64')}]}:{})}),signal:AbortSignal.timeout(10000),
  });
  const body=await response.json();
  if(!response.ok||!body.id){
   await db.query("UPDATE notification_outbox SET status='failed',locked_until=NULL,last_error=$2 WHERE id=$1",[id,`El proveedor rechazó el envío (HTTP ${response.status}). Revisa su configuración.`]);return;
  }
  await db.query("UPDATE notification_outbox SET status='sent',locked_until=NULL,sent_at=now(),provider_id=$2,last_error=NULL WHERE id=$1",[id,body.id]);
 }catch{
  await db.query("UPDATE notification_outbox SET status='uncertain',locked_until=NULL,last_error='Sin confirmación del proveedor. Puede reintentarse durante las primeras 23 horas con la misma clave.' WHERE id=$1",[id]);
 }
}
export async function sendQuoteEmail(quoteId:string){
 const rows=(await pool().query("SELECT id FROM notification_outbox WHERE quote_id=$1 AND channel='email' ORDER BY created_at,id",[quoteId])).rows;
 for(const row of rows)await sendMail(row.id);
 const customer=(await pool().query("SELECT status FROM notification_outbox WHERE quote_id=$1 AND kind='initial_customer'",[quoteId])).rows;
 return {customerSent:customer.some(row=>row.status==='sent')};
}
export async function sendLeadEmails(leadId:string){
 const rows=(await pool().query("SELECT id FROM notification_outbox WHERE lead_id=$1 AND channel='email' ORDER BY created_at,id",[leadId])).rows;
 for(const row of rows)await sendMail(row.id);
}
