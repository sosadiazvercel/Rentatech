import type {Metadata} from 'next';
import {RentalWizard} from '@/components/rental-wizard';
import {catalog} from '@/server/rental';
import {fallbackCatalog,isDatabaseUnavailable} from '@/server/rental-fallback';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Cotiza tu experiencia de realidad virtual'};

async function safeCatalog(){
 try{return await catalog();}
 catch(e){if(isDatabaseUnavailable(e))return fallbackCatalog();throw e;}
}

export default async function Quote({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const p=await searchParams;
 const data=await safeCatalog();
 const q=Number(p.cantidad);
 const model=data.products.find(product=>product.code===p.equipo)?.code??data.products.find(product=>product.code==='QUEST3')?.code??data.products[0]?.code;
 return <div className="wrap"><div className="page-head"><div className="eyebrow">Elige. Alquila. Crea.</div><h1>Prepara tu experiencia.</h1><p>Consulta equipos, fecha y precio estimado. Nuestro equipo revisara los detalles antes de confirmar tu reserva.</p></div>{model?<RentalWizard products={data.products} model={model} quantity={Number.isInteger(q)&&q>=3?q:3}/>:<p className="notice">Próximamente publicaremos los equipos disponibles.</p>}</div>;
}
