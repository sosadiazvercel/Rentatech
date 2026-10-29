import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { getPublicProducts } from '@/server/public-products';
import './globals.css';

export const metadata: Metadata = {
    title: { default: 'RENTA TECH · Realidad virtual', template: '%s · RENTA TECH' },
    description: 'Renta de Meta Quest 2 y Meta Quest 3 para eventos y experiencias de realidad virtual.',
    icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
    robots: { index: false, follow: false },
};

export default async function Layout({ children }: { children: React.ReactNode }) {
    const products = await getPublicProducts(); return <html lang="es"><body>
        <a className="skip" href="#contenido">Saltar al contenido</a>
        <SiteHeader products={products} />
        <main id="contenido">{children}</main>
        <footer className="footer"><div className="wrap footer-inner">
            <div><Link className="brand" href="/">RENTA TECH</Link><p>Renta de tecnologia para eventos. Bogota, Colombia.</p></div>
            <nav className="footer-links" aria-label="Informacion">
                <Link href="/vr">Realidad virtual</Link>
                <Link href="/cotizar">Cotizar</Link>
                {/* <Link href="/politicas/privacidad">Privacidad</Link>
   <Link href="/creditos">Creditos de imagenes</Link> */}
                <Link href="/admin">Acceso equipo</Link>
            </nav>
        </div></footer>
    </body></html>;
}
