import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {FitTitle} from '@/components/fit-title';
import {Headset} from '@/components/headset';
import {getPublicProduct,getPublicProducts} from '@/server/public-products';
import s from '@/components/marketing.module.css';

export const dynamic='force-dynamic';

export async function generateStaticParams(){return (await getPublicProducts()).map(product=>({slug:product.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const product=await getPublicProduct(slug);return {title:product?.title||'Equipo'};}

export default async function Product({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const product=await getPublicProduct(slug);
 if(!product)notFound();
 return <div className="wrap">
  <p className="breadcrumb"><Link href="/vr">{product.category}</Link>{product.brand&&<> / {product.brand}</>} / {product.title}</p>
  <section className={s.productDetail}>
   <div className={`${s.detailImage} product-image-frame`}><Headset model={product.code} image={product.image} title={product.title}/></div>
   <div className={s.detailPanel}>
    <FitTitle className={s.detailTitle} max={48} min={16}>{product.title}</FitTitle>
    <div className={s.detailPrice}>{product.price}<span>/ dia</span></div>
    <Link className="button wide" href={`/cotizar?equipo=${product.code}`}>Solicitar cotizacion</Link>
    <p>{product.text}</p>
    <dl>{product.specs.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
   </div>
  </section>
 </div>;
}
