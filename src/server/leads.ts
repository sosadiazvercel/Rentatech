import 'server-only';
import {createHash,createHmac,randomUUID} from 'node:crypto';
import {leadSchema,reviewReasons,leadUpdateSchema} from '@/lib/lead-schema';
import {pool,transaction} from './db';
import {HttpError} from './http';
import type {Staff} from './auth';
import {getConfig} from './rental';
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
 const parsed=leadUpdateSchema.safeParse(raw);if(!parsed.success)throw new HttpError(422,'INVALID_UPDATE','Revisa etapa, responsable y motivo de pérdida');
 const v=parsed.data;
 return transaction(async db=>{
  const old=(await db.query('SELECT id,stage,owner_user_id,estimated_value_cop,next_action_at FROM public.lead WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!old)throw new HttpError(404,'NOT_FOUND','No encontramos la solicitud');
  if(['won','quoted'].includes(old.stage))throw new HttpError(409,'STAGE_LOCKED','Esta etapa no se modifica en Sprint 1');
  if(v.ownerId&&!(await db.query('SELECT id FROM public.staff_profile WHERE id=$1 AND active=true',[v.ownerId])).rowCount)throw new HttpError(422,'INVALID_OWNER','Responsable no disponible');
  await db.query('UPDATE public.lead SET stage=$2,owner_user_id=$3,estimated_value_cop=$4,next_action_at=$5,loss_reason=$6 WHERE id=$1',[id,v.stage,v.ownerId,v.estimatedValue,v.nextAction,v.stage==='lost'?v.lossReason:null]);
  if(v.note)await db.query('INSERT INTO public.lead_note(lead_id,author_user_id,body) VALUES($1,$2,$3)',[id,staff.id,v.note]);
  await db.query('INSERT INTO public.audit_log(actor_type,actor_id,entity_type,entity_id,action,before,after) VALUES($1,$2,$3,$4,$5,$6,$7)',['staff',staff.id,'lead',id,'updated',JSON.stringify(old),JSON.stringify({stage:v.stage,owner_user_id:v.ownerId,estimated_value_cop:v.estimatedValue,next_action_at:v.nextAction})]);
  return {ok:true};
 });
}
