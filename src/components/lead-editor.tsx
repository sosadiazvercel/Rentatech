'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {type RentalContext} from '@/lib/lead-schema';
import {stageLabels,processStages} from '@/lib/lead-schema';

type Values={stage:string;lastActiveStage?:string;version:number;ownerId:string|null;estimatedValue:string|null;paymentUrl:string;paymentReference:string;attachmentId:string|null;attachmentName:string|null;technicianIds:string[]};
export function LeadEditor({id,values,staff,technicians,technicianCount,request,products}:{id:string;values:Values;request:RentalContext;products:{code:string;name:string}[];staff:{id:string;role:string;name:string}[];technicians:{id:string;name:string;active:boolean}[];technicianCount:number}){
 const router=useRouter();const [stage,setStage]=useState(values.stage),[version,setVersion]=useState(values.version),[currentStage,setCurrentStage]=useState(values.stage);
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[hasAttachment,setHasAttachment]=useState(Boolean(values.attachmentId));
 const closed=currentStage==='completed';
 const valueLocked=['awaiting_payment','confirmed','completed'].includes(currentStage)||['awaiting_payment','confirmed','completed'].includes(stage);
 const fileStage=['quoted','awaiting_payment'].includes(stage);
 const buttons:Record<string,string>={quoted:'Enviar cotización',awaiting_payment:'Enviar enlace de pago',confirmed:'Confirmar pago y alquiler',completed:'Finalizar alquiler',lost:'Marcar como perdido'};
 return <form className="stack" onSubmit={async e=>{
  e.preventDefault();setBusy(true);setError('');setMessage('');const form=e.currentTarget,fd=new FormData(form);
  try{
   const file=fd.get('attachment');let attachment;
   if(file instanceof File&&file.size){
    if(file.size>5*1024*1024)throw Error('El PDF debe pesar máximo 5 MB');
    const content=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('No se pudo leer el archivo'));reader.readAsDataURL(file);});
    attachment={filename:file.name,content};
   }
   const response=await fetch(`/api/v1/admin/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,expectedVersion:version,request:Object.fromEntries(Object.entries(request).map(([key,value])=>[key,fd.has('context_'+key)?(typeof value==='number'?Number(fd.get('context_'+key)):fd.get('context_'+key)):value])),...(stage==='confirmed'?{technicianIds:fd.getAll('technicianIds')}:{}),ownerId:fd.get('ownerId')||null,estimatedValue:fd.get('estimatedValue')?Number(fd.get('estimatedValue')):null,paymentUrl:fd.get('paymentUrl')??values.paymentUrl,paymentReference:fd.get('paymentReference')??values.paymentReference,paymentConfirmed:fd.has('paymentConfirmed'),note:fd.get('note')||'',...(attachment?{attachment}:{})})});
   const data=await response.json();if(!response.ok)throw Error(data.error?.message||'No se pudo guardar');setVersion(data.version);setCurrentStage(stage);if(attachment)setHasAttachment(true);
   setMessage(data.notificationQueued?'Cambios guardados. Consulta el estado del correo abajo.':'Cambios guardados');
   (form.elements.namedItem('note') as HTMLTextAreaElement).value='';if(form.elements.namedItem('attachment'))(form.elements.namedItem('attachment') as HTMLInputElement).value='';router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy(false);}
 }}>
 <ol className="lead-progress" aria-label="Progreso del alquiler">{processStages.map((key,i)=>{const current=currentStage==='lost'?processStages.length-1:processStages.indexOf(currentStage as typeof processStages[number]);const done=i<current||(currentStage==='lost'&&i===current);return <li key={key} className={(key===currentStage||(currentStage==='lost'&&key==='completed'))?'current':done?'complete':'pending'} aria-current={(key===currentStage||(currentStage==='lost'&&key==='completed'))?'step':undefined}><span>{done?'✓':i+1}</span>{stageLabels[key]}</li>;})}</ol>
 {currentStage==='lost'&&<p className="message-error">Solicitud marcada como perdida.</p>}
 {closed&&<p className="notice">El alquiler está finalizado. El seguimiento es de solo lectura.</p>}
 <fieldset className="lead-fields" disabled={closed||busy}>
 <details><summary>Editar información del alquiler</summary><div className="fields" style={{marginBlock:16}}>{(Object.keys(request) as (keyof RentalContext)[]).map(key=>{const labels:Record<keyof RentalContext,string>={name:'Contacto',email:'Correo',phone:'Teléfono',company:'Empresa',nit:'NIT / Cédula',equipment:'Equipo',quantity:'Cantidad',days:'Días de alquiler',date:'Fecha',start:'Hora de inicio',durationHours:'Horas de servicio',city:'Ciudad',address:'Dirección o lugar',contentStatus:'Contenido',notes:'Notas del alquiler'};const locked=['confirmed','completed'].includes(currentStage)&&['equipment','quantity','days','date','start','durationHours'].includes(key);return <label className="field" key={key}>{labels[key]}{key==='equipment'?<select name={'context_'+key} defaultValue={request[key]} disabled={locked}>{products.map(p=><option value={p.code} key={p.code}>{p.name}</option>)}</select>:key==='contentStatus'?<select name={'context_'+key} defaultValue={request[key]}><option value="ready">Contenido del cliente</option><option value="custom">Por definir</option></select>:key==='notes'?<textarea name={'context_'+key} defaultValue={request[key]}/>:<input name={'context_'+key} defaultValue={request[key]} disabled={locked} type={key==='date'?'date':key==='start'?'time':key==='email'?'email':typeof request[key]==='number'?'number':'text'} min={typeof request[key]==='number'?1:undefined} required={['name','email','phone','date','start','city','address'].includes(key)}/>}</label>;})}</div>{currentStage==='confirmed'&&<p className="muted">Para cambiar fechas, cantidades o equipo de una reserva confirmada, cancélala y crea una nueva solicitud para volver a verificar disponibilidad.</p>}</details>
 <label className="field">Etapa<select aria-label="Etapa" name="stage" value={stage} onChange={e=>setStage(e.target.value)}>{Object.entries(stageLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 {stage==='new'&&<p className="notice">Revisa los datos del cliente y el contexto del alquiler. Selecciona Cotizado cuando el documento esté listo para enviar.</p>}
 <label className="field">Responsable<select aria-label="Responsable" name="ownerId" defaultValue={values.ownerId||''}><option value="">Sin asignar</option>{staff.map(u=><option value={u.id} key={u.id}>{u.name}</option>)}</select></label>
 <label className="field">Valor estimado manual (COP)<input name="estimatedValue" type="number" min="0" step="1" readOnly={valueLocked} aria-readonly={valueLocked} defaultValue={values.estimatedValue||''}/></label>
 {fileStage&&<label className="field">{stage==='awaiting_payment'?'Cotización final aprobada (PDF)':'Archivo de cotización (PDF)'}<input name="attachment" type="file" accept="application/pdf,.pdf" required={!hasAttachment}/><small>Máximo 5 MB. El documento se guarda y se adjunta al correo del cliente.</small></label>}
 {values.attachmentId&&<a href={`/api/v1/admin/leads/${id}/attachments/${values.attachmentId}`}>Descargar {values.attachmentName||'cotización adjunta'}</a>}
 {stage==='quoted'&&<p className="notice">El correo solicitará al cliente que responda para aceptar la cotización.</p>}
 {stage==='awaiting_payment'&&<><p>Registra esta etapa después de recibir la aprobación del cliente.</p><label className="field">Enlace de pago<input name="paymentUrl" type="url" required defaultValue={values.paymentUrl} placeholder="https://…"/></label></>}
 {stage==='confirmed'&&<><fieldset className="stack"><legend>Técnicos asignados ({technicianCount} requeridos)</legend>{technicians.filter(t=>t.active||values.technicianIds.includes(t.id)).map(t=><label className="check" key={t.id}><input type="checkbox" name="technicianIds" value={t.id} defaultChecked={values.technicianIds.includes(t.id)} disabled={!t.active}/>{t.name}{!t.active?' (inactivo)':''}</label>)}{!technicians.some(t=>t.active)&&<p>Registra técnicos en Operaciones → Personal antes de confirmar.</p>}</fieldset><label className="field">Referencia del pago validado<input name="paymentReference" required defaultValue={values.paymentReference}/></label>{currentStage!=='confirmed'&&<label className="check"><input name="paymentConfirmed" type="checkbox" required/>Verifiqué el pago y la disponibilidad de los equipos para confirmar el alquiler.</label>}</>}
 {stage==='completed'&&<p className="notice">El alquiler quedará finalizado y se enviará un correo de cierre y agradecimiento.</p>}
 {stage==='lost'&&<p className="notice">No se enviarán correos automáticos al cliente.</p>}
 <label className="field">Agregar nota<textarea name="note" maxLength={4000} placeholder="Contexto del alquiler"/></label>
 </fieldset>
 {message&&<div role="status" className="message-success">{message}</div>}{error&&<div role="alert" className="message-error">{error}</div>}{!closed&&<button className="button" disabled={busy}>{busy?'Guardando…':buttons[stage]||'Guardar seguimiento'}</button>}
 </form>;
}
