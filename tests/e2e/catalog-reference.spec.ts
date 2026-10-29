import {test,expect} from '@playwright/test';

test('reference gallery, mega menu and search navigate between real products',async({page})=>{
 await page.setViewportSize({width:1385,height:1000});await page.goto('/');
 const first=page.getByRole('button',{name:'Mostrar Meta Quest 2',exact:true});
 await first.click();await expect(first).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Realidad Virtual',exact:true}).hover();
 await expect(page.locator('#vr-menu')).toBeVisible();
 await page.locator('.mega-browse').getByRole('link',{name:'Realidad mixta',exact:true}).hover();
 await expect(page.locator('.mega-product strong')).toHaveText('Meta Quest 3');
 await page.locator('.nav-mega-trigger').focus();await page.keyboard.press('Escape');
 await expect(page.locator('#vr-menu')).toBeHidden();
 await page.getByRole('button',{name:'Buscar',exact:true}).click();
 await page.getByLabel('Buscar producto',{exact:true}).fill('Quest 2');
 await expect(page.locator('.site-search-results a')).toHaveCount(1);
 await page.getByLabel('Buscar producto',{exact:true}).press('Enter');
 await expect(page).toHaveURL(/meta-quest-2/);
});

test('the category menu filters the catalog and card details start with the title',async({page})=>{
 await page.goto('/vr?categoria=realidad-mixta');
 await expect(page.getByRole('link',{name:'Realidad mixta',exact:true})).toHaveAttribute('aria-current','page');
 await expect(page.locator('article').filter({hasText:'Meta Quest 3'})).toHaveCount(1);
 await expect(page.locator('article').filter({hasText:'Meta Quest 2'})).toHaveCount(0);
 await expect(page.locator('article').first().locator('h3')).toHaveText('Meta Quest 3');
 await page.getByRole('link',{name:'Todos',exact:true}).click();
 await expect(page.locator('article')).toHaveCount(2);
});

test('mobile product titles fit inside their cards',async({page})=>{
 await page.setViewportSize({width:360,height:850});await page.goto('/');
 await expect(page.getByRole('link',{name:'Telefono',exact:true})).toHaveCount(0);
 const heading=await page.locator('main h1').boundingBox();
 const counter=await page.locator('main section').first().locator('[aria-live="polite"]').boundingBox();
 expect(heading&&counter&&heading.y>counter.y+counter.height).toBe(true);
 const quoteButton=await page.locator('main').getByRole('link',{name:'Cotizar',exact:true}).first().boundingBox();
 const browseButton=await page.locator('main').getByRole('link',{name:'Ver equipos',exact:true}).first().boundingBox();
 expect(quoteButton&&browseButton&&browseButton.y>quoteButton.y+quoteButton.height).toBe(true);
 await expect.poll(()=>page.locator('main h3').evaluateAll(titles=>titles.every(el=>el.scrollWidth<=el.clientWidth+1))).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
 await expect(page.getByRole('navigation',{name:'Menu movil',exact:true})).toBeVisible();
});
