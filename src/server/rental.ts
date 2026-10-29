import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type pg from 'pg';
import {z} from 'zod';
import {pool,transaction} from './db';
import {HttpError} from './http';
import {emailConfigured} from './email';
import type {CatalogProduct} from '@/lib/catalog';
import type {Staff} from './auth';
import {calculate,eventSchema,requestSchema,rulesSchema,type Rules,type RentalEvent,type RentalRequest,type Overrides,type Estimate} from '@/lib/rental';
type DB=Pick<pg.PoolClient,'query'>;
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function fail(message:string,status=422):never{throw new HttpError(status,'RENTAL_ERROR',message);}
function parse<T>(schema:z.ZodType<T>,value:unknown):T{const p=schema.safeParse(value);if(!p.success)fail(p.error.issues.map(i=>i.message).join('. '));return p.data;}
export async function getConfig(db:DB=pool()){
 const row=(await db.query('SELECT p.id,p.rules FROM rental_settings s JOIN pricing_version p ON p.id=s.pricing_version_id WHERE s.id=true FOR SHARE OF s')).rows[0];
 if(!row)fail('Falta configuración de alquiler',503);
 return {id:row.id as string,rules:rulesSchema.parse(row.rules)};
}
export function period(v:RentalEvent,r:Rules){const start=new Date(`${v.date}T${v.start}:00-05:00`),hours=Math.max(24,v.days*24);return {start,end:new Date(+start+hours*3600000),from:new Date(+start-(r.bufferBeforeMinutes??0)*60000),to:new Date(+start+hours*3600000+(r.bufferAfterMinutes??0)*60000)};}
export async function estimate(raw:unknown,db:DB=pool(),overrides:Overrides={}):Promise<Estimate>{
 const v=parse(eventSchema,raw),c=await getConfig(db),p=period(v,c.rules);
 const equipment=(await db.query('SELECT id,name FROM equipment WHERE code=$1 AND active AND published',[v.equipment])).rows[0];if(!equipment)fail('Equipo no disponible');
 const counts=(await db.query(`SELECT count(*)::int total,count(*) FILTER(WHERE u.status='ready' AND NOT EXISTS(SELECT 1 FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND a.active AND a.period && tstzrange($2,$3,'[)')))::int available FROM inventory_unit u WHERE u.equipment_id=$1 AND NOT u.is_fixture`,[equipment.id,p.from,p.to])).rows[0];
 const zone=(await db.query("SELECT base_price FROM transport_zone WHERE lower(name) IN ('bogotá','bogota') AND active LIMIT 1")).rows[0];
 const transport=['bogotá','bogota'].includes(v.city.toLowerCase())&&zone?.base_price!=null?Number(zone.base_price):null;
 return {...calculate(v,c.rules,transport,overrides),available:counts.available,totalInventory:counts.total,bufferProvisional:c.rules.bufferBeforeMinutes==null||c.rules.bufferAfterMinutes==null,pricingId:c.id,equipmentName:equipment.name,event:v};
}
export async function catalog(){
 const c=await getConfig();
 const products=(await pool().query(`SELECT e.code,e.name,e.slug,e.brand,e.description,e.summary,e.categories,e.specifications,e.featured,e.sort_order,p.version image_version,count(u.id)::int inventory FROM equipment e LEFT JOIN equipment_photo p ON p.equipment_id=e.id LEFT JOIN inventory_unit u ON u.equipment_id=e.id AND NOT u.is_fixture WHERE e.active AND e.published GROUP BY e.id,p.version ORDER BY e.sort_order,e.name`)).rows as CatalogProduct[];
 return {products,minimumQuantity:3,startingPrices:products.map(product=>({code:product.code,...calculate({equipment:product.code,quantity:3,days:1,date:'2099-01-01',start:'10:00',durationHours:8,city:'Bogota',address:'',contentStatus:'ready'},c.rules,null)}))};
}
async function audit(db:DB,staff:Staff|null,entity:string,id:string,action:string,after:unknown={}){await db.query('INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,after) VALUES($1,$2,$3,$4,$5,$6)',[staff?'staff':'public',staff?.id??null,entity,id,action,JSON.stringify(after)]);}
function onlyEvent(v:RentalRequest):RentalEvent {return {equipment:v.equipment,quantity:v.quantity,days:v.days,date:v.date,start:v.start,durationHours:v.durationHours,city:v.city,address:v.address,contentStatus:v.contentStatus};}
async function saveQuote(db:DB,v:RentalRequest,leadId:string,version:number,overrides:Overrides={},status='pending_confirmation'){
 const ev=onlyEvent(v),e=await estimate(ev,db,overrides),c=await getConfig(db),p=period(ev,c.rules);
 if(v.quantity>e.available)fail(`Solo hay ${e.available} equipos disponibles en ese horario`,409);
 const id=randomUUID();
 const snapshot={...e,request:v,rules:c.rules,overrides,internalCosts:{technician:null,transport:null,licenses:null,other:null}};
 const result=await db.query(`INSERT INTO quote(id,lead_id,version,status,pricing_version_id,event_start,event_end,city,venue,equipment_id,quantity,attendees,content_status,technician_count,backup_count,snapshot,subtotal_cop,tax_cop,total_cop,deposit_cop,expires_at,public_token_hash,policy_version)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,(SELECT id FROM equipment WHERE code=$10),$11,1,'pending_review',$12,0,$13,$14,$15,$16,$17,now()+($19::int*interval '1 hour'),$18,'sprint2-proposed') RETURNING number`,[id,leadId,version,status,c.id,p.start,p.end,v.city,JSON.stringify({address:v.address}),v.equipment,v.quantity,e.technicianCount??1,JSON.stringify(snapshot),e.subtotal,e.tax??0,e.total,e.deposit,hash(randomUUID()),c.rules.quoteValidityHours]);
 const lines=[{type:'hardware',description:`${v.quantity} ${e.equipmentName} / ${v.days} dia(s)`,quantity:1,unit:e.hardware},{type:'technician',description:'Operador VR obligatorio',quantity:e.technicianCount??1,unit:e.technicianUnit},{type:'transport',description:'Transporte Bogota ida y vuelta',quantity:1,unit:e.transport},{type:'content',description:e.contentLabel,quantity:1,unit:e.content}];
 for(const l of lines)if(l.unit!=null)await db.query('INSERT INTO quote_line(quote_id,type,description,quantity,unit_cop,total_cop,taxable) VALUES($1,$2,$3,$4,$5,$6,true)',[id,l.type,l.description,l.quantity,l.unit,l.quantity*l.unit]);
 return {id,number:result.rows[0].number as string,estimate:e};
}
export async function createQuote(raw:unknown,key:string){
 const v=parse(requestSchema,raw);if(!/^[a-zA-Z0-9-]{16,80}$/.test(key))fail('Falta identificador de solicitud');const digest=hash(JSON.stringify(v));
 return transaction(async db=>{
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['quote:'+key]);
  const prior=(await db.query("SELECT * FROM command_receipt WHERE scope='quote' AND actor_key='public' AND request_key=$1",[key])).rows[0];
  if(prior){if(prior.request_hash!==digest)fail('La solicitud cambió; vuelve a enviarla',409);return prior.result_private;}
  await db.query(`INSERT INTO customer(company_name,contact_name,email_normalized,phone_e164,customer_type) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email_normalized) DO NOTHING`,[v.company,v.name,v.email,v.phone,v.company?'business':'private']);
  const customer=(await db.query('SELECT id FROM customer WHERE email_normalized=$1',[v.email])).rows[0];
  const leadId=randomUUID(),p=period(onlyEvent(v),(await getConfig(db)).rules);
  await db.query(`INSERT INTO lead(id,customer_id,request,source,privacy_version,privacy_accepted_at,continuation_token_hash,continuation_expires_at) VALUES($1,$2,$3,'web','sprint2-local-v1',now(),$4,now()+interval '7 days')`,[leadId,customer.id,JSON.stringify({...v,end:p.end.toLocaleTimeString('es-CO',{timeZone:'America/Bogota',hour:'2-digit',minute:'2-digit',hour12:false})}),hash(randomUUID())]);
  const result=await saveQuote(db,v,leadId,1);
  await db.query('INSERT INTO internal_notification(quote_id,message) VALUES($1,$2)',[result.id,`Nueva solicitud ${result.number}`]);
  await db.query("INSERT INTO notification_outbox(quote_id,channel) VALUES($1,'email')",[result.id]);
  await db.query("INSERT INTO command_receipt(scope,actor_key,request_key,request_hash,result_private,status) VALUES('quote','public',$1,$2,$3,'complete')",[key,digest,JSON.stringify(result)]);
  await audit(db,null,'quote',result.id,'requested');return result;
 });
}
const cop=z.number().int().min(0).max(1000000000);
const overrideSchema=z.object({transport:cop.optional(),hardware:cop.optional(),technicianUnit:cop.optional(),taxPercent:z.number().min(0).max(100).optional(),technicianCount:z.number().int().min(1).max(100).optional()}).strict();
const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('settings'),expectedId:z.uuid(),rules:rulesSchema,transport:cop.nullable()}),
 z.object({action:z.literal('asset'),id:z.uuid().optional(),equipment:z.string().max(40),code:z.string().trim().min(1).max(80),serial:z.string().trim().max(180),status:z.enum(['ready','maintenance','quarantine','retired','unverified']),condition:z.string().max(200),notes:z.string().max(2000)}),
 z.object({action:z.literal('technician'),id:z.uuid().optional(),name:z.string().trim().min(2).max(180),phone:z.string().max(100),email:z.string().max(254),active:z.boolean(),cost4:cop.nullable(),cost8:cop.nullable(),notes:z.string().max(2000)}),
 z.object({action:z.literal('revise'),id:z.uuid(),request:requestSchema,overrides:overrideSchema}),
 z.object({action:z.literal('quoteStatus'),id:z.uuid(),status:z.enum(['quote_sent','cancelled'])}),
 z.object({action:z.literal('confirm'),id:z.uuid(),technicianIds:z.array(z.uuid()).min(1).max(100),received:cop,reference:z.string().trim().min(3).max(180),reviewed:z.literal(true),depositAccepted:z.literal(true)}),
 z.object({action:z.literal('bookingStatus'),id:z.uuid(),status:z.enum(['in_service','completed','cancelled']),reason:z.string().trim().max(1000)}),
 z.object({action:z.literal('assign'),id:z.uuid(),technicianIds:z.array(z.uuid()).min(1).max(100)}),
 z.object({action:z.literal('payment'),id:z.uuid(),amount:cop.refine(v=>v>0),reference:z.string().trim().min(3).max(180),refund:z.boolean()}),
 z.object({action:z.literal('incident'),bookingId:z.uuid(),assetId:z.uuid(),type:z.enum(['DAMAGE','LOSS','THEFT','ACCESSORY_LOSS','OTHER']),description:z.string().trim().min(3).max(2000),estimatedCost:cop.nullable()}),
 z.object({action:z.literal('resolveIncident'),id:z.uuid(),finalCost:cop.nullable()}),
 z.object({action:z.literal('readNotifications')})
]);
async function assignStaff(db:DB,ids:string[],bookingId:string,from:Date,to:Date,required:number,unit:number,hours:number){
 if(new Set(ids).size!==ids.length||ids.length!==required)fail(`Selecciona exactamente ${required} técnico(s)`);
 const techs=(await db.query('SELECT * FROM technician WHERE id=ANY($1::uuid[]) AND active AND NOT is_fixture ORDER BY id FOR UPDATE',[ids])).rows;
 if(techs.length!==required)fail('Técnico inactivo o no válido');
 await db.query('UPDATE technician_allocation SET active=false WHERE booking_id=$1',[bookingId]);
 for(const t of techs){if((await db.query("SELECT 1 FROM technician_allocation WHERE technician_id=$1 AND active AND period && tstzrange($2,$3,'[)')",[t.id,from,to])).rowCount)fail(`${t.name} ya está asignado en ese horario`,409);
 await db.query("INSERT INTO technician_allocation(technician_id,booking_id,kind,period,internal_cost_cop,client_price_cop) VALUES($1,$2,'event',tstzrange($3,$4,'[)'),$5,$6)",[t.id,bookingId,from,to,hours<=4?t.internal_cost_4h:hours<=8?t.internal_cost_8h:null,unit]);}
}
export async function mutate(raw:unknown,staff:Staff){
 if(staff.role!=='admin')fail('Solo el administrador puede modificar operaciones',403);
 const v=parse(command,raw);
 try{return await transaction(async db=>{
  if(v.action==='settings'){
   await db.query('SELECT * FROM rental_settings WHERE id=true FOR UPDATE');const current=await getConfig(db);if(current.id!==v.expectedId)fail('La configuración cambió. Recarga antes de guardar.',409);
   const id=randomUUID();await db.query("INSERT INTO pricing_version(id,version,mode,rules,rules_hash,active,approved_by,approved_at) VALUES($1,$2,'sandbox',$3,$4,true,$5,now())",[id,'S2-'+id,JSON.stringify(v.rules),hash(JSON.stringify(v.rules)),staff.id]);
   await db.query('UPDATE pricing_version SET active=false WHERE id=$1',[current.id]);await db.query('UPDATE rental_settings SET pricing_version_id=$1 WHERE id=true',[id]);
   await db.query("UPDATE transport_zone SET base_price=$1 WHERE name='Bogotá'",[v.transport]);await audit(db,staff,'pricing',id,'version_created',{rules:v.rules,transport:v.transport});return {id};
  }
  if(v.action==='asset'){
   const e=(await db.query('SELECT id FROM equipment WHERE code=$1',[v.equipment])).rows[0];if(!e)fail('Producto inválido');
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['inventory:'+e.id]);
   if(v.id){const old=(await db.query('SELECT * FROM inventory_unit WHERE id=$1 AND NOT is_fixture FOR UPDATE',[v.id])).rows[0];if(!old)fail('Activo no encontrado',404);if(old.equipment_id!==e.id)fail('El modelo de un activo existente no puede cambiar');
    if(v.status!=='ready'&&(await db.query('SELECT 1 FROM unit_allocation WHERE inventory_unit_id=$1 AND active AND upper(period)>now()',[v.id])).rowCount)fail('El equipo tiene una reserva activa. Cancélala o reasigna antes de retirarlo.',409);
    await db.query('UPDATE inventory_unit SET asset_tag=$2,serial=$3,status=$4,condition=$5,notes=$6 WHERE id=$1',[v.id,v.code,v.serial||null,v.status,v.condition,v.notes]);await audit(db,staff,'asset',v.id,'updated',v);return {id:v.id};}
   const id=randomUUID();await db.query('INSERT INTO inventory_unit(id,equipment_id,asset_tag,serial,status,condition,notes) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,e.id,v.code,v.serial||null,v.status,v.condition,v.notes]);await audit(db,staff,'asset',id,'created',v);return {id};
  }
  if(v.action==='technician'){
   const id=v.id??randomUUID();
   if(v.id){await db.query('SELECT id FROM technician WHERE id=$1 FOR UPDATE',[id]);if(!v.active&&(await db.query('SELECT 1 FROM technician_allocation WHERE technician_id=$1 AND active AND upper(period)>now()',[id])).rowCount)fail('El técnico tiene reservas próximas',409);}
   await db.query(`INSERT INTO technician(id,name,contact,email,active,internal_cost_4h,internal_cost_8h,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,contact=EXCLUDED.contact,email=EXCLUDED.email,active=EXCLUDED.active,internal_cost_4h=EXCLUDED.internal_cost_4h,internal_cost_8h=EXCLUDED.internal_cost_8h,notes=EXCLUDED.notes`,[id,v.name,v.phone,v.email,v.active,v.cost4,v.cost8,v.notes]);await audit(db,staff,'technician',id,'saved',v);return {id};
  }
  if(v.action==='revise'||v.action==='quoteStatus'||v.action==='confirm'){
   const q=(await db.query('SELECT * FROM quote WHERE id=$1 FOR UPDATE',[v.id])).rows[0];if(!q)fail('Cotización no encontrada',404);
   if(['accepted','cancelled','superseded','expired'].includes(q.status))fail('La cotización ya está cerrada',409);
   if(v.action==='quoteStatus'){await db.query('UPDATE quote SET status=$2 WHERE id=$1',[q.id,v.status]);if(v.status==='quote_sent')await db.query("UPDATE lead SET stage='quoted' WHERE id=$1",[q.lead_id]);await audit(db,staff,'quote',q.id,v.status);return {id:q.id};}
   if(v.action==='revise'){
    const result=await saveQuote(db,v.request,q.lead_id,q.version+1,v.overrides,'draft');await db.query("UPDATE quote SET status='superseded' WHERE id=$1",[q.id]);await audit(db,staff,'quote',result.id,'revised',{previous:q.id});return result;
   }
   if(new Date(q.expires_at)<=new Date())fail('Cotización vencida. Crea una revisión.',409);
   const snap=q.snapshot as Estimate&{request:RentalRequest;rules:Rules};
   if(!snap.complete)fail('Completa transporte, impuestos, buffers y tarifas mediante una revisión antes de confirmar');
   if(v.received<Number(q.deposit_cop)||v.received>Number(q.total_cop))fail('El pago registrado debe cubrir el anticipo y no superar el total');
   const p=period(snap.event,snap.rules);if(p.start<=new Date())fail('El evento ya comenzó');
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['inventory:'+q.equipment_id]);
   const units=(await db.query(`SELECT u.id FROM inventory_unit u WHERE u.equipment_id=$1 AND u.status='ready' AND NOT u.is_fixture AND NOT EXISTS(SELECT 1 FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND a.active AND a.period && tstzrange($2,$3,'[)')) ORDER BY u.asset_tag LIMIT $4 FOR UPDATE OF u`,[q.equipment_id,p.from,p.to,q.quantity])).rows;
   if(units.length!==q.quantity)fail('La disponibilidad cambió; no hay suficientes equipos. No se confirmó la reserva.',409);
   const id=randomUUID();const b=(await db.query(`INSERT INTO booking(id,quote_id,status,confirmed_at,terms_version,terms_accepted_at,accepted_contact,request_key,public_token_hash,token_expires_at,balance_due_at,total_cop,deposit_cop,paid_cop,payment_status,deposit_percentage)
   VALUES($1,$2,'confirmed',now(),$3,now(),$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING number`,[id,q.id,q.policy_version,snap.request.name,'confirm:'+q.id,hash(randomUUID()),p.end,p.from,q.total_cop,q.deposit_cop,v.received,v.received===Number(q.total_cop)?'PAID':v.received?'PARTIALLY_PAID':'UNPAID',snap.depositPercent])).rows[0];
   for(const u of units)await db.query("INSERT INTO unit_allocation(inventory_unit_id,booking_id,kind,period) VALUES($1,$2,'use',tstzrange($3,$4,'[)'))",[u.id,id,p.from,p.to]);
   await assignStaff(db,v.technicianIds,id,p.from,p.to,q.technician_count,snap.technicianUnit??0,snap.event.durationHours);
   if(v.received>0)await db.query("INSERT INTO payment(booking_id,purpose,reference,status,application_status,expected_cop,received_cop,environment,approved_at,method,recorded_by) VALUES($1,'deposit',$2,'approved','applied',$3,$3,'test',now(),'manual',$4)",[id,v.reference,v.received,staff.id]);
   await db.query("UPDATE quote SET status='accepted' WHERE id=$1",[q.id]);await db.query("UPDATE lead SET stage='won' WHERE id=$1",[q.lead_id]);await audit(db,staff,'booking',id,'confirmed',{quote:q.id,reference:v.reference,received:v.received,reviewed:true,depositAccepted:true});return {id,number:b.number};
  }
  if(v.action==='bookingStatus'||v.action==='assign'||v.action==='payment'){
   const b=(await db.query('SELECT b.*,q.snapshot,q.technician_count FROM booking b JOIN quote q ON q.id=b.quote_id WHERE b.id=$1 FOR UPDATE OF b',[v.id])).rows[0];if(!b)fail('Reserva no encontrada',404);
   if(v.action==='bookingStatus'){
    if(b.status==='cancelled'||b.status==='completed')fail('La reserva ya está cerrada',409);
    if(v.status==='in_service'&&b.status!=='confirmed')fail('Transición no válida');if(v.status==='completed'&&b.status!=='in_service')fail('Primero registra el inicio del evento');
    if(v.status==='in_service'&&(await db.query("SELECT 1 FROM unit_allocation a JOIN inventory_unit u ON u.id=a.inventory_unit_id WHERE a.booking_id=$1 AND a.active AND u.status<>'ready'",[b.id])).rowCount)fail('Hay equipos con incidencias o mantenimiento. Resuelve la asignación antes del despacho');
    if(v.status==='in_service'&&Number(b.paid_cop)<Number(b.total_cop))fail('Registra el saldo antes del despacho');
    if(v.status==='cancelled'&&!v.reason)fail('Indica el motivo de cancelación');
    await db.query("UPDATE booking SET status=$2,cancellation_reason=$3,refund_status=CASE WHEN $2='cancelled' AND paid_cop>0 THEN 'pending' ELSE refund_status END WHERE id=$1",[b.id,v.status,v.reason||null]);
    if(v.status==='cancelled'||v.status==='completed'){await db.query('UPDATE unit_allocation SET active=false WHERE booking_id=$1',[b.id]);await db.query('UPDATE technician_allocation SET active=false WHERE booking_id=$1',[b.id]);}
    await audit(db,staff,'booking',b.id,v.status,{reason:v.reason});return {id:b.id};
   }
   if(v.action==='assign'){
    if(b.status!=='confirmed')fail('Solo se reasignan técnicos de reservas confirmadas');
    const snap=b.snapshot as Estimate&{rules:Rules};const p=period(snap.event,snap.rules);await assignStaff(db,v.technicianIds,b.id,p.from,p.to,b.technician_count,snap.technicianUnit??0,snap.event.durationHours);await audit(db,staff,'booking',b.id,'staff_assigned',{technicianIds:v.technicianIds});return {id:b.id};
   }
   const prior=(await db.query('SELECT booking_id FROM payment WHERE reference=$1',[v.reference])).rows[0];if(prior)fail('Referencia de pago ya registrada',409);
   const next=Number(b.paid_cop)+(v.refund?-v.amount:v.amount);if(next<0||next>Number(b.total_cop))fail('El importe supera el saldo disponible');
   if(!v.refund&&b.status==='cancelled')fail('No se reciben pagos de una reserva cancelada');
   await db.query("INSERT INTO payment(booking_id,purpose,reference,status,application_status,expected_cop,received_cop,refunded_cop,environment,approved_at,method,recorded_by) VALUES($1,'balance',$2,'approved',$3,$4,$4,$5,'test',now(),'manual',$6)",[b.id,v.reference,v.refund?'refunded':'applied',v.amount,v.refund?v.amount:0,staff.id]);
   await db.query("UPDATE booking SET paid_cop=$2::bigint,payment_status=$3,refund_status=CASE WHEN $4 THEN CASE WHEN $2::bigint=0 THEN 'completed' ELSE 'partial' END ELSE refund_status END WHERE id=$1",[b.id,next,next===0?(v.refund?'REFUNDED':'UNPAID'):next===Number(b.total_cop)?'PAID':'PARTIALLY_PAID',v.refund]);await audit(db,staff,'booking',b.id,v.refund?'refund_recorded':'payment_recorded',{amount:v.amount,reference:v.reference});return {id:b.id};
  }
  if(v.action==='incident'){
   const asset=(await db.query('SELECT equipment_id FROM inventory_unit WHERE id=$1',[v.assetId])).rows[0];if(!asset)fail('Equipo no encontrado',404);
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['inventory:'+asset.equipment_id]);
   await db.query('SELECT id FROM inventory_unit WHERE id=$1 FOR UPDATE',[v.assetId]);
   if(!(await db.query('SELECT 1 FROM unit_allocation WHERE booking_id=$1 AND inventory_unit_id=$2',[v.bookingId,v.assetId])).rowCount)fail('El equipo no pertenece a esta reserva');
   const id=randomUUID();await db.query('INSERT INTO incident(id,booking_id,asset_id,type,description,estimated_cost) VALUES($1,$2,$3,$4,$5,$6)',[id,v.bookingId,v.assetId,v.type,v.description,v.estimatedCost]);
   // Exclude the affected asset from future availability; keep historical allocations.
   await db.query("UPDATE inventory_unit SET status=CASE WHEN $2 IN ('LOSS','THEFT') THEN 'quarantine' ELSE 'maintenance' END WHERE id=$1",[v.assetId,v.type]);await audit(db,staff,'incident',id,'created',v);return {id};
  }
  if(v.action==='resolveIncident'){await db.query("UPDATE incident SET status='RESOLVED',final_cost=$2 WHERE id=$1",[v.id,v.finalCost]);await audit(db,staff,'incident',v.id,'resolved',{finalCost:v.finalCost});return {id:v.id};}
  await db.query('UPDATE internal_notification SET read_at=now() WHERE read_at IS NULL');return {ok:true};
 });}catch(e){if(e&&typeof e==='object'&&'code' in e){if(e.code==='23P01')fail('Conflicto de disponibilidad. Recarga e intenta otra asignación.',409);if(e.code==='23505')fail('El código, serial o referencia ya existe.',409);}throw e;}
}
export async function operationsData(){
 const db=pool();const config=await getConfig(db);
 const [products,assets,technicians,quotes,bookings,incidents,notifications,zones]=await Promise.all([
 db.query('SELECT e.id,e.code,e.name,p.version image_version FROM equipment e LEFT JOIN equipment_photo p ON p.equipment_id=e.id ORDER BY e.code'),
 db.query(`SELECT u.*,e.code equipment,CASE WHEN u.status<>'ready' THEN u.status WHEN EXISTS(SELECT 1 FROM unit_allocation a JOIN booking b ON b.id=a.booking_id WHERE a.inventory_unit_id=u.id AND a.active AND b.status='in_service') THEN 'in_use' WHEN EXISTS(SELECT 1 FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND a.active AND upper(a.period)>now()) THEN 'reserved' ELSE 'ready' END display_status,(SELECT max(upper(a.period)) FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND upper(a.period)<=now()) last_event,(SELECT min(lower(a.period)) FROM unit_allocation a WHERE a.inventory_unit_id=u.id AND a.active AND upper(a.period)>now()) next_event FROM inventory_unit u JOIN equipment e ON e.id=u.equipment_id WHERE NOT u.is_fixture ORDER BY u.asset_tag`),
 db.query('SELECT * FROM technician WHERE NOT is_fixture ORDER BY name'),
 db.query(`SELECT q.*,COALESCE(q.snapshot->>'equipmentName',e.name) equipment_name FROM quote q JOIN equipment e ON e.id=q.equipment_id ORDER BY q.created_at DESC LIMIT 200`),
 db.query(`SELECT b.*,q.event_start,q.event_end,q.quantity,q.city,q.snapshot,q.technician_count,COALESCE(q.snapshot->>'equipmentName',e.name) equipment_name,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',u.id,'code',u.asset_tag)) FROM unit_allocation a JOIN inventory_unit u ON u.id=a.inventory_unit_id WHERE a.booking_id=b.id),'[]') assets,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name)) FROM technician_allocation a JOIN technician t ON t.id=a.technician_id WHERE a.booking_id=b.id AND a.active),'[]') technicians FROM booking b JOIN quote q ON q.id=b.quote_id JOIN equipment e ON e.id=q.equipment_id ORDER BY q.event_start DESC LIMIT 200`),
 db.query('SELECT * FROM incident ORDER BY created_at DESC LIMIT 200'),db.query('SELECT * FROM internal_notification ORDER BY created_at DESC LIMIT 100'),db.query('SELECT * FROM transport_zone ORDER BY name')]);
 const emails=await db.query("SELECT n.id,n.quote_id,n.status,n.attempts,n.sent_at,n.last_error,q.number FROM notification_outbox n JOIN quote q ON q.id=n.quote_id WHERE n.channel='email' ORDER BY n.created_at DESC LIMIT 100");
 return {emailConfigured:emailConfigured(),emails:emails.rows,config,products:products.rows,assets:assets.rows,technicians:technicians.rows,quotes:quotes.rows,bookings:bookings.rows,incidents:incidents.rows,notifications:notifications.rows,zones:zones.rows};
}
