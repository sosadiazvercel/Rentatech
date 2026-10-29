'use client';

import {type FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Headset} from './headset';
import {ArrowIcon} from './arrow-icon';
import {categorySlug} from '@/lib/catalog';
import type {PublicProduct} from '@/server/public-products';

export function SiteHeader({products}:{products:PublicProduct[]}){
 const [open,setOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),[query,setQuery]=useState(''),[megaOpen,setMegaOpen]=useState(false),[featured,setFeatured]=useState(Math.min(1,products.length-1));
 const inputRef=useRef<HTMLInputElement>(null);
 const router=useRouter();
 const categories=[...new Set(products.flatMap(p=>p.categories))];
 const close=()=>{setOpen(false);setSearchOpen(false);setMegaOpen(false);};
 const openSearch=()=>{setOpen(false);setMegaOpen(false);setSearchOpen(true);};
 const results=useMemo(()=>{
  const q=query.trim().toLowerCase();
  if(!q)return products;
  return products.filter(p=>(p.title+' '+p.categories.join(' ')+' '+p.meta+' '+p.code).toLowerCase().includes(q));
 },[products,query]);
 useEffect(()=>{if(searchOpen)inputRef.current?.focus();},[searchOpen]);
 function submitSearch(e:FormEvent){
  e.preventDefault();
  const target=results[0]?.href??'/vr';
  close();
  router.push(target);
 }
 return <header className="header">
  <div className="wrap header-inner">
   <Link className="brand" href="/" onClick={close}>RENTA TECH<small>by SosaDiaz</small></Link>
   <div className="mobile-actions" aria-label="Acciones rapidas">
    <button className="mobile-icon mobile-search" type="button" aria-label="Buscar" aria-expanded={searchOpen} onClick={openSearch}><span/></button>
    <Link className="button black" href="/pagos">Pagos</Link>
    <button className="menu-toggle mobile-icon mobile-burger" type="button" aria-label="Abrir menu" aria-expanded={open} onClick={()=>setOpen(!open)}><span/></button>
   </div>
   <nav className="nav" aria-label="Navegacion principal">
    <div className={`nav-mega-item ${megaOpen?'mega-open':''}`} onMouseEnter={()=>setMegaOpen(true)} onMouseLeave={()=>setMegaOpen(false)} onKeyDown={e=>{if(e.key==='Escape')setMegaOpen(false);}}>
     <button type="button" className="nav-mega-trigger" aria-expanded={megaOpen} aria-controls="vr-menu" onClick={()=>setMegaOpen(!megaOpen)}>Realidad Virtual <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" fill="none" stroke="currentColor"/></svg></button>
     <div id="vr-menu" className="mega-menu" role="group" aria-label="Productos de realidad virtual">
      <div className="mega-inner">
       <div className="mega-browse">
        <p>Explorar</p>

        <Link href="/vr" onMouseEnter={()=>setFeatured(Math.min(1,products.length-1))} onFocus={()=>setFeatured(Math.min(1,products.length-1))} onClick={close}>Todos</Link>
        {categories.map(category=><Link key={category} href={`/vr?categoria=${categorySlug(category)}`} onMouseEnter={()=>setFeatured(Math.max(0,products.findIndex(p=>p.categories.includes(category))))} onFocus={()=>setFeatured(Math.max(0,products.findIndex(p=>p.categories.includes(category))))} onClick={close}>{category}</Link>)}
       </div>
       <div className="mega-featured">
        <p>Destacados</p>
        <div className="mega-products">
         {products.slice(featured,featured+1).map(p=><Link className="mega-product" href={p.href} key={p.code} onClick={close}>
          <span className="product-image-frame"><Headset model={p.code} image={p.image} title={p.title}/></span>
          <strong>{p.title}</strong>
          <small>{p.meta}</small>

         </Link>)}
        </div>
       </div>
       <div className="mega-copy">
        <p>Realidad virtual</p>
        <span>Equipos Meta Quest probados y listos para eventos, activaciones y experiencias inmersivas.</span>
        <Link href="/cotizar">Solicitar una cotización <ArrowIcon/></Link>
        <Link href="/vr">Ver todos los equipos <ArrowIcon/></Link>
       </div>
      </div>
     </div>
    </div>
    <button className="desktop search-trigger" type="button" aria-expanded={searchOpen} onClick={openSearch}><svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor"/><path d="m12 12 5 5" stroke="currentColor"/></svg>Buscar</button>
    <Link className="button black" href="/cotizar">Solicitar cotizacion</Link>
    <Link className="header-pay-link" href="/pagos">Pagos</Link>
   </nav>
  </div>
  <div className={`site-search ${searchOpen?'open':''}`} role="search">
   <form className="site-search-bar" onSubmit={submitSearch}>
    <span className="mobile-search" aria-hidden="true"><span/></span>
    <input ref={inputRef} value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){setSearchOpen(false);setQuery('');}}} placeholder="Buscar producto" aria-label="Buscar producto" autoComplete="off"/>
    <button type="button" onClick={()=>{setSearchOpen(false);setQuery('');}}>Esc</button>
   </form>
   <div className="site-search-results" aria-label="Resultados de busqueda">
    {results.length?results.map(p=><Link key={p.href} href={p.href} onClick={close}>
     <span className="search-thumb"><Image src={p.image} alt="" width={96} height={72}/></span>
     <strong>{p.title}</strong>
     <span>{p.category}</span>
     <em>{p.price} <small>/ dia</small></em>
    </Link>):<div className="site-search-empty">No encontramos productos con ese nombre.</div>}
   </div>
  </div>
  <div className={`mobile-menu ${open?'open':''}`}>
   <nav aria-label="Menu movil">
    <Link href="/vr" onClick={close}>Realidad virtual <ArrowIcon/></Link>
    {products.map(p=><Link href={p.href} onClick={close} key={p.code}>{p.title} <ArrowIcon/></Link>)}
    <Link href="/cotizar" onClick={close}>Cotizar <ArrowIcon/></Link>
    <Link href="/pagos" onClick={close}>Pagos <ArrowIcon/></Link>
   </nav>
   <div className="mobile-portal">
    <Link href="/admin" onClick={close}>Portal cliente <ArrowIcon/></Link>
    <div>
     <strong>Prepara tu evento</strong>
     <p>Cuentanos fecha, ciudad y cantidad de visores. Revisamos disponibilidad antes de confirmar.</p>
     <Link className="button light compact" href="/cotizar" onClick={close}>Solicitar cotizacion</Link>
    </div>
   </div>
  </div>
 </header>;
}
