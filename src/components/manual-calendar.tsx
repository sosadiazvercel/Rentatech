'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import type {CalendarEvent} from '@/lib/manual-calendar';

const zone='America/Bogota';
const dateKey=(date:Date)=>date.toLocaleDateString('en-CA',{timeZone:zone});
const monthLabel=new Intl.DateTimeFormat('es-CO',{month:'long',year:'numeric',timeZone:zone});
const dayLabel=new Intl.DateTimeFormat('es-CO',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:zone});
const timeLabel=new Intl.DateTimeFormat('es-CO',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:zone});
function addDays(date:Date,days:number){const next=new Date(date);next.setUTCDate(next.getUTCDate()+days);return next;}
function inputDate(date:Date){return date.toISOString().slice(0,10);}

export function ManualCalendar(){
 const today=useMemo(()=>new Date(),[]),[month,setMonth]=useState(()=>new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1,12)));
 const [events,setEvents]=useState<CalendarEvent[]>([]),[selected,setSelected]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const first=useMemo(()=>new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),1,12)),[month]);
 const gridStart=useMemo(()=>addDays(first,-first.getUTCDay()),[first]);
 const days=useMemo(()=>Array.from({length:42},(_,index)=>addDays(gridStart,index)),[gridStart]);
 const load=useCallback(async()=>{const from=addDays(gridStart,-1).toISOString(),to=addDays(gridStart,43).toISOString();const response=await fetch(`/api/v1/admin/calendar-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);if(response.ok)setEvents(await response.json());},[gridStart]);
 useEffect(()=>{void load();},[load]);
 async function save(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError('');const form=event.currentTarget,fd=new FormData(form);
  const body={title:String(fd.get('title')||''),date:String(fd.get('date')||''),start:String(fd.get('start')||''),endDate:String(fd.get('endDate')||''),end:String(fd.get('end')||''),location:String(fd.get('location')||''),notes:String(fd.get('notes')||'')};
  try{const response=await fetch('/api/v1/admin/calendar-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'No fue posible guardar el evento.');setSelected('');await load();}
  catch(reason){setError(reason instanceof Error?reason.message:'No fue posible guardar el evento.');}finally{setBusy(false);}
 }
 const byDay=(day:string)=>events.filter(item=>dateKey(new Date(item.start_at))===day);
 return <div className="manual-calendar">
  <div className="calendar-toolbar"><button className="button secondary compact" onClick={()=>setMonth(new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),1,12)))}>Hoy</button><div className="actions"><button aria-label="Mes anterior" className="calendar-arrow" onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()-1,1,12)))}>‹</button><button aria-label="Mes siguiente" className="calendar-arrow" onClick={()=>setMonth(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,1,12)))}>›</button></div><h2>{monthLabel.format(first)}</h2><span>Haz clic en un día para agregar un alquiler</span></div>
  <div className="calendar-scroll"><div className="calendar-grid"><div className="calendar-weekdays">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(day=><strong key={day}>{day}</strong>)}</div><div className="calendar-days">{days.map(day=>{const key=inputDate(day),items=byDay(key),outside=day.getUTCMonth()!==month.getUTCMonth();return <button type="button" key={key} className={`calendar-day${outside?' outside':''}${key===dateKey(today)?' today':''}`} aria-label={`Agregar evento el ${dayLabel.format(day)}`} onClick={()=>{setSelected(key);setError('');}}><span className="calendar-number">{day.getUTCDate()}</span><span className="calendar-events">{items.map(item=><span className="calendar-event" key={item.id}><strong>{timeLabel.format(new Date(item.start_at))}</strong> {item.title}{item.location&&<small>{item.location}</small>}</span>)}</span></button>;})}</div></div></div>
  {selected&&<div className="calendar-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected('');}}><form className="card calendar-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-dialog-title" onSubmit={save}><div className="calendar-dialog-head"><div><span className="eyebrow">Nuevo evento</span><h2 id="calendar-dialog-title">Alquiler del {dayLabel.format(new Date(`${selected}T12:00:00-05:00`))}</h2></div><button type="button" aria-label="Cerrar" className="calendar-close" onClick={()=>setSelected('')}>×</button></div><div className="fields"><label className="field">Nombre del evento<input name="title" required autoFocus placeholder="Alquiler Meta Quest 3 · Cliente"/></label><label className="field">Lugar<input name="location" placeholder="Dirección o salón"/></label><label className="field">Fecha de inicio<input name="date" type="date" required defaultValue={selected}/></label><label className="field">Hora de inicio<input name="start" type="time" required defaultValue="09:00"/></label><label className="field">Fecha de cierre<input name="endDate" type="date" required defaultValue={selected}/></label><label className="field">Hora de cierre<input name="end" type="time" required defaultValue="17:00"/></label></div><label className="field">Notas<textarea name="notes" placeholder="Cliente, equipos, técnicos y observaciones"/></label>{error&&<p className="message-error" role="alert">{error}</p>}<div className="actions"><button className="button" disabled={busy}>{busy?'Guardando…':'Guardar evento'}</button><button className="button secondary" type="button" disabled={busy} onClick={()=>setSelected('')}>Cancelar</button></div></form></div>}
 </div>;
}
