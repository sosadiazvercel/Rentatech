import {requireStaff} from '@/server/auth';
import {sendLeadEmails,sendQuoteEmail} from '@/server/email';
import {pool} from '@/server/db';
import {errorResponse,sameOrigin,HttpError} from '@/server/http';
import {z} from 'zod';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(req);await requireStaff();const {id}=await params;
 if(!z.uuid().safeParse(id).success)throw new HttpError(400,'INVALID_ID','Identificador inválido');
 await sendLeadEmails(id);
 const quotes=(await pool().query('SELECT id FROM quote WHERE lead_id=$1',[id])).rows;
 for(const quote of quotes)await sendQuoteEmail(quote.id);
 return Response.json({ok:true});
}catch(e){return errorResponse(e);}}
