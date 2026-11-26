import {requireStaff} from '@/server/auth';
import {createCalendarEvent,listCalendarEvents,updateCalendarEvent,deleteCalendarEvent} from '@/server/manual-calendar';
import {z} from 'zod';
import {errorResponse,jsonBody,sameOrigin,HttpError} from '@/server/http';

export async function GET(req:Request){
 try{await requireStaff();const url=new URL(req.url);return Response.json(await listCalendarEvents(url.searchParams.get('from')||'',url.searchParams.get('to')||''),{headers:{'Cache-Control':'private, no-store'}});}
 catch(error){return errorResponse(error);}
}

export async function PATCH(req:Request){
 try{sameOrigin(req);const staff=await requireStaff();const parsed=z.object({id:z.uuid()}).passthrough().safeParse(await jsonBody(req));if(!parsed.success)throw new HttpError(422,'INVALID_ID','Evento inválido.');const {id,...body}=parsed.data;return Response.json(await updateCalendarEvent(id,body,staff));}
 catch(error){return errorResponse(error);}
}

export async function DELETE(req:Request){
 try{sameOrigin(req);const staff=await requireStaff();return Response.json(await deleteCalendarEvent(await jsonBody(req),staff));}
 catch(error){return errorResponse(error);}
}

export async function POST(req:Request){
 try{sameOrigin(req);const staff=await requireStaff();return Response.json(await createCalendarEvent(await jsonBody(req),staff),{status:201,headers:{'Cache-Control':'private, no-store'}});}
 catch(error){return errorResponse(error);}
}
