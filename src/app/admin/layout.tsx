import {redirect} from 'next/navigation';
import Link from 'next/link';
import {currentStaff} from '@/server/auth';
import {Logout} from '@/components/login-form';

export const dynamic='force-dynamic';

export default async function AdminLayout({children}:{children:React.ReactNode}){
 const staff=await currentStaff();
 if(!staff)redirect('/acceso');
 return <div className="wrap"><div className="admin-bar"><div><Link href="/admin/leads"><strong>CRM · Solicitudes</strong></Link><div><small className="muted">{staff.role==='admin'?'Administrador':'Operador'} · Gestión comercial</small></div></div><nav className="admin-tools" aria-label="Panel del equipo"><Link href="/admin/productos" className="button secondary compact">Productos</Link><Link href="/admin/leads" className="button secondary compact">Solicitudes</Link><Link href="/admin/operaciones" className="button secondary compact">Operaciones</Link><Logout/></nav></div>{children}</div>;
}
