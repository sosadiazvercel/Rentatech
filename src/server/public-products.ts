import 'server-only';
import {catalog} from './rental';
import {fallbackCatalog,isDatabaseUnavailable} from './rental-fallback';
import {money} from '@/lib/rental';

type ProductMeta={
 image:string;
 text:string;
 meta:string;
 specs:[string,string][];
};

const known:Record<string,ProductMeta>={
 QUEST2:{
  image:'/images/meta-quest-2-cutout.png',
  text:'Realidad virtual inalambrica y versatil para tus eventos.',
  meta:'128 GB / 2 controles touch / seguimiento 6DOF',
  specs:[['Tipo','Standalone VR'],['Almacenamiento','128 GB'],['Resolucion','1832 x 1920 por ojo'],['Mandos','Touch incluidos'],['Seguimiento','Inside-out'],['Passthrough','Blanco y negro']],
 },
 QUEST3:{
  image:'/images/meta-quest-3-cutout.png',
  text:'Nuestro equipo principal para experiencias inmersivas y contenido con mayor nitidez.',
  meta:'512 GB / 2 controles Touch Plus / seguimiento 6DOF',
  specs:[['Tipo','Standalone VR'],['Almacenamiento','512 GB'],['Resolucion','2064 x 2208 por ojo'],['Mandos','Touch Plus incluidos'],['Seguimiento','Inside-out'],['Passthrough','A color']],
 },
};

const generic:ProductMeta={
 image:'/images/product-placeholder.svg',
 text:'Equipo de realidad virtual disponible para eventos y experiencias inmersivas.',
 meta:'Realidad virtual / inventario operativo',
 specs:[['Tipo','Realidad virtual'],['Operacion','Acompanamiento tecnico'],['Disponibilidad','Sujeta a validacion']],
};

function slugify(value:string){
 return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

async function safeCatalog(){
 try{return await catalog();}
 catch(e){if(isDatabaseUnavailable(e))return fallbackCatalog();throw e;}
}

export type PublicProduct={
 code:string;
 title:string;
 slug:string;
 href:string;
 category:string;
 categories:string[];
 brand:string;
 featured:boolean;
 price:string;
 inventory:number;
 image:string;
 text:string;
 meta:string;
 specs:[string,string][];
};

export async function getPublicProducts():Promise<PublicProduct[]>{
 const data=await safeCatalog();
 return data.products.map(product=>{
  const meta=known[product.code]??generic;
  const price=data.startingPrices.find(p=>p.code===product.code);
  return {
   code:product.code,
   title:product.name,
   slug:'slug' in product?product.slug:slugify(product.name||product.code),
   href:`/vr/${'slug' in product?product.slug:slugify(product.name||product.code)}`,
   category:'categories' in product?product.categories[0]:'Realidad virtual',
   categories:'categories' in product?product.categories:['Realidad virtual',...(product.code==='QUEST3'?['Realidad mixta']:[])],
   brand:'brand' in product?product.brand:'Meta',
   featured:'featured' in product?product.featured:true,
   price:price?.hardware!=null?money(Math.round(price.hardware/3)):'Por revisar',
   inventory:product.inventory,
   image:'image_version' in product&&product.image_version?`/api/v1/products/${encodeURIComponent(product.code)}/image?v=${product.image_version}`:meta.image,
   text:'description' in product?product.description:meta.text,
   meta:'summary' in product?product.summary:meta.meta,
   specs:'specifications' in product?product.specifications:meta.specs,
  };
 });
}

export async function getPublicProduct(slug:string){
 const products=await getPublicProducts();
 return products.find(p=>p.slug===slug||slugify(p.code)===slug);
}
