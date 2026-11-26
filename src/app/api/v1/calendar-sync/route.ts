import {authorizeCalendarScript} from '@/server/google-calendar-auth';
import {listCalendarEvents} from '@/server/manual-calendar';
import {errorResponse} from '@/server/http';

export const dynamic='force-dynamic';
export async function GET(req:Request){
 try{
  await authorizeCalendarScript(req);
  return Response.json({events:await listCalendarEvents('1900-01-01T00:00:00Z','2200-01-01T00:00:00Z')},{headers:{'Cache-Control':'private, no-store'}});
 }catch(error){return errorResponse(error);}
}
