'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function CalendarSettings({initialId}:{initialId:string}){
 const router=useRouter();
 const [id,setId]=useState(initialId);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');
  try{
   const response=await fetch('/api/v1/admin/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
   const body=await response.json() as {id?:string;error?:{message?:string}};
   if(!response.ok)throw new Error(body.error?.message||'No fue posible guardar el calendario.');
   setId(body.id||'');setMessage(body.id?'Calendario conectado correctamente.':'Se quitó la conexión del calendario.');router.refresh();
  }catch(error){setMessage(error instanceof Error?error.message:'No fue posible guardar el calendario.');}
  finally{setBusy(false);}
 }
 return <form className="card calendar-settings" onSubmit={submit}>
  <h2>Conectar Google Calendar</h2>
  <p>Crea el calendario una sola vez en Google y pega aquí su ID. Al guardar aparecerá abajo, sin configurar variables en Vercel.</p>
  <a className="button secondary compact" href="https://calendar.google.com/calendar/u/0/r/settings/createcalendar" target="_blank" rel="noreferrer">Crear calendario en Google</a>
  <label className="field">ID del calendario
   <input name="calendarId" value={id} onChange={event=>setId(event.target.value)} placeholder="reservas@group.calendar.google.com" autoComplete="off"/>
  </label>
  <p className="muted">En Google Calendar: Configuración del calendario → Integrar el calendario → ID del calendario.</p>
  <div className="actions"><button className="button" disabled={busy}>{busy?'Guardando…':'Guardar y mostrar calendario'}</button></div>
  <p aria-live="polite">{message}</p>
 </form>;
}
