import type {Metadata} from 'next';
import {ProductCards} from '@/components/marketing';
import {getPublicProducts} from '@/server/public-products';

export const metadata:Metadata={title:'Realidad virtual para eventos'};

export default async function Events(){const products=await getPublicProducts();return <div className="wrap">
 <div className="page-head">
  <p className="eyebrow">Realidad Virtual</p>
  <h1>Meta Quest para eventos.</h1>
  <p>Por ahora trabajamos una sola categoria: realidad virtual. Puedes solicitar Meta Quest 2 o Meta Quest 3 y el equipo revisa disponibilidad antes de confirmar.</p>
 </div>
 <ProductCards products={products}/>
</div>;}
