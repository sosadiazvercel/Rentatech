import 'server-only';
import {calendarEventSchema} from '@/lib/manual-calendar';
import type {Staff} from './auth';
import {pool,transaction} from './db';
import {HttpError} from './http';
import {z} from 'zod';
import {mutate} from './rental';

export async function listCalendarEvents(from:string,to:string){
 const start=new Date(from),end=new Date(to);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw new HttpError(422,'CALENDAR_RANGE_INVALID','Selecciona un rango válido.');
 return (await pool().query(`SELECT id,title,start_at,end_at,location,notes,'manual' source,NULL::uuid lead_id FROM public.calendar_event
  WHERE start_at<$2 AND end_at>$1
  UNION ALL
  SELECT b.id,b.number||' · '||COALESCE(l.request->>'name',q.snapshot->'request'->>'name','Cliente'),q.event_start,q.event_end,
   COALESCE(l.request->>'address',q.snapshot->'request'->>'address','')||' · '||COALESCE(l.request->>'city',q.city),
   concat(q.quantity,' × ',e.name,E'\nTécnicos: ',COALESCE((SELECT string_agg(t.name,', ' ORDER BY t.name) FROM technician_allocation a JOIN technician t ON t.id=a.technician_id WHERE a.booking_id=b.id AND a.active),'Sin asignación activa'),E'\n',COALESCE(l.request->>'notes','')),
   'booking',q.lead_id
  FROM booking b JOIN quote q ON q.id=b.quote_id JOIN equipment e ON e.id=q.equipment_id LEFT JOIN lead l ON l.id=q.lead_id
  WHERE b.status IN ('confirmed','in_service') AND q.event_start<$2 AND q.event_end>$1
  ORDER BY start_at,title`,[start.toISOString(),end.toISOString()])).rows;
}

export async function updateCalendarEvent(id:string,raw:unknown,staff:Staff){
 if(!z.uuid().safeParse(id).success)throw new HttpError(422,'INVALID_ID','Evento inválido.');
 const parsed=calendarEventSchema.safeParse(raw);
 if(!parsed.success)throw new HttpError(422,'CALENDAR_EVENT_INVALID',parsed.error.issues[0].message);
 const v=parsed.data;
 return transaction(async db=>{
  const old=(await db.query('SELECT * FROM calendar_event WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!old)throw new HttpError(404,'NOT_FOUND','Evento no encontrado.');
  const row=(await db.query('UPDATE calendar_event SET title=$2,start_at=$3,end_at=$4,location=$5,notes=$6 WHERE id=$1 RETURNING id,title,start_at,end_at,location,notes',[id,v.title,`${v.date}T${v.start}:00-05:00`,`${v.endDate}T${v.end}:00-05:00`,v.location,v.notes])).rows[0];
  await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,before,after) VALUES('staff',$1,'calendar_event',$2,'updated',$3,$4)",[staff.id,id,JSON.stringify(old),JSON.stringify(row)]);
  return row;
 });
}

export async function deleteCalendarEvent(raw:unknown,staff:Staff){
 const parsed=z.object({id:z.uuid(),source:z.enum(['manual','booking'])}).strict().safeParse(raw);
 if(!parsed.success)throw new HttpError(422,'INVALID_ID','Evento inválido.');
 const {id,source}=parsed.data;
 if(source==='booking')return mutate({action:'bookingStatus',id,status:'cancelled',reason:'Reserva eliminada desde el calendario'},staff);
 return transaction(async db=>{
  const old=(await db.query('DELETE FROM calendar_event WHERE id=$1 RETURNING *',[id])).rows[0];
  if(!old)throw new HttpError(404,'NOT_FOUND','Evento no encontrado.');
  await db.query("INSERT INTO audit_log(actor_type,actor_id,entity_type,entity_id,action,before) VALUES('staff',$1,'calendar_event',$2,'deleted',$3)",[staff.id,id,JSON.stringify(old)]);
  return {id};
 });
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
