'use client';

import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {categorySlug,type AdminProduct} from '@/lib/catalog';
import {money} from '@/lib/rental';
import {ProductPhotos} from './product-photos';
import s from './product-manager.module.css';

type Data={pricingId:string;products:AdminProduct[]};
const emptyProduct:AdminProduct={id:'',code:'',name:'',slug:'',brand:'',description:'',summary:'',categories:['Realidad virtual'],specifications:[],published:false,active:true,featured:false,sortOrder:0,updatedAt:'',image_version:null,inventory:0,tiers:[{min:3,max:15,unit:null}]};

export function ProductManager({isAdmin}:{isAdmin:boolean}){
 const router=useRouter();const [data,setData]=useState<Data|null>(null),[selected,setSelected]=useState(''),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 async function load(){const response=await fetch('/api/v1/admin/products',{cache:'no-store'});const body=await response.json();if(!response.ok)throw Error(body.error?.message??'No pudimos cargar los productos.');setData(body);return body as Data;}
 useEffect(()=>{let active=true;fetch('/api/v1/admin/products',{cache:'no-store'}).then(async response=>{const body=await response.json();if(!response.ok)throw Error(body.error?.message??'No pudimos cargar los productos.');if(active){setData(body);setSelected(body.products[0]?.id??'new');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 async function save(product:AdminProduct){
  setBusy(true);setError('');setMessage('');
  try{
   const response=await fetch('/api/v1/admin/products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:product.id||undefined,expectedUpdatedAt:product.updatedAt||undefined,expectedPricingId:data!.pricingId,code:product.code,name:product.name,slug:product.slug,brand:product.brand,description:product.description,summary:product.summary,categories:product.categories,specifications:product.specifications,published:product.published,active:product.active,featured:product.featured,sortOrder:product.sortOrder,tiers:product.tiers})});
   const body=await response.json();if(!response.ok)throw Error(body.error?.message??'No pudimos guardar el producto.');
   await load();setSelected(body.id);setMessage('Producto guardado. Los cambios ya están disponibles en la tienda.');router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar el producto.');}finally{setBusy(false);}
 }
 async function remove(product:AdminProduct){
  if(!window.confirm(`¿Eliminar definitivamente ${product.name}? Si tiene inventario o historial, tendrás que archivarlo.`))return;
  setBusy(true);setError('');setMessage('');
  try{const response=await fetch('/api/v1/admin/products',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:product.id})});const body=await response.json();if(!response.ok)throw Error(body.error?.message);const next=await load();setSelected(next.products[0]?.id??'new');setMessage('Producto eliminado.');router.refresh();}
  catch(e){setError(e instanceof Error?e.message:'No pudimos eliminar el producto.');}finally{setBusy(false);}
 }
 if(!data)return <section className="section">{error?<p className="message-error" role="alert">{error}</p>:<p>Cargando catálogo…</p>}</section>;
 const product=selected==='new'?emptyProduct:data.products.find(p=>p.id===selected);
 const results=data.products.filter(p=>(p.name+' '+p.code+' '+p.categories.join(' ')).toLowerCase().includes(query.toLowerCase()));
 return <section className={s.page}>
  <div className={s.heading}><div><p className="eyebrow">Catálogo</p><h1>Productos</h1><p>Edita lo que aparece en la tienda y las tarifas de alquiler.</p></div>{isAdmin&&<button className="button" disabled={busy} onClick={()=>{setSelected('new');setMessage('');setError('');}}>Agregar producto</button>}</div>
  {error&&<p className="message-error" role="alert">{error}</p>}{message&&<p className="message-success" role="status">{message}</p>}
  {!isAdmin&&<p className="notice">Puedes consultar el catálogo. Los cambios requieren un administrador.</p>}
  <div className={s.layout}>
   <aside className={s.list} aria-label="Lista de productos"><label className="field">Buscar producto<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nombre, código o categoría"/></label><p className="muted">{data.products.length} productos · {data.products.filter(p=>p.active&&p.published).length} publicados</p>
    {results.map(p=><button key={p.id} type="button" disabled={busy} className={`${s.item} ${p.id===selected?s.selected:''}`} onClick={()=>{setSelected(p.id);setError('');setMessage('');}}><strong>{p.name}</strong><span>{p.code} · {p.active?p.published?'Publicado':'Borrador':'Archivado'}</span><small>{p.inventory} unidades · {p.tiers[0]?.unit!=null?money(p.tiers[0].unit)+'/día':'Precio pendiente'}</small></button>)}
    {!results.length&&<p>No se encontraron productos.</p>}
   </aside>
   {product&&<ProductEditor key={product.id+product.updatedAt} product={product} isAdmin={isAdmin} busy={busy} onSave={save} onDelete={remove}/>}
  </div>
 </section>;
}

function ProductEditor({product,isAdmin,busy,onSave,onDelete}:{product:AdminProduct;isAdmin:boolean;busy:boolean;onSave:(p:AdminProduct)=>Promise<void>;onDelete:(p:AdminProduct)=>Promise<void>}){
 const [draft,setDraft]=useState(product),[categories,setCategories]=useState(product.categories.join(', ')),[autoSlug,setAutoSlug]=useState(!product.id);
 const update=<K extends keyof AdminProduct>(key:K,value:AdminProduct[K])=>setDraft(p=>({...p,[key]:value}));
 const field=(key:'code'|'name'|'brand'|'slug'|'summary',label:string,required=false)=><label className="field">{label}<input name={key} value={draft[key]} required={required} maxLength={key==='summary'?500:key==='name'?180:120} readOnly={key==='code'&&Boolean(product.id)} onChange={e=>{const value=e.target.value;if(key==='name'&&autoSlug)setDraft(p=>({...p,name:value,slug:categorySlug(value)}));else update(key,value);if(key==='slug')setAutoSlug(false);}}/></label>;
 return <div className={s.editor}>
  <form onSubmit={e=>{e.preventDefault();void onSave({...draft,categories:categories.split(',').map(v=>v.trim()).filter(Boolean),specifications:draft.specifications.filter(([name,value])=>name.trim()||value.trim())});}}>
   <fieldset disabled={busy||!isAdmin} className={s.form}>
    <div className={s.editorHeading}><h2>{product.id?'Editar producto':'Nuevo producto'}</h2>{product.id&&product.published&&product.active&&<Link href={`/vr/${product.slug}`} target="_blank" className="button secondary compact">Ver ficha publicada</Link>}</div>
    <div className="fields">{field('name','Nombre del producto',true)}{field('code','Código interno',true)}{field('brand','Marca')}{field('slug','URL del producto',true)}</div>
    <p className="muted">El código identifica el inventario. La URL de la ficha es /vr/{draft.slug||'nombre-del-producto'}.</p>
    <label className="field">Descripción del producto<textarea name="description" value={draft.description} maxLength={6000} rows={5} onChange={e=>update('description',e.target.value)}/></label>
    {field('summary','Texto corto para el menú y el buscador')}
    <div className="fields"><label className="field">Categorías<input aria-label="Categorías" value={categories} maxLength={1000} onChange={e=>setCategories(e.target.value)} placeholder="Realidad virtual, Realidad mixta"/><small>Separa las categorías con comas. Aparecen en los filtros y el menú.</small></label><label className="field">Orden en la tienda<input type="number" min={0} max={100000} value={draft.sortOrder} onChange={e=>update('sortOrder',Number(e.target.value))}/></label></div>
    <div className={s.visibility}><label className="check"><input type="checkbox" checked={draft.active} onChange={e=>update('active',e.target.checked)}/>Producto activo</label><label className="check"><input type="checkbox" checked={draft.published} onChange={e=>update('published',e.target.checked)}/>Publicado en la tienda</label><label className="check"><input type="checkbox" checked={draft.featured} onChange={e=>update('featured',e.target.checked)}/>Destacado en el inicio</label><small>Desactiva el producto para archivarlo. Un borrador puede conservar su inventario sin mostrarse en la tienda.</small></div>
    <section className={s.group}><h3>Características</h3><p>Agrega los datos técnicos que se muestran en la ficha, en el orden deseado.</p>
     {draft.specifications.map(([name,value],index)=><div className={s.specRow} key={index}><label className="field">Característica {index+1}<input aria-label={`Nombre característica ${index+1}`} value={name} maxLength={100} onChange={e=>update('specifications',draft.specifications.map((row,i)=>i===index?[e.target.value,row[1]]:row))}/></label><label className="field">Valor<input aria-label={`Valor característica ${index+1}`} value={value} maxLength={500} onChange={e=>update('specifications',draft.specifications.map((row,i)=>i===index?[row[0],e.target.value]:row))}/></label><div className={s.rowActions}><button type="button" className="button secondary compact" disabled={index===0} aria-label={`Subir característica ${index+1}`} onClick={()=>{const next=[...draft.specifications];[next[index-1],next[index]]=[next[index],next[index-1]];update('specifications',next);}}>Subir</button><button type="button" className="button secondary compact" onClick={()=>update('specifications',draft.specifications.filter((_,i)=>i!==index))} aria-label={`Quitar característica ${index+1}`}>Quitar</button></div></div>)}
     <button type="button" className="button secondary compact" disabled={draft.specifications.length>=40} onClick={()=>update('specifications',[...draft.specifications,['','']])}>Agregar característica</button>
    </section>
    <section className={s.group}><h3>Precios de alquiler por día</h3><p>Precio por unidad según la cantidad. Guardar conserva los importes de las cotizaciones anteriores. El cotizador actual admite desde 3 hasta 15 equipos.</p>
     {draft.tiers.map((tier,index)=><div key={index} className={s.tierRow}>{(['min','max','unit'] as const).map(key=><label key={key} className="field">{key==='min'?'Desde':key==='max'?'Hasta':'Precio unitario (COP)'}<input aria-label={`${key} precio ${index+1}`} type="number" min={key==='unit'?0:3} max={key==='unit'?1000000000:10000} value={tier[key]??''} placeholder={key==='unit'?'Por cotizar':undefined} onChange={e=>update('tiers',draft.tiers.map((t,i)=>i===index?{...t,[key]:key==='unit'&&e.target.value===''?null:Number(e.target.value)}:t))}/></label>)}<button className="button secondary compact" type="button" onClick={()=>update('tiers',draft.tiers.filter((_,i)=>i!==index))}>Quitar rango</button></div>)}
     <button className="button secondary compact" type="button" disabled={draft.tiers.length>=30} onClick={()=>{const min=(draft.tiers.at(-1)?.max??2)+1;update('tiers',[...draft.tiers,{min,max:Math.max(min,15),unit:null}]);}}>Agregar rango de precio</button>
    </section>
    <section className={s.group}><h3>Inventario físico</h3><p>{product.inventory} unidades registradas. La disponibilidad por fecha depende de las reservas y del estado de cada unidad.</p><Link className="button secondary compact" href="/admin/operaciones">Administrar unidades en Inventario</Link></section>
    <div className={s.saveBar}><button className="button" type="submit">{busy?'Guardando…':'Guardar producto'}</button>{product.id&&<button className="button secondary" type="button" onClick={()=>void onDelete(product)}>Eliminar producto</button>}</div>
   </fieldset>
  </form>
  <section className={`card ${s.photos}`}><h3>Foto del producto</h3>{product.id?isAdmin?<ProductPhotos products={[product]}/>:<p>La edición de imágenes requiere un administrador.</p>:<p>Guarda primero el producto para subir su foto.</p>}</section>
 </div>;
}
