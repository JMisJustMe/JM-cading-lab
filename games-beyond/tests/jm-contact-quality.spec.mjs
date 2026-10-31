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

test('@jm-power Drag & Aim real release and preview respect the original 100 percent power ceiling',async({page,context},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  // Observe the original guide's first segment without substituting drawing/physics.
  await page.addInitScript(()=>{
    const p=CanvasRenderingContext2D.prototype,set=p.setLineDash,move=p.moveTo,line=p.lineTo,restore=p.restore;
    let guide=false,first=false,origin=null;
    p.setLineDash=function(d){guide=d.length>0;first=false;origin=null;return set.call(this,d)};
    p.moveTo=function(x,y){if(guide&&!first)origin={x,y};return move.call(this,x,y)};
    p.lineTo=function(x,y){if(guide&&!first&&origin){window.__jmGuideVelocity={vx:(x-origin.x)/.48,vy:(y-origin.y)/.48};first=true}return line.call(this,x,y)};
    p.restore=function(){guide=false;return restore.call(this)};
  });
  await page.goto('./bodies/drag-aim-loop-kernel-v0-9-9.html');
  const touch=info.project.name==='mobile-chromium'?await context.newCDPSession(page):null;
  const evidence=[];
  for(const pull of [100,250,600]){
    await page.locator('#resetBall').click();
    const canvas=page.locator('#arena');await canvas.scrollIntoViewIfNeeded();const box=await canvas.boundingBox();
    const from={x:box.x+box.width*150/960,y:box.y+box.height*440/600},to={x:from.x+box.width*pull/960,y:from.y};
    if(touch){
      await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});
      await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[to]});
    }else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y)}
    await expect(page.locator('#dragPower')).toHaveText(pull===100?'40%':'100%');
    const preview=await page.evaluate(()=>window.__jmGuideVelocity);
    const expected=-.065*Math.min(pull,250);
    const previewSpeed=Math.hypot(preview.vx,preview.vy);
    expect(preview.vx).toBeLessThan(0);expect(previewSpeed).toBeLessThanOrEqual(16.250001);
    if(pull===600)expect(previewSpeed).toBeCloseTo(16.25,2);
    else expect(previewSpeed).toBeCloseTo(Math.abs(expected),0);
    if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
    await page.locator('[data-open="proof"]').click();
    const download=page.waitForEvent('download');await page.locator('#exportReceipt').click();
    const file=await download;
    const fs=await import('node:fs/promises');const receipt=JSON.parse(await fs.readFile(await file.path(),'utf8'));
    const release=receipt.trace.filter(e=>e.type==='release').at(-1).payload;
    expect(receipt.chainValid).toBe(true);expect(release.power).toBeLessThanOrEqual(250);
    if(pull===600)expect(release.power).toBe(250);
    // Native input coordinates may be quantised; compare authored power to its actual vector.
    expect(Math.hypot(release.vx,release.vy)).toBeCloseTo(release.power*.065,1);
    expect(release.vx).toBeCloseTo(preview.vx,1);expect(release.vy).toBeCloseTo(preview.vy,1);
    evidence.push({pull,preview,release,chainValid:receipt.chainValid});
    await page.locator('[data-open="play"]').click();
  }
  expect(errors).toEqual([]);
  await test.info().attach('drag-aim-power-parity.json',{body:JSON.stringify(evidence),contentType:'application/json'});
});

async function kernelReceipt(page){
  await page.locator('[data-open="proof"]').click();
  const waiting=page.waitForEvent('download');await page.locator('#exportReceipt').click();
  const file=await waiting,fs=await import('node:fs/promises');
  const receipt=JSON.parse(await fs.readFile(await file.path(),'utf8'));
  await page.locator('[data-open="play"]').click();return receipt;
}
async function kernelPoints(page){
  const canvas=page.locator('#arena');await canvas.scrollIntoViewIfNeeded();const b=await canvas.boundingBox();
  return{canvas,start:{x:b.x+b.width*150/960,y:b.y+b.height*440/600},end:{x:b.x+b.width*450/960,y:b.y+b.height*440/600},other:{x:b.x+b.width*750/960,y:b.y+b.height*440/600}};
}
test('@jm-pointer Drag & Aim initiating contact owns the shot through unrelated fingers and releases',async({page,context},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./bodies/drag-aim-loop-kernel-v0-9-9.html');const p=await kernelPoints(page);
  await p.canvas.evaluate(el=>{
    window.__jmDownIds=[];window.__jmUpShots=[];
    el.addEventListener('pointerdown',e=>window.__jmDownIds.push(e.pointerId));
    el.addEventListener('pointerup',e=>window.__jmUpShots.push({id:e.pointerId,shots:+document.getElementById('hudShots').textContent}));
  });
  const touch=info.project.name==='mobile-chromium'?await context.newCDPSession(page):null;
  if(touch){
    // The non-owning finger starts first, away from the ball, so it releases first.
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.other,id:1}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.other,id:1},{...p.start,id:2}]});
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p.other,id:1},{...p.end,id:2}]});
  }else{
    await page.mouse.move(p.start.x,p.start.y);await page.mouse.down();await page.mouse.move(p.end.x,p.end.y);
    await p.canvas.dispatchEvent('pointerdown',{pointerId:99,clientX:p.start.x,clientY:p.start.y});
  }
  await p.canvas.dispatchEvent('pointermove',{pointerId:99,clientX:p.other.x,clientY:p.other.y});
  await p.canvas.dispatchEvent('pointerup',{pointerId:99,clientX:p.other.x,clientY:p.other.y});
  await p.canvas.dispatchEvent('pointercancel',{pointerId:99});await p.canvas.dispatchEvent('lostpointercapture',{pointerId:99});
  await expect(page.locator('#hudShots')).toHaveText('0');
  await expect(page.locator('#statePill')).toHaveText('CHARGING');
  const owner=await page.evaluate(()=>window.__jmDownIds.filter(id=>id!==99).at(-1));
  if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});else await page.mouse.up();
  await expect(page.locator('#hudShots')).toHaveText('1');
  const ups=await page.evaluate(()=>window.__jmUpShots.filter(e=>e.id!==99));
  if(touch){expect(ups).toHaveLength(2);expect(ups[0].id).not.toBe(owner);expect(ups[0].shots).toBe(0)}
  expect(ups.at(-1)).toEqual({id:owner,shots:1});
  const receipt=await kernelReceipt(page);expect(receipt.chainValid).toBe(true);
  const releases=receipt.trace.filter(e=>e.type==='release');expect(releases).toHaveLength(1);
  expect(releases[0].payload.power).toBe(250);expect(releases[0].payload.vx).toBeCloseTo(-16.25,1);
  expect(errors).toEqual([]);
  await test.info().attach('drag-owner.json',{body:JSON.stringify({owner,ups,releases}),contentType:'application/json'});
});

test('@jm-pointer Drag & Aim interrupted contact recovers without phantom release and keeps both keyboard routes',async({page,context},info)=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('./bodies/drag-aim-loop-kernel-v0-9-9.html');
  await page.locator('#arena').evaluate(el=>el.addEventListener('pointerdown',e=>window.__jmOwnerId=e.pointerId));
  const touch=info.project.name==='mobile-chromium'?await context.newCDPSession(page):null;
  for(const cause of ['capture','cancel','blur','reset','restart']){
    await page.locator('#restartLevel').click();const p=await kernelPoints(page);
    if(touch){await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...p.start,id:11}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p.end,id:11}]})}
    else{await page.mouse.move(p.start.x,p.start.y);await page.mouse.down();await page.mouse.move(p.end.x,p.end.y)}
    const owner=await page.evaluate(()=>window.__jmOwnerId);
    if(cause==='capture'){
      await p.canvas.evaluate((el,id)=>el.releasePointerCapture(id),owner);
      // Touch capture overrides are processed at the next native pointer event.
      if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...p.end,x:p.end.x+1,id:11}]});
      else await page.mouse.move(p.end.x+1,p.end.y);
    }
    if(cause==='cancel'){
      if(touch)await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
      else await p.canvas.dispatchEvent('pointercancel',{pointerId:owner});
    }
    if(cause==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
    if(cause==='reset'||cause==='restart')await page.locator(cause==='reset'?'#resetBall':'#restartLevel').press('Enter');
    await expect(page.locator('#statePill')).toHaveText('READY');
    if(touch){if(cause!=='cancel')await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}else await page.mouse.up();
    await expect(page.locator('#hudShots')).toHaveText('0');
    await p.canvas.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Space');
    await expect(page.locator('#hudShots')).toHaveText('1');await page.keyboard.press('Enter');
    await expect(page.locator('#hudShots')).toHaveText('2');
  }
  const receipt=await kernelReceipt(page);expect(receipt.chainValid).toBe(true);
  const reasons=receipt.trace.filter(e=>e.type==='drag.cancel').map(e=>e.payload.reason);
  expect(reasons).toEqual(expect.arrayContaining(['capture.lost','pointer.cancel','focus.lost','core.reset','level.restart']));
  expect(receipt.trace.filter(e=>e.type==='keyboard.aim_release')).toHaveLength(10);
  expect(errors).toEqual([]);
});
