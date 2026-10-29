import {z} from 'zod';
import {requireStaff} from '@/server/auth';
import {errorResponse,jsonBody,sameOrigin} from '@/server/http';
import {sendQuoteEmail} from '@/server/email';

export async function POST(req:Request){
 try{
  sameOrigin(req);await requireStaff('admin');
  const {quoteId}=z.object({quoteId:z.uuid()}).parse(await jsonBody(req));
  await sendQuoteEmail(quoteId);
  return Response.json({ok:true});
 }catch(e){return errorResponse(e);}
}
