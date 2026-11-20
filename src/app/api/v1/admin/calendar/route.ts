import {z} from 'zod';
import {revalidatePath} from 'next/cache';
import {requireStaff} from '@/server/auth';
import {saveCalendarId} from '@/server/calendar';
import {errorResponse,HttpError,jsonBody,sameOrigin} from '@/server/http';

export async function POST(req:Request){
 try{
  sameOrigin(req);
  const staff=await requireStaff('admin');
  const parsed=z.object({id:z.unknown()}).safeParse(await jsonBody(req));
  if(!parsed.success)throw new HttpError(422,'CALENDAR_INVALID','Falta el ID del calendario.');
  const result=await saveCalendarId(parsed.data.id,staff);
  revalidatePath('/admin/calendario');
  return Response.json(result,{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error);}
}
