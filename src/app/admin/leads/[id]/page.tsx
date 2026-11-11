import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {pool} from '@/server/db';
import {requireStaff} from '@/server/auth';
import {LeadEditor} from '@/components/lead-editor';
import {LeadMailStatus} from '@/components/lead-mail-status';

export default async function Detail({params}:{params:Promise<{id:string}>}){
 await requireStaff();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const l=(await pool().query('SELECT l.*,a.filename FROM public.lead l LEFT JOIN public.lead_attachment a ON a.id=l.attachment_id WHERE l.id=$1',[id])).rows[0];if(!l)notFound();
 const [notes,staff,emails,history]=await Promise.all([
  pool().query('SELECT body,created_at FROM public.lead_note WHERE lead_id=$1 ORDER BY created_at DESC',[id]),
  pool().query('SELECT id,role FROM public.staff_profile WHERE active=true ORDER BY role'),
  pool().query('SELECT n.id,n.kind,n.status,n.last_error FROM notification_outbox n LEFT JOIN quote q ON q.id=n.quote_id WHERE n.lead_id=$1 OR q.lead_id=$1 ORDER BY n.created_at DESC',[id]),
  pool().query("SELECT before->>'stage' stage FROM audit_log WHERE entity_type='lead' AND entity_id=$1 AND after->>'stage'='lost' AND before->>'stage'<>'lost' ORDER BY occurred_at DESC LIMIT 1",[id]),
 ]);
 const r=l.request;
 const fields=[['Contacto',[r.name,r.email,r.phone].filter(Boolean).join(' · ')],['NIT / Cédula',r.nit],['Fecha',[r.date,r.start].filter(Boolean).join(' · ')],['Días de alquiler',r.days??1],['Equipo',`${r.quantity??'Por definir'} × ${r.equipment??'Por definir'}`],['Lugar',[r.address||r.venue,r.city].filter(Boolean).join(' · ')],['Contenido',({ready:'Contenido del cliente',custom:'Por definir',unknown:'Por definir',client_provided:'Contenido del cliente',games:'Por definir'} as Record<string,string>)[r.contentStatus||r.content]||'Por definir'],['Notas',r.notes||r.purpose],['Origen',l.source]];
 return <section style={{paddingBlock:32}}><div className="breadcrumb"><Link href="/admin/leads">Solicitudes</Link> / Detalle</div><h1 style={{fontSize:36}}>{r.company||r.name||'Solicitud de alquiler'}</h1><p className="mono">{id}</p><div className="detail-grid"><div className="stack"><article className="card"><h3>Contexto del alquiler</h3><dl>{fields.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value??'Por definir'}</dd></div>)}</dl></article>{r.reasons?.length>0&&<article className="card"><h3>Pendientes de revisión</h3><ul>{r.reasons.map((x:string)=><li key={x}>{x}</li>)}</ul></article>}<article className="card"><h3>Notas del equipo</h3>{notes.rows.length?notes.rows.map((n,i)=><div key={i} style={{borderBottom:'1px solid var(--line)',paddingBlock:12}}><small className="muted">{new Date(n.created_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{n.body}</p></div>):<p>Sin notas todavía.</p>}</article><LeadMailStatus id={id} emails={emails.rows}/></div><article className="card"><h3>Seguimiento del alquiler</h3><LeadEditor id={id} values={{stage:l.stage,lastActiveStage:history.rows[0]?.stage,version:l.stage_version,ownerId:l.owner_user_id,estimatedValue:l.estimated_value_cop,paymentUrl:l.payment_url,paymentReference:l.payment_reference,attachmentId:l.attachment_id,attachmentName:l.filename}} staff={staff.rows}/></article></div></section>;
}
