import { z } from 'zod';
const short=z.string().trim().min(1,'Completa este campo').max(180);
const optional= z.string().trim().max(180).optional();
export const leadSchema=z.object({
 city:short, date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Selecciona una fecha válida'),
 start:z.string().regex(/^([01]\d|2[0-3]):00$/,'Selecciona una hora entera'),
 end:z.string().regex(/^([01]\d|2[0-3]):00$/,'Selecciona una hora entera'),
 equipment:z.enum(['QUEST2','QUEST3']), quantity:z.number().int().min(3).max(1000),
 attendees:z.number().int().min(1).max(100000), purpose:short,
 content:z.enum(['client_provided','games','custom','unknown']),
 venue:short,address:short, indoor:z.boolean(), access:z.boolean(), extraTechnician:z.boolean(),
 company:optional,name:short,email:z.email('Escribe un correo válido').trim().toLowerCase().max(254),
 phone:z.string().regex(/^\+[1-9]\d{7,14}$/,'Usa formato internacional, por ejemplo +573001234567'),
 customerType:z.enum(['business','agency','university','private']),
 privacy:z.literal(true,{error:'Acepta el aviso para guardar la solicitud'}), marketing:z.boolean(),
 attribution:z.object({source:optional,medium:optional,campaign:optional,content:optional,term:optional,gclid:optional,landing:optional,referrer:optional}).strict().optional(),
}).strict().superRefine((v,ctx)=>{
 const start=new Date(`${v.date}T${v.start}:00-05:00`), end=new Date(`${v.date}T${v.end}:00-05:00`);
 if(!Number.isFinite(start.getTime())||start.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})!==v.date) ctx.addIssue({code:'custom',path:['date'],message:'La fecha no existe'});
 if(start.getTime()<=Date.now())ctx.addIssue({code:'custom',path:['date'],message:'Selecciona una fecha futura'});
 if(end<=start)ctx.addIssue({code:'custom',path:['end'],message:'La hora de cierre debe ser posterior al inicio'});
 if(v.customerType!=='private'&&!v.company)ctx.addIssue({code:'custom',path:['company'],message:'Escribe el nombre de la organización'});
});
export type LeadInput=z.infer<typeof leadSchema>;
export function reviewReasons(v:LeadInput,now=Date.now()) {
 const reasons=['Lugar y contenido pendientes de validación'];
 if(!['bogotá','bogota'].includes(v.city.toLowerCase()))reasons.push('Cobertura fuera de Bogotá');
 if(v.quantity<3||v.quantity>15)reasons.push('Cantidad fuera del paquete estándar');
 if(v.start<'08:00'||v.end>'20:00'||Number(v.end.slice(0,2))-Number(v.start.slice(0,2))>8)reasons.push('Horario especial');
 if(new Date(`${v.date}T${v.start}:00-05:00`).getTime()-now<72*3600000)reasons.push('Menos de 72 horas de anticipación');
 if(!v.indoor||!v.access)reasons.push('Revisar condiciones del lugar');
 if(v.content!=='client_provided')reasons.push('Contenido por definir o licenciar');
 if(v.extraTechnician)reasons.push('Operación adicional');
 if(v.customerType==='private')reasons.push('Evento particular');
 return reasons;
}
export const stageLabels={new:'Nueva',qualified:'Calificada',quoted:'Cotizada',won:'Ganada',lost:'Perdida'} as const;
export const leadUpdateSchema=z.object({
 stage:z.enum(['new','qualified','lost']), ownerId:z.uuid().nullable(),
 estimatedValue:z.number().int().nonnegative().max(1000000000).nullable(),
 nextAction:z.iso.datetime({offset:true}).nullable(), lossReason:z.string().trim().max(1000), note:z.string().trim().max(4000)
}).strict().refine(v=>v.stage!=='lost'||v.lossReason.length>0,{path:['lossReason'],message:'Indica el motivo de pérdida'});
