import 'dotenv/config';
import {afterAll,afterEach,beforeAll,it,expect,vi} from 'vitest';
import pg from 'pg';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {migrate} from '../../scripts/migrate';
import {seed} from '../../scripts/seed';
import {pool} from '@/server/db';
import {createQuote,estimate,mutate} from '@/server/rental';
import {adminProducts,saveProduct,deleteProduct} from '@/server/products';
import {sendQuoteEmail} from '@/server/email';
import {getPublicProducts} from '@/server/public-products';
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
async function quote(){return createQuote({equipment:'QUEST3',quantity:3,days:1,date:'2035-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready',name:'Test',company:'QA',email:'qa@example.test',phone:'+573001234567',nit:'',notes:'',privacy:true},randomUUID());}
function configure(){vi.stubEnv('RESEND_API_KEY','test-only');vi.stubEnv('EMAIL_FROM','RENTATECH <test@example.test>');vi.stubEnv('EMAIL_NOTIFICATION_TO','staff@example.test');}
it('records missing email configuration without attempting an external send',async()=>{
 vi.stubEnv('RESEND_API_KEY','');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 const q=await quote();await sendQuoteEmail(q.id);
 expect(fetcher).not.toHaveBeenCalled();expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('not_configured');
});
it('serializes concurrent sends, uses a stable provider key and never resends accepted emails',async()=>{
 configure();const fetcher=vi.fn(async()=>Response.json({id:'provider-test-id'}));vi.stubGlobal('fetch',fetcher);
 const q=await quote();await Promise.all([sendQuoteEmail(q.id),sendQuoteEmail(q.id)]);await sendQuoteEmail(q.id);
 expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0]).toBeDefined();
 const row=(await db.query('SELECT * FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0];expect(row.status).toBe('sent');expect(row.provider_id).toBe('provider-test-id');
 const options=(fetcher.mock.calls as unknown as [string,RequestInit][])[0][1];expect((options.headers as Record<string,string>)['Idempotency-Key']).toBe(`quote/${row.id}`);
 expect(JSON.parse(options.body as string).to).toEqual(['qa@example.test']);
});
it('records provider errors and uncertain responses, and blocks retries past the safe provider window',async()=>{
 configure();const fetcher=vi.fn(async()=>Response.json({message:'rejected'},{status:422}));vi.stubGlobal('fetch',fetcher);
 const q=await quote();await sendQuoteEmail(q.id);expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('failed');
 fetcher.mockRejectedValueOnce(new Error('timeout'));await sendQuoteEmail(q.id);
 expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('uncertain');
 await db.query("UPDATE notification_outbox SET attempted_at=now()-interval '25 hours' WHERE quote_id=$1",[q.id]);await sendQuoteEmail(q.id);
 expect(fetcher).toHaveBeenCalledTimes(2);expect((await db.query('SELECT status FROM notification_outbox WHERE quote_id=$1',[q.id])).rows[0].status).toBe('review_required');
});

const staff={id:'00000000-0000-4000-8000-000000000011',auth_user_id:'00000000-0000-4000-8000-000000000001',role:'admin' as const};
function payload(p:AdminProduct,pricingId:string){return {id:p.id,expectedUpdatedAt:p.updatedAt,expectedPricingId:pricingId,code:p.code,name:p.name,slug:p.slug,brand:p.brand,description:p.description,summary:p.summary,categories:p.categories,specifications:p.specifications,published:p.published,active:p.active,featured:p.featured,sortOrder:p.sortOrder,tiers:p.tiers};}
async function newProduct(code:string){return saveProduct({expectedPricingId:(await adminProducts()).pricingId,code,name:'Equipo de prueba '+code,slug:code.toLowerCase(),brand:'Marca de prueba',description:'Descripción editable',summary:'Resumen editable',categories:['Categoría de prueba'],specifications:[['Resolución','4K']],published:true,active:true,featured:true,sortOrder:30,tiers:[{min:3,max:15,unit:123000}]},staff);}

it('creates arbitrary products with editable content and prices; real units enable their quotations',async()=>{
 const created=await newProduct('CATALOGQA');
 let data=await adminProducts();let product=data.products.find(p=>p.id===created.id)!;
 expect((await getPublicProducts()).find(p=>p.code==='CATALOGQA')).toMatchObject({title:'Equipo de prueba CATALOGQA',brand:'Marca de prueba',text:'Descripción editable',specs:[['Resolución','4K']],categories:['Categoría de prueba'],price:expect.stringContaining('123.000')});
 const event={equipment:'CATALOGQA',quantity:3,days:1,date:'2037-10-15',start:'10:00',durationHours:8,city:'Bogota',address:'QA',contentStatus:'ready'};
 expect((await estimate(event)).available).toBe(0);
 for(let i=0;i<3;i++)await mutate({action:'asset',equipment:'CATALOGQA',code:'CATALOGQA-'+i,serial:'',status:'ready',condition:'QA',notes:'Inventario de prueba'},staff);
 expect(await estimate(event)).toMatchObject({available:3,hardware:369000});
 const request={...event,name:'QA catálogo',company:'QA',email:'catalog@example.test',phone:'+573001234567',notes:'',nit:'',privacy:true};
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
