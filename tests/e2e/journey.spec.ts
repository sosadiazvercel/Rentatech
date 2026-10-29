import {test,expect} from '@playwright/test';
import {validLead} from '../fixture';
test('public pages fit mobile and preserve model selection',async({page})=>{
 await page.setViewportSize({width:360,height:800});
 for(const path of ['/','/vr','/vr/quest-2','/vr/quest-3','/realidad-virtual-para-eventos','/alquiler-meta-quest-bogota','/cotizar']){
  await page.goto(path);await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
 await page.goto('/vr/quest-2');await page.getByRole('link',{name:'Cotizar y verificar fecha'}).click();await expect(page.getByLabel('Modelo',{exact:true})).toHaveValue('QUEST2');
});
test('wizard → saved quote → CRM follow-up',async({page})=>{
 await page.goto('/cotizar');
 await page.getByLabel('Cantidad de gafas').fill('2');await page.getByRole('button',{name:'Consultar disponibilidad'}).click();await expect(page.getByRole('alert',{name:'Error del cotizador'})).toContainText('mínimo de 3');
 await page.getByLabel('Cantidad de gafas').fill('3');await page.getByLabel('Fecha del evento').fill('2032-10-16');
 await page.getByRole('button',{name:'Consultar disponibilidad'}).click();await expect(page.getByRole('heading',{name:'¿Dónde y para qué?'})).toBeVisible();
 await page.getByLabel('Dirección o lugar del evento').fill('Recinto ficticio QA');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await page.getByLabel('Nombre de contacto').fill('Contacto QA');await page.getByLabel('Empresa (opcional)').fill('Empresa ficticia QA');await page.getByLabel('Correo electrónico').fill('qa-wizard@example.test');await page.getByLabel('Teléfono / WhatsApp').fill('+573001234567');await page.getByRole('checkbox',{name:/Acepto el aviso/}).check();await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByText(/^\$\s*1\.060\.000$/)).toBeVisible();
 await page.screenshot({path:'test-results/sprint2-quote-desktop.png',fullPage:true});await page.setViewportSize({width:360,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/sprint2-quote-mobile.png',fullPage:true});await page.getByRole('button',{name:'Solicitar reserva',exact:true}).click();await expect(page.getByRole('heading',{name:'Hemos recibido tu solicitud.'})).toBeVisible();
 await page.goto('/admin');await expect(page).toHaveURL(/acceso/);await page.getByLabel('Correo del equipo').fill(process.env.LOCAL_ADMIN_EMAIL||'admin@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_ADMIN_PASSWORD!);await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
 await page.getByRole('link',{name:'Abrir'}).first().click();await page.getByLabel('Etapa',{exact:true}).selectOption('qualified');await page.getByLabel('Agregar nota').fill('Seguimiento cotización QA');await page.getByRole('button',{name:'Guardar seguimiento'}).click();await expect(page.getByRole('status')).toHaveText('Cambios guardados');await page.reload();await expect(page.getByText('Seguimiento cotización QA',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Salir',exact:true}).click();await expect(page).toHaveURL(/acceso/);await page.goto('/admin/operaciones');await expect(page).toHaveURL(/acceso/);
});

test('API enforces input, origin, auth and role boundaries',async({request,page})=>{
 expect((await request.get('/api/v1/admin/leads')).status()).toBe(401);
 expect((await request.post('/api/v1/leads',{data:validLead,headers:{Origin:'https://other.example','Idempotency-Key':crypto.randomUUID()}})).status()).toBe(403);
 expect((await request.post('/api/v1/leads',{data:{...validLead,privacy:false},headers:{Origin:'http://127.0.0.1:3000','Idempotency-Key':crypto.randomUUID()}})).status()).toBe(422);
 await page.goto('/acceso');await page.getByLabel('Correo del equipo').fill(process.env.LOCAL_OPERATOR_EMAIL||'operador@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_OPERATOR_PASSWORD!);await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
 const response=await page.request.post('/api/v1/admin/pricing-versions',{data:{},headers:{Origin:'http://127.0.0.1:3000'}});expect(response.status()).toBe(403);
});
test('capture visual QA',async({page})=>{await page.goto('/');await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});await page.setViewportSize({width:360,height:800});await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});await page.goto('/cotizar');await page.screenshot({path:'test-results/form-mobile.png',fullPage:true});});
