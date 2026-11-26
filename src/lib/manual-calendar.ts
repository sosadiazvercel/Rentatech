import {z} from 'zod';

const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Selecciona una fecha válida.');
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Selecciona una hora válida.');
export const calendarEventSchema=z.object({
 title:z.string().trim().min(2,'Escribe el nombre del evento.').max(180),
 date,start:time,endDate:date,end:time,
 location:z.string().trim().max(300).default(''),notes:z.string().trim().max(2000).default(''),
}).strict().superRefine((value,ctx)=>{
 const start=new Date(`${value.date}T${value.start}:00-05:00`),end=new Date(`${value.endDate}T${value.end}:00-05:00`);
 if(!Number.isFinite(start.getTime())||start.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})!==value.date)ctx.addIssue({code:'custom',path:['date'],message:'La fecha de inicio no existe.'});
 if(!Number.isFinite(end.getTime())||end.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})!==value.endDate)ctx.addIssue({code:'custom',path:['endDate'],message:'La fecha de cierre no existe.'});
 if(end<=start)ctx.addIssue({code:'custom',path:['end'],message:'El cierre debe ser posterior al inicio.'});
});

export type CalendarEventInput=z.infer<typeof calendarEventSchema>;
export type CalendarEvent={id:string;title:string;start_at:string;end_at:string;location:string;notes:string;source?:'manual'|'booking';lead_id?:string};
