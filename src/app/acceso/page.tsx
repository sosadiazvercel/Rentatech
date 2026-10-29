import {LoginForm} from '@/components/login-form';
import {basicAdminEmail} from '@/server/auth';

export default function Login(){return <div className="wrap"><section className="card login-card"><div className="eyebrow">Espacio del equipo</div><h1>Todo empieza con una conversación.</h1><p>Accede para administrar productos, solicitudes, cotizaciones, reservas y operaciones.</p><LoginForm defaultEmail={basicAdminEmail()}/><p style={{fontSize:11,margin:'20px 0 0'}}>Acceso exclusivo para el equipo autorizado de RENTATECH.</p></section></div>;}
