import { test, expect } from '@playwright/test';

const BUILT_IN = '22 MOUNTED · 24 FULL';

async function boot(page, path='./') {
  await page.goto(path);
  await expect(page.locator('#status')).toContainText(BUILT_IN, { timeout: 60_000 });
}

async function openGame(page, id) {
  await page.evaluate(id => window.GamesBeyond.playBody(id), id);
  await expect(page.locator('#bodyDialog')).toBeVisible();
  await expect.poll(() => page.locator('#bodyFrame').evaluate(f => f.contentDocument?.readyState)).toBe('complete');
  return page.locator('#bodyFrame');
}

test('CP30 original House retains three actual grid tracks and a usable embedded viewport', async ({ page }) => {
  for (const size of [{ width: 1280, height: 720 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(size);
    await boot(page);
    const frame = await openGame(page, 'western-sniper');
    const metrics = await frame.evaluate(f => {
      const d=f.contentDocument;
      const stage=d.querySelector('.stage')?.getBoundingClientRect();
      return { frameHeight: f.getBoundingClientRect().height, frameWidth:f.getBoundingClientRect().width, stageHeight:stage?.height||0, grid:getComputedStyle(f.parentElement).gridTemplateRows.split(' ').length };
    });
    console.log('HOUSE_VIEWPORT',size,metrics);
    expect(metrics.grid).toBe(3);
    expect(metrics.frameHeight).toBeGreaterThan(size.height < 500 ? 140 : 390);
    expect(metrics.stageHeight).toBeGreaterThan(size.height < 500 ? 85 : 180);
    await page.locator('#closeDialog').click();
  }
});

test('CP30 cardBORED visibly renders the real card hand in the repaired viewport', async ({ page }) => {
  await boot(page, './?jm-play=cardbored');
  await expect(page.locator('#bodyDialog')).toBeVisible();
  const cards = await expect.poll(() => page.locator('#bodyFrame').evaluate(f => {
    const d=f.contentDocument;
    const hand=d.querySelector('#hand');
    return hand ? [...hand.querySelectorAll('.card')].filter(x => {
      const r=x.getBoundingClientRect();
      return r.width>20 && r.height>20;
    }).length : 0;
  }),{timeout:10000}).toBeGreaterThan(0);
  const frameHeight=await page.locator('#bodyFrame').evaluate(f=>f.clientHeight);
  expect(frameHeight).toBeGreaterThan(350);
});

test('CP30 GameCore loads the recovered original T-Boys reference asset', async ({ page }) => {
  const missing=[];
  page.on('response', r=>{if(r.status()===404)missing.push(r.url())});
  await boot(page);
  await openGame(page, 'gamecore');
  await expect.poll(()=>page.locator('#bodyFrame').evaluate(f=>{
    const img=f.contentDocument.querySelector('img[src*="TBOYS_REFERENCE_CONTACT_SHEET"]');
    return img?.naturalWidth||0;
  }),{timeout:10000}).toBeGreaterThan(0);
  expect(missing.filter(x=>x.includes('TBOYS_REFERENCE_CONTACT_SHEET'))).toEqual([]);
});

test('CP30 accessibility assistance repairs C-grade opening copies and keeps stored source immutable', async ({ page }) => {
  await boot(page);
  for (const id of ['fourfold-arena', 'gamecore']) {
    const before=await page.evaluate(id=>window.GamesBeyond.pack.bodies.find(b=>b.id===id).html,id);
    const frame=await openGame(page,id);
    await expect.poll(()=>page.locator('#bodySummary').textContent()).toMatch(/Runtime assistance/);
    const result=await frame.evaluate(f=>{
      const d=f.contentDocument;
      return { noAlt:d.querySelectorAll('img:not([alt])').length,unnamedCanvas:[...d.querySelectorAll('canvas')].filter(x=>!x.getAttribute('aria-label')&&!x.getAttribute('aria-labelledby')).length,zoom:d.querySelector('meta[name="viewport"]')?.content||'',summary:d.title };
    });
    console.log('ASSISTED_COPY',id,result);
    expect(result.noAlt).toBe(0);
    expect(result.unnamedCanvas).toBe(0);
    expect(result.zoom).not.toMatch(/maximum-scale|user-scalable\s*=\s*no/i);
    expect(await page.evaluate(id=>window.GamesBeyond.pack.bodies.find(b=>b.id===id).html,id)).toBe(before);
    await page.locator('#closeDialog').click();
  }
});

test('CP30 every one of the 22 built-in doors opens its authentic mounted document', async ({ page }) => {
  test.setTimeout(180_000);
  await boot(page);
  const ids=await page.evaluate(()=>window.GamesBeyond.pack.bodies.map(x=>x.id));
  expect(ids).toHaveLength(22);
  const failures=[];
  for(const id of ids){
    try{
      const frame=await openGame(page,id);
      const state=await frame.evaluate(f=>({
        height:f.getBoundingClientRect().height,
        htmlLength:f.contentDocument?.documentElement?.outerHTML.length||0,
        ready:f.contentDocument?.readyState
      }));
      if(state.height<135||state.htmlLength<250||state.ready!=='complete')failures.push({id,...state});
    }catch(error){failures.push({id,error:String(error)})}
    await page.locator('#closeDialog').click();
  }
  expect(failures).toEqual([]);
  console.log('ALL_MOUNTED_DOORS_VERIFIED',ids.length);
});

test('CP30 direct play link launches game without a manual OPEN BODY click',async({page})=>{
  await boot(page,'./?jm-play=crewbound-arena');
  await expect(page.locator('#bodyDialog')).toBeVisible();
  await expect(page.locator('#dialogTitle')).toContainText(/Crewbound/i);
  await expect.poll(()=>page.locator('#bodyFrame').evaluate(f=>f.contentDocument?.documentElement?.outerHTML.length||0)).toBeGreaterThan(300);
  await page.goto('./?jm-play=unknown-private-body');
  await expect(page.locator('#status')).toContainText('PLAY HOLD',{timeout:60000});
  await expect(page.locator('#bodyDialog')).not.toBeVisible();
});
