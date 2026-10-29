import 'server-only';
import {calculate,eventSchema,requestSchema,type Estimate,type RentalEvent,type RentalRequest,type Rules} from '@/lib/rental';

export const fallbackProducts=[
 {code:'QUEST2',name:'Meta Quest 2',inventory:14},
 {code:'QUEST3',name:'Meta Quest 3',inventory:15},
];

const fallbackRules:Rules={
 minimumQuantity:3,
 quoteValidityHours:168,
 tiers:[
  {product:'QUEST2',min:3,max:4,unit:150000},
  {product:'QUEST2',min:5,max:9,unit:135000},
  {product:'QUEST2',min:10,max:15,unit:120000},
  {product:'QUEST3',min:3,max:4,unit:280000},
  {product:'QUEST3',min:5,max:9,unit:250000},
  {product:'QUEST3',min:10,max:15,unit:220000},
 ],
 staffRules:[{min:3,max:15,count:1}],
 technicianRates:{'4':300000,'5':300000,'6':300000,'7':300000,'8':300000},
 durationFactors:{'4':1,'5':1,'6':1,'7':1,'8':1},
 extraHourRate:50000,
 contentConfig:{upToQuantity:10,upToPrice:250000,abovePrice:350000},
 bufferBeforeMinutes:60,
 bufferAfterMinutes:45,
 taxPercent:0,
 depositPercent:50,
 cancellationPolicy:'Configuracion local de prueba.',
 damagePolicy:'Configuracion local de prueba.',
};

export function isDatabaseUnavailable(e:unknown){
 return Boolean(e&&typeof e==='object'&&'code' in e&&['ECONNREFUSED','ENOTFOUND','ETIMEDOUT'].includes(String(e.code)));
}

export function fallbackCatalog(){
 return {
  products:fallbackProducts,
  minimumQuantity:3,
  startingPrices:(['QUEST2','QUEST3'] as const).map(code=>({code,...calculate({equipment:code,quantity:3,days:1,date:'2099-01-01',start:'10:00',durationHours:8,city:'Bogota',address:'',contentStatus:'ready'},fallbackRules,180000)})),
 };
}

export function fallbackEstimate(raw:unknown):Estimate{
 const event=eventSchema.parse(raw) as RentalEvent;
 const product=fallbackProducts.find(p=>p.code===event.equipment)??fallbackProducts[1];
 return {
  ...calculate(event,fallbackRules,event.city.toLowerCase().includes('bogota')?180000:null),
  available:product.inventory,
  totalInventory:product.inventory,
  bufferProvisional:false,
  pricingId:'local-fallback',
  equipmentName:product.name,
  event,
 };
}

export function fallbackQuote(raw:unknown){
 const request=requestSchema.parse(raw) as RentalRequest;
 const suffix=Math.random().toString(36).slice(2,7).toUpperCase();
 const event={equipment:request.equipment,quantity:request.quantity,date:request.date,start:request.start,durationHours:request.durationHours,city:request.city,address:request.address};
 return {
  id:`local-${Date.now().toString(36)}-${suffix.toLowerCase()}`,
  number:`RT-LOCAL-${suffix}`,
  estimate:fallbackEstimate(event),
 };
}
