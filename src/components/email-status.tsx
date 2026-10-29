'use client';
import {useState} from 'react';

export type EmailStatus={id:string;quote_id:string;number:string;status:string;attempts:number;sent_at:string|null;last_error:string|null};
const labels:Record<string,string>={sent:'Aceptado por el proveedor',sending:'En proceso',not_configured:'Sin configurar',failed:'Error de envío',uncertain:'Confirmación pendiente',review_required:'Requiere revisión'};
export function EmailStatuses({emails,configured,isAdmin,onRefresh}:{emails:EmailStatus[];configured:boolean;isAdmin:boolean;onRefresh:()=>Promise<void>}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function retry(quoteId:string){
  setBusy(true);setError('');
  try{const r=await fetch('/api/v1/operations/email',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quoteId})});if(!r.ok)throw Error('No se pudo procesar el correo.');await onRefresh();}
  catch(e){setError(e instanceof Error?e.message:'Error de envío.');}finally{setBusy(false);}
 }
 return <section style={{marginTop:32}}><h2 style={{fontSize:26}}>Correos de solicitudes</h2>
  <p>{configured?'Proveedor conectado. El estado aceptado confirma que el proveedor recibió el correo; la entrega se consulta en su panel.':'Envíos desactivados: configura RESEND_API_KEY, EMAIL_FROM y EMAIL_NOTIFICATION_TO.'}</p>
  {error&&<p role="alert">{error}</p>}
  <div className="stack">{emails.map(mail=><article className="card" key={mail.id}>
   <strong>{mail.number}</strong><p>{labels[mail.status]??mail.status} · Intentos: {mail.attempts}</p>
   {mail.last_error&&<p>{mail.last_error}</p>}
   {isAdmin&&configured&&!['sent','review_required'].includes(mail.status)&&<button className="button secondary compact" disabled={busy} onClick={()=>void retry(mail.quote_id)}>Reintentar correo de {mail.number}</button>}
  </article>)}</div>
 </section>;
}
