import {test,expect} from '@playwright/test';
import pg from 'pg';
import {createHash,randomBytes,randomUUID} from 'node:crypto';

test('manual calendar uses selected date and supports editing and deleting; lost stays editable',async({page,context})=>{
 const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_dev'))throw Error('Local QA only');
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 const token=randomBytes(32).toString('base64url'),customerId=randomUUID(),leadId=randomUUID(),title='Evento ajustes '+randomUUID();
 try{
  const staff=(await db.query("SELECT id FROM staff_profile WHERE role='admin' AND active LIMIT 1")).rows[0];
  await db.query("INSERT INTO staff_session(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",[createHash('sha256').update(token).digest('hex'),staff.id]);
  await context.addCookies([{name:'nk_staff_session',value:token,url:'http://127.0.0.1:3000'}]);
  await page.goto('/admin/calendario');
  await page.locator('.calendar-day.today .calendar-add').click();
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Bogota'});
  await expect(page.getByLabel('Fecha de inicio')).toHaveValue(today);
  await page.getByLabel('Nombre del evento').fill(title);await page.getByLabel('Lugar',{exact:true}).fill('Lugar QA');
  await page.getByRole('button',{name:'Guardar evento',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.locator('.calendar-event').filter({hasText:title}).click();
  await page.getByLabel('Nombre del evento').fill(title+' editado');await page.getByRole('button',{name:'Guardar evento',exact:true}).click();
  await expect(page.locator('.calendar-event').filter({hasText:title+' editado'})).toBeVisible();
  await page.screenshot({path:'test-results/calendar-adjustments-desktop.png',fullPage:true});
  await page.locator('.calendar-event').filter({hasText:title}).click();page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Eliminar evento',exact:true}).click();await expect(page.locator('.calendar-event').filter({hasText:title})).toHaveCount(0);
  await db.query("INSERT INTO customer(id,contact_name,email_normalized,phone_e164,customer_type) VALUES($1,'Cliente QA',$2,'+573001234567','private')",[customerId,customerId+'@example.test']);
  const request={name:'Cliente QA',email:'qa@example.test',phone:'+573001234567',equipment:'QUEST3',quantity:3,days:1,date:'2035-10-15',start:'10:00',city:'Bogotá',address:'Lugar QA',nit:'900123456',contentStatus:'ready'};
  await db.query("INSERT INTO lead(id,customer_id,stage,request,source,privacy_version,privacy_accepted_at,continuation_token_hash,continuation_expires_at) VALUES($1,$2,'lost',$3,'qa','qa',now(),'qa',now()+interval '1 day')",[leadId,customerId,JSON.stringify(request)]);
  await page.goto('/admin/leads/'+leadId);
  await expect(page.locator('.lead-progress li').last()).toHaveAttribute('aria-current','step');
  await expect(page.getByLabel('Etapa',{exact:true})).toBeEnabled();
  await expect(page.getByLabel('Responsable',{exact:true}).getByRole('option',{name:'Jorge',exact:true})).toHaveCount(1);
  await expect(page.getByLabel('Responsable',{exact:true}).getByRole('option',{name:'Felipe',exact:true})).toHaveCount(1);
  await page.getByText('Editar información del alquiler',{exact:true}).click();
  await page.locator('input[name="context_nit"]').fill('123456789');
  await page.getByRole('button',{name:'Marcar como perdido',exact:true}).click();await expect(page.getByRole('status')).toContainText('Cambios guardados');
  await expect.poll(async()=>(await db.query('SELECT request FROM lead WHERE id=$1',[leadId])).rows[0].request.nit).toBe('123456789');
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/lead-adjustments-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await db.query("UPDATE lead SET stage='completed' WHERE id=$1",[leadId]);await page.reload();await expect(page.getByLabel('Etapa',{exact:true})).toBeDisabled();
 }finally{
  await db.query('DELETE FROM calendar_event WHERE title LIKE $1',[title+'%']);
  await db.query('DELETE FROM lead WHERE id=$1',[leadId]);await db.query('DELETE FROM customer WHERE id=$1',[customerId]);
  await db.query('DELETE FROM staff_session WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);await db.end();
 }
});

test('public catalog uses equipment links and accessible search close button',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'Nuestros equipos',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Buscar',exact:true}).click();await expect(page.getByRole('button',{name:'Cerrar búsqueda'})).toBeVisible();
 expect(await page.locator('.site-search-results a').count()).toBeLessThanOrEqual(3);
 await expect(page.locator('.site-search-results a').first()).toHaveAttribute('href',/^\/equipos\//);
 await page.getByRole('button',{name:'Cerrar búsqueda'}).click();await expect(page.locator('.site-search')).toBeHidden();
 await page.screenshot({path:'test-results/catalog-adjustments-desktop.png',fullPage:true});
 await page.goto('/equipos');await expect(page.getByRole('heading',{name:'Nuestros equipos',exact:true})).toBeVisible();
 await page.goto('/cotizar');await expect(page.getByRole('heading',{name:'Configura tu alquiler',exact:true})).toBeVisible();
 await page.getByLabel('Cantidad de equipos',{exact:true}).fill('2');await page.getByLabel('Fecha del alquiler').fill('2035-10-15');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('alert',{name:'Error del cotizador'})).toContainText('mínimo 3');
});

test('reservation list keeps confirmed services, highlights urgency and filters quotations',async({page,context})=>{
 const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_dev'))throw Error('Local QA only');
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 const token=randomBytes(32).toString('base64url');
 try{
  const staff=(await db.query("SELECT id FROM staff_profile WHERE role='admin' AND active LIMIT 1")).rows[0];
  await db.query("INSERT INTO staff_session(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '15 minutes')",[createHash('sha256').update(token).digest('hex'),staff.id]);
  await context.addCookies([{name:'nk_staff_session',value:token,url:'http://127.0.0.1:3000'}]);
  const base=await (await page.request.get('/api/v1/operations')).json();
  const soon=new Date(Date.now()+2*86400000).toISOString(),later=new Date(Date.now()+3*86400000).toISOString();
  const snapshot={request:{name:'Cliente QA',company:'QA',email:'qa@example.test',phone:'+573001234567',city:'Bogotá',address:'Lugar QA'},event:{quantity:3,durationHours:8},total:100000,complete:true,pending:[],depositPercent:50,deposit:50000};
  const booking={id:'booking-qa',lead_id:'lead-qa',number:'RT-R-QA-confirmada',status:'confirmed',event_start:soon,event_end:later,quantity:3,equipment_name:'Meta Quest 3',snapshot,total_cop:'100000',paid_cop:'100000',balance_due_cop:'0',payment_status:'PAID',assets:[],technicians:[{id:'tech-qa',name:'Técnico asignado QA'}]};
  await page.route('**/api/v1/operations',route=>route.fulfill({json:{...base,bookings:[booking,{...booking,id:'completed-qa',number:'RT-R-QA-completada',status:'completed'}],quotes:[{id:'quote-new',number:'RT-Q-QA-nueva',status:'pending_confirmation',snapshot,event_start:soon,created_at:soon,quantity:3,equipment_name:'Meta Quest 3',total_cop:'100000'},{id:'quote-old',number:'RT-Q-QA-cancelada',status:'cancelled',snapshot,event_start:soon,created_at:soon,quantity:3,equipment_name:'Meta Quest 3',total_cop:'100000'}]}}));
  await page.goto('/admin/operaciones');await page.getByRole('button',{name:'Reservas',exact:true}).click();
  await expect(page.getByRole('button',{name:/RT-R-QA-confirmada/})).toBeVisible();await expect(page.getByRole('button',{name:/RT-R-QA-completada/})).toHaveCount(0);
  await expect(page.locator('.service-urgent')).toContainText('Faltan 2 días');
  await page.getByRole('button',{name:/RT-R-QA-confirmada/}).click();await expect(page.getByText('Técnicos: Técnico asignado QA',{exact:true})).toHaveCount(2);
  await page.screenshot({path:'test-results/reservation-adjustments-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Ver historial y servicios en curso',exact:true}).click();await expect(page.getByRole('button',{name:/RT-R-QA-completada/})).toBeVisible();
  await page.getByRole('button',{name:'Cotizaciones',exact:true}).click();await page.getByLabel('Estado de cotización').selectOption('cancelled');
  await expect(page.getByRole('button',{name:/RT-Q-QA-cancelada/})).toBeVisible();await expect(page.getByRole('button',{name:/RT-Q-QA-nueva/})).toHaveCount(0);
 }finally{await db.query('DELETE FROM staff_session WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);await db.end();}
});
