import Link from 'next/link';
import {notFound} from 'next/navigation';
import {z} from 'zod';
import {pool} from '@/server/db';
import {requireStaff} from '@/server/auth';
import {getConfig} from '@/server/rental';
import {LeadEditor} from '@/components/lead-editor';
import {LeadMailStatus} from '@/components/lead-mail-status';

export default async function Detail({params}:{params:Promise<{id:string}>}){
 await requireStaff();const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const l=(await pool().query('SELECT l.*,a.filename FROM public.lead l LEFT JOIN public.lead_attachment a ON a.id=l.attachment_id WHERE l.id=$1',[id])).rows[0];if(!l)notFound();
 const [notes,staff,emails,history,technicians,assigned,config,quote]=await Promise.all([
  pool().query('SELECT body,created_at FROM public.lead_note WHERE lead_id=$1 ORDER BY created_at DESC',[id]),
  pool().query("SELECT p.id,p.role,COALESCE(NULLIF(p.display_name,''),p.login_email,u.email,'Responsable sin nombre') name FROM public.staff_profile p LEFT JOIN auth.users u ON u.id=p.auth_user_id WHERE p.active=true ORDER BY name"),
  pool().query('SELECT n.id,n.kind,n.status,n.last_error FROM notification_outbox n LEFT JOIN quote q ON q.id=n.quote_id WHERE n.lead_id=$1 OR q.lead_id=$1 ORDER BY n.created_at DESC',[id]),
  pool().query("SELECT before->>'stage' stage FROM audit_log WHERE entity_type='lead' AND entity_id=$1 AND after->>'stage'='lost' AND before->>'stage'<>'lost' ORDER BY occurred_at DESC LIMIT 1",[id]),
  pool().query('SELECT id,name,active FROM technician WHERE NOT is_fixture ORDER BY name'),
  pool().query("SELECT a.technician_id FROM technician_allocation a JOIN booking b ON b.id=a.booking_id JOIN quote q ON q.id=b.quote_id WHERE q.lead_id=$1 AND (a.active OR (b.status IN ('completed','cancelled') AND a.created_at=(SELECT max(latest.created_at) FROM technician_allocation latest WHERE latest.booking_id=b.id)))",[id]),
  getConfig(),
  pool().query('SELECT technician_count FROM quote WHERE lead_id=$1 ORDER BY version DESC LIMIT 1',[id]),
 ]);
 const r=l.request;
 const technicianCount=quote.rows[0]?.technician_count??config.rules.staffRules.find(rule=>r.quantity>=rule.min&&r.quantity<=rule.max)?.count??1;
 const products=(await pool().query('SELECT code,name FROM equipment ORDER BY name')).rows;
 const technicianNames=(await pool().query('SELECT name FROM technician WHERE id=ANY($1::uuid[])',[assigned.rows.map(a=>a.technician_id)])).rows.map(t=>t.name).join(', ');
 const fields=[['Contacto',[r.name,r.email,r.phone].filter(Boolean).join(' · ')],['NIT / Cédula',r.nit],['Fecha',[r.date,r.start].filter(Boolean).join(' · ')],['Días de alquiler',r.days??1],['Equipo',`${r.quantity??'Por definir'} × ${r.equipment??'Por definir'}`],['Lugar',[r.address||r.venue,r.city].filter(Boolean).join(' · ')],['Contenido',({ready:'Contenido del cliente',custom:'Por definir',unknown:'Por definir',client_provided:'Contenido del cliente',games:'Por definir'} as Record<string,string>)[r.contentStatus||r.content]||'Por definir'],['Notas',r.notes||r.purpose],['Técnicos asignados',technicianNames||'Sin asignación activa'],['Origen',l.source]];
 return <section style={{paddingBlock:32}}><div className="breadcrumb"><Link href="/admin/leads">Solicitudes</Link> / Detalle</div><h1 style={{fontSize:36}}>{r.company||r.name||'Solicitud de alquiler'}</h1><p className="mono">{id}</p><div className="detail-grid"><div className="stack"><article className="card"><h3>Contexto del alquiler</h3><dl>{fields.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value??'Por definir'}</dd></div>)}</dl></article>{r.reasons?.length>0&&<article className="card"><h3>Pendientes de revisión</h3><ul>{r.reasons.map((x:string)=><li key={x}>{x}</li>)}</ul></article>}<article className="card"><h3>Notas del equipo</h3>{notes.rows.length?notes.rows.map((n,i)=><div key={i} style={{borderBottom:'1px solid var(--line)',paddingBlock:12}}><small className="muted">{new Date(n.created_at).toLocaleString('es-CO',{timeZone:'America/Bogota'})}</small><p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{n.body}</p></div>):<p>Sin notas todavía.</p>}</article><LeadMailStatus id={id} emails={emails.rows}/></div><article className="card"><h3>Seguimiento del alquiler</h3><LeadEditor id={id} products={products} request={{name:r.name||'',email:r.email||'',phone:r.phone||'',company:r.company||'',nit:r.nit||'',equipment:r.equipment||'QUEST3',quantity:r.quantity??3,days:r.days??1,date:r.date||'',start:r.start||'10:00',durationHours:r.durationHours??8,city:r.city||'',address:r.address||r.venue||'',contentStatus:r.contentStatus??(r.content==='client_provided'?'ready':'custom'),notes:r.notes||r.purpose||''}} values={{stage:l.stage,lastActiveStage:history.rows[0]?.stage,version:l.stage_version,ownerId:l.owner_user_id,estimatedValue:l.estimated_value_cop,paymentUrl:l.payment_url,paymentReference:l.payment_reference,attachmentId:l.attachment_id,attachmentName:l.filename,technicianIds:assigned.rows.map(a=>a.technician_id)}} staff={staff.rows} technicians={technicians.rows} technicianCount={technicianCount}/></article></div></section>;
}
