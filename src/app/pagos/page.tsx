import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata:Metadata={title:'Pagos'};

export default function Payments(){return <div className="wrap"><section className="reading">
 <p className="eyebrow">Pagos</p><h1>Paga después de recibir tu cotización.</h1>
 <p>Primero revisamos la fecha, los equipos disponibles y los detalles de tu evento. Te enviaremos las instrucciones de pago junto con la cotización aprobada.</p>
 <p>El enlace de pago de prueba todavía no está integrado con cada solicitud. Si ya recibiste una cotización, responde al equipo para confirmar cómo pagarla.</p>
 <Link className="button" href="/cotizar">Solicitar cotización</Link>
 </section></div>;}
