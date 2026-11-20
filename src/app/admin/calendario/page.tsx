import {requireStaff} from '@/server/auth';
import {calendarId} from '@/server/calendar';
import {calendarUrl} from '@/lib/calendar';
import {CalendarSettings} from '@/components/calendar-settings';

export default async function Calendar(){
 const staff=await requireStaff();
 const id=await calendarId();
 const url=id?calendarUrl(id):'';
 return <section className="section"><h1 style={{fontSize:40}}>Calendario de reservas</h1><p>Reservas confirmadas · Hora de Bogotá</p>{staff.role==='admin'&&<CalendarSettings initialId={id}/>} {id?<><p>Registra y actualiza las reservas directamente en el calendario compartido.</p><iframe className="calendar-frame" title="Calendario compartido de reservas RENTATECH" src={url}/><a className="button secondary compact" href={url} target="_blank" rel="noreferrer">Abrir en Google Calendar</a></>:<div className="notice"><h2 style={{fontSize:24}}>Calendario pendiente de conectar</h2><p>{staff.role==='admin'?'Pega arriba el ID del calendario de Google y guárdalo para mostrarlo aquí.':'Un administrador debe conectar el calendario compartido.'}</p></div>}</section>;
}
