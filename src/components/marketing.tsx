import Link from 'next/link';
import {FitTitle} from './fit-title';
import {Headset} from './headset';
import {ArrowIcon} from './arrow-icon';
import type {PublicProduct} from '@/server/public-products';
import s from './marketing.module.css';

export function ProductCards({products,compact=false}:{products:PublicProduct[];compact?:boolean}){return <div className={s.catalogGrid}>{products.map(p=><article key={p.code} className={`${s.productTile} ${compact?s.compactTile:''}`}>
 <Link className={`${s.productPhoto} product-image-frame`} href={p.href} aria-label={`Ver ${p.title}`}>
  <Headset model={p.code} image={p.image} title={p.title}/>
 </Link>
 <div className={s.productInfo}>
  <FitTitle as="h3" className={s.productTitle} max={compact?22:28} min={13}>{p.title}</FitTitle>
  <p>{p.text}</p>
  {compact?<Link className={s.productArrow} href={p.href} aria-label={`Ver ${p.title}`}><ArrowIcon/></Link>:<div className={s.productActions}>
   <div><strong>{p.price}</strong><span>/ dia</span></div>
   <Link className="button compact" href={`/cotizar?equipo=${p.code}`}>Solicitar cotizacion</Link>
  </div>}
 </div>
 </article>)}</div>;}

export function Closing(){return <section className={s.simpleClosing}>
 <h2>Cuéntanos que necesitas rentar.</h2>
 <Link className="button" href="/cotizar">Solicitar cotizacion</Link>
</section>;}
