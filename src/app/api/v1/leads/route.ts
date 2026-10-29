import {createLead} from '@/server/leads';
import {errorResponse,HttpError,jsonBody,rateLimit,sameOrigin} from '@/server/http';
export async function POST(req:Request){try{
 sameOrigin(req);if(process.env.APP_ENV==='production')throw new HttpError(503,'SPRINT1_DEMO_ONLY','La captación comercial todavía no está habilitada');
 await rateLimit(req,'leads');const result=await createLead(await jsonBody(req),req.headers.get('idempotency-key')||'');
 if('invalid' in result)return Response.json({error:{code:'VALIDATION_ERROR',message:'Revisa los campos señalados',fields:result.invalid.fieldErrors}},{status:422});
 return Response.json(result,{status:'replayed' in result?200:201});
}catch(e){return errorResponse(e);}}
