import {requireStaff} from '@/server/auth';
import {pool} from '@/server/db';
import {errorResponse,HttpError} from '@/server/http';
import {z} from 'zod';
export async function GET(_req:Request,{params}:{params:Promise<{id:string;attachmentId:string}>}){try{
 await requireStaff();const {id,attachmentId}=await params;
 if(!z.uuid().safeParse(id).success||!z.uuid().safeParse(attachmentId).success)throw new HttpError(400,'INVALID_ID','Identificador inválido');
 const row=(await pool().query('SELECT filename,data FROM lead_attachment WHERE id=$1 AND lead_id=$2',[attachmentId,id])).rows[0];
 if(!row)throw new HttpError(404,'NOT_FOUND','Archivo no encontrado');
 return new Response(new Uint8Array(row.data),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${row.filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return errorResponse(e);}}
