'use client';

import Image from 'next/image';
import {useEffect,useRef,useState} from 'react';

const countries=[
 ['+57','CO','Colombia'],['+1','US','Estados Unidos / Canadá'],['+52','MX','México'],['+34','ES','España'],['+54','AR','Argentina'],['+55','BR','Brasil'],['+56','CL','Chile'],['+51','PE','Perú'],['+593','EC','Ecuador'],['+58','VE','Venezuela'],['+507','PA','Panamá'],['+506','CR','Costa Rica'],['+598','UY','Uruguay'],['+595','PY','Paraguay'],['+591','BO','Bolivia'],['+44','GB','Reino Unido'],['+49','DE','Alemania'],['+33','FR','Francia'],
] as const;

export function PhoneInput({country,value,onCountry,onChange}:{country:string;value:string;onCountry:(code:string)=>void;onChange:(value:string)=>void}){
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const selected=countries.find(item=>item[0]===country)??countries[0];
 useEffect(()=>{
  function close(event:MouseEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}
  document.addEventListener('mousedown',close);return()=>document.removeEventListener('mousedown',close);
 },[]);
 function choose(code:string){onCountry(code);setOpen(false);requestAnimationFrame(()=>trigger.current?.focus());}
 return <div className="phone-field" ref={root}>
  <label className="phone-label" id="phone-label" htmlFor="rental-phone">Teléfono / WhatsApp</label>
  <div className="phone-control">
   <div className="phone-country">
    <button ref={trigger} className="phone-country-trigger" type="button" aria-label={`Código internacional, ${selected[2]} ${country}`} aria-haspopup="listbox" aria-expanded={open} aria-controls="country-options" onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}>
     <Image src={`/images/flags/${selected[1].toLowerCase()}.svg`} width={24} height={18} alt="" unoptimized/><span>{country}</span><span aria-hidden="true">▾</span>
    </button>
    {open&&<div className="phone-country-options" id="country-options" role="listbox" aria-label="País y código internacional">
     {countries.map(([code,iso,name])=><button type="button" role="option" aria-selected={code===country} className={code===country?'selected':''} key={code} onClick={()=>choose(code)}>
      <Image src={`/images/flags/${iso.toLowerCase()}.svg`} width={24} height={18} alt="" unoptimized/><span>{name}</span><strong>{code}</strong>
     </button>)}
    </div>}
   </div>
   <input id="rental-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={value} onChange={event=>onChange(event.target.value.replace(/\D/g,''))}/>
  </div>
 </div>;
}
