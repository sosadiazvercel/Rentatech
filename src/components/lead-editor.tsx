'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {stageLabels,processStages} from '@/lib/lead-schema';

type Values={stage:string;lastActiveStage?:string;version:number;ownerId:string|null;estimatedValue:string|null;paymentUrl:string;paymentReference:string;attachmentId:string|null;attachmentName:string|null};
export function LeadEditor({id,values,staff}:{id:string;values:Values;staff:{id:string;role:string}[]}){
 const router=useRouter();const [stage,setStage]=useState(values.stage),[version,setVersion]=useState(values.version),[currentStage,setCurrentStage]=useState(values.stage);
 const [lastActive,setLastActive]=useState(values.lastActiveStage||values.stage);
 const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[hasAttachment,setHasAttachment]=useState(Boolean(values.attachmentId));
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
   const response=await fetch(`/api/v1/admin/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage,expectedVersion:version,ownerId:fd.get('ownerId')||null,estimatedValue:fd.get('estimatedValue')?Number(fd.get('estimatedValue')):null,paymentUrl:fd.get('paymentUrl')??values.paymentUrl,paymentReference:fd.get('paymentReference')??values.paymentReference,paymentConfirmed:fd.has('paymentConfirmed'),note:fd.get('note')||'',...(attachment?{attachment}:{})})});
   const data=await response.json();if(!response.ok)throw Error(data.error?.message||'No se pudo guardar');setVersion(data.version);setCurrentStage(stage);if(stage!=='lost')setLastActive(stage);if(attachment)setHasAttachment(true);
   setMessage(data.notificationQueued?'Cambios guardados. Consulta el estado del correo abajo.':'Cambios guardados');
   (form.elements.namedItem('note') as HTMLTextAreaElement).value='';if(form.elements.namedItem('attachment'))(form.elements.namedItem('attachment') as HTMLInputElement).value='';router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy(false);}
 }}>
 <ol className="lead-progress" aria-label="Progreso del alquiler">{processStages.map((key,i)=>{const current=processStages.indexOf((currentStage==='lost'?lastActive:currentStage) as typeof processStages[number]);const done=i<current||(currentStage==='lost'&&i===current);return <li key={key} className={key===currentStage?'current':done?'complete':'pending'} aria-current={key===currentStage?'step':undefined}><span>{done?'✓':i+1}</span>{stageLabels[key]}</li>;})}</ol>
 {currentStage==='lost'&&<p className="message-error">Solicitud marcada como perdida.</p>}
 <label className="field">Etapa<select aria-label="Etapa" name="stage" value={stage} onChange={e=>setStage(e.target.value)}>{Object.entries(stageLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 {stage==='new'&&<p className="notice">Revisa los datos del cliente y el contexto del alquiler. Selecciona Cotizado cuando el documento esté listo para enviar.</p>}
 <label className="field">Responsable<select aria-label="Responsable" name="ownerId" defaultValue={values.ownerId||''}><option value="">Sin asignar</option>{staff.map((u,i)=><option value={u.id} key={u.id}>{u.role==='admin'?'Administrador':'Operador'} {i+1}</option>)}</select></label>
 <label className="field">Valor estimado manual (COP)<input name="estimatedValue" type="number" min="0" step="1" defaultValue={values.estimatedValue||''}/></label>
 {fileStage&&<label className="field">{stage==='awaiting_payment'?'Cotización final aprobada (PDF)':'Archivo de cotización (PDF)'}<input name="attachment" type="file" accept="application/pdf,.pdf" required={!hasAttachment}/><small>Máximo 5 MB. El documento se guarda y se adjunta al correo del cliente.</small></label>}
 {values.attachmentId&&<a href={`/api/v1/admin/leads/${id}/attachments/${values.attachmentId}`}>Descargar {values.attachmentName||'cotización adjunta'}</a>}
 {stage==='quoted'&&<p className="notice">El correo solicitará al cliente que responda para aceptar la cotización.</p>}
 {stage==='awaiting_payment'&&<><p>Registra esta etapa después de recibir la aprobación del cliente.</p><label className="field">Enlace de pago<input name="paymentUrl" type="url" required defaultValue={values.paymentUrl} placeholder="https://…"/></label></>}
 {stage==='confirmed'&&<><label className="field">Referencia del pago validado<input name="paymentReference" required defaultValue={values.paymentReference}/></label>{currentStage!=='confirmed'&&<label className="check"><input name="paymentConfirmed" type="checkbox" required/>Verifiqué el pago y la disponibilidad de los equipos para confirmar el alquiler.</label>}</>}
 {stage==='completed'&&<p className="notice">El alquiler quedará finalizado y se enviará un correo de cierre y agradecimiento.</p>}
 {stage==='lost'&&<p className="notice">No se enviarán correos automáticos al cliente.</p>}
 <label className="field">Agregar nota<textarea name="note" maxLength={4000} placeholder="Contexto del alquiler"/></label>
 {message&&<div role="status" className="message-success">{message}</div>}{error&&<div role="alert" className="message-error">{error}</div>}<button className="button" disabled={busy}>{busy?'Guardando…':buttons[stage]||'Guardar seguimiento'}</button>
 </form>;
}
