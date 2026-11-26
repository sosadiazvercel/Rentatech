import type {Metadata} from 'next';
import {RentalWizard} from '@/components/rental-wizard';
import {minimumFor} from '@/lib/products';
import {catalog} from '@/server/rental';
import {fallbackCatalog,isDatabaseUnavailable} from '@/server/rental-fallback';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Cotiza tu alquiler de equipos'};

async function safeCatalog(){
 try{return await catalog();}
 catch(e){if(isDatabaseUnavailable(e))return fallbackCatalog();throw e;}
}

export default async function Quote({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const data=await safeCatalog();
 const q=Number(p.cantidad);
 const model=data.products.find(product=>product.code===p.equipo)?.code??data.products.find(product=>product.code==='QUEST3')?.code??data.products[0]?.code;
 return <div className="wrap">{model?<RentalWizard products={data.products} model={model} quantity={Number.isInteger(q)&&q>=1?q:minimumFor(model)}/>:<p className="notice">Próximamente publicaremos los equipos disponibles.</p>}</div>;
}
