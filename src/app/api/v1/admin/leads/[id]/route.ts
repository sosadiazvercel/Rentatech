import {requireStaff} from '@/server/auth';
import {updateLead} from '@/server/leads';
import {errorResponse,jsonBody,sameOrigin,HttpError} from '@/server/http';
import {z} from 'zod';
import {sendLeadEmails} from '@/server/email';
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){try{
 sameOrigin(req);const staff=await requireStaff();const {id}=await params;
 if(!z.uuid().safeParse(id).success)throw new HttpError(400,'INVALID_ID','Identificador inválido');
 const result=await updateLead(id,await jsonBody(req,7*1024*1024),staff);
 if(result.notificationQueued)try{await sendLeadEmails(id);}catch{console.error('lead_email_pending',{leadId:id});}
 return Response.json(result);
}catch(e){return errorResponse(e);}}
