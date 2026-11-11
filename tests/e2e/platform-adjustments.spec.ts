import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID,randomBytes,createHash} from 'node:crypto';

test('hero frames stay complete when switching products and mobile hides header account actions',async({page})=>{
 await page.goto('/');
 const selectors=page.getByRole('button',{name:/^Mostrar /});
 for(let i=0;i<await selectors.count();i++){
  await selectors.nth(i).click();await expect(selectors.nth(i)).toHaveAttribute('aria-pressed','true');
  expect(await selectors.nth(i).evaluate(el=>{const css=getComputedStyle(el,'::after');return css.borderTopWidth==='2px'&&css.borderRightWidth==='2px'&&css.borderBottomWidth==='2px'&&css.borderLeftWidth==='2px'&&css.zIndex==='4';})).toBe(true);
 }
 await page.screenshot({path:'test-results/home-adjusted-desktop.png',fullPage:true});
 await page.setViewportSize({width:360,height:850});
 await page.getByRole('button',{name:'Abrir menu'}).click();
 for(const link of await page.locator('header a[href="/cotizar"],header a[href="/admin"]').all())await expect(link).toBeHidden();
 await page.getByRole('button',{name:'Abrir menu'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/home-adjusted-mobile.png',fullPage:true});
});

test('quote validates identification, includes rental days and displays only the final confirmation',async({page})=>{
 await page.route('**/api/v1/rental/quotes',route=>route.fulfill({json:{number:'RT-QA-ONLY',emailSent:true}}));
 await page.goto('/cotizar');
 await expect(page.locator('main')).not.toContainText('Mínimo 3 visores');
 await page.getByLabel('Número de días de alquiler').fill('2');await page.getByLabel('Fecha del alquiler').fill('2035-10-15');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.locator('aside')).toContainText('2 jornadas de hasta 8 horas');
 await page.getByLabel('Dirección o lugar del alquiler').fill('Lugar QA');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.getByLabel('Código internacional')).toHaveValue('+57');
 await page.getByLabel('Nombre de contacto').fill('Cliente QA');await page.getByLabel('Correo electronico').fill('qa@example.test');await page.getByLabel('Teléfono / WhatsApp').fill('3001234567');
 await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.getByRole('alert',{name:'Error del cotizador'})).toContainText('NIT');
 await page.getByLabel('NIT / Cédula').fill('900123456');await page.getByRole('button',{name:'Continuar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Resumen de cotizacion'})).toBeVisible();
 await page.setViewportSize({width:360,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Solicitar cotización',exact:true}).click();
 await expect(page.locator('main h1')).toHaveCount(1);await expect(page.locator('main h1')).toHaveText('¡Tu cotización está lista!');
 await expect(page.locator('main')).toContainText('Hemos enviado un resumen al correo electrónico que registraste. Pronto nos pondremos en contacto contigo para continuar con el proceso.');
 await expect(page.locator('main')).not.toContainText('Prepara tu experiencia');
 await page.screenshot({path:'test-results/quote-confirmation-mobile.png',fullPage:true});
});

test('request detail handles current rental fields and adapts follow-up to each stage',async({page,context})=>{
 const url=new URL(process.env.DATABASE_URL!);if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_dev'))throw Error('Local development database only');
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 const customerId=randomUUID(),leadId=randomUUID(),token=randomBytes(32).toString('base64url');
 try{
  const staff=(await db.query("SELECT id FROM staff_profile WHERE role='admin' AND active LIMIT 1")).rows[0];
  await db.query("INSERT INTO staff_session(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",[createHash('sha256').update(token).digest('hex'),staff.id]);
  await db.query("INSERT INTO customer(id,contact_name,email_normalized,phone_e164,customer_type) VALUES($1,'Cliente QA',$2,'+573001234567','private')",[customerId,`${customerId}@example.test`]);
  await db.query("INSERT INTO lead(id,customer_id,request,source,privacy_version,privacy_accepted_at,continuation_token_hash,continuation_expires_at) VALUES($1,$2,$3,'qa','qa',now(),'qa',now()+interval '1 day')",[leadId,customerId,JSON.stringify({name:'Cliente QA',email:'qa@example.test',phone:'+573001234567',equipment:'QUEST3',quantity:3,days:2,date:'2035-10-15',start:'10:00',city:'Bogotá',address:'Lugar QA',nit:'900123456',contentStatus:'ready'})]);
  await context.addCookies([{name:'nk_staff_session',value:token,url:'http://127.0.0.1:3000'}]);
  await page.goto(`/admin/leads/${leadId}`);
  await expect(page.getByRole('heading',{name:'Contexto del alquiler'})).toBeVisible();
  await expect(page.locator('main')).not.toContainText('undefined');await expect(page.locator('main')).not.toContainText('Marketing');await expect(page.locator('main')).not.toContainText('Privacidad');
  await expect(page.getByLabel('Próxima acción')).toHaveCount(0);await expect(page.getByLabel('Motivo de pérdida')).toHaveCount(0);
  await expect(page.getByRole('list',{name:'Progreso del alquiler'}).locator('li')).toHaveCount(5);
  await page.getByLabel('Etapa',{exact:true}).selectOption('quoted');await expect(page.getByRole('button',{name:'Enviar cotización',exact:true})).toBeVisible();await expect(page.getByLabel('Archivo de cotización (PDF)')).toBeVisible();
  await page.getByLabel('Etapa',{exact:true}).selectOption('awaiting_payment');await expect(page.getByLabel('Enlace de pago')).toBeVisible();await expect(page.getByLabel('Cotización final aprobada (PDF)')).toBeVisible();
  await page.getByLabel('Etapa',{exact:true}).selectOption('confirmed');await expect(page.getByLabel('Referencia del pago validado')).toBeVisible();
  await page.getByLabel('Etapa',{exact:true}).selectOption('lost');await expect(page.getByText('No se enviarán correos automáticos al cliente.')).toBeVisible();
  await page.setViewportSize({width:360,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/lead-followup-mobile.png',fullPage:true});
  await page.goto('/admin/operaciones');await page.getByRole('button',{name:'Inventario',exact:true}).click();
  await expect(page.locator('tbody a[href^="/vr/"]').first()).toBeVisible();
 }finally{
  await db.query('DELETE FROM lead WHERE id=$1',[leadId]);await db.query('DELETE FROM customer WHERE id=$1',[customerId]);await db.query('DELETE FROM staff_session WHERE token_hash=$1',[createHash('sha256').update(token).digest('hex')]);await db.end();
 }
});
