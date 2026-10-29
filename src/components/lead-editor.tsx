'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
type Values={stage:string;ownerId:string|null;estimatedValue:string|null;nextAction:string|null;lossReason:string|null};
export function LeadEditor({id,values,staff}:{id:string;values:Values;staff:{id:string;role:string}[]}){
 const router=useRouter();const [message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <form className="stack" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');const form=e.currentTarget,fd=new FormData(form);const date=String(fd.get('nextAction')||'');try{
 const response=await fetch(`/api/v1/admin/leads/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:fd.get('stage'),ownerId:fd.get('ownerId')||null,estimatedValue:fd.get('estimatedValue')?Number(fd.get('estimatedValue')):null,nextAction:date?new Date(date+'-05:00').toISOString():null,lossReason:fd.get('lossReason')||'',note:fd.get('note')||''})});const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'No se pudo guardar');setMessage('Cambios guardados');(form.elements.namedItem('note') as HTMLTextAreaElement).value='';router.refresh();}catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}finally{setBusy(false);}}}>
 <label className="field">Etapa<select aria-label="Etapa" name="stage" defaultValue={values.stage}><option value="new">Nueva</option><option value="qualified">Calificada</option><option value="lost">Perdida</option></select></label>
 <label className="field">Responsable<select aria-label="Responsable" name="ownerId" defaultValue={values.ownerId||''}><option value="">Sin asignar</option>{staff.map((u,i)=><option value={u.id} key={u.id}>{u.role==='admin'?'Administrador':'Operador'} {i+1}</option>)}</select></label>
 <label className="field">Valor estimado manual (COP)<input name="estimatedValue" type="number" min="0" step="1" defaultValue={values.estimatedValue||''}/></label>
 <label className="field">Próxima acción (hora Bogotá)<input name="nextAction" type="datetime-local" defaultValue={values.nextAction||''}/></label>
 <label className="field">Motivo de pérdida<input name="lossReason" maxLength={1000} defaultValue={values.lossReason||''}/></label>
 <label className="field">Agregar nota<textarea name="note" maxLength={4000} placeholder="Contexto y siguiente paso"/></label>
 {message&&<div role="status" className="message-success">{message}</div>}{error&&<div role="alert" className="message-error">{error}</div>}<button className="button" disabled={busy}>{busy?'Guardando…':'Guardar seguimiento'}</button>
 </form>;
}
