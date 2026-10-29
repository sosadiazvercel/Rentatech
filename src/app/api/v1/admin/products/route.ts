import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/server/auth';
import {adminProducts,deleteProduct,saveProduct} from '@/server/products';
import {errorResponse,HttpError,jsonBody,sameOrigin} from '@/server/http';

export async function GET(){try{await requireStaff();return Response.json(await adminProducts(),{headers:{'Cache-Control':'private, no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{sameOrigin(req);const staff=await requireStaff('admin');const result=await saveProduct(await jsonBody(req,65536),staff);revalidatePath('/','layout');return Response.json(result);}catch(e){return errorResponse(e);}}
export async function DELETE(req:Request){try{
 sameOrigin(req);const staff=await requireStaff('admin');const parsed=z.object({id:z.uuid()}).safeParse(await jsonBody(req));
 if(!parsed.success)throw new HttpError(422,'PRODUCT_INVALID','Selecciona un producto válido.');
 await deleteProduct(parsed.data.id,staff);revalidatePath('/','layout');return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
