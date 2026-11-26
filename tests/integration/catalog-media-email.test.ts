import 'dotenv/config';
import {afterAll,afterEach,beforeAll,it,expect,vi} from 'vitest';
import pg from 'pg';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {migrate} from '../../scripts/migrate';
import {seed} from '../../scripts/seed';
import {pool} from '@/server/db';
import {createQuote,estimate,mutate,operationsData} from '@/server/rental';
import {adminProducts,saveProduct,deleteProduct} from '@/server/products';
import {sendQuoteEmail} from '@/server/email';
import {sendLeadEmails} from '@/server/email';
import {updateLead} from '@/server/leads';
import {getPublicProducts} from '@/server/public-products';
import {rentalContextSchema} from '@/lib/lead-schema';
import {listCalendarEvents,deleteCalendarEvent} from '@/server/manual-calendar';
import {GET,POST} from '@/app/api/v1/products/[code]/image/route';
import type {AdminProduct} from '@/lib/catalog';

const auth=vi.hoisted(()=>({allowed:true}));
vi.mock('@/server/auth',()=>({requireStaff:async()=>{if(!auth.allowed)throw new Error('Unauthorized');return {id:'00000000-0000-4000-8000-000000000011',role:'admin'};}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
let db:pg.Client;
beforeAll(async()=>{
 const url=new URL(process.env.DATABASE_URL!);
 if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local test database only');
 url.pathname='/rentatech_media_test';const adminUrl=new URL(url);adminUrl.pathname='/postgres';
 const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();
 if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='rentatech_media_test'")).rowCount)await admin.query('CREATE DATABASE rentatech_media_test');await admin.end();
 process.env.DATABASE_URL=url.toString();process.env.APP_ENV='development';process.env.APP_BASE_URL='http://127.0.0.1:3000';
 db=new pg.Client({connectionString:url.toString()});await db.connect();await db.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
 await migrate(url.toString(),true);await seed(url.toString());
});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();auth.allowed=true;});
afterAll(async()=>{await db?.end();await pool().end();});
const context={params:Promise.resolve({code:'QUEST3'})};
const upload=(body:Uint8Array,type='image/png')=>new Request('http://127.0.0.1:3000/api/v1/products/QUEST3/image',{method:'POST',headers:{Origin:'http://127.0.0.1:3000','Content-Type':type},body:new Uint8Array(body)});

it('rejects unsupported, corrupt, oversized and unauthorized uploads without changing the catalog',async()=>{
 expect((await POST(upload(new Uint8Array([1]),'image/svg+xml'),context)).status).toBe(415);
 expect((await POST(upload(new Uint8Array([1,2,3])),context)).status).toBe(422);
 expect((await POST(upload(new Uint8Array(5*1024*1024+1)),context)).status).toBe(413);
 auth.allowed=false;expect((await POST(upload(new Uint8Array([1])),context)).ok).toBe(false);
 expect((await db.query('SELECT * FROM equipment_photo')).rowCount).toBe(0);
});
it('normalizes photos, persists them, changes cache URLs and exposes the new photo through the catalog',async()=>{
 const photo=await sharp({create:{width:40,height:30,channels:4,background:'#ff000080'}}).png().toBuffer();
 const saved=await POST(upload(photo),context);expect(saved.status).toBe(200);const first=await saved.json();
 expect((await getPublicProducts()).find(p=>p.code==='QUEST3')?.image).toBe(first.image);
 const response=await GET(new Request(`http://127.0.0.1:3000${first.image}`),context);
 expect(response.headers.get('cache-control')).toContain('immutable');
 const meta=await sharp(Buffer.from(await response.arrayBuffer())).metadata();expect(meta.format).toBe('webp');expect(meta.hasAlpha).toBe(true);
 const secondPhoto=await sharp({create:{width:40,height:30,channels:4,background:'#0000ff80'}}).png().toBuffer();
 const second=await (await POST(upload(secondPhoto),context)).json();expect(second.image).not.toBe(first.image);
 expect((await GET(new Request(`http://127.0.0.1:3000${first.image}`),context)).status).toBe(404);
 expect((await GET(new Request(`http://127.0.0.1:3000${second.image}`),context)).status).toBe(200);
});
it('denies direct access to photo storage for anonymous and authenticated database roles',async()=>{
 for(const role of ['anon','authenticated']){await db.query(`SET ROLE ${role}`);await expect(db.query('SELECT * FROM equipment_photo')).rejects.toThrow();await db.query('RESET ROLE');}
});
async function quote(){return createQuote({equipment:'QUEST3',quantity:3,days:1,date:'2035-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready',name:'Test',company:'QA',email:'qa@example.test',phone:'+573001234567',nit:'900123456',notes:'',privacy:true},randomUUID());}
function configure(){vi.stubEnv('RESEND_API_KEY','test-only');vi.stubEnv('EMAIL_FROM','RENTATECH <test@example.test>');vi.stubEnv('EMAIL_NOTIFICATION_TO','staff@example.test');}
it('records missing email configuration without attempting an external send',async()=>{
 vi.stubEnv('RESEND_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const q=await quote();await sendQuoteEmail(q.id);
 expect(fetcher).not.toHaveBeenCalled();expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('not_configured');
});
it('serializes concurrent sends, uses a stable provider key and never resends accepted emails',async()=>{
 configure();const fetcher=vi.fn(async()=>Response.json({id:'provider-test-id'}));vi.stubGlobal('fetch',fetcher);
 const q=await quote();await Promise.all([sendQuoteEmail(q.id),sendQuoteEmail(q.id)]);await sendQuoteEmail(q.id);
 expect(fetcher).toHaveBeenCalledTimes(2);expect(fetcher.mock.calls[0]).toBeDefined();
 const row=(await db.query('SELECT * FROM notification_outbox WHERE quote_id=$1 ORDER BY id',[q.id])).rows[0];expect(row.status).toBe('sent');expect(row.provider_id).toBe('provider-test-id');
 const options=(fetcher.mock.calls as unknown as [string,RequestInit][])[0][1];expect((options.headers as Record<string,string>)['Idempotency-Key']).toBe(`quote/${row.id}`);
 const payloads=(fetcher.mock.calls as unknown as [string,RequestInit][]).map(call=>JSON.parse(call[1].body as string));expect(payloads.map(p=>p.to[0]).sort()).toEqual(['qa@example.test','staff@example.test']);expect(payloads[0].subject).not.toBe(payloads[1].subject);
});
it('records provider errors and uncertain responses, and blocks retries past the safe provider window',async()=>{
 configure();const fetcher=vi.fn(async()=>Response.json({message:'rejected'},{status:422}));vi.stubGlobal('fetch',fetcher);
 const q=await quote();await sendQuoteEmail(q.id);expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('failed');
 fetcher.mockRejectedValue(new Error('timeout'));await sendQuoteEmail(q.id);
 expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('uncertain');
 await db.query("UPDATE notification_outbox SET attempted_at=now()-interval '25 hours' WHERE quote_id=$1",[q.id]);await sendQuoteEmail(q.id);
 expect(fetcher).toHaveBeenCalledTimes(4);expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('review_required');
});

const staff={id:'00000000-0000-4000-8000-000000000011',auth_user_id:'00000000-0000-4000-8000-000000000001',role:'admin' as const};
function payload(p:AdminProduct,pricingId:string){return {id:p.id,expectedUpdatedAt:p.updatedAt,expectedPricingId:pricingId,code:p.code,name:p.name,slug:p.slug,brand:p.brand,description:p.description,summary:p.summary,categories:p.categories,specifications:p.specifications,published:p.published,active:p.active,featured:p.featured,sortOrder:p.sortOrder,tiers:p.tiers};}
async function newProduct(code:string){return saveProduct({expectedPricingId:(await adminProducts()).pricingId,code,name:'Equipo de prueba '+code,slug:code.toLowerCase(),brand:'Marca de prueba',description:'Descripción editable',summary:'Resumen editable',categories:['Categoría de prueba'],specifications:[['Resolución','4K']],published:true,active:true,featured:true,sortOrder:30,tiers:[{min:1,max:15,unit:123000}]},staff);}

it('creates arbitrary products with editable content and prices; real units enable their quotations',async()=>{
 const created=await newProduct('CATALOGQA');
 let data=await adminProducts();let product=data.products.find(p=>p.id===created.id)!;
 expect((await getPublicProducts()).find(p=>p.code==='CATALOGQA')).toMatchObject({title:'Equipo de prueba CATALOGQA',brand:'Marca de prueba',text:'Descripción editable',specs:[['Resolución','4K']],categories:['Categoría de prueba'],price:expect.stringContaining('123.000')});
 expect((await estimate({equipment:'CATALOGQA',quantity:1,days:1,date:'2037-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready'})).hardware).toBe(123000);
 const event={equipment:'CATALOGQA',quantity:3,days:1,date:'2037-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready'};
 expect((await estimate(event)).available).toBe(0);
 for(let i=0;i<3;i++)await mutate({action:'asset',equipment:'CATALOGQA',code:'CATALOGQA-'+i,serial:'',status:'ready',condition:'QA',notes:'Inventario de prueba'},staff);
 expect(await estimate(event)).toMatchObject({available:3,hardware:369000});
 const request={...event,name:'QA catálogo',company:'QA',email:'catalog@example.test',phone:'+573001234567',notes:'',nit:'900123456',privacy:true};
 const before=await createQuote(request,randomUUID());
 await saveProduct({...payload(product,data.pricingId),name:'Producto actualizado',description:'Descripción nueva',specifications:[['Memoria','1 TB'],['Conectividad','Wi-Fi']],categories:['Nueva categoría'],tiers:[{min:3,max:15,unit:150000}]},staff);
 const publicProduct=(await getPublicProducts()).find(p=>p.code==='CATALOGQA')!;
 expect(publicProduct).toMatchObject({title:'Producto actualizado',slug:'catalogqa',specs:[['Memoria','1 TB'],['Conectividad','Wi-Fi']],categories:['Nueva categoría']});
 expect((await estimate(event)).hardware).toBe(450000);
 expect((await db.query('SELECT snapshot FROM quote WHERE id=$1',[before.id])).rows[0].snapshot.hardware).toBe(369000);
 data=await adminProducts();product=data.products.find(p=>p.id===created.id)!;
 await saveProduct({...payload(product,data.pricingId),active:false},staff);
 expect((await getPublicProducts()).some(p=>p.code==='CATALOGQA')).toBe(false);
 expect((await adminProducts()).products.some(p=>p.code==='CATALOGQA')).toBe(true);
 await expect(estimate(event)).rejects.toMatchObject({status:422});
 await expect(deleteProduct(created.id,staff)).rejects.toMatchObject({status:409,code:'PRODUCT_IN_USE'});
});

it('protects product roles, stale edits, duplicate URLs and complete price cleanup on deletion',async()=>{
 const created=await newProduct('DELETEQA');
 const data=await adminProducts(),product=data.products.find(p=>p.id===created.id)!;
 await expect(saveProduct(payload(product,data.pricingId),{...staff,role:'operator'})).rejects.toMatchObject({status:403});
 await expect(saveProduct({...payload(product,data.pricingId),slug:'meta-quest-3'},staff)).rejects.toMatchObject({status:409});
 await saveProduct({...payload(product,data.pricingId),published:false,name:'Borrador de prueba'},staff);
 expect((await getPublicProducts()).some(p=>p.code==='DELETEQA')).toBe(false);
 await expect(saveProduct(payload(product,data.pricingId),staff)).rejects.toMatchObject({status:409});
 await deleteProduct(created.id,staff);
 const after=await adminProducts();expect(after.products.some(p=>p.id===created.id)).toBe(false);
 expect((await db.query('SELECT rules FROM pricing_version WHERE id=$1',[after.pricingId])).rows[0].rules.tiers.some((t:{product:string})=>t.product==='DELETEQA')).toBe(false);
});

it('follows all rental stages, stores private PDFs, reserves units and sends each action only once',async()=>{
 configure();const fetcher=vi.fn(async()=>Response.json({id:randomUUID()}));vi.stubGlobal('fetch',fetcher);
 const q=await quote(),leadId=(await db.query('SELECT lead_id FROM quote WHERE id=$1',[q.id])).rows[0].lead_id;
 const pdf=Buffer.from('%PDF-1.4\nQuotation test\n%%EOF').toString('base64');
 let version=0;
 const save=async(stage:string,patch:Record<string,unknown>={})=>{const result=await updateLead(leadId,{stage,expectedVersion:version,ownerId:null,estimatedValue:1570000,note:'',...patch},staff);version=result.version;return result;};
 await expect(save('quoted')).rejects.toMatchObject({code:'ATTACHMENT_REQUIRED'});
 await expect(save('completed')).rejects.toMatchObject({code:'CONFIRM_FIRST'});
 await save('quoted',{attachment:{filename:'cotizacion.pdf',content:pdf}});
 const attached=(await db.query('SELECT * FROM lead_attachment WHERE lead_id=$1',[leadId])).rows[0];expect(attached.data.toString('base64')).toBe(pdf);
 for(const role of ['anon','authenticated']){await db.query(`SET ROLE ${role}`);await expect(db.query('SELECT * FROM lead_attachment')).rejects.toThrow();await db.query('RESET ROLE');}
 await Promise.all([sendLeadEmails(leadId),sendLeadEmails(leadId)]);expect(fetcher).toHaveBeenCalledTimes(1);
 let mail=JSON.parse((fetcher.mock.calls as unknown as [string,RequestInit][])[0][1].body as string);expect(mail.attachments[0].content).toBe(pdf);expect(mail.text).toContain('confirmar si la aceptas');expect(mail.html).toContain('Tu propuesta está lista.');
 expect((await save('quoted',{note:'Solo una nota',attachment:{filename:'cotizacion.pdf',content:pdf}})).notificationQueued).toBe(false);
 await sendLeadEmails(leadId);expect(fetcher).toHaveBeenCalledTimes(1);
 await expect(updateLead(leadId,{stage:'lost',expectedVersion:0,ownerId:null,estimatedValue:null,note:''},staff)).rejects.toMatchObject({code:'STALE_UPDATE'});
 await expect(save('awaiting_payment')).rejects.toMatchObject({code:'PAYMENT_LINK_REQUIRED'});
 await save('awaiting_payment',{paymentUrl:'https://example.test/pagar'});await sendLeadEmails(leadId);
 await expect(save('awaiting_payment',{estimatedValue:1,paymentUrl:'https://example.test/pagar'})).rejects.toMatchObject({code:'VALUE_LOCKED'});
 mail=JSON.parse((fetcher.mock.calls as unknown as [string,RequestInit][])[1][1].body as string);expect(mail.text).toContain('https://example.test/pagar');expect(mail.html).toContain('Ir al pago seguro');expect(mail.attachments).toHaveLength(1);
 await expect(save('confirmed')).rejects.toMatchObject({code:'PAYMENT_REQUIRED'});
 await expect(save('confirmed',{paymentConfirmed:true,paymentReference:'COMPROBANTE-QA'})).rejects.toMatchObject({code:'TECHNICIAN_REQUIRED'});
 const technician=await mutate({action:'technician',name:'Técnico seguimiento QA',phone:'',email:'',active:true,cost4:null,cost8:null,notes:''},staff);
 await save('confirmed',{paymentConfirmed:true,paymentReference:'COMPROBANTE-QA',technicianIds:[technician.id]});await sendLeadEmails(leadId);
 const booking=(await operationsData()).bookings.find(b=>b.snapshot.request.email==='qa@example.test'&&b.status==='confirmed');
 expect(booking).toBeDefined();expect(booking.technicians).toEqual([{id:technician.id,name:'Técnico seguimiento QA'}]);
 expect(booking).toMatchObject({payment_status:'PAID',paid_cop:'1570000',balance_due_cop:'0'});
 expect((await db.query('SELECT received_cop,reference FROM payment WHERE booking_id=$1',[booking.id])).rows).toEqual([{received_cop:'1570000',reference:'COMPROBANTE-QA'}]);
 const context=rentalContextSchema.parse(Object.fromEntries(Object.keys(rentalContextSchema.shape).map(key=>[key,booking.snapshot.request[key]])));
 await save('confirmed',{request:{...context,address:'Nueva dirección QA',nit:'900999888',notes:'Contexto actualizado'},paymentReference:'COMPROBANTE-QA'});
 expect((await operationsData()).bookings.find(b=>b.id===booking.id).snapshot.request).toMatchObject({address:'Nueva dirección QA',nit:'900999888'});
 expect((await listCalendarEvents('2035-01-01T00:00:00Z','2099-01-01T00:00:00Z')).find(item=>item.id===booking.id)?.location).toContain('Nueva dirección QA');
 await expect(save('confirmed',{request:{...context,date:'2037-12-01'},paymentReference:'COMPROBANTE-QA'})).rejects.toMatchObject({code:'CONFIRMED_EVENT_LOCKED'});
 await expect(save('confirmed',{estimatedValue:1,paymentReference:'COMPROBANTE-QA'})).rejects.toMatchObject({code:'VALUE_LOCKED'});
 expect((await db.query('SELECT count(*)::int n FROM unit_allocation WHERE lead_id=$1 AND active',[leadId])).rows[0].n).toBe(3);
 await save('confirmed',{note:'Pago revisado',paymentReference:'COMPROBANTE-QA'});await sendLeadEmails(leadId);expect(fetcher).toHaveBeenCalledTimes(3);
 await save('completed');await sendLeadEmails(leadId);expect(fetcher).toHaveBeenCalledTimes(4);
 await expect(save('completed',{note:'Intento de editar cierre'})).rejects.toMatchObject({code:'RENTAL_CLOSED'});
 expect((await db.query('SELECT active FROM technician_allocation WHERE booking_id=$1',[booking.id])).rows.every(a=>!a.active)).toBe(true);
 expect((await db.query('SELECT count(*)::int n FROM unit_allocation WHERE lead_id=$1 AND active',[leadId])).rows[0].n).toBe(0);
 expect((await db.query('SELECT count(*)::int n FROM notification_outbox WHERE lead_id=$1',[leadId])).rows[0].n).toBe(4);
});

it('marks a request lost without sending email, and rejects invalid PDF uploads atomically',async()=>{
 const q=await quote(),leadId=(await db.query('SELECT lead_id FROM quote WHERE id=$1',[q.id])).rows[0].lead_id;
 const base={expectedVersion:0,ownerId:null,estimatedValue:null,note:''};
 await expect(updateLead(leadId,{...base,stage:'quoted',attachment:{filename:'bad.pdf',content:Buffer.from('not a PDF').toString('base64')}},staff)).rejects.toMatchObject({code:'INVALID_ATTACHMENT'});
 await updateLead(leadId,{...base,stage:'lost'},staff);
 expect((await db.query('SELECT stage FROM lead WHERE id=$1',[leadId])).rows[0].stage).toBe('lost');
 expect((await db.query('SELECT 1 FROM notification_outbox WHERE lead_id=$1',[leadId])).rowCount).toBe(0);
});

it('rejects a busy technician without creating a partial reservation',async()=>{
 const technician=await mutate({action:'technician',name:'Técnico único QA',phone:'',email:'',active:true,cost4:null,cost8:null,notes:''},staff);
 const pdf=Buffer.from('%PDF-1.4\nQA\n%%EOF').toString('base64');
 async function prepare(equipment:string){
  const q=await createQuote({equipment,quantity:3,days:1,date:'2038-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready',name:'QA disponibilidad',company:'QA',email:'availability@example.test',phone:'+573001234567',nit:'900123456',notes:'',privacy:true},randomUUID());
  const leadId=(await db.query('SELECT lead_id FROM quote WHERE id=$1',[q.id])).rows[0].lead_id;
  const base={ownerId:null,estimatedValue:1000000,note:''};
  await updateLead(leadId,{...base,expectedVersion:0,stage:'quoted',attachment:{filename:'qa.pdf',content:pdf}},staff);
  await updateLead(leadId,{...base,expectedVersion:1,stage:'awaiting_payment',paymentUrl:'https://example.test/pay'},staff);
  return {leadId,base};
 }
 const first=await prepare('QUEST3'),second=await prepare('QUEST2');
 const confirm={expectedVersion:2,stage:'confirmed',paymentConfirmed:true,paymentReference:'QA',technicianIds:[technician.id]};
 await updateLead(first.leadId,{...first.base,...confirm},staff);
 await expect(updateLead(second.leadId,{...second.base,...confirm,paymentReference:'QA-busy-second'},staff)).rejects.toMatchObject({status:409});
 expect((await db.query('SELECT stage,stage_version FROM lead WHERE id=$1',[second.leadId])).rows[0]).toMatchObject({stage:'awaiting_payment',stage_version:2});
 expect((await db.query('SELECT 1 FROM unit_allocation WHERE lead_id=$1',[second.leadId])).rowCount).toBe(0);
 expect((await db.query('SELECT 1 FROM booking b JOIN quote q ON q.id=b.quote_id WHERE q.lead_id=$1',[second.leadId])).rowCount).toBe(0);
 await updateLead(first.leadId,{...first.base,expectedVersion:3,stage:'completed'},staff);
});

it('adds an older confirmed request to reservations when assigning its technician',async()=>{
 const q=await createQuote({equipment:'QUEST3',quantity:3,days:1,date:'2039-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready',name:'QA anterior',company:'QA',email:'legacy@example.test',phone:'+573001234567',nit:'900123456',notes:'',privacy:true},randomUUID());
 const saved=(await db.query('SELECT * FROM quote WHERE id=$1',[q.id])).rows[0];
 await db.query("UPDATE lead SET stage='confirmed',estimated_value_cop=1000000 WHERE id=$1",[saved.lead_id]);
 const units=(await db.query('SELECT id FROM inventory_unit WHERE equipment_id=$1 AND NOT is_fixture LIMIT 3',[saved.equipment_id])).rows;
 for(const unit of units)await db.query("INSERT INTO unit_allocation(inventory_unit_id,lead_id,kind,period,reason) VALUES($1,$2,'manual',tstzrange($3,$4,'[)'),'QA anterior')",[unit.id,saved.lead_id,saved.event_start,saved.event_end]);
 const technician=await mutate({action:'technician',name:'Técnico alquiler anterior QA',phone:'',email:'',active:true,cost4:null,cost8:null,notes:''},staff);
 await updateLead(saved.lead_id,{stage:'confirmed',expectedVersion:0,estimatedValue:1000000,ownerId:null,note:'',technicianIds:[technician.id]},staff);
 const booking=(await operationsData()).bookings.find(b=>b.quote_id===q.id);
 expect(booking).toBeDefined();expect(booking.assets).toHaveLength(3);expect(booking.technicians).toHaveLength(1);
 expect(booking.payment_status).toBe('UNPAID');
 expect((await db.query('SELECT 1 FROM unit_allocation WHERE lead_id=$1 AND active',[saved.lead_id])).rowCount).toBe(3);
 await deleteCalendarEvent({id:booking.id,source:'booking'},staff);
 expect((await db.query('SELECT stage FROM lead WHERE id=$1',[saved.lead_id])).rows[0].stage).toBe('lost');
 expect((await db.query('SELECT 1 FROM unit_allocation WHERE booking_id=$1 AND active',[booking.id])).rowCount).toBe(0);
 expect((await listCalendarEvents('2039-01-01T00:00:00Z','2040-01-01T00:00:00Z')).some(item=>item.id===booking.id)).toBe(false);
});
