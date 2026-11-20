import {z} from 'zod';

const calendarIdSchema=z.string().trim().max(320,'El ID no puede superar 320 caracteres.').refine(
 value=>value===''||(!/[\s<>"]/.test(value)&&value.includes('@')),
 'Pega un ID de Google Calendar válido, por ejemplo reservas@group.calendar.google.com.',
);

export function parseCalendarId(value:unknown){return calendarIdSchema.parse(value);}

export function calendarUrl(id:string){
 const url=new URL('https://calendar.google.com/calendar/embed');
 url.searchParams.set('src',id);
 url.searchParams.set('ctz','America/Bogota');
 url.searchParams.set('mode','MONTH');
 return url.toString();
}
