import {requireStaff} from '@/server/auth';
import {ManualCalendar} from '@/components/manual-calendar';

export default async function Calendar(){
 await requireStaff();
 return <section className="section"><h1 style={{fontSize:40}}>Calendario de reservas</h1><p>Agenda interna del equipo · Hora de Bogotá</p><ManualCalendar/></section>;
}
