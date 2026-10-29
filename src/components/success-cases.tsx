'use client';
import {useRef,useState} from 'react';
import {successCases,type SuccessCase} from '@/content/success-cases';
import s from './marketing.module.css';

function vimeoEmbed(link:string):string|null {
 try {
  const url=new URL(link);
  if(url.protocol!=='https:'||!['vimeo.com','www.vimeo.com','player.vimeo.com'].includes(url.hostname))return null;
  const match=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/);
  if(!match)return null;
  const embed=new URL(`https://player.vimeo.com/video/${match[1]}`);
  const hash=url.searchParams.get('h')||match[2];
  if(hash)embed.searchParams.set('h',hash);
  embed.searchParams.set('dnt','1');
  return embed.toString();
 }catch{return null;}
}

export function SuccessCases() {
 const dialog=useRef<HTMLDialogElement>(null);
 const [selected,setSelected]=useState<SuccessCase|null>(null);
 const embed=selected?vimeoEmbed(selected.vimeoUrl):null;
 function open(c:SuccessCase){setSelected(c);dialog.current?.showModal();}
 function close(){dialog.current?.close();setSelected(null);}
 return <section className={`section ${s.cases}`} aria-labelledby="cases-title">
  <div className="section-heading"><div><div className="eyebrow">Casos de éxito</div><h2 id="cases-title">Cada experiencia<br/>tiene una historia.</h2></div><p>El objetivo, lo que hicimos y el resultado: una mirada a la realidad virtual en acción.</p></div>
  <div className="grid-3">{successCases.map((c,i)=>{
   const ready=!!vimeoEmbed(c.vimeoUrl);
   return <article className={s.caseCard} key={c.id}>
    <button type="button" className={s.casePreview} onClick={()=>open(c)} aria-label={`${ready?'Ver video':'Ampliar vista de muestra'}: ${c.title}`} aria-haspopup="dialog">
     <span className={s.caseNumber}>0{i+1} / {ready?'VIMEO':'VISTA DE MUESTRA'}</span>
     <span className={s.playIcon} aria-hidden="true">▷</span>
     <span className={s.previewLabel}>{ready?'Ver video en grande':'Espacio para video de Vimeo'}<span aria-hidden="true"> ↗</span></span>
    </button>
    <div className={s.caseBody}><span className="tag">{ready?'Experiencia RENTATECH':'Contenido pendiente'}</span><h3>{c.title}</h3><p>{c.description}</p></div>
   </article>;
  })}</div>
  <dialog ref={dialog} className={s.caseDialog} aria-labelledby="video-title" onCancel={close} onClose={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget)close();}}>
   {selected&&<div className={s.dialogContent}>
    <div className={s.dialogHeader}><h3 id="video-title">{selected.title}</h3><button type="button" className="button secondary compact" onClick={close} autoFocus aria-label="Cerrar video">Cerrar ×</button></div>
    {embed?<iframe className={s.vimeoFrame} src={embed} title={`Video: ${selected.title}`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className={s.videoPending}><span className={s.playIcon} aria-hidden="true">▷</span><strong>Aquí irá el video del caso</strong><p>Vista de muestra. El video estará disponible cuando agreguemos su enlace de Vimeo.</p></div>}
    <p className={s.dialogDescription}>{selected.description}</p>
   </div>}
  </dialog>
 </section>;
}
