import {estimate} from '@/server/rental';
import {errorResponse,jsonBody,rateLimit,sameOrigin} from '@/server/http';
import {fallbackEstimate,isDatabaseUnavailable} from '@/server/rental-fallback';
export async function POST(req:Request){try{sameOrigin(req);try{await rateLimit(req,'estimate',60);}catch(e){if(!isDatabaseUnavailable(e))throw e;}const body=await jsonBody(req);try{return Response.json(await estimate(body),{headers:{'Cache-Control':'no-store'}});}catch(e){if(isDatabaseUnavailable(e))return Response.json(fallbackEstimate(body),{headers:{'Cache-Control':'no-store'}});throw e;}}catch(e){return errorResponse(e);}}
