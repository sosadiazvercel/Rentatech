import {requireStaff} from '@/server/auth';
import {mutate,operationsData} from '@/server/rental';
import {errorResponse,jsonBody,sameOrigin} from '@/server/http';
export async function GET(){try{await requireStaff();return Response.json(await operationsData(),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(req:Request){try{sameOrigin(req);const staff=await requireStaff('admin');return Response.json(await mutate(await jsonBody(req),staff));}catch(e){return errorResponse(e);}}
