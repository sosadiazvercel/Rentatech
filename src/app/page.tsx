import {HomeHero} from '@/components/home-hero';
import {ProductCards} from '@/components/marketing';
import {getPublicProducts} from '@/server/public-products';

export const dynamic='force-dynamic';

export default async function Home() {
 const products=(await getPublicProducts()).filter(p=>p.featured);
 return <div className="home-page">
  <HomeHero products={products}/>
  <section className="section home-catalog">
   <div className="section-heading">
    <div>
     <p className="eyebrow">Nuestros equipos</p>
     <h2>Realidad Virtual</h2>
    </div>
    <p>Equipos de realidad virtual listos para crear experiencias memorables.</p>
   </div>
   <ProductCards products={products} compact/>
  </section>
 </div>;
}
