import { test, expect } from '@playwright/test';

/**
 * CP24: receiver-context browser checks for the three ORIGINAL game bodies.
 * Pixel/desktop Chromium are simulated contexts, NOT proof of a physical phone.
 * This test does not render or re-skin any game from another game's HTML.
 */
const games = [
  { path: './bodies/drag-aim-loop-kernel-v0-9-9.html', canvas: '#arena', title: /Drag.*Aim/i },
  { path: './bodies/fight-clash-v0-4.html', canvas: '#game', title: /Fight Clash/i },
  { path: './bodies/futarized-v1-2.html', canvas: '#aimCanvas', title: /FUTARIZED/i }
];

for (const game of games) {
  test('@jm-contact original game opens and fits its real playfield: ' + game.path, async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(game.path);
    await expect(page).toHaveTitle(game.title);
    await expect(page.locator(game.canvas)).toBeVisible();
    await expect.poll(async () => page.locator(game.canvas).evaluate(c => c.width > 0 && c.height > 0)).toBeTruthy();
    const overflow = await page.evaluate(() =>
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('@jm-contact Drag & Aim keyboard changes aim and fires via ORIGINAL physics', async ({ page }, info) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/drag-aim-loop-kernel-v0-9-9.html');
  await page.locator('#arena').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.locator('#hudShots')).toHaveText('1');
  await expect(page.locator('#statePill')).toContainText(/MOVING|READY/);
  expect(errors).toEqual([]);
});

test('@jm-contact Fight Clash never keeps held UI after browser focus loss', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/fight-clash-v0-4.html');
  // Genuine opening route: First Bell modal blocks the start button until a mode is chosen.
  await page.locator('#introBoxing').click();
  await expect(page.locator('#intro')).not.toHaveClass(/show/);
  const startButton=page.locator('#startBtn');
  if(await startButton.isVisible()) await startButton.click();
  else await page.locator('#game').click({position:{x:40,y:40}});
  await page.keyboard.down('w');
  await page.keyboard.down('i');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('w');
  await page.keyboard.up('i');
  await expect(page.locator('.held')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('@jm-contact Fight Clash rapid pause and resume preserves a single live simulation loop', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  // Observe the real browser scheduler; execute every original game callback.
  await page.addInitScript(()=>{
    const schedule=window.requestAnimationFrame.bind(window);
    const pending=new Set();
    window.__jmFightFrames={peak:0,pending:()=>pending.size};
    window.requestAnimationFrame=callback=>{
      const id=schedule(time=>{pending.delete(id);callback(time)});
      pending.add(id);window.__jmFightFrames.peak=Math.max(window.__jmFightFrames.peak,pending.size);
      return id;
    };
  });
  await page.goto('./bodies/fight-clash-v0-4.html');
  await page.locator('#introBoxing').click();
  if(await page.locator('#startBtn').isVisible()) await page.locator('#startBtn').click();
  else await page.locator('#game').click({position:{x:40,y:40}});
  const scheduler=await page.locator('#pauseBtn').evaluate(button=>{
    for(let i=0;i<20;i++){button.click();button.click()}
    return {peak:window.__jmFightFrames.peak,pending:window.__jmFightFrames.pending()};
  });
  expect(scheduler).toEqual({peak:1,pending:1});
  await page.locator('#pauseBtn').click();
  await expect(page.locator('#pauseBtn')).toHaveText('RESUME');
  await expect.poll(()=>page.evaluate(()=>window.__jmFightFrames.pending())).toBe(0);
  const pausedTime=await page.locator('#timer').textContent();
  await page.waitForTimeout(450);
  await expect(page.locator('#timer')).toHaveText(pausedTime);
  await page.locator('#pauseBtn').click();
  await expect(page.locator('#timer')).not.toHaveText(pausedTime);
  expect(await page.evaluate(()=>window.__jmFightFrames.peak)).toBe(1);
  expect(errors).toEqual([]);
  await test.info().attach('fight-clash-single-loop.json',{body:JSON.stringify(scheduler),contentType:'application/json'});
});

test('@jm-contact FUTARIZED 44px actions survive short portrait viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:700});
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('./bodies/futarized-v1-2.html');
  for (const selector of ['#tapPulse','#holdCharge','#guardBtn','.tab.active']) {
    const target = page.locator(selector);
    await expect(target).toBeVisible();
    const h = await target.evaluate(el => el.getBoundingClientRect().height);
    expect(h, selector).toBeGreaterThanOrEqual(43.5);
  }
  await expect(page.locator('#aimCanvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('@jm-contact FUTARIZED aim belongs to its initiating pointer and cancellation never shoots', async ({ page }) => {
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./bodies/futarized-v1-2.html');
  const canvas=page.locator('#aimCanvas');
  await canvas.scrollIntoViewIfNeeded();
  const box=await canvas.boundingBox();
  const x=box.x+box.width*.23,y=box.y+box.height*.60;
  await page.mouse.move(x,y);await page.mouse.down();
  await canvas.dispatchEvent('pointermove',{pointerId:99,clientX:box.x+box.width*.05,clientY:y});
  await canvas.dispatchEvent('pointerup',{pointerId:99,clientX:box.x+box.width*.05,clientY:y});
  await expect(page.locator('#aimShots')).toHaveText('0');
  await canvas.dispatchEvent('pointercancel',{pointerId:99});
  await page.mouse.move(box.x+box.width*.08,y);
  await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('1');
  await page.locator('#resetAim').click();
  await page.mouse.move(x,y);await page.mouse.down();
  await canvas.dispatchEvent('lostpointercapture',{pointerId:1});
  await page.mouse.move(box.x+box.width*.08,y);await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('0');
  await page.mouse.move(x,y);await page.mouse.down();
  await page.locator('#resetAim').evaluate(el=>el.click());
  await page.mouse.move(box.x+box.width*.08,y);await page.mouse.up();
  await expect(page.locator('#aimShots')).toHaveText('0');
  expect(errors).toEqual([]);
});

const fightStore='fight_clash_chameleon_v0_4';
const fightPath='./bodies/fight-clash-v0-4.html';
async function observeFightFrames(context){
  await context.addInitScript(()=>{
    const schedule=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set();
    window.__jmFightFrames={peak:0,pending:()=>pending.size};
    window.requestAnimationFrame=callback=>{const id=schedule(time=>{pending.delete(id);callback(time)});pending.add(id);window.__jmFightFrames.peak=Math.max(window.__jmFightFrames.peak,pending.size);return id};
    window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id)};
  });
}
async function beginFight(page){
  await page.locator('#introBoxing').click();
  if(await page.locator('#startBtn').isVisible())await page.locator('#startBtn').click();
  else await page.locator('#game').click({position:{x:40,y:40}});
}
async function saveFight(page){
  const panel=page.locator('#sidePanel');
  const opened=!(await panel.isVisible());
  if(opened)await page.locator('#panelBtn').click();
  await page.locator('[data-tab="routeos"]').click();
  await page.locator('#saveBtn').click();
  if(opened)await page.locator('#panelBtn').click();
  return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),fightStore);
}
async function reopenFight(page,context,errors){
  await page.close();
  const next=await context.newPage();next.on('pageerror',e=>errors.push(String(e)));
  await next.goto(fightPath);return next;
}

for(const paused of [false,true]){
  test('@jm-return Fight Clash '+(paused?'paused':'running')+' bout survives real close/reopen and resumes once',async({page,context},info)=>{
    await observeFightFrames(context);
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    let live=page;await live.goto(fightPath);await beginFight(live);
    await live.keyboard.down('w');await live.waitForTimeout(220);await live.keyboard.up('w');
    if(paused)await live.locator('#pauseBtn').click();
    let saved=await saveFight(live);
    expect(saved.recordType).toBe('FightClashRouteOSState');expect(saved.game.paused).toBe(paused);
    const observations=[];
    for(let pass=0;pass<2;pass++){
      live=await reopenFight(live,context,errors);
      await expect(live.locator('#status')).toHaveText('RESTORED');
      await expect(live.locator('#intro')).not.toHaveClass(/show/);
      await expect(live.locator('#pauseBtn')).toHaveText('RESUME');
      expect(await live.evaluate(()=>window.__jmFightFrames.pending())).toBe(0);
      // Repeated same-size resize notifications must preserve exact saved coordinates.
      await live.evaluate(()=>{for(let i=0;i<10;i++)window.dispatchEvent(new Event('resize'))});
      const restored=await saveFight(live);
      expect(restored.game).toEqual({...saved.game,paused:true});
      const frozen=await live.locator('#timer').textContent();await live.waitForTimeout(350);
      await expect(live.locator('#timer')).toHaveText(frozen);
      await live.locator('#pauseBtn').click();
      await expect(live.locator('#timer')).not.toHaveText(frozen);
      await live.keyboard.down('w');await live.waitForTimeout(220);await live.keyboard.up('w');
      const moved=await saveFight(live);
      expect(moved.game.player.y).not.toBe(restored.game.player.y);
      // Both native keyboard and real mobile touch routes must still reach combat.
      if(info.project.name==='mobile-chromium'){
        const box=await live.locator('#game').boundingBox();
        await live.touchscreen.tap(box.x+box.width*.78,box.y+box.height*.65);
      }else await live.keyboard.press('j');
      const acted=await saveFight(live);
      const strikes=p=>p.events.filter(e=>(e.actor==='PLAYER'&&['WHIFF','HIT'].includes(e.phase))||(e.actor==='CPU'&&e.phase==='BLOCK')).length;
      expect(acted.game.player.action==='jab'||acted.game.player.buffer==='jab'||strikes(acted)>strikes(moved)).toBeTruthy();
      const frames=await live.evaluate(()=>({peak:window.__jmFightFrames.peak,pending:window.__jmFightFrames.pending()}));
      expect(frames).toEqual({peak:1,pending:1});
      expect(acted.game.time).toBeLessThan(saved.game.time);
      observations.push({pass,savedTime:saved.game.time,restoredTime:restored.game.time,continuedTime:acted.game.time,frames});
      if(paused)await live.locator('#pauseBtn').click();
      saved=await saveFight(live);
    }
    expect(errors).toEqual([]);
    await test.info().attach('fight-clash-return.json',{body:JSON.stringify(observations),contentType:'application/json'});
    await live.close();
  });
}

test('@jm-return Fight Clash rejects invalid or incomplete saved packets without partial restoration',async({page,context})=>{
  test.setTimeout(60_000);await observeFightFrames(context);
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(fightPath);await beginFight(page);const valid=await saveFight(page);
  const altered=change=>{const p=structuredClone(valid);change(p);return JSON.stringify(p)};
  const invalid=[
    '{broken', 'null', JSON.stringify({game:{}}),
    altered(p=>p.recordType='OtherGame'),altered(p=>p.version='999'),
    altered(p=>delete p.game.player),altered(p=>delete p.game.player.x),
    altered(p=>p.game.player.hp='100'),altered(p=>p.game.enemy.vx=null),
    altered(p=>p.game.time=-1),altered(p=>p.game.cpuLevel='unknown'),
    altered(p=>delete p.game.running),altered(p=>p.game.activeLaw='unknown'),
    altered(p=>p.events={}),altered(p=>p.ledger=[null]),
    altered(p=>p.game.roundOver=true)
  ];
  for(const raw of invalid){
    await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:fightStore,raw});
    await page.reload();
    await expect(page.locator('#intro')).toHaveClass(/show/);
    await expect(page.locator('#status')).toHaveText('READY');
    await expect(page.locator('#timer')).toHaveText('30');
    expect(await page.evaluate(()=>window.__jmFightFrames.pending())).toBe(0);
    expect(await page.evaluate(k=>localStorage.getItem(k),fightStore)).toBe(raw);
    await beginFight(page);
    await expect(page.locator('#timer')).not.toHaveText('30');
  }
  expect(errors).toEqual([]);
});
