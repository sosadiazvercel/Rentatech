import {requireStaff} from '@/server/auth';
import {updateLead} from '@/server/leads';
import {errorResponse,jsonBody,sameOrigin,HttpError} from '@/server/http';
import {z} from 'zod';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(req);const staff=await requireStaff();const {id}=await params;
 if(!z.uuid().safeParse(id).success)throw new HttpError(400,'INVALID_ID','Identificador inválido');
 return Response.json(await updateLead(id,await jsonBody(req),staff));
}catch(e){return errorResponse(e);}}
