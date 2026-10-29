import 'server-only';
import {pool,transaction} from './db';

export function emailConfigured(){return Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM&&process.env.EMAIL_NOTIFICATION_TO);}

// Claim briefly in the database; never keep a connection locked during HTTP.
export async function sendQuoteEmail(quoteId:string){
 const row=await transaction(async db=>{
  const row=(await db.query(`SELECT n.*,q.number,q.snapshot FROM notification_outbox n JOIN quote q ON q.id=n.quote_id WHERE n.quote_id=$1 AND n.channel='email' ORDER BY n.created_at LIMIT 1 FOR UPDATE OF n`,[quoteId])).rows[0];
  if(!row||row.status==='sent'||(row.locked_until&&new Date(row.locked_until).getTime()>Date.now()))return;
  if(!emailConfigured()){
   await db.query("UPDATE notification_outbox SET status='not_configured',last_error='Falta configurar RESEND_API_KEY, EMAIL_FROM y EMAIL_NOTIFICATION_TO.' WHERE id=$1",[row.id]);return;
  }
  // Provider idempotency expires after 24 hours. An uncertain old send needs review.
  if(row.status==='review_required'||(row.attempts>0&&row.attempted_at&&Date.now()-new Date(row.attempted_at).getTime()>23*3600000)){
   await db.query("UPDATE notification_outbox SET status='review_required',last_error='Revisa el historial del proveedor antes de intentar otro envio.' WHERE id=$1",[row.id]);return;
  }
  await db.query("UPDATE notification_outbox SET status='sending',attempts=attempts+1,attempted_at=COALESCE(attempted_at,now()),locked_until=now()+interval '30 seconds' WHERE id=$1",[row.id]);
  return row;
 });
 if(!row)return;
 const db=pool();
 const request=row.snapshot.request;
  const text=[`Hola ${request.name},`,`Recibimos tu solicitud ${row.number}.`,`${request.quantity} ${row.snapshot.equipmentName} para el ${request.date}, ${request.start}, en ${request.city}.`,'Revisaremos disponibilidad, contenido y logistica antes de confirmar la cotizacion.','Esta solicitud no confirma una reserva ni registra un pago.','El equipo de RENTA TECH'].join('\n\n');
  try{
   const response=await fetch('https://api.resend.com/emails',{
    method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`quote/${row.id}`},
    body:JSON.stringify({from:process.env.EMAIL_FROM,to:[request.email],bcc:process.env.EMAIL_NOTIFICATION_TO!.split(',').map(v=>v.trim()).filter(Boolean),subject:`Recibimos tu solicitud ${row.number} | RENTA TECH`,text}),signal:AbortSignal.timeout(10000),
   });
   const body=await response.json();
   if(!response.ok||!body.id){
    await db.query("UPDATE notification_outbox SET status='failed',locked_until=NULL,last_error=$2 WHERE id=$1",[row.id,`El proveedor rechazo el envio (HTTP ${response.status}). Revisa la configuracion y el panel del proveedor.`]);return;
   }
   await db.query("UPDATE notification_outbox SET status='sent',locked_until=NULL,sent_at=now(),provider_id=$2,last_error=NULL WHERE id=$1",[row.id,body.id]);
  }catch{
   await db.query("UPDATE notification_outbox SET status='uncertain',locked_until=NULL,last_error='No se recibio confirmacion del proveedor. Puede reintentarse durante las primeras 23 horas con la misma clave.' WHERE id=$1",[row.id]);
  }
}
