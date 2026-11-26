import {HomeHero} from '@/components/home-hero';
import {ProductCards} from '@/components/marketing';
import {getPublicProducts} from '@/server/public-products';

export const dynamic='force-dynamic';

export default async function Home() {
 const products=(await getPublicProducts()).filter(p=>p.featured).slice(0,3);
 return <div className="home-page">
  <HomeHero products={products}/>
  <section className="section home-catalog">
   <div className="section-heading">
    <div>
     <h2>Nuestros equipos</h2>
    </div>
    <p>Equipos únicos de última tecnología para crear experiencias interactivas memorables.</p>
   </div>
   <ProductCards products={products} compact/>
  </section>
 </div>;
}
