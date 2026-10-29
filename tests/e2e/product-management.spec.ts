import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import pg from 'pg';

async function clearLocalLoginAttempts(){
 const url=new URL(process.env.DATABASE_URL!);
 if(process.env.APP_ENV!=='development'||process.env.AUTH_MODE!=='local'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.endsWith('_dev'))throw Error('Login QA requires the local development environment');
 const db=new pg.Client({connectionString:url.toString()});await db.connect();
 try{await db.query('DELETE FROM request_limit WHERE key=$1',[createHash('sha256').update('login:local').digest('hex')]);}finally{await db.end();}
}
test.beforeEach(clearLocalLoginAttempts);
test.afterEach(clearLocalLoginAttempts);

test('configured login and complete product editing reach the public store',async({page})=>{
 const email=process.env.LOCAL_ADMIN_EMAIL||'admin@example.test';
 const code='QA'+Date.now();const name='Equipo QA '+code;let id:string|undefined;
 const origin={Origin:'http://127.0.0.1:3000'};
 await page.setViewportSize({width:1280,height:900});
 expect((await page.request.get('/api/v1/admin/products')).status()).toBe(401);
 await page.goto('/acceso');await page.getByLabel('Correo del equipo').fill(email.toUpperCase());
 await page.getByLabel('Contraseña',{exact:true}).fill('wrong-qa-password');
 await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page.locator('form [role="alert"]')).toContainText('incorrectos');
 await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_ADMIN_PASSWORD!);
 await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
 try{
  await page.getByRole('link',{name:'Productos',exact:true}).click();
  await page.getByRole('button',{name:'Agregar producto',exact:true}).click();
  await page.getByLabel('Nombre del producto',{exact:true}).fill(name);
  await page.getByLabel('Código interno',{exact:true}).fill(code);
  await page.getByLabel('Marca',{exact:true}).fill('Marca QA');
  await page.getByLabel('Descripción del producto',{exact:true}).fill('Descripción administrada desde el panel.');
  await page.getByLabel('Texto corto para el menú y el buscador',{exact:true}).fill('Resumen QA');
  await page.getByLabel('Categorías',{exact:true}).fill('Realidad virtual, Categoría QA');
  await page.getByLabel('Publicado en la tienda',{exact:true}).check();
  await page.getByLabel('Destacado en el inicio',{exact:true}).check();
  await page.getByRole('button',{name:'Agregar característica',exact:true}).click();
  await page.getByLabel('Nombre característica 1',{exact:true}).fill('Memoria');
  await page.getByLabel('Valor característica 1',{exact:true}).fill('256 GB');
  await page.getByLabel('unit precio 1',{exact:true}).fill('120000');
  await page.getByRole('button',{name:'Guardar producto',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Producto guardado');
  const data=await (await page.request.get('/api/v1/admin/products')).json();
  const product=data.products.find((p:{code:string})=>p.code===code);id=product.id;
  await page.screenshot({path:'test-results/admin-product-management.png',fullPage:true});
  await page.goto(`/vr/${product.slug}`);await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();
  await expect(page.locator('main')).toContainText('256 GB');await expect(page.locator('main')).toContainText('120.000');
  await page.goto(`/cotizar?equipo=${code}`);await expect(page.getByLabel('Modelo de visor')).toHaveValue(code);
  await page.goto('/admin/productos');await page.getByRole('complementary',{name:'Lista de productos'}).getByRole('button',{name:new RegExp(name)}).click();
  await page.getByLabel('Descripción del producto',{exact:true}).fill('Descripción actualizada de QA.');
  await page.getByLabel('Valor característica 1',{exact:true}).fill('512 GB');
  await page.getByRole('button',{name:'Guardar producto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Producto guardado');
  await page.goto(`/vr/${product.slug}`);await expect(page.locator('main')).toContainText('512 GB');await expect(page.locator('main')).toContainText('Descripción actualizada de QA.');
  await page.goto('/admin/productos');await page.getByRole('complementary',{name:'Lista de productos'}).getByRole('button',{name:new RegExp(name)}).click();
  await page.getByLabel('Publicado en la tienda',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Guardar producto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Producto guardado');
  const hidden=await page.request.get(`/vr/${product.slug}`);expect(hidden.status()).toBe(404);
  await page.getByLabel('Producto activo',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Guardar producto',exact:true}).click();await expect(page.getByRole('status')).toContainText('Producto guardado');
  const archived=await (await page.request.get('/api/v1/admin/products')).json();expect(archived.products.find((p:{id:string})=>p.id===id).active).toBe(false);
  await page.setViewportSize({width:360,height:850});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'test-results/admin-product-management-mobile.png',fullPage:true});
  page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Eliminar producto',exact:true}).click();
  await expect(page.getByRole('status')).toHaveText('Producto eliminado.');id=undefined;
 }finally{const current=await (await page.request.get('/api/v1/admin/products')).json();const own=current.products?.find((p:{code:string})=>p.code===code);if(own){const result=await page.request.delete('/api/v1/admin/products',{headers:origin,data:{id:own.id}});expect(result.ok(),await result.text()).toBe(true);}}
});

test('operators can read product data but cannot modify it',async({page})=>{
 await page.goto('/acceso');await page.getByLabel('Correo del equipo').fill(process.env.LOCAL_OPERATOR_EMAIL||'operador@example.test');await page.getByLabel('Contraseña',{exact:true}).fill(process.env.LOCAL_OPERATOR_PASSWORD!);
 await page.getByRole('button',{name:'Entrar al CRM'}).click();await expect(page).toHaveURL(/admin\/leads/);
 const list=await page.request.get('/api/v1/admin/products');expect(list.status()).toBe(200);
 const mutation=await page.request.post('/api/v1/admin/products',{headers:{Origin:'http://127.0.0.1:3000'},data:{}});expect(mutation.status()).toBe(403);
 await page.goto('/admin/productos');await expect(page.getByRole('button',{name:'Agregar producto',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Guardar producto',exact:true})).toBeDisabled();
});
