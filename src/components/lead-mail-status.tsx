'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export function LeadMailStatus({id,emails}:{id:string;emails:{id:string;kind:string;status:string;last_error:string|null}[]}){
 const router=useRouter();const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const labels:Record<string,string>={sent:'Enviado',superseded:'Sustituido por una actualización posterior',sending:'En proceso',not_configured:'Pendiente de configuración',failed:'Error de envío',uncertain:'Confirmación pendiente',review_required:'Requiere revisión'};
 const kinds:Record<string,string>={initial_customer:'Resumen para el cliente',initial_admin:'Notificación para Jorge',quoted:'Cotización',awaiting_payment:'Enlace de pago',confirmed:'Confirmación del alquiler',completed:'Cierre del alquiler'};
 return <article className="card"><h3>Correos de la solicitud</h3>{emails.length?emails.map(mail=><div key={mail.id}><strong>{kinds[mail.kind]||mail.kind}</strong><p>{labels[mail.status]||mail.status}</p>{mail.last_error&&<small>{mail.last_error}</small>}</div>):<p>No hay correos pendientes.</p>}{error&&<p role="alert">{error}</p>}{emails.some(m=>!['sent','superseded','review_required'].includes(m.status))&&<button className="button secondary compact" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch(`/api/v1/admin/leads/${id}/email`,{method:'POST'});if(!r.ok)throw Error('No pudimos reintentar el envío');router.refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'Procesando…':'Reintentar correos pendientes'}</button>}</article>;
}
