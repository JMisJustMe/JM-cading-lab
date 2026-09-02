import { test, expect } from '@playwright/test';

const door='puka/00_OPEN_FIRST.html';

function collectRuntimeErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));
  page.on('console',message=>{if(message.type()==='error') errors.push(`console:${message.text()}`)});
  return errors;
}

async function handIdentity(page){
  return {
    hand:await page.locator('#dealerLine').textContent(),
    cards:await page.locator('.you .playing-card').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label'))),
    pot:await page.locator('.pot b').textContent()
  };
}

test('@puka-canonical-continuity replaceable cache carrier may advance while canonical PUKA state returns',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=collectRuntimeErrors(page);

  await page.goto(`${door}?puka-continuity=${Date.now()}`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableState')).toBeVisible();

  // Start from a clean local proof context. This affects only the isolated test browser.
  await page.evaluate(async()=>{
    for(const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for(const key of await caches.keys()) if(key.startsWith('jm-puka-')) await caches.delete(key);
    localStorage.removeItem('jm-puka-v12a');
    localStorage.removeItem('jm-puka-v14a');
  });
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('[data-next-hand]')).toBeVisible();
  await page.locator('[data-next-hand]').click();
  await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
  const before=await handIdentity(page);
  expect(before.cards).toHaveLength(2);
  expect(await page.evaluate(()=>localStorage.getItem('jm-puka-v12a')),'the established state lineage must contain the live hand').toBeTruthy();
  expect(await page.evaluate(()=>localStorage.getItem('jm-puka-v14a')),'cache identity must not silently become a second persistence store').toBeNull();

  // Simulate an older disposable PUKA carrier immediately before the current worker installs.
  await page.evaluate(async()=>{
    for(const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    const legacy=await caches.open('jm-puka-v13a');
    await legacy.put(new Request(location.href),new Response('legacy PUKA cache carrier'));
  });
  expect(await page.evaluate(async()=>await caches.keys())).toContain('jm-puka-v13a');

  // Same door, current carrier. The saved hand must return without a state-store version reset.
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
  const after=await handIdentity(page);
  expect(after,'canonical-door descendant reload must restore the exact contacted hand').toEqual(before);
  expect(await page.evaluate(()=>localStorage.getItem('jm-puka-v12a')),'established state lineage must remain present after worker/carrier upgrade').toBeTruthy();
  expect(await page.evaluate(()=>localStorage.getItem('jm-puka-v14a')),'cache version and persistence version must remain separate concerns').toBeNull();

  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await expect.poll(async()=>page.evaluate(async()=>await caches.keys()),{message:'current PUKA worker must mount its cache carrier without touching saved state'}).toContain('jm-puka-v14a');
  await expect.poll(async()=>page.evaluate(async()=>await caches.keys()),{message:'current PUKA worker must retire earlier PUKA cache carriers'}).not.toContain('jm-puka-v13a');

  const manifest=await page.evaluate(async()=>await (await fetch('manifest.webmanifest',{cache:'no-store'})).json());
  expect(manifest.id,'explicit PWA identity must preserve the previously implicit start-url identity').toBe('./00_OPEN_FIRST.html');
  expect(manifest.start_url).toBe('./00_OPEN_FIRST.html');
  expect(manifest.scope).toBe('./');
  expect(errors,'canonical continuity route must remain free of console/page errors').toEqual([]);

  await context.close();
});
