import {test,expect} from '@playwright/test';
import type {Rules} from '@/lib/rental';
test('admin config → quote → confirmed reservation → cancellation; mobile panel',async({page})=>{
 await page.goto('/acceso');await page.getByLabel('Correo del equipo').fill(process.env.LOCAL_ADMIN_EMAIL||'admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_ADMIN_PASSWORD!);await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
 const post=async(data:unknown)=>{const r=await page.request.post('/api/v1/operations',{data,headers:{Origin:'http://127.0.0.1:3000'}});expect(r.ok(),await r.text()).toBeTruthy();return r.json();};
 const initial=await (await page.request.get('/api/v1/operations')).json();const original=initial.config.rules as Rules;const transport=initial.zones.find((z:{name:string})=>z.name==='Bogotá').base_price;let techId:string|undefined;let bookingId:string|undefined;
 try{
  await post({action:'settings',expectedId:initial.config.id,rules:{...original,bufferBeforeMinutes:60,bufferAfterMinutes:60,taxPercent:0},transport:0});
  const tech=await post({action:'technician',name:'Técnico ficticio QA '+Date.now(),phone:'QA',email:'',active:true,cost4:null,cost8:null,notes:'Creado por prueba automatizada; no es personal real'});techId=tech.id;
  const response=await page.request.post('/api/v1/rental/quotes',{data:{equipment:'QUEST3',quantity:3,date:'2033-10-20',start:'10:00',durationHours:4,city:'Bogotá',address:'Recinto ficticio QA',name:'Cliente ficticio QA',company:'QA E2E',email:'sprint2-e2e@example.test',phone:'+573001234567',nit:'',notes:'Prueba automatizada de Sprint 2',privacy:true},headers:{Origin:'http://127.0.0.1:3000','Idempotency-Key':crypto.randomUUID()}});expect(response.ok()).toBeTruthy();const quote=await response.json();
  await page.goto('/admin/operaciones');await page.getByRole('button',{name:'Cotizaciones',exact:true}).click();await page.getByRole('button',{name:new RegExp(quote.number)}).click();
  await page.getByRole('checkbox',{name:/Técnico ficticio QA/}).check();await page.getByLabel('Pago recibido y verificado (COP)').fill('530000');await page.getByLabel('Referencia del pago / comprobante').fill('QA-'+crypto.randomUUID());await page.getByRole('checkbox',{name:/Verifiqué espacio/}).check();await page.getByRole('checkbox',{name:/El cliente aceptó/}).check();await page.getByRole('button',{name:'Confirmar reserva',exact:true}).click();await expect(page.getByRole('status')).toHaveText('Cambios guardados');
  const current=await (await page.request.get('/api/v1/operations')).json();const booking=current.bookings.find((b:{quote_id:string})=>b.quote_id===quote.id);expect(booking).toBeTruthy();bookingId=booking.id;
  await page.getByRole('button',{name:'Reservas',exact:true}).click();await page.getByRole('button',{name:new RegExp(booking.number)}).click();await expect(page.getByText(/Saldo:.*530.000/)).toBeVisible();
  await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/sprint2-reservation-mobile.png',fullPage:true});
  await page.getByLabel('Motivo de cancelación').fill('Fin de prueba automatizada');await page.getByRole('button',{name:'Cancelar reserva y liberar equipos'}).click();await expect(page.getByText(/Inventario liberado/)).toBeVisible();
  const available=await page.request.post('/api/v1/rental/estimate',{data:{equipment:'QUEST3',quantity:15,date:'2033-10-20',start:'10:00',durationHours:4,city:'Bogotá',address:'QA'},headers:{Origin:'http://127.0.0.1:3000'}});expect((await available.json()).available).toBe(15);
  await page.getByRole('button',{name:'Inventario',exact:true}).click();await expect(page.getByRole('button',{name:'Editar Q3-015'})).toBeVisible();await page.getByRole('button',{name:'Tarifas',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/sprint2-pricing-mobile.png',fullPage:true});
 }finally{
  const state=await (await page.request.get('/api/v1/operations')).json();if(bookingId&&state.bookings.find((b:{id:string;status:string})=>b.id===bookingId&&b.status==='confirmed'))await post({action:'bookingStatus',id:bookingId,status:'cancelled',reason:'QA cleanup'});
  if(techId)await post({action:'technician',id:techId,name:'Técnico ficticio QA (inactivo)',phone:'QA',email:'',active:false,cost4:null,cost8:null,notes:'Solo prueba automatizada'});
  await post({action:'settings',expectedId:state.config.id,rules:original,transport:transport==null?null:Number(transport)});
 }
});
