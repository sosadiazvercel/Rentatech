import type {Metadata} from 'next';
import Link from 'next/link';
import {ProductCards} from '@/components/marketing';
import {getPublicProducts} from '@/server/public-products';
import s from '@/components/marketing.module.css';
import {categorySlug} from '@/lib/catalog';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Realidad virtual'};

export default async function VR({searchParams}:{searchParams:Promise<{categoria?:string}>}){
 const {categoria}=await searchParams;
 const products=await getPublicProducts();
 const categories=[...new Set(products.flatMap(p=>p.categories))];
 const visible=categoria?products.filter(p=>p.categories.some(c=>categorySlug(c)===categoria)):products;
 return <div className="wrap">
  <div className={s.categoryHead}>
   <div>
    <p className="breadcrumb">Equipos / Realidad virtual</p>
    <h1>Realidad Virtual</h1>
   </div>
   <p>Equipos Meta listos para eventos y experiencias inmersivas. Renta tecnologia de ultima generacion, sin complicaciones.</p>
  </div>
  <div className={s.categoryLayout}>
   <aside className={s.filters} aria-label="Explorar">
    <p>Explorar</p>
    <Link href="/vr" aria-current={!categoria?'page':undefined}>Todos</Link>
    {categories.map(category=><Link key={category} href={`/vr?categoria=${categorySlug(category)}`} aria-current={categoria===categorySlug(category)?'page':undefined}>{category}</Link>)}
   </aside>
   {visible.length?<ProductCards products={visible}/>:<p className="notice">No hay productos publicados en esta categoría.</p>}
  </div>
 </div>;
}
