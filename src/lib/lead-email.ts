import {money} from './rental';

type RequestSummary={name?:string;email?:string;company?:string;phone?:string;nit?:string;equipment?:string;quantity?:number;days?:number;date?:string;start?:string;city?:string;address?:string;notes?:string};
type Estimate={hardware:number|null;staff:number|null;transport:number|null;content:number|null;tax:number|null;total:number;pending:string[];equipmentName?:string};
export type MailPayload={to:string[];subject:string;text:string;html:string};

const ink='#111111',paper='#f5f5f1',acid='#eef8bd',muted='#666660',line='#ddddd6';
const esc=(value:unknown)=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]!));
const fmtDate=(date?:string,start?:string)=>{
 if(!date)return 'Por definir';
 const parsed=new Date(`${date}T12:00:00-05:00`);
 const formatted=Number.isNaN(parsed.getTime())?date:new Intl.DateTimeFormat('es-CO',{timeZone:'America/Bogota',day:'numeric',month:'long',year:'numeric'}).format(parsed);
 return `${formatted}${start?` · ${start}`:''}`;
};
const detailRows=(r:RequestSummary)=>[
 ['Contacto',r.name||'Sin nombre'],['Empresa',r.company||'Persona natural'],['Correo',r.email||'—'],['Teléfono',r.phone||'—'],['NIT / Cédula',r.nit||'—'],
 ['Equipo',`${r.quantity??0} × ${r.equipment||'Por definir'}`],['Duración',`${r.days??1} día${(r.days??1)===1?'':'s'} de alquiler`],['Inicio',fmtDate(r.date,r.start)],['Lugar',[r.address,r.city].filter(Boolean).join(', ')||'Por definir'],
];
const rows=(items:(string|number)[][])=>items.map(([label,value])=>`<tr><td style="padding:10px 0;border-bottom:1px solid ${line};color:${muted};font-size:13px;line-height:1.4;width:38%;vertical-align:top">${esc(label)}</td><td style="padding:10px 0;border-bottom:1px solid ${line};color:${ink};font-size:14px;line-height:1.4;font-weight:600;vertical-align:top">${esc(value)}</td></tr>`).join('');
const button=(label:string,url:string)=>`<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 4px"><tr><td style="background:${ink}"><a href="${esc(url)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:12px;line-height:1;font-weight:700;letter-spacing:.08em;text-transform:uppercase">${esc(label)} &rarr;</a></td></tr></table>`;

function shell({preheader,eyebrow,title,intro,body,reference,accent=''}:{preheader:string;eyebrow:string;title:string;intro:string;body:string;reference:string;accent?:string}){
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head><body style="margin:0;padding:0;background:${paper};color:${ink};font-family:Arial,Helvetica,sans-serif"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${paper}"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid ${line}"><tr><td style="padding:22px 28px;background:${ink};color:#ffffff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:21px;font-weight:800;letter-spacing:-.03em">RENTA TECH</td><td align="right" style="font-size:10px;color:#bcbcb7;letter-spacing:.12em;text-transform:uppercase">Alquiler para eventos</td></tr></table></td></tr>${accent?`<tr><td style="height:7px;background:${accent}"></td></tr>`:''}<tr><td style="padding:38px 28px 18px"><div style="font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${muted};margin-bottom:14px">${esc(eyebrow)}</div><h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;letter-spacing:-.02em;color:${ink}">${esc(title)}</h1><p style="margin:0;color:#3f3f3b;font-size:16px;line-height:1.6">${esc(intro)}</p></td></tr><tr><td style="padding:8px 28px 36px">${body}</td></tr><tr><td style="padding:22px 28px;background:${ink};color:#ffffff"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="font-size:12px;line-height:1.5"><strong>RENTA TECH</strong><br><span style="color:#bcbcb7">Tecnología lista para tu evento.</span></td><td align="right" style="font-size:10px;line-height:1.5;color:#8f8f89">REF.<br>${esc(reference)}</td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

function requestCard(r:RequestSummary){
 return `<div style="margin:10px 0 22px;padding:4px 20px 10px;background:#fafaf7;border:1px solid ${line}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows(detailRows(r))}</table>${r.notes?`<div style="padding:16px 0 6px"><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${muted};margin-bottom:6px">Notas</div><div style="font-size:14px;line-height:1.5;color:${ink}">${esc(r.notes)}</div></div>`:''}</div>`;
}

function estimateCard(estimate:Estimate,r:RequestSummary){
 const pending=estimate.pending.length?`<div style="margin-top:18px;padding:14px 16px;border-left:3px solid ${ink};background:${paper};font-size:13px;line-height:1.5;color:#454540"><strong>Por revisar:</strong> ${esc(estimate.pending.join(' · '))}</div>`:'';
 return `<div style="margin:0 0 22px;border:1px solid ${line}"><div style="padding:14px 18px;background:${ink};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Estimación inicial · ${esc(estimate.equipmentName||r.equipment||'Equipo')}</div><div style="padding:6px 18px 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows([['Visores',estimate.hardware==null?'Por definir':money(estimate.hardware)],['Operación técnica',estimate.staff==null?'Por definir':money(estimate.staff)],['Transporte',estimate.transport==null?'Por definir':money(estimate.transport)],['Contenido',estimate.content==null?'Por definir':money(estimate.content)],['Impuestos',estimate.tax==null?'Por definir':money(estimate.tax)]])}</table><div style="padding:20px 0 4px"><div style="font-size:11px;color:${muted};text-transform:uppercase;letter-spacing:.1em">Total estimado</div><div style="margin-top:5px;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:${ink}">${esc(money(estimate.total))}</div></div>${pending}</div></div>`;
}

export function rentalSummary(r:RequestSummary){
 return detailRows(r).map(([label,value])=>`${label}: ${value}`).concat(r.notes?[`Notas: ${r.notes}`]:[]).join('\n');
}

export function initialMail(r:RequestSummary,number:string,admin=false,estimate?:Estimate):MailPayload{
 const prices=estimate?['',`Equipo: ${estimate.equipmentName||r.equipment}`,`Visores: ${estimate.hardware==null?'Por definir':money(estimate.hardware)}`,`Operador: ${estimate.staff==null?'Por definir':money(estimate.staff)}`,`Transporte: ${estimate.transport==null?'Por definir':money(estimate.transport)}`,`Contenido: ${estimate.content==null?'Por definir':money(estimate.content)}`,`Impuestos: ${estimate.tax==null?'Por definir':money(estimate.tax)}`,`Total estimado: ${money(estimate.total)}`,`Pendientes: ${estimate.pending.join('; ')||'Ninguno'}`].join('\n'):'';
 const text=[admin?'Hola Jorge, recibimos una nueva solicitud de alquiler.':`Hola ${r.name}, ¡recibimos tu solicitud! Pronto nos pondremos en contacto contigo para continuar con el proceso.`,rentalSummary(r),prices,admin?'Revisa la solicitud y prepara la cotización definitiva desde el panel de solicitudes.':'Revisaremos disponibilidad y detalles antes de confirmar la reserva.','RENTA TECH'].filter(Boolean).join('\n\n');
 const adminUrl=`${(process.env.APP_BASE_URL||'https://rentatech.co').replace(/\/$/,'')}/admin/leads`;
 const body=`${estimate?estimateCard(estimate,r):''}${requestCard(r)}${admin&&process.env.APP_BASE_URL?button('Abrir panel de solicitudes',adminUrl):''}<p style="margin:18px 0 0;color:${muted};font-size:12px;line-height:1.5">${admin?'Esta estimación puede contener valores pendientes y no constituye una reserva.':'Te responderemos a este mismo correo con los siguientes pasos.'}</p>`;
 const html=shell({preheader:admin?`Nueva solicitud ${number} de ${r.name}`:`Recibimos tu solicitud ${number}`,eyebrow:admin?'Nueva solicitud de alquiler':'Solicitud recibida',title:admin?`${r.name||'Nuevo cliente'} quiere alquilar`:`Hola ${r.name||''}, recibimos tu solicitud.`,intro:admin?'Estos son los datos registrados por el cliente. Revisa la disponibilidad y prepara la propuesta definitiva.':'Nuestro equipo revisará la disponibilidad, la logística y los detalles del evento antes de confirmar la reserva.',body,reference:number,accent:acid});
 return {to:admin?(process.env.EMAIL_NOTIFICATION_TO||'jorgesosadiaz@sosadiazbros.com').split(',').map(x=>x.trim()).filter(Boolean):[r.email!],subject:admin?`Nueva solicitud de alquiler ${number} · ${r.name} | RENTA TECH`:`Recibimos tu solicitud ${number} | RENTA TECH`,text,html};
}

export function stageMail(stage:string,r:RequestSummary,id:string,paymentUrl:string):MailPayload{
 const templates:Record<string,{subject:string;eyebrow:string;title:string;intro:string;accent?:string}>={
  quoted:{subject:'Tu cotización de alquiler',eyebrow:'Cotización adjunta',title:'Tu propuesta está lista.',intro:'Adjuntamos la cotización de tu alquiler. Respóndenos a este correo para confirmar si la aceptas.',accent:acid},
  awaiting_payment:{subject:'Tu alquiler está pendiente de pago',eyebrow:'Siguiente paso',title:'Completa el pago de tu alquiler.',intro:'Adjuntamos la cotización aprobada. Realiza el pago y responde este correo con el comprobante para que podamos validarlo.',accent:'#f6d98d'},
  confirmed:{subject:'Tu alquiler está confirmado',eyebrow:'Reserva confirmada',title:'Todo está listo para tu evento.',intro:'Validamos el pago y reservamos los equipos. Conserva este correo como resumen de tu alquiler.',accent:'#9dd9b7'},
  completed:{subject:'Gracias por alquilar con RENTA TECH',eyebrow:'Servicio finalizado',title:'Gracias por confiar en nosotros.',intro:'Tu servicio de alquiler ha finalizado. Esperamos volver a acompañarte en una próxima experiencia.',accent:'#c9d4da'},
 };
 const t=templates[stage];
 const action=stage==='awaiting_payment'&&paymentUrl?button('Ir al pago seguro',paymentUrl):'';
 const note=stage==='quoted'?'La cotización en PDF está adjunta a este correo.':stage==='awaiting_payment'?'La reserva se confirma únicamente después de validar el pago.':stage==='confirmed'?'Si necesitas ajustar algún detalle, responde directamente a este correo.':'Tu opinión nos ayuda a seguir mejorando.';
 const textMessage=stage==='quoted'?'Adjuntamos tu cotización. Responde a este correo para confirmar si la aceptas. Una vez recibamos tu aceptación, te enviaremos las instrucciones de pago.':stage==='awaiting_payment'?`Adjuntamos la versión final de la cotización aprobada. Realiza el pago en este enlace:\n${paymentUrl}\nEnvíanos el comprobante respondiendo a este correo. Validaremos el pago antes de confirmar tu reserva.`:stage==='confirmed'?'Hemos validado tu pago. Tu alquiler y la reserva de los equipos están confirmados. Estos son los detalles de tu reserva:':'Tu servicio de alquiler ha finalizado. Gracias por confiar en nosotros. Esperamos acompañarte en tu próximo alquiler.';
 const body=`${action}${requestCard(r)}<p style="margin:18px 0 0;color:${muted};font-size:13px;line-height:1.6">${esc(note)}</p>`;
 return {to:[r.email!],subject:`${t.subject} | RENTA TECH`,text:`Hola ${r.name},\n\n${textMessage}\n\n${rentalSummary(r)}\n\nReferencia: ${id}\n\nEl equipo de RENTA TECH`,html:shell({preheader:t.intro,eyebrow:t.eyebrow,title:t.title,intro:t.intro,body,reference:id,accent:t.accent})};
}
