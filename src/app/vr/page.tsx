import type {Metadata} from 'next';
import Link from 'next/link';
import {ProductCards} from '@/components/marketing';
import {getPublicProducts} from '@/server/public-products';
import s from '@/components/marketing.module.css';
import {categorySlug} from '@/lib/catalog';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Nuestros equipos'};

export default async function VR({searchParams}:{searchParams:Promise<{categoria?:string}>}){
 const {categoria}=await searchParams;
 const products=await getPublicProducts();
 const categories=[...new Set(products.flatMap(p=>p.categories))];
 const visible=categoria?products.filter(p=>p.categories.some(c=>categorySlug(c)===categoria)):products;
 return <div className="wrap">
  <div className={s.categoryHead}>
   <div>
    <p className="breadcrumb">Catálogo / Equipos</p>
    <h1>Nuestros equipos</h1>
   </div>
   <p>Equipos únicos de última tecnología para crear experiencias interactivas memorables.</p>
  </div>
  <div className={s.categoryLayout}>
   <aside className={s.filters} aria-label="Explorar">
    <p>Explorar</p>
    <Link href="/equipos" aria-current={!categoria?'page':undefined}>Todos</Link>
    {categories.map(category=><Link key={category} href={`/equipos?categoria=${categorySlug(category)}`} aria-current={categoria===categorySlug(category)?'page':undefined}>{category}</Link>)}
   </aside>
   {visible.length?<ProductCards products={visible}/>:<p className="notice">No hay productos publicados en esta categoría.</p>}
  </div>
 </div>;
}
