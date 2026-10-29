'use client';

import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {PublicProduct} from '@/server/public-products';
import s from './marketing.module.css';

export function HomeHero({products}:{products:PublicProduct[]}){
 const heroProducts=products.length?products:[];
 const [active,setActive]=useState(Math.min(1,Math.max(0,heroProducts.length-1)));
 const product=heroProducts[active]??heroProducts[0];
 if(!product)return null;
 return <section className={s.heroShowcase}>
  <div className={s.heroCopy}>
   <h1>Realidad virtual,<br/>lista para usar.</h1>
   <p>Boutique de renta de tecnología para experiencias, eventos y activaciones.</p>
   <div className="actions">
    <Link className="button light" href="/cotizar">Cotizar</Link>
    <Link className="button ghostDark" href="/vr">Ver equipos</Link>
   </div>
  </div>
  <div className={s.heroCounter} aria-live="polite">
   <strong>{product.title}</strong>
   <span>{String(active+1).padStart(2,'0')} / {String(heroProducts.length).padStart(2,'0')}</span>
  </div>
  <div className={`${s.heroDevice} product-image-frame`} style={{position:'relative'}}>
   <Image key={product.image} src={product.image} alt={product.title} fill preload={active===1} sizes="(max-width: 760px) 100vw, 720px"/>
  </div>
  <div className={s.heroSelector} aria-label="Galeria de productos">
   <div className={s.selectorTabs}>
    <span>{product.category}</span>
   </div>
   {heroProducts.map((item,index)=><button key={item.code} type="button" className={index===active?s.activeThumb:''} onClick={()=>setActive(index)} aria-label={`Mostrar ${item.title}`} aria-pressed={index===active}>
    <span className="product-image-frame"><Image src={item.image} alt="" width={140} height={90}/></span><small>{item.title}</small>
   </button>)}
  </div>
 </section>;
}
