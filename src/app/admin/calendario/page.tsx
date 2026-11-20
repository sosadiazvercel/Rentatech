import {requireStaff} from '@/server/auth';

export default async function Calendar(){
 await requireStaff();
 const id=process.env.GOOGLE_CALENDAR_ID?.trim();
 const url=new URL('https://calendar.google.com/calendar/embed');
 if(id)url.searchParams.set('src',id);
 url.searchParams.set('ctz','America/Bogota');
 url.searchParams.set('mode','MONTH');
 return <section className="section"><h1 style={{fontSize:40}}>Calendario de reservas</h1><p>Reservas confirmadas · Hora de Bogotá</p>{id?<><p>Registra y actualiza las reservas directamente en el calendario compartido.</p><iframe className="calendar-frame" title="Calendario compartido de reservas RENTATECH" src={url.toString()}/><a className="button secondary compact" href={url.toString()} target="_blank" rel="noreferrer">Abrir en Google Calendar</a></>:<div className="notice"><h2 style={{fontSize:24}}>Calendario pendiente de configurar</h2><p>Cuando esté creado el calendario de reservas, su vista compartida aparecerá aquí.</p></div>}</section>;
}
