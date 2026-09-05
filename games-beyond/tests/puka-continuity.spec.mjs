import { test, expect } from '@playwright/test';

const canonical='puka/';
const primaryStore='jm-puka-v12a';
const currentCache='jm-puka-v17a';

async function visibleHandIdentity(page){
  return page.locator('.you .playing-card').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('aria-label')));
}

async function visiblePot(page){
  return page.locator('.pot b').textContent();
}

test('@puka-continuity canonical door, PWA identity and state survive service-worker re-entry', async ({ browser },testInfo) => {
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(`pageerror:${e.message}`));
  page.on('console',m=>{if(m.type()==='error')errors.push(`console:${m.text()}`)});

  await page.goto(`${canonical}?continuity=door#resume`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableState')).toBeVisible();
  expect(new URL(page.url()).pathname.endsWith('/games-beyond/puka/00_OPEN_FIRST.html')).toBeTruthy();
  expect(new URL(page.url()).search).toContain('continuity=door');
  expect(new URL(page.url()).hash).toBe('#resume');

  const manifest=await page.evaluate(async()=>{
    const link=document.querySelector('link[rel="manifest"]');
    const url=new URL(link.href,location.href);
    const body=await fetch(url,{cache:'no-store'}).then(r=>r.json());
    return {body,href:url.href};
  });
  expect(manifest.body.id,'PWA identity must be explicit and stable').toBe('./00_OPEN_FIRST.html');
  expect(manifest.body.start_url).toBe('./00_OPEN_FIRST.html');
  expect(manifest.body.scope).toBe('./');

  const registration=await page.evaluate(async()=>{
    if(!('serviceWorker' in navigator)) return null;
    const reg=await navigator.serviceWorker.ready;
    return {scope:reg.scope,script:reg.active?.scriptURL||''};
  });
  expect(registration,'PUKA must register a service worker in browser proof').not.toBeNull();
  expect(registration.scope.endsWith('/games-beyond/puka/')).toBeTruthy();
  expect(registration.script.endsWith('/games-beyond/puka/sw.js')).toBeTruthy();

  await page.locator('[data-next-hand]').click();
  await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
  const hand=await page.locator('#dealerLine').textContent();
  const cards=await visibleHandIdentity(page);
  const pot=await visiblePot(page);
  expect(cards).toHaveLength(2);
  const storedBeforeRaw=await page.evaluate(key=>localStorage.getItem(key),primaryStore);
  expect(storedBeforeRaw,'stable PUKA primary store must contain the active hand').toBeTruthy();
  const storedBefore=JSON.parse(storedBeforeRaw);
  const beforeState={
    version:storedBefore.version,
    handNo:storedBefore.state?.handNo,
    pot:storedBefore.state?.pot,
    playerHole:(storedBefore.state?.players?.player?.hole||[]).map(c=>c.id)
  };
  await page.screenshot({path:testInfo.outputPath('puka-continuity-before-sw-reentry.png'),fullPage:false});

  await page.evaluate(async(oldKey)=>{
    await caches.open(oldKey).then(c=>c.put('./legacy-proof',new Response('old')));
    const regs=await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map(r=>r.unregister()));
  },'jm-puka-v09a');

  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
  await expect(page.locator('#dealerLine')).toHaveText(hand);
  expect(await visibleHandIdentity(page),'same private cards must return after service-worker reinstall').toEqual(cards);
  expect(await visiblePot(page),'same pot must return after service-worker reinstall').toBe(pot);
  const storedAfterRaw=await page.evaluate(key=>localStorage.getItem(key),primaryStore);
  expect(storedAfterRaw,'service-worker/cache replacement must not erase PUKA local state').toBeTruthy();
  const storedAfter=JSON.parse(storedAfterRaw);
  const afterState={
    version:storedAfter.version,
    handNo:storedAfter.state?.handNo,
    pot:storedAfter.state?.pot,
    playerHole:(storedAfter.state?.players?.player?.hole||[]).map(c=>c.id)
  };
  expect(afterState,'stable game state must survive while trace metadata may lawfully grow').toEqual(beforeState);

  await page.evaluate(async()=>navigator.serviceWorker.ready);
  await page.waitForTimeout(150);
  const cacheKeys=await page.evaluate(async()=>await caches.keys());
  expect(cacheKeys).toContain(currentCache);
  expect(cacheKeys.filter(k=>k.startsWith('jm-puka-')&&k!==currentCache),'activation must remove stale PUKA caches only').toEqual([]);
  await page.screenshot({path:testInfo.outputPath('puka-continuity-after-sw-reentry.png'),fullPage:false});

  expect(errors,'canonical continuity route must stay free of runtime errors').toEqual([]);
  await context.close();
});
