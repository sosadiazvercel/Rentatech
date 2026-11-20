import 'server-only';
import type {Staff} from './auth';
import {pool} from './db';
import {HttpError} from './http';
import {parseCalendarId} from '@/lib/calendar';

export async function calendarId(){
 const result=await pool().query<{google_calendar_id:string}>('SELECT google_calendar_id FROM public.rental_settings WHERE id=true');
 if(!result.rowCount)throw new HttpError(503,'CALENDAR_SETTINGS_MISSING','Falta la configuración general del sistema.');
 return result.rows[0].google_calendar_id;
}

export async function saveCalendarId(value:unknown,staff:Staff){
 if(staff.role!=='admin')throw new HttpError(403,'FORBIDDEN','Tu rol no permite cambiar el calendario.');
 let id:string;
 try{id=parseCalendarId(value);}catch{throw new HttpError(422,'CALENDAR_INVALID','Pega un ID válido de Google Calendar.');}
 const result=await pool().query<{google_calendar_id:string}>(
  'UPDATE public.rental_settings SET google_calendar_id=$1 WHERE id=true RETURNING google_calendar_id',
  [id],
 );
 if(!result.rowCount)throw new HttpError(503,'CALENDAR_SETTINGS_MISSING','Falta la configuración general del sistema.');
 return {id:result.rows[0].google_calendar_id};
}
