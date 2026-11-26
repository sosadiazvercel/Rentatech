'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import type {CalendarEvent} from '@/lib/manual-calendar';

const zone='America/Bogota';
const dateKey=(date:Date)=>date.toLocaleDateString('en-CA',{timeZone:zone});
const monthLabel=new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:zone});
const dayLabel=new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:zone});
const timeLabel=new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone});
const inputTime=(value:string)=>timeLabel.format(new Date(value));
function addDays(date:Date,days:number){const next=new Date(date);next.setUTCDate(next.getUTCDate()+days);return next;}

export function ManualCalendar(){
 const [today]=useState(()=>new Date()),[month,setMonth]=useState(()=>new Date(dateKey(new Date()).slice(0,7)+'-01T12:00:00Z'));
 const [events,setEvents]=useState<CalendarEvent[]>([]),[selected,setSelected]=useState(''),[editing,setEditing]=useState<CalendarEvent|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const first=useMemo(()=>new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1,12)),[month]);
 const gridStart=useMemo(()=>addDays(first,-first.getUTCDay()),[first]);
 const days=useMemo(()=>Array.from({length:42},(_,index)=>addDays(gridStart,index)),[gridStart]);
 const close=()=>{setSelected('');setEditing(null);setError('');};
 const load=useCallback(async()=>{
  const response=await fetch(`/api/v1/admin/calendar-events?from=${encodeURIComponent(addDays(gridStart,-1).toISOString())}&to=${encodeURIComponent(addDays(gridStart,43).toISOString())}`);
  const data=await response.json();if(!response.ok)throw Error(data.error?.message||'No fue posible cargar el calendario.');setEvents(data);
 },[gridStart]);
 useEffect(()=>{let active=true;const controller=new AbortController();fetch(`/api/v1/admin/calendar-events?from=${encodeURIComponent(addDays(gridStart,-1).toISOString())}&to=${encodeURIComponent(addDays(gridStart,43).toISOString())}`,{signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error?.message||'No fue posible cargar el calendario.');if(active)setEvents(data);}).catch(reason=>{if(active)setError(reason.message);});return()=>{active=false;controller.abort();};},[gridStart]);
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');const fd=new FormData(event.currentTarget);
  const body={...(editing?{id:editing.id}:{}),title:String(fd.get('title')||''),date:String(fd.get('date')||''),start:String(fd.get('start')||''),endDate:String(fd.get('endDate')||''),end:String(fd.get('end')||''),location:String(fd.get('location')||''),notes:String(fd.get('notes')||'')};
  try{const response=await fetch('/api/v1/admin/calendar-events',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'No fue posible guardar el evento.');await load();close();}
  catch(reason){setError(reason instanceof Error?reason.message:'No fue posible guardar el evento.');}finally{setBusy(false);}
 }
 async function remove(){
  if(!editing||!window.confirm(editing.source==='booking'?'¿Cancelar esta reserva y liberar sus equipos y técnicos? Se conservará el historial.':'¿Eliminar este evento del calendario?'))return;
  setBusy(true);setError('');
  try{const response=await fetch('/api/v1/admin/calendar-events',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editing.id,source:editing.source||'manual'})});const data=await response.json();if(!response.ok)throw Error(data.error?.message||'No fue posible eliminar el evento.');await load();close();}
  catch(reason){setError(reason instanceof Error?reason.message:'No fue posible eliminar el evento.');}finally{setBusy(false);}
 }
 const byDay=(day:string)=>events.filter(item=>+new Date(item.start_at)<+new Date(day+'T00:00:00-05:00')+86400000&&+new Date(item.end_at)>+new Date(day+'T00:00:00-05:00'));
 return <div className="manual-calendar">
  <div className="calendar-toolbar"><button className="button secondary compact" onClick={()=>setMonth(new Date(dateKey(today).slice(0,7)+'-01T12:00:00Z'))}>Hoy</button><div className="actions"><button aria-label="Mes anterior" className="calendar-arrow" onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1,12)))}>‹</button><button aria-label="Mes siguiente" className="calendar-arrow" onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1,12)))}>›</button></div><h2>{monthLabel.format(first)}</h2><span>Haz clic en un día para agregar un alquiler</span></div>
  {error&&!selected&&<p role="alert" className="message-error">{error}</p>}
  <div className="calendar-scroll"><div className="calendar-grid"><div className="calendar-weekdays">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(day=><strong key={day}>{day}</strong>)}</div><div className="calendar-days">{days.map(day=>{const key=dateKey(day),outside=day.getUTCMonth()!==month.getUTCMonth();return <div key={key} className={`calendar-day${outside?' outside':''}${key===dateKey(today)?' today':''}`}><button type="button" className="calendar-add" aria-label={`Agregar evento el ${dayLabel.format(day)}`} onClick={()=>{setEditing(null);setSelected(key);setError('');}}><span className="calendar-number">{day.getUTCDate()}</span></button><div className="calendar-events">{byDay(key).map(item=><button type="button" className={`calendar-event ${item.source==='booking'?'calendar-booking':''}`} key={item.id} onClick={()=>{setEditing(item);setSelected(dateKey(new Date(item.start_at)));setError('');}}><strong>{inputTime(item.start_at)}</strong> {item.title}{item.location&&<small>{item.location}</small>}</button>)}</div></div>;})}</div></div></div>
  {selected&&<div className="calendar-modal" role="presentation" onMouseDown={event=>{if(!busy&&event.target===event.currentTarget)close();}}><form key={editing?.id||selected} className="card calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-dialog-title" onSubmit={save}><div className="calendar-dialog-head"><div><span className="eyebrow">{editing?editing.source==='booking'?'Reserva confirmada':'Editar evento':'Nuevo evento'}</span><h2 id="calendar-dialog-title">{editing?.title||`Alquiler del ${dayLabel.format(new Date(selected+'T12:00:00-05:00'))}`}</h2></div><button type="button" aria-label="Cerrar" className="calendar-close" disabled={busy} onClick={close}>×</button></div>
  {editing?.source==='booking'?<><p>{dayLabel.format(new Date(editing.start_at))} · {inputTime(editing.start_at)} — {dayLabel.format(new Date(editing.end_at))} · {inputTime(editing.end_at)}</p><p>{editing.location}</p><p style={{whiteSpace:'pre-wrap'}}>{editing.notes}</p><Link className="button secondary" href={`/admin/leads/${editing.lead_id}`}>Editar información y técnicos</Link></>:<fieldset className="lead-fields" disabled={busy}><div className="fields"><label className="field">Nombre del evento<input name="title" required autoFocus defaultValue={editing?.title||''} placeholder="Alquiler · Cliente"/></label><label className="field">Lugar<input name="location" defaultValue={editing?.location||''} placeholder="Dirección o salón"/></label><label className="field">Fecha de inicio<input name="date" type="date" required defaultValue={selected}/></label><label className="field">Hora de inicio<input name="start" type="time" required defaultValue={editing?inputTime(editing.start_at):'09:00'}/></label><label className="field">Fecha de cierre<input name="endDate" type="date" required defaultValue={editing?dateKey(new Date(editing.end_at)):selected}/></label><label className="field">Hora de cierre<input name="end" type="time" required defaultValue={editing?inputTime(editing.end_at):'17:00'}/></label></div><label className="field">Notas<textarea name="notes" defaultValue={editing?.notes||''} placeholder="Cliente, equipos, técnicos y observaciones"/></label></fieldset>}
  {error&&<p className="message-error" role="alert">{error}</p>}<div className="actions">{editing?.source!=='booking'&&<button className="button" disabled={busy}>{busy?'Guardando…':'Guardar evento'}</button>}{editing&&<button className="button secondary" type="button" disabled={busy} onClick={()=>void remove()}>{editing.source==='booking'?'Cancelar reserva':'Eliminar evento'}</button>}<button className="button secondary" type="button" disabled={busy} onClick={close}>{editing?'Cerrar':'Cancelar'}</button></div></form></div>}
 </div>;
}
