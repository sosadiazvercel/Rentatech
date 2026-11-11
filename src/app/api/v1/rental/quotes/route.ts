import {createQuote} from '@/server/rental';
import {errorResponse,jsonBody,rateLimit,sameOrigin} from '@/server/http';
import {isDatabaseUnavailable} from '@/server/rental-fallback';
import {sendQuoteEmail} from '@/server/email';

export async function POST(req:Request){
 try{
  sameOrigin(req);
  try{await rateLimit(req,'quote',10);}catch(e){if(!isDatabaseUnavailable(e))throw e;}
  const body=await jsonBody(req);
  const result=await createQuote(body,req.headers.get('idempotency-key')||'');
  // A mail failure must never turn a saved quote into a failed submission.
  let emailSent=false;
  try{emailSent=(await sendQuoteEmail(result.id))?.customerSent??false;}catch{console.error('quote_email_pending',{quoteId:result.id});}
  return Response.json({...result,emailSent},{status:201});
 }catch(e){return errorResponse(e);}
}
