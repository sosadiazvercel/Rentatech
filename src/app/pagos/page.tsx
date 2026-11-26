import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata:Metadata={title:'Pagos'};

export default function Payments(){return <div className="wrap"><section className="reading">
 <p className="eyebrow">Pagos</p><h1>Paga después de recibir tu cotización.</h1>
 <p>Primero revisamos la fecha, los equipos disponibles y los detalles de tu evento. Te enviaremos las instrucciones de pago junto con la cotización aprobada.</p>
 <p>Si ya recibiste y aprobaste tu cotización, paga con la referencia indicada por nuestro equipo.</p>
 <p><a className="button" href="https://checkout.wompi.co/l/VPOS_iLusWZ">Pagar con Wompi</a></p>
 <Link className="button" href="/cotizar">Solicitar cotización</Link>
 </section></div>;}
