import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/server/auth';
import {pool,transaction} from '@/server/db';
import {errorResponse,HttpError,sameOrigin} from '@/server/http';

type Context={params:Promise<{code:string}>};
export async function GET(req:Request,{params}:Context){
 try{
  const {code}=await params;
  const version=new URL(req.url).searchParams.get('v');
  const row=(await pool().query('SELECT p.data,p.version FROM equipment_photo p JOIN equipment e ON e.id=p.equipment_id WHERE e.code=$1',[code])).rows[0];
  if(!row||(version&&version!==row.version))return new Response(null,{status:404,headers:{'Cache-Control':'no-store'}});
  return new Response(new Uint8Array(row.data),{headers:{'Content-Type':'image/webp','Cache-Control':version?'public, max-age=31536000, immutable':'no-store','ETag':`"${row.version}"`}});
 }catch(e){return errorResponse(e);}
}

export async function POST(req:Request,{params}:Context){
 try{
  sameOrigin(req);const staff=await requireStaff('admin');const {code}=await params;
  if(!['image/jpeg','image/png','image/webp'].includes(req.headers.get('content-type')??''))throw new HttpError(415,'IMAGE_TYPE','Usa una imagen JPG, PNG o WebP.');
  const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'IMAGE_REQUIRED','Selecciona una foto.');
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5*1024*1024){await reader.cancel();throw new HttpError(413,'IMAGE_SIZE','La foto debe pesar menos de 5 MB.');}chunks.push(value);}
  let data:Buffer;
  try{data=await sharp(Buffer.concat(chunks),{limitInputPixels:24000000}).rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}
  catch{throw new HttpError(422,'INVALID_IMAGE','No pudimos leer la imagen. Usa JPG, PNG o WebP.');}
  if(data.length>2*1024*1024)throw new HttpError(413,'IMAGE_SIZE','La imagen procesada es demasiado grande.');
  const version=createHash('sha256').update(data).digest('hex');
  await transaction(async db=>{
   const product=(await db.query('SELECT id FROM equipment WHERE code=$1',[code])).rows[0];
   if(!product)throw new HttpError(404,'PRODUCT_NOT_FOUND','Producto no encontrado.');
   await db.query('INSERT INTO equipment_photo(equipment_id,data,version) VALUES($1,$2,$3) ON CONFLICT(equipment_id) DO UPDATE SET data=EXCLUDED.data,version=EXCLUDED.version,updated_at=now()',[product.id,data,version]);
   await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,after) VALUES('staff',$1,'equipment',$2,'photo_updated',$3)",[staff.id,product.id,JSON.stringify({version})]);
  });
  revalidatePath('/','layout');
  return Response.json({image:`/api/v1/products/${encodeURIComponent(code)}/image?v=${version}`},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return errorResponse(e);}
}

export async function DELETE(req:Request,{params}:Context){
 try{
  sameOrigin(req);const staff=await requireStaff('admin');const {code}=await params;
  await transaction(async db=>{
   const product=(await db.query('SELECT id FROM equipment WHERE code=$1',[code])).rows[0];
   if(!product)throw new HttpError(404,'PRODUCT_NOT_FOUND','Producto no encontrado.');
   await db.query('DELETE FROM equipment_photo WHERE equipment_id=$1',[product.id]);
   await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,after) VALUES('staff',$1,'equipment',$2,'photo_removed','{}')",[staff.id,product.id]);
  });
  revalidatePath('/','layout');return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
