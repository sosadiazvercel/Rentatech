import {createQuote} from '@/server/rental';
import {errorResponse,HttpError,jsonBody,rateLimit,sameOrigin} from '@/server/http';
import {isDatabaseUnavailable} from '@/server/rental-fallback';
import {sendQuoteEmail} from '@/server/email';

export async function POST(req:Request){
 try{
  sameOrigin(req);
  if(process.env.COMMERCIAL_ENABLED==='false')throw new HttpError(503,'COMMERCIAL_DISABLED','La recepción de cotizaciones está temporalmente deshabilitada');
  try{await rateLimit(req,'quote',10);}catch(e){if(!isDatabaseUnavailable(e))throw e;}
  const body=await jsonBody(req);
  const result=await createQuote(body,req.headers.get('idempotency-key')||'');
  // A mail failure must never turn a saved quote into a failed submission.
  try{await sendQuoteEmail(result.id);}catch{console.error('quote_email_pending',{quoteId:result.id});}
  return Response.json(result,{status:201});
 }catch(e){return errorResponse(e);}
}
