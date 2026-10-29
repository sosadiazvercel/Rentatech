import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type pg from 'pg';
import {pool,transaction} from './db';
import {HttpError} from './http';
import type {Staff} from './auth';
import {getConfig} from './rental';
import {rulesSchema,type Rules} from '@/lib/rental';
import {productSchema,type AdminProduct} from '@/lib/catalog';

export async function adminProducts(){
 const config=await getConfig();
 const result=await pool().query(`SELECT e.*,p.version image_version,(SELECT count(*)::int FROM inventory_unit u WHERE u.equipment_id=e.id AND NOT u.is_fixture) inventory FROM equipment e LEFT JOIN equipment_photo p ON p.equipment_id=e.id ORDER BY e.sort_order,e.name`);
 return {pricingId:config.id,products:result.rows.map(e=>({id:e.id,code:e.code,name:e.name,slug:e.slug,brand:e.brand,description:e.description,summary:e.summary,categories:e.categories,specifications:e.specifications,published:e.published,active:e.active,featured:e.featured,sortOrder:e.sort_order,updatedAt:e.updated_at.toISOString(),image_version:e.image_version,inventory:e.inventory,tiers:config.rules.tiers.filter(t=>t.product===e.code).map(({min,max,unit})=>({min,max,unit}))} satisfies AdminProduct))};
}
function admin(staff:Staff){if(staff.role!=='admin')throw new HttpError(403,'FORBIDDEN','Solo un administrador puede cambiar productos.');}
async function writePricing(db:Pick<pg.PoolClient,'query'>,previousId:string,rules:Rules,staff:Staff){
 const valid=rulesSchema.safeParse(rules);if(!valid.success)throw new HttpError(422,'PRICING_INVALID',valid.error.issues.map(i=>i.message).join(' '));
 const id=randomUUID(),body=JSON.stringify(valid.data);
 await db.query("INSERT INTO pricing_version(id,version,mode,rules,rules_hash,active,approved_by,approved_at) VALUES($1,$2,'sandbox',$3,$4,true,$5,now())",[id,'CAT-'+id,body,createHash('sha256').update(body).digest('hex'),staff.id]);
 await db.query('UPDATE pricing_version SET active=false WHERE id=$1',[previousId]);
 await db.query('UPDATE rental_settings SET pricing_version_id=$1 WHERE id=true',[id]);
}
export async function saveProduct(raw:unknown,staff:Staff){
 admin(staff);const parsed=productSchema.safeParse(raw);
 if(!parsed.success)throw new HttpError(422,'PRODUCT_INVALID',parsed.error.issues.map(i=>i.message).join(' '));
 const v=parsed.data;
 try{return await transaction(async db=>{
  await db.query('SELECT id FROM rental_settings WHERE id=true FOR UPDATE');const config=await getConfig(db);
  if(config.id!==v.expectedPricingId)throw new HttpError(409,'PRICING_CHANGED','Las tarifas cambiaron. Recarga antes de guardar.');
  const old=v.id?(await db.query('SELECT * FROM equipment WHERE id=$1 FOR UPDATE',[v.id])).rows[0]:null;
  if(v.id&&!old)throw new HttpError(404,'PRODUCT_NOT_FOUND','Producto no encontrado.');
  if(old&&(old.updated_at.toISOString()!==v.expectedUpdatedAt))throw new HttpError(409,'PRODUCT_CHANGED','Otra persona modificó el producto. Recarga antes de guardar.');
  if(old&&old.code!==v.code)throw new HttpError(422,'CODE_IMMUTABLE','El código de un producto existente no puede cambiar.');
  const id=v.id??randomUUID();
  const values=[id,v.code,v.name,v.slug,v.brand,v.description,v.summary,v.categories,JSON.stringify(v.specifications),v.published,v.active,v.featured,v.sortOrder];
  await db.query(`INSERT INTO equipment(id,code,name,slug,brand,description,summary,categories,specifications,published,active,featured,sort_order)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
   ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,brand=EXCLUDED.brand,description=EXCLUDED.description,summary=EXCLUDED.summary,categories=EXCLUDED.categories,specifications=EXCLUDED.specifications,published=EXCLUDED.published,active=EXCLUDED.active,featured=EXCLUDED.featured,sort_order=EXCLUDED.sort_order`,values);
  const previous=config.rules.tiers.filter(t=>t.product===v.code).map(({min,max,unit})=>({min,max,unit}));
  if(JSON.stringify(previous)!==JSON.stringify(v.tiers)){
   const rules={...config.rules,tiers:[...config.rules.tiers.filter(t=>t.product!==v.code),...v.tiers.map(t=>({...t,product:v.code}))]};
   await writePricing(db,config.id,rules,staff);
  }
  await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,after) VALUES('staff',$1,'equipment',$2,$3,$4)",[staff.id,id,old?'product_updated':'product_created',JSON.stringify(v)]);
  return {id,code:v.code};
 });}catch(e){if(e&&typeof e==='object'&&'code'in e&&e.code==='23505')throw new HttpError(409,'PRODUCT_EXISTS','Ya existe un producto con ese código o URL.');throw e;}
}

export async function deleteProduct(id:string,staff:Staff){
 admin(staff);
 try{await transaction(async db=>{
  await db.query('SELECT id FROM rental_settings WHERE id=true FOR UPDATE');const config=await getConfig(db);
  const product=(await db.query('SELECT id,code FROM equipment WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!product)throw new HttpError(404,'PRODUCT_NOT_FOUND','Producto no encontrado.');
  await db.query('DELETE FROM equipment WHERE id=$1',[id]);
  if(config.rules.tiers.some(t=>t.product===product.code))await writePricing(db,config.id,{...config.rules,tiers:config.rules.tiers.filter(t=>t.product!==product.code)},staff);
  await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,after) VALUES('staff',$1,'equipment',$2,'product_deleted',$3)",[staff.id,id,JSON.stringify({code:product.code})]);
 });}catch(e){if(e&&typeof e==='object'&&'code'in e&&e.code==='23503')throw new HttpError(409,'PRODUCT_IN_USE','El producto tiene inventario o historial comercial. Archívalo para conservar sus reservas y registros.');throw e;}
}
