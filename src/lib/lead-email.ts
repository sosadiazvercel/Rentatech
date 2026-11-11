import {money} from './rental';

type RequestSummary={name?:string;email?:string;company?:string;phone?:string;nit?:string;equipment?:string;quantity?:number;days?:number;date?:string;start?:string;city?:string;address?:string;notes?:string};
export type MailPayload={to:string[];subject:string;text:string};
export function rentalSummary(r:RequestSummary){
 return [`Contacto: ${r.name||'Sin nombre'}`,`Correo: ${r.email||'—'}`,`Teléfono: ${r.phone||'—'}`,`Empresa: ${r.company||'Persona natural'}`,`NIT / Cédula: ${r.nit||'—'}`,`Equipo: ${r.quantity??0} × ${r.equipment||'Por definir'}`,`Días de alquiler: ${r.days??1}`,`Inicio: ${r.date||'Por definir'} ${r.start||''}`,`Lugar: ${[r.address,r.city].filter(Boolean).join(', ')||'Por definir'}`,r.notes?`Notas: ${r.notes}`:''].filter(Boolean).join('\n');
}
export function initialMail(r:RequestSummary,number:string,admin=false,estimate?:{hardware:number|null;staff:number|null;transport:number|null;content:number|null;tax:number|null;total:number;pending:string[];equipmentName?:string}):MailPayload{
 const prices=estimate?['',`Equipo: ${estimate.equipmentName||r.equipment}`,`Visores: ${estimate.hardware==null?'Por definir':money(estimate.hardware)}`,`Operador: ${estimate.staff==null?'Por definir':money(estimate.staff)}`,`Transporte: ${estimate.transport==null?'Por definir':money(estimate.transport)}`,`Contenido: ${estimate.content==null?'Por definir':money(estimate.content)}`,`Impuestos: ${estimate.tax==null?'Por definir':money(estimate.tax)}`,`Total estimado: ${money(estimate.total)}`,`Pendientes: ${estimate.pending.join('; ')||'Ninguno'}`].join('\n'):'';
 return {to:admin?(process.env.EMAIL_NOTIFICATION_TO||'jorgesosadiaz@sosadiazbros.com').split(',').map(x=>x.trim()).filter(Boolean):[r.email!],subject:admin?`Nueva solicitud de alquiler ${number} · ${r.name} | RENTA TECH`:`Tu cotización ${number} está lista | RENTA TECH`,text:[admin?'Hola Jorge, recibimos una nueva solicitud de alquiler.':`Hola ${r.name}, ¡tu cotización está lista! Pronto nos pondremos en contacto contigo para continuar con el proceso.`,rentalSummary(r),prices,admin?'Revisa la solicitud y prepara la cotización definitiva desde el panel de solicitudes.':'Revisaremos disponibilidad y detalles antes de confirmar la reserva.','RENTA TECH'].filter(Boolean).join('\n\n')};
}
export function stageMail(stage:string,r:RequestSummary,id:string,paymentUrl:string):MailPayload{
 const templates:Record<string,[string,string]>={
  quoted:['Tu cotización de alquiler','Adjuntamos tu cotización. Responde a este correo para confirmar si la aceptas. Una vez recibamos tu aceptación, te enviaremos las instrucciones de pago.'],
  awaiting_payment:['Tu alquiler está pendiente de pago',`Adjuntamos la versión final de la cotización aprobada. Realiza el pago en este enlace:\n${paymentUrl}\nEnvíanos el comprobante respondiendo a este correo. Validaremos el pago antes de confirmar tu reserva.`],
  confirmed:['Tu alquiler está confirmado','Hemos validado tu pago. Tu alquiler y la reserva de los equipos están confirmados. Estos son los detalles de tu reserva:'],
  completed:['Gracias por alquilar con RENTA TECH','Tu servicio de alquiler ha finalizado. Gracias por confiar en nosotros. Esperamos acompañarte en tu próximo alquiler.'],
 };
 const [subject,message]=templates[stage];
 return {to:[r.email!],subject:`${subject} | RENTA TECH`,text:`Hola ${r.name},\n\n${message}\n\n${rentalSummary(r)}\n\nReferencia: ${id}\n\nEl equipo de RENTA TECH`};
}
