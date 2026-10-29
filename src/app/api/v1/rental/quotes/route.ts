import {createQuote} from '@/server/rental';
import {errorResponse,HttpError,jsonBody,rateLimit,sameOrigin} from '@/server/http';
import {fallbackQuote,isDatabaseUnavailable} from '@/server/rental-fallback';
import {sendQuoteEmail} from '@/server/email';

export async function POST(req:Request){
 try{
  sameOrigin(req);
  if(process.env.APP_ENV==='production')throw new HttpError(503,'LAUNCH_PENDING','La publicacion comercial esta pendiente de configurar');
  try{await rateLimit(req,'quote',10);}catch(e){if(!isDatabaseUnavailable(e))throw e;}
  const body=await jsonBody(req);
  try{
   const result=await createQuote(body,req.headers.get('idempotency-key')||'');
   // A mail failure must never turn a saved quote into a failed submission.
   try{await sendQuoteEmail(result.id);}catch{console.error('quote_email_pending',{quoteId:result.id});}
   return Response.json(result,{status:201});
  }
  catch(e){if(isDatabaseUnavailable(e))return Response.json(fallbackQuote(body),{status:201});throw e;}
 }catch(e){return errorResponse(e);}
}
