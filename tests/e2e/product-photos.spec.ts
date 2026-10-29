import {test,expect} from '@playwright/test';
import pg from 'pg';

test('administrator uploads a photo and every public view uses its versioned URL',async({page})=>{
 const url=new URL(process.env.DATABASE_URL!);
 if(!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_dev'))throw Error('Photo QA requires the local development database');
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 const id=(await db.query("SELECT id FROM equipment WHERE code='QUEST3'")).rows[0].id;
 const original=(await db.query('SELECT * FROM equipment_photo WHERE equipment_id=$1',[id])).rows[0];
 try{
  const unauthorized=await page.request.post('/api/v1/products/QUEST3/image',{headers:{Origin:'http://127.0.0.1:3000','Content-Type':'image/png'},data:Buffer.from([1])});
  expect(unauthorized.status()).toBe(401);
  await page.goto('/acceso');await page.getByLabel('Correo del equipo').fill(process.env.LOCAL_ADMIN_EMAIL||'admin@example.test');
  await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_ADMIN_PASSWORD!);
  await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
  await page.goto('/admin/operaciones');await page.getByRole('button',{name:'Fotos de productos',exact:true}).click();
  await page.getByLabel('Cambiar foto de Meta Quest 3').setInputFiles('public/images/meta-quest-3-cutout.png');
  await expect(page.getByRole('status')).toHaveText('Foto de Meta Quest 3 guardada.',{timeout:20000});
  await page.screenshot({path:'test-results/admin-product-photos.png',fullPage:true});
  for(const path of ['/','/vr','/vr/meta-quest-3']){
   await page.goto(path);
   const image=page.locator('main img[src*="products%2FQUEST3%2Fimage"]').first();
   await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
  }
  await page.setViewportSize({width:1385,height:1000});await page.goto('/');
  await page.getByRole('button',{name:'Realidad Virtual',exact:true}).hover();
  await page.locator('.mega-browse').getByRole('link',{name:'Realidad mixta',exact:true}).hover();
  await expect(page.locator('.mega-product img')).toHaveAttribute('src',/products%2FQUEST3%2Fimage/);
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await page.getByLabel('Buscar producto',{exact:true}).fill('Quest 3');
  await expect(page.locator('.site-search-results img')).toHaveAttribute('src',/products%2FQUEST3%2Fimage/);
 }finally{
  if(original)await db.query('UPDATE equipment_photo SET data=$2,version=$3,updated_at=$4 WHERE equipment_id=$1',[id,original.data,original.version,original.updated_at]);
  else await db.query('DELETE FROM equipment_photo WHERE equipment_id=$1',[id]);
  await db.end();
 }
});
