import {z} from 'zod';

export const categorySlug=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export type ProductTier={min:number;max:number;unit:number|null};
export type CatalogFields={slug:string;brand:string;description:string;summary:string;categories:string[];specifications:[string,string][];featured:boolean;sort_order:number};
export type CatalogProduct=CatalogFields&{code:string;name:string;inventory:number;image_version:string|null};
export type AdminProduct={id:string;code:string;name:string;slug:string;brand:string;description:string;summary:string;categories:string[];specifications:[string,string][];published:boolean;active:boolean;featured:boolean;sortOrder:number;updatedAt:string;image_version:string|null;inventory:number;tiers:ProductTier[]};
const text=(max:number)=>z.string().trim().max(max);
const tier=z.object({min:z.number().int().min(3).max(10000),max:z.number().int().min(3).max(10000),unit:z.number().int().min(0).max(1000000000).nullable()}).strict();
export const productSchema=z.object({
 id:z.uuid().optional(),expectedUpdatedAt:z.iso.datetime().optional(),expectedPricingId:z.uuid(),
 code:z.string().trim().regex(/^[A-Z0-9][A-Z0-9_-]{0,39}$/,'Usa un código único en mayúsculas, sin espacios.'),
 name:text(180).min(2,'Escribe el nombre del producto.'),
 slug:text(120).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/,'La URL solo admite minúsculas, números y guiones.'),
 brand:text(120),description:text(6000),summary:text(500),
 categories:z.array(text(80).min(1).refine(value=>Boolean(categorySlug(value)),'Escribe un nombre de categoría válido.')).min(1,'Agrega al menos una categoría.').max(12).transform(values=>[...new Map(values.map(value=>[categorySlug(value),value])).values()]),
 specifications:z.array(z.tuple([text(100).min(1),text(500).min(1)])).max(40),
 published:z.boolean(),active:z.boolean(),featured:z.boolean(),sortOrder:z.number().int().min(0).max(100000),
 tiers:z.array(tier).max(30),
}).strict().superRefine((p,ctx)=>{
 if(p.id&&!p.expectedUpdatedAt)ctx.addIssue({code:'custom',message:'Recarga el producto antes de guardar.'});
 for(let i=0;i<p.tiers.length;i++){
  const a=p.tiers[i];if(a.max<a.min)ctx.addIssue({code:'custom',message:'El final de un rango debe ser igual o mayor que su inicio.'});
  for(let j=i+1;j<p.tiers.length;j++){const b=p.tiers[j];if(a.min<=b.max&&b.min<=a.max)ctx.addIssue({code:'custom',message:'Los rangos de precio se solapan.'});}
 }
});
