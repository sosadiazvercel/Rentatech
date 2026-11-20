import 'server-only';
import {calendarEventSchema} from '@/lib/manual-calendar';
import type {Staff} from './auth';
import {pool,transaction} from './db';
import {HttpError} from './http';

export async function listCalendarEvents(from:string,to:string){
 const start=new Date(from),end=new Date(to);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new HttpError(422,'CALENDAR_RANGE_INVALID','Selecciona un rango válido.');
 return (await pool().query(`SELECT id,title,start_at,end_at,location,notes FROM public.calendar_event
  WHERE start_at<$2 AND end_at>$1 ORDER BY start_at,title`,[start.toISOString(),end.toISOString()])).rows;
}

export async function createCalendarEvent(raw:unknown,staff:Staff){
 const parsed=calendarEventSchema.safeParse(raw);
 if(!parsed.success)throw new HttpError(422,'CALENDAR_EVENT_INVALID',parsed.error.issues[0].message);
 const value=parsed.data,start=new Date(`${value.date}T${value.start}:00-05:00`),end=new Date(`${value.endDate}T${value.end}:00-05:00`);
 return transaction(async db=>{
  const result=await db.query(`INSERT INTO public.calendar_event(title,start_at,end_at,location,notes,created_by)
   VALUES($1,$2,$3,$4,$5,$6) RETURNING id,title,start_at,end_at,location,notes`,[value.title,start,end,value.location,value.notes,staff.id]);
  await db.query(`INSERT INTO public.audit_log(actor_type,actor_id,entity_type,entity_id,action,after)
   VALUES('staff',$1,'calendar_event',$2,'created',$3)`,[staff.id,result.rows[0].id,JSON.stringify({title:value.title,startAt:start.toISOString(),endAt:end.toISOString()})]);
  return result.rows[0];
 });
}
