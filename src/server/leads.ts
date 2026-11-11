import 'server-only';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {leadSchema,reviewReasons,leadUpdateSchema} from '@/lib/lead-schema';
import {pool,transaction} from './db';
import {HttpError} from './http';
import type {Staff} from './auth';
import {getConfig,period} from './rental';
import {eventSchema} from '@/lib/rental';
import {stageMail} from '@/lib/lead-email';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function createLead(raw:unknown,key:string){
 const parsed=leadSchema.safeParse(raw);
 if(!parsed.success)return {invalid:parsed.error.flatten()};
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))throw new HttpError(400,'INVALID_KEY','Falta la clave de solicitud');
 const data=parsed.data;const bodyHash=hash(JSON.stringify(data));
 const secret=process.env.TOKEN_SECRET;if(!secret||secret.length<32)throw new Error('TOKEN_SECRET_REQUIRED');
 return transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['lead:'+key]);
  const prior=await db.query('SELECT request_hash,result_private FROM public.command_receipt WHERE scope=$1 AND actor_key=$2 AND request_key=$3',['lead','public',key]);
  if(prior.rowCount){if(prior.rows[0].request_hash!==bodyHash)throw new HttpError(409,'KEY_CONFLICT','Esta solicitud ya se usó con otros datos');return {...prior.rows[0].result_private,replayed:true};}
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['customer:'+data.email]);
  await db.query(`INSERT INTO public.customer(company_name,contact_name,email_normalized,phone_e164,customer_type,marketing_consent)
   VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(email_normalized) DO NOTHING`,[data.company||null,data.name,data.email,data.phone,data.customerType,data.marketing]);
  const customer=(await db.query('SELECT id FROM public.customer WHERE email_normalized=$1',[data.email])).rows[0];
  const last=(await db.query("SELECT attribution FROM public.lead WHERE customer_id=$1 AND created_at > now()-interval '30 days' ORDER BY created_at DESC LIMIT 1",[customer.id])).rows[0]?.attribution;
  const touch=data.attribution?.source?{...data.attribution,at:new Date().toISOString()}:null;
  const attribution={first:last?.first||touch||{source:'unknown'},last:touch||last?.last||{source:'unknown'}};
  const config=await getConfig(db);const technicianCount=config.rules.staffRules.find(r=>data.quantity>=r.min&&data.quantity<=r.max)?.count??null;
  const id=randomUUID(),token=createHmac('sha256',secret).update(id+':'+key).digest('hex'),reasons=reviewReasons(data);
  await db.query(`INSERT INTO public.lead(id,customer_id,request,source,attribution,privacy_version,privacy_accepted_at,marketing_consent,continuation_token_hash,continuation_expires_at)
   VALUES($1,$2,$3,$4,$5,'sprint1-demo-v1',now(),$6,$7,now()+interval '24 hours')`,[id,customer.id,JSON.stringify({...data,reasons,technicianCount:technicianCount}),attribution.last.source,JSON.stringify(attribution),data.marketing,hash(token)]);
  const result={leadId:id,status:'manual_review',reasons,technicianCount:technicianCount,message:'Solicitud de prueba guardada. No confirma precio, disponibilidad ni reserva.'};
  // No token is needed by the Sprint 1 UI. Store only its hash for future continuation.
  await db.query('INSERT INTO public.command_receipt(scope,actor_key,request_key,request_hash,result_private,status) VALUES($1,$2,$3,$4,$5,$6)',['lead','public',key,bodyHash,JSON.stringify(result),'complete']);
  await db.query('INSERT INTO public.audit_log(actor_type,entity_type,entity_id,action) VALUES($1,$2,$3,$4)',['public','lead',id,'created']);
  return result;
 });
}
export async function listLeads(stage='',page=1){
 const where=stage?'WHERE l.stage=$1':'';const args:unknown[]=stage?[stage]:[];
 return (await pool().query(`SELECT l.*, c.email_normalized, c.contact_name, c.company_name FROM public.lead l JOIN public.customer c ON c.id=l.customer_id ${where} ORDER BY l.created_at DESC LIMIT 30 OFFSET $${args.length+1}`,[...args,(page-1)*30])).rows;
}
export async function updateLead(id:string,raw:unknown,staff:Staff){
 const parsed=leadUpdateSchema.safeParse(raw);if(!parsed.success)throw new HttpError(422,'INVALID_UPDATE',parsed.error.issues[0].message);
 const v=parsed.data;
 return transaction(async db=>{
  const old=(await db.query('SELECT * FROM public.lead WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!old)throw new HttpError(404,'NOT_FOUND','No encontramos la solicitud');
  if(v.expectedVersion!==old.stage_version)throw new HttpError(409,'STALE_UPDATE','La solicitud cambió. Recarga antes de guardar.');
  if(v.ownerId&&!(await db.query('SELECT id FROM public.staff_profile WHERE id=$1 AND active=true',[v.ownerId])).rowCount)throw new HttpError(422,'INVALID_OWNER','Responsable no disponible');
  let attachmentId=old.attachment_id;
  if(v.attachment){
   const content=Buffer.from(v.attachment.content,'base64');
   if(!v.attachment.filename.toLowerCase().endsWith('.pdf')||content.subarray(0,5).toString()!=='%PDF-'||content.length>5*1024*1024||content.length<8)throw new HttpError(422,'INVALID_ATTACHMENT','Adjunta un PDF válido de máximo 5 MB');
   attachmentId=(await db.query('INSERT INTO public.lead_attachment(lead_id,filename,data,digest) VALUES($1,$2,$3,$4) ON CONFLICT(lead_id,digest) DO UPDATE SET digest=EXCLUDED.digest RETURNING id',[id,v.attachment.filename.replace(/[^a-zA-Z0-9._ -]/g,'_'),content,hash(content.toString('base64'))])).rows[0].id;
  }
  const transition=old.stage!==v.stage;
  if(transition&&old.stage==='confirmed'&&!['completed','lost'].includes(v.stage))throw new HttpError(409,'RENTAL_CONFIRMED','Un alquiler confirmado solo puede finalizarse o marcarse perdido');
  if(transition&&v.stage==='awaiting_payment'&&old.stage!=='quoted')throw new HttpError(422,'QUOTE_FIRST','Envía la cotización antes de registrar su aprobación');
  if(transition&&v.stage==='confirmed'&&old.stage!=='awaiting_payment')throw new HttpError(422,'APPROVAL_FIRST','Registra la aprobación y el enlace de pago antes de confirmar');
  const resend=['quoted','awaiting_payment'].includes(v.stage)&&(attachmentId!==old.attachment_id||v.paymentUrl!==old.payment_url);
  const notify=(transition||resend)&&!['new','lost'].includes(v.stage);
  if(transition||resend)await db.query("UPDATE notification_outbox SET status='superseded',last_error='Sustituido por una etapa o cotización posterior' WHERE lead_id=$1 AND status IN ('not_configured','failed')",[id]);
  if(['quoted','awaiting_payment'].includes(v.stage)&&!attachmentId)throw new HttpError(422,'ATTACHMENT_REQUIRED','Adjunta la cotización en PDF');
  if(v.stage==='awaiting_payment'&&!v.paymentUrl)throw new HttpError(422,'PAYMENT_LINK_REQUIRED','Registra el enlace de pago');
  if(v.stage==='confirmed'&&transition&&(!v.paymentConfirmed||!v.paymentReference))throw new HttpError(422,'PAYMENT_REQUIRED','Confirma el pago e indica su referencia');
  if(v.stage==='completed'&&transition&&old.stage!=='confirmed')throw new HttpError(422,'CONFIRM_FIRST','Confirma el alquiler antes de finalizarlo');
  if(transition&&old.stage==='completed')throw new HttpError(409,'RENTAL_CLOSED','El alquiler ya finalizó');
  if(transition&&v.stage==='confirmed'){
   const existing=(await db.query("SELECT b.id FROM booking b JOIN quote q ON q.id=b.quote_id WHERE q.lead_id=$1 AND b.status IN ('confirmed','in_service')",[id])).rows[0];
   if(!existing){
    // The event schema is strict, so pick only rental fields from the saved request.
    const r=old.request;
    const checked=eventSchema.safeParse({equipment:r.equipment,quantity:r.quantity,days:r.days??1,date:r.date,start:r.start,durationHours:r.durationHours??8,city:r.city,address:r.address||r.venue||'',contentStatus:r.contentStatus??'custom'});
    if(!checked.success)throw new HttpError(422,'REVIEW_RENTAL','Revisa la fecha y los datos del alquiler antes de confirmar');
    const p=period(checked.data,(await getConfig(db)).rules);
    const equipment=(await db.query('SELECT id FROM equipment WHERE code=$1',[r.equipment])).rows[0];
    if(!equipment)throw new HttpError(422,'INVALID_EQUIPMENT','Equipo no disponible');
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['inventory:'+equipment.id]);
    const units=(await db.query("SELECT u.id FROM inventory_unit u WHERE u.equipment_id=$1 AND u.status='ready' AND NOT u.is_fixture AND NOT EXISTS(SELECT 1 FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND a.active AND a.period && tstzrange($2,$3,'[)')) ORDER BY u.asset_tag LIMIT $4 FOR UPDATE OF u",[equipment.id,p.from,p.to,r.quantity])).rows;
    if(units.length!==r.quantity)throw new HttpError(409,'NO_AVAILABILITY','No hay suficientes equipos disponibles para confirmar el alquiler');
    for(const unit of units)await db.query("INSERT INTO unit_allocation(inventory_unit_id,lead_id,kind,period,reason) VALUES($1,$2,'manual',tstzrange($3,$4,'[)'),$5)",[unit.id,id,p.from,p.to,'Alquiler confirmado '+id]);
   }
  }
  if(transition&&old.stage==='confirmed'&&v.stage!=='confirmed'){
   await db.query('UPDATE unit_allocation SET active=false WHERE lead_id=$1',[id]);
   const bookings=(await db.query("SELECT b.id FROM booking b JOIN quote q ON q.id=b.quote_id WHERE q.lead_id=$1 AND b.status IN ('confirmed','in_service') FOR UPDATE OF b",[id])).rows;
   for(const booking of bookings){
    await db.query("UPDATE booking SET status=$2,cancellation_reason=CASE WHEN $2='cancelled' THEN 'Cierre desde seguimiento comercial' ELSE cancellation_reason END,refund_status=CASE WHEN $2='cancelled' AND paid_cop>0 THEN 'pending' ELSE refund_status END WHERE id=$1",[booking.id,v.stage==='completed'?'completed':'cancelled']);
    await db.query('UPDATE unit_allocation SET active=false WHERE booking_id=$1',[booking.id]);
    await db.query('UPDATE technician_allocation SET active=false WHERE booking_id=$1',[booking.id]);
   }
  }
  const version=old.stage_version+1;
  await db.query('UPDATE public.lead SET stage=$2,owner_user_id=$3,estimated_value_cop=$4,payment_url=$5,payment_reference=$6,attachment_id=$7,stage_version=$8 WHERE id=$1',[id,v.stage,v.ownerId,v.estimatedValue,v.paymentUrl,v.paymentReference,attachmentId,version]);
  if(v.note)await db.query('INSERT INTO public.lead_note(lead_id,author_user_id,body) VALUES($1,$2,$3)',[id,staff.id,v.note]);
  if(notify){
   const payload=stageMail(v.stage,old.request,id,v.paymentUrl);
   await db.query("INSERT INTO public.notification_outbox(lead_id,channel,kind,payload,attachment_id,event_key) VALUES($1,'email',$2,$3,$4,$5)",[id,v.stage,JSON.stringify(payload),['quoted','awaiting_payment'].includes(v.stage)?attachmentId:null,'lead/'+id+'/'+version]);
  }
  await db.query('INSERT INTO public.audit_log(actor_type,actor_id,entity_type,entity_id,action,before,after) VALUES($1,$2,$3,$4,$5,$6,$7)',['staff',staff.id,'lead',id,'updated',JSON.stringify({stage:old.stage,version:old.stage_version}),JSON.stringify({stage:v.stage,version,paymentReference:v.paymentReference,attachmentId})]);
  return {ok:true,version,notificationQueued:notify};
 });
}
