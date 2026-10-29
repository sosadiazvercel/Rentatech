import {z} from 'zod';

export const money=(n:number)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);

const amount=z.number().int().min(0).max(1000000000);
const tier=z.object({product:z.string().min(1).max(40),min:z.number().int().min(3),max:z.number().int().max(10000),unit:amount.nullable()}).strict().refine(v=>v.max>=v.min);
const staffRule=z.object({min:z.number().int().min(3),max:z.number().int().max(10000),count:z.number().int().min(1).max(100)}).strict().refine(v=>v.max>=v.min);
const contentConfig=z.object({upToQuantity:z.number().int().min(3).max(10000).default(10),upToPrice:amount.default(250000),abovePrice:amount.default(350000)}).strict();

export const rulesSchema=z.object({
 minimumQuantity:z.literal(3),
 quoteValidityHours:z.number().int().min(1).max(2160).default(168),
 tiers:z.array(tier).max(100),
 staffRules:z.array(staffRule).min(1).max(50),
 technicianRates:z.record(z.string().regex(/^[4-8]$/),amount.nullable()),
 durationFactors:z.record(z.string().regex(/^[4-8]$/),z.number().min(0.01).max(20).nullable()),
 extraHourRate:amount.nullable(),
 contentConfig:contentConfig.default({upToQuantity:10,upToPrice:250000,abovePrice:350000}),
 bufferBeforeMinutes:z.number().int().min(0).max(2880).nullable(),
 bufferAfterMinutes:z.number().int().min(0).max(2880).nullable(),
 taxPercent:z.number().min(0).max(100).nullable(),
 depositPercent:z.number().min(0).max(100),
 cancellationPolicy:z.string().max(4000),
 damagePolicy:z.string().max(4000),
}).strict().superRefine((r,ctx)=>{
 for(let i=0;i<r.tiers.length;i++)for(let j=i+1;j<r.tiers.length;j++){const a=r.tiers[i],b=r.tiers[j];if(a.product===b.product&&a.min<=b.max&&b.min<=a.max)ctx.addIssue({code:'custom',message:'Los rangos de precios se solapan'});}
 for(let i=0;i<r.staffRules.length;i++)for(let j=i+1;j<r.staffRules.length;j++){const a=r.staffRules[i],b=r.staffRules[j];if(a.min<=b.max&&b.min<=a.max)ctx.addIssue({code:'custom',message:'Los rangos de tecnicos se solapan'});}
});

export type Rules=z.infer<typeof rulesSchema>;

export const eventSchema=z.object({
 equipment:z.string().min(1).max(40),
 quantity:z.number().int().min(3,'Para garantizar una operacion adecuada, nuestros servicios VR tienen un minimo de 3 equipos.').max(15,'El cotizador automatico cubre hasta 15 visores.'),
 days:z.number().int().min(1,'Indica al menos 1 dia de alquiler').max(30).default(1),
 date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/,'Selecciona la fecha del evento'),
 start:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Selecciona una hora valida'),
 durationHours:z.number().int().min(4).max(72).default(8),
 city:z.string().trim().min(1).max(180),
 address:z.string().trim().max(500),
 contentStatus:z.enum(['ready','custom']).default('custom'),
}).strict().superRefine((v,ctx)=>{
 const d=new Date(`${v.date}T${v.start}:00-05:00`);
 if(!Number.isFinite(d.getTime())||d.toLocaleDateString('en-CA',{timeZone:'America/Bogota'})!==v.date||d.getTime()<=Date.now())ctx.addIssue({code:'custom',message:'Selecciona una fecha y hora futuras validas',path:['date']});
});

export const requestSchema=eventSchema.safeExtend({
 address:z.string().trim().min(1,'Escribe la direccion o lugar del evento').max(500),
 name:z.string().trim().min(2,'Escribe el nombre del contacto').max(180),
 company:z.string().trim().max(180),
 email:z.email('Escribe un correo valido').trim().toLowerCase().max(254),
 phone:z.string().regex(/^\+[1-9]\d{7,14}$/,'Incluye codigo de pais, por ejemplo +573001234567'),
 notes:z.string().trim().max(2000),
 nit:z.string().trim().max(40),
 privacy:z.literal(true,{error:'Acepta el aviso de privacidad'}),
}).strict();

export type RentalEvent=z.infer<typeof eventSchema>;
export type RentalRequest=z.infer<typeof requestSchema>;
export type Overrides={transport?:number;hardware?:number;technicianUnit?:number;taxPercent?:number;technicianCount?:number};

export function calculate(v:RentalEvent,r:Rules,transport:number|null,overrides:Overrides={}){
 const pending:string[]=[];
 const tier=r.tiers.find(t=>t.product===v.equipment&&v.quantity>=t.min&&v.quantity<=t.max);
 const hardware=overrides.hardware??(tier?.unit!=null?Math.round(tier.unit*v.quantity*v.days):null);
 const count=overrides.technicianCount??r.staffRules.find(t=>v.quantity>=t.min&&v.quantity<=t.max)?.count??null;
 const rate=r.technicianRates['8']??r.technicianRates['4']??null;
 const technicianUnit=overrides.technicianUnit??rate;
 const staff=count!=null&&technicianUnit!=null?count*technicianUnit:null;
 const freight=overrides.transport??transport;
 const content=v.contentStatus==='ready'?(v.quantity<=r.contentConfig.upToQuantity?r.contentConfig.upToPrice:r.contentConfig.abovePrice):null;
 const contentLabel=v.contentStatus==='ready'?'Configuracion de contenido':'Contenido personalizado';
 const taxPercent=overrides.taxPercent??r.taxPercent;
 if(hardware==null)pending.push('Precio de visor para esta cantidad');
 if(count==null||staff==null)pending.push('Operador VR obligatorio por definir');
 if(freight==null)pending.push('Transporte por cotizar');
 if(content==null)pending.push('Contenido personalizado por cotizar');
 if(taxPercent==null)pending.push('Impuestos por confirmar');
 if(r.bufferBeforeMinutes==null||r.bufferAfterMinutes==null)pending.push('Buffer logistico por definir');
 const subtotal=(hardware??0)+(staff??0)+(freight??0)+(content??0);
 const tax=taxPercent==null?null:Math.round(subtotal*taxPercent/100);
 const total=subtotal+(tax??0);
 return {hardware,hardwareUnit:tier?.unit??null,days:v.days,technicianCount:count,technicianUnit,staff,transport:freight,content,contentLabel,additionalHourNote:'Hora adicional: $50.000. Se valida manualmente si la jornada supera 8 horas.',subtotal,taxPercent,tax,total,deposit:Math.round(total*r.depositPercent/100),depositPercent:r.depositPercent,pending,complete:pending.length===0};
}

export type Estimate=ReturnType<typeof calculate>&{available:number;totalInventory:number;bufferProvisional:boolean;pricingId:string;equipmentName:string;event:RentalEvent};
export const quoteStatus:Record<string,string>={draft:'Borrador',pending_confirmation:'Solicitud recibida',quote_sent:'Cotizacion enviada',issued:'Emitida',accepted:'Reservada',cancelled:'Cancelada',superseded:'Reemplazada',expired:'Vencida'};
export const bookingStatus:Record<string,string>={confirmed:'Confirmada',in_service:'En evento',completed:'Completada',cancelled:'Cancelada'};
export const assetStatus:Record<string,string>={ready:'Disponible',reserved:'Reservado',in_use:'En evento',maintenance:'Mantenimiento',quarantine:'Fuera de servicio',retired:'Fuera de servicio',unverified:'Pendiente de revision'};
export const paymentStatus:Record<string,string>={UNPAID:'Sin pago',PARTIALLY_PAID:'Pago parcial',PAID:'Pagada',REFUNDED:'Reembolsada'};
