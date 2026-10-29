'use client';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useState} from 'react';

export function ProductPhotos({products}:{products:{code:string;name:string;image_version?:string|null}[]}){
 const router=useRouter();const [versions,setVersions]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 const fallback=(code:string)=>['QUEST2','QUEST3'].includes(code)?`/images/meta-quest-${code==='QUEST2'?'2':'3'}-cutout.png`:'/images/product-placeholder.svg';
 async function remove(code:string){setBusy(code);setError('');setMessage('');try{const response=await fetch(`/api/v1/products/${encodeURIComponent(code)}/image`,{method:'DELETE'});const data=await response.json();if(!response.ok)throw Error(data.error?.message);setVersions(v=>({...v,[code]:fallback(code)}));setMessage('Foto personalizada retirada.');router.refresh();}catch(e){setError(e instanceof Error?e.message:'No se pudo retirar la foto.');}finally{setBusy('');}}
 async function upload(code:string,file:File){
  setError('');setMessage('');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Usa JPG, PNG o WebP de hasta 5 MB.');return;}
  setBusy(code);
  try{
   const r=await fetch(`/api/v1/products/${encodeURIComponent(code)}/image`,{method:'POST',headers:{'Content-Type':file.type},body:file});
   const data=await r.json();if(!r.ok)throw Error(data.error?.message??'No se pudo guardar la foto.');
   setVersions(v=>({...v,[code]:data.image}));setMessage(`Foto de ${products.find(p=>p.code===code)?.name} guardada.`);router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar la foto.');}finally{setBusy('');}
 }
 return <div className="stack"><p>La foto se actualiza en inicio, menú, buscador, catálogo y ficha. JPG, PNG o WebP, hasta 5 MB. Usa un recorte del equipo con fondo transparente para acercarte a la referencia.</p>
  {message&&<p role="status" className="message-success">{message}</p>}{error&&<p role="alert" className="message-error">{error}</p>}
  <div className="grid-2">{products.map(p=><article className="card" key={p.code}>
   <Image unoptimized src={versions[p.code]??(p.image_version?`/api/v1/products/${encodeURIComponent(p.code)}/image?v=${p.image_version}`:fallback(p.code))} alt={p.name} width={400} height={240} style={{width:'100%',height:200,objectFit:'contain'}}/>
   <h3>{p.name}</h3><label className="field">Cambiar foto de {p.name}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy)} onChange={e=>{const f=e.target.files?.[0];if(f)void upload(p.code,f);e.target.value='';}}/></label>
   {(versions[p.code]!==undefined?versions[p.code].startsWith('/api/'):Boolean(p.image_version))&&<button type="button" className="button secondary compact" disabled={Boolean(busy)} onClick={()=>void remove(p.code)}>Retirar foto personalizada</button>}
   {busy===p.code&&<p role="status">Guardando foto…</p>}
  </article>)}</div>
 </div>;
}
