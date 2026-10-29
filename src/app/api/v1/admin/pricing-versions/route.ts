import {requireStaff} from '@/server/auth';
import {mutate} from '@/server/rental';
import {errorResponse,sameOrigin,jsonBody} from '@/server/http';
export async function POST(req:Request){try{sameOrigin(req);const staff=await requireStaff('admin');const body=await jsonBody(req);return Response.json(await mutate({...body,action:'settings'},staff));}catch(e){return errorResponse(e);}}
