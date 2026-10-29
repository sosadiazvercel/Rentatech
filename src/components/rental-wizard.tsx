'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {eventSchema,requestSchema,money,type Estimate,type RentalRequest} from '@/lib/rental';
import s from './rental.module.css';

const todayBogota=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});

export function RentalWizard({products,model,quantity}:{products:{code:string;name:string;inventory:number}[];model:string;quantity:number}) {
 const [v,set]=useState<RentalRequest>({equipment:model,quantity:Math.max(3,Math.min(15,quantity)),days:1,date:'',start:'10:00',durationHours:8,city:'Bogota',address:'',contentStatus:'custom',name:'',company:'',email:'',phone:'',notes:'',nit:'',privacy:true});
 const [privacy,setPrivacy]=useState(false),[step,setStep]=useState(0),[quote,setQuote]=useState<Estimate|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<{number:string;estimate?:Estimate}|null>(null);
 const key=useRef({body:'',key:''});
 const pendingManual=quote?.pending.some(p=>p.includes('cotizar')||p.includes('confirmar'))??false;
 const [minDate,setMinDate]=useState(todayBogota);
 useEffect(()=>{const timer=setInterval(()=>setMinDate(todayBogota()),60000);return()=>clearInterval(timer);},[]);

 function requestKey(){
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,18)}-${Math.random().toString(36).slice(2,18)}`;
 }
 function change<K extends keyof RentalRequest>(k:K,value:RentalRequest[K]){
  set(p=>({...p,[k]:value}));
  if(['equipment','quantity','days','date','start','city','address','contentStatus'].includes(k))setQuote(null);
  setError('');
 }
 const event=useMemo(()=>({equipment:v.equipment,quantity:v.quantity,days:v.days,date:v.date,start:v.start,durationHours:v.durationHours,city:v.city,address:v.address,contentStatus:v.contentStatus}),[v.equipment,v.quantity,v.days,v.date,v.start,v.durationHours,v.city,v.address,v.contentStatus]);
 useEffect(()=>{
  if(step===0)return;
  const checked=eventSchema.safeParse(event);
  if(!checked.success)return;
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   try{
    const response=await fetch('/api/v1/rental/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(checked.data),signal:controller.signal});
    if(response.ok)setQuote(await response.json());
   }catch{/* The next button reports validation errors. */}
  },350);
  return()=>{clearTimeout(timer);controller.abort();};
 },[step,event]);
 async function price(){
  const checked=eventSchema.safeParse(event);
  if(!checked.success)throw new Error(checked.error.issues[0].message);
  const r=await fetch('/api/v1/rental/estimate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(checked.data)});
  const data=await r.json();
  if(!r.ok)throw new Error(data.error?.message);
  setQuote(data);
  if(v.quantity>data.available)throw new Error(`Solo hay ${data.available} visores disponibles para ese horario.`);
  return data;
 }
 async function next(){
  setBusy(true);setError('');
  try{
   if(step===0)await price();
   if(step===1){if(!v.address.trim())throw new Error('Escribe la direccion o el lugar previsto para el evento.');await price();}
   if(step===2){const checked=requestSchema.safeParse({...v,privacy});if(!checked.success)throw new Error(checked.error.issues[0].message);await price();}
   setStep(p=>p+1);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos continuar');}
  finally{setBusy(false);}
 }
 async function submit(){
  setBusy(true);setError('');
  try{
   const body=JSON.stringify({...v,privacy});
   if(key.current.body!==body)key.current={body,key:requestKey()};
   const r=await fetch('/api/v1/rental/quotes',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key.current.key},body});
   const data=await r.json();
   if(!r.ok)throw new Error(data.error?.message);
   setResult(data);
  }catch(e){setError(e instanceof Error?e.message:'No pudimos guardar la solicitud');}
  finally{setBusy(false);}
 }
 function input(k:keyof RentalRequest,label:string,type='text',max?:number){
  return <label className="field">{label}<input aria-label={label} type={type} value={String(v[k])} onChange={e=>change(k,(type==='number'?Number(e.target.value):e.target.value) as never)} min={type==='date'?minDate:type==='number'&&k==='quantity'?3:type==='number'?1:undefined} max={max}/></label>;
 }
 function lines(q:Estimate){
  return [
   ['Visores',`${v.quantity} x ${q.equipmentName} x ${v.days} dia(s)`,q.hardware],
   ['Operador VR obligatorio','Jornada incluida hasta 8 horas',q.staff],
   ['Transporte',q.transport==null?'Fuera de Bogota: por cotizar':'Bogota ida y vuelta',q.transport],
   [q.contentLabel,v.contentStatus==='ready'?'Se cobra por proyecto':'Por definir segun experiencia',q.content],
  ];
 }
 if(result)return <section className="reading" aria-live="polite"><div className="eyebrow">Solicitud recibida</div><h1>Hemos recibido tu solicitud.</h1><p>Tu solicitud <strong>{result.number}</strong> quedó guardada. Revisaremos disponibilidad, logística y contenido contigo antes de confirmar la reserva.</p><div className="notice">Esta solicitud no bloquea equipos. Nuestro equipo se pondrá en contacto para confirmar la cotización y la forma de pago.</div><div className="actions" style={{marginTop:24}}><button className="button secondary" onClick={()=>{setResult(null);setStep(0);key.current={body:'',key:''};}}>Nueva solicitud</button></div></section>;
 return <section className={s.wizard}>
  <ol className={s.steps} aria-label="Pasos del cotizador">{['Equipo y fecha','Lugar y contenido','Tus datos','Cotizacion'].map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><span>{i+1}</span>{label}</li>)}</ol>
  <div className={s.wizardLayout}><div className="card">
   <h2 className={s.stepTitle}>{['Configura tu alquiler VR','Donde sera la experiencia?','Con quien hablamos?','Resumen de cotizacion'][step]}</h2>
   {step===0&&<div className="stack"><label className="field">Modelo de visor<select aria-label="Modelo de visor" value={v.equipment} onChange={e=>change('equipment',e.target.value)}>{products.map(p=><option key={p.code} value={p.code}>{p.name}</option>)}</select></label><div className="fields">{input('quantity','Cantidad de visores','number',15)}{input('days','Número de días de alquiler','number',30)}</div><small className="muted">Mínimo 3 visores. Máximo inicial del cotizador: 15 visores. {quote?`${quote.available} disponibles en el horario consultado.`:`${products.find(p=>p.code===v.equipment)?.inventory??0} unidades registradas.`}</small><div className="fields">{input('date','Fecha del evento','date')}{input('start','Hora de inicio','time')}</div>{input('city','Ciudad del evento')}<p className="notice">El operador VR es obligatorio. La jornada incluida es de hasta 8 horas. Hora adicional: $50.000.</p></div>}
   {step===1&&<div className="stack">{input('address','Dirección o lugar del evento')}<fieldset className={s.inlineChoice}><legend>¿Ya tienes la experiencia o contenido que quieres utilizar?</legend><label><input type="radio" checked={v.contentStatus==='ready'} onChange={()=>change('contentStatus','ready')}/>Sí, ya tengo contenido</label><label><input type="radio" checked={v.contentStatus==='custom'} onChange={()=>change('contentStatus','custom')}/>No, necesito experiencia personalizada</label></fieldset><label className="field">Notas del evento<textarea aria-label="Notas del evento" value={v.notes} onChange={e=>change('notes',e.target.value)} placeholder="Describe el evento, asistentes, contenido o idea de experiencia."/></label><small className="muted">Bogotá suma transporte ida y vuelta. Fuera de Bogotá o con contenido personalizado, revisaremos el precio contigo.</small></div>}
   {step===2&&<div className="stack"><div className="fields">{input('name','Nombre de contacto')}{input('company','Empresa (opcional)')}{input('email','Correo electronico','email')}{input('phone','Telefono / WhatsApp')}{input('nit','NIT (opcional)')}</div><label className="check"><input type="checkbox" checked={privacy} onChange={e=>setPrivacy(e.target.checked)}/>Acepto el aviso de privacidad y el tratamiento de mis datos para gestionar esta solicitud.</label><Link href="/politicas/privacidad">Leer aviso de privacidad</Link></div>}
   {step===3&&quote&&<div className="stack"><p>Revisa el resumen de precio. Si algún valor está pendiente, nuestro equipo lo confirmará antes de enviarte la cotización definitiva.</p><p className="notice">La solicitud no bloquea inventario. Confirmaremos disponibilidad, logística y forma de pago contigo.</p></div>}
   {error&&<p role="alert" aria-label="Error del cotizador" className="message-error" style={{marginTop:20}}>{error}</p>}
  </div><aside className={s.wizardAside} aria-live="polite"><div className="eyebrow">Cotizador VR</div><h3>{quote?'Tu cotización':'Precio según tu evento'}</h3>{quote?<div className="stack"><dl className={s.summary}><dt>Equipo</dt><dd>{quote.equipmentName} · {v.quantity} visores</dd><dt>Fecha</dt><dd>{v.date} · {v.start}</dd><dt>Días</dt><dd>{v.days}</dd><dt>Lugar</dt><dd>{v.address||v.city}</dd></dl><div className={s.breakdown}>{lines(quote).map(([label,description,value])=><div key={String(label)}><span><strong>{label}</strong><small>{description}</small></span><b>{value==null?'Por definir':money(Number(value))}</b></div>)}</div><div className={s.quotePrice}><small>{quote.complete?'Total estimado':pendingManual?'Subtotal conocido; faltan valores':'Subtotal conocido'}</small><strong>{money(quote.total)}</strong><span>{quote.additionalHourNote}</span></div>{quote.pending.length>0&&<div className="notice"><strong>Por revisar:</strong><ul>{quote.pending.map(p=><li key={p}>{p}</li>)}</ul></div>}</div>:<p>Elige equipo, cantidad, fecha y ciudad. El precio aparecerá aquí al comprobar disponibilidad.</p>}</aside>
  <div className={s.wizardActions}>{step>0&&<button type="button" disabled={busy} className="button secondary" onClick={()=>setStep(p=>p-1)}>Atrás</button>}<button type="button" disabled={busy} className="button" onClick={step===3?submit:next}>{busy?'Consultando…':step===3?'Solicitar cotización':step===0?'Calcular disponibilidad':'Continuar'}</button></div></div>
 </section>;
}
