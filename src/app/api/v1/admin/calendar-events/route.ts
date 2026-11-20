import {requireStaff} from '@/server/auth';
import {createCalendarEvent,listCalendarEvents} from '@/server/manual-calendar';
import {errorResponse,jsonBody,sameOrigin} from '@/server/http';

export async function GET(req:Request){
 try{await requireStaff();const url=new URL(req.url);return Response.json(await listCalendarEvents(url.searchParams.get('from')||'',url.searchParams.get('to')||''),{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){return errorResponse(error);}
}

export async function POST(req:Request){
 try{sameOrigin(req);const staff=await requireStaff();return Response.json(await createCalendarEvent(await jsonBody(req),staff),{status:201,headers:{'Cache-Control':'private, no-store'}});}
 catch(error){return errorResponse(error);}
}
