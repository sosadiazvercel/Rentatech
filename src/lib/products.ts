export const isVrEquipment=(code:string)=>/^QUEST[\w-]*$/i.test(code);
export const minimumFor=(code:string)=>isVrEquipment(code)?3:1;

export function serviceCountdown(start:string,now=new Date()){
 const day=(value:Date)=>Date.parse(value.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})+'T00:00:00Z');
 const days=Math.round((day(new Date(start))-day(now))/86400000);
 return {days,urgent:days>=0&&days<7,label:days<0?'Fecha de inicio pasada':days===0?'El servicio es hoy':days===1?'Falta 1 día para el servicio':`Faltan ${days} días para el servicio`};
}
