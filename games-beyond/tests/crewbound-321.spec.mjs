import { test, expect } from '@playwright/test';
const PATH='./crewbound-321/';
test('CREWBOUND CP01 starts with 3+2+1, readable controls and an actual canvas',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(PATH);
  await expect(page.locator('h1')).toContainText('3 + 2 + 1');
  await expect(page.locator('#roster .unit')).toHaveCount(6);
  await expect(page.locator('#formation')).toContainText('FLOOR 3 · YARD 2 · FLEX 1');
  const canvas=await page.locator('#arena').boundingBox();
  expect(canvas.width).toBeGreaterThan(250);expect(canvas.height).toBeGreaterThan(300);
  const summary=await page.evaluate(()=>({players:game.floor('player').length,rivals:game.floor('enemy').length,all:game.units.length}));
  expect(summary).toEqual({players:3,rivals:3,all:12});
  expect(errors).toEqual([]);
});
test('CREWBOUND CP01 touch selects two, taps target, commits opposed concurrent plans',async({page})=>{
  await page.goto(PATH);
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('#roster .unit').nth(1).click();
  await expect(page.locator('#pair')).toHaveText('2 / 2 READY');
  const before=await page.evaluate(()=>({p:game.floor('player')[0].x,e:game.floor('enemy')[0].y}));
  await page.locator('#arena').click({position:{x:135,y:155}});
  await expect(page.locator('#commit')).toBeEnabled();
  await page.locator('#commit').click();
  await expect(page.locator('#turn')).toHaveText('GO 1');
  const info=await page.evaluate(()=>({
    pr:game.log.filter(r=>r.type==='ORDER'&&r.side==='player').length,
    enemy:game.log.filter(r=>(r.type==='ORDER'||r.type==='YARD_INTERVENTION')&&r.side==='enemy').length,
    both:game.log.some(r=>r.type==='SIMULTANEOUS_PAIR_COMMIT'),
    resolving:game.resolve>0
  }));
  expect(info).toEqual({pr:2,enemy:2,both:true,resolving:true});
  await page.waitForTimeout(370);
  const after=await page.evaluate(()=>({p:game.floor('player')[0].x,e:game.floor('enemy')[0].y}));
  expect(after.p).not.toBe(before.p);expect(after.e).not.toBe(before.e);
});
test('CREWBOUND CP01 yard support remains off-field; flex can deploy fourth fighter',async({page})=>{
  await page.goto(PATH);
  await page.locator('#roster .unit').nth(5).click();
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('[data-action=DEPLOY]').click();
  await page.locator('#arena').click({position:{x:80,y:160}});
  await page.locator('#commit').click();
  const state=await page.evaluate(()=>({floor:game.floor('player').length,yard:game.yard('player').length,flex:!!game.flex('player')}));
  expect(state).toEqual({floor:4,yard:2,flex:false});
  await expect(page.locator('#formation')).toContainText('FLOOR 4 · YARD 2 · FLEX 0');
});
test('CREWBOUND CP01 rematch starts clean and original v0.5 is not altered by test',async({page})=>{
  await page.goto(PATH);
  const source=await page.evaluate(()=>window.JM_CREWBOUND_321_SIM.ORIGINAL_BODY_SHA256);
  expect(source).toBe('5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7');
  await page.locator('#reset').click();
  await expect(page.locator('#turn')).toHaveText('GO 0');
  await expect(page.locator('#commit')).toBeDisabled();
});

test('CP02 game displays six exclusive fighters with distinct painted canvas portraits',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto(PATH);
  const cast=await page.evaluate(()=>({
    names:[...document.querySelectorAll('#roster .unit b')].map(n=>n.textContent),
    total:Object.keys(window.JM_CREWBOUND_321_SIM.ROSTER).length,
    portraitPixels:[...document.querySelectorAll('#roster .unit canvas')].map(c=>{
      const pix=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let visible=0;for(let i=3;i<pix.length;i+=4)if(pix[i]>20)visible++;
      return visible;
    }),
    model:window.JM_CREWBOUND_321_SIM.CAST_SCHEMA
  }));
  expect(cast.names).toEqual(['Kepler','Ironvale','Solace','Locke','Aster','Nox']);
  expect(cast.total).toBe(12);
  expect(cast.model).toBe('JM.CREWBOUND.CP02.UNIQUE_CAST/1');
  expect(cast.portraitPixels.every(n=>n>180)).toBe(true);
  expect(errors).toEqual([]);
});

test('CP02 exclusive HTML gallery renders twelve distinct named pilots, filter and silhouette modes',async({page})=>{
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.goto('./crewbound-321/cast.html');
  await expect(page.locator('.card')).toHaveCount(12);
  const names=await page.locator('.card h3').allTextContents();
  expect(new Set(names).size).toBe(12);
  expect(names).not.toContain('ZIPP');expect(names).not.toContain('BRAX');
  const before=await page.locator('.card canvas').first().evaluate(c=>{
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let chroma=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=100){chroma+=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);n++}
    return chroma/Math.max(1,n);
  });
  expect(before).toBeGreaterThan(45);
  await page.locator('#sil').click();
  await expect(page.locator('#sil')).toHaveAttribute('aria-pressed','true');
  const after=await page.locator('.card canvas').first().evaluate(c=>{
    const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
    let chroma=0,n=0;for(let i=0;i<d.length;i+=4)if(d[i+3]>=100){chroma+=Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2]);n++}
    return chroma/Math.max(1,n);
  });
  expect(after).toBeLessThan(25);
  expect(after).toBeLessThan(before*.5);
  await page.locator('#home').click();
  await expect(page.locator('#playerCast .card')).toHaveCount(6);
  await expect(page.locator('#enemyCast')).toBeHidden();
  await page.locator('#rivals').click();
  await expect(page.locator('#enemyCast .card')).toHaveCount(6);
  await expect(page.locator('#playerCast')).toBeHidden();
  expect(errors).toEqual([]);
});

test('CP02 Fold-friendly roster keeps touch button identity across live frames',async({page})=>{
  await page.goto(PATH);
  await page.locator('#roster .unit').first().evaluate(b=>b.dataset.ownerTestId='preserved');
  await page.waitForTimeout(800);
  expect(await page.locator('#roster .unit').first().getAttribute('data-owner-test-id')).toBe('preserved');
  await page.locator('#roster .unit').first().click();
  await expect(page.locator('#pair')).toHaveText('1 / 2 READY');
  await page.waitForTimeout(450);
  await expect(page.locator('#roster .unit').first()).toHaveAttribute('aria-pressed','true');
});


test('CP03 no three-minute timeout before first paired command; rematch re-arms clock',async({page})=>{
  await page.goto(PATH);
  await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
  const initial=await page.evaluate(()=>({
    time:game.time,turn:game.turn,positions:game.floor('player').concat(game.floor('enemy')).map(u=>[u.x,u.y]),ended:game.ended
  }));
  await page.waitForTimeout(1250);
  const idle=await page.evaluate(()=>({
    time:game.time,turn:game.turn,positions:game.floor('player').concat(game.floor('enemy')).map(u=>[u.x,u.y]),ended:game.ended
  }));
  expect(initial.time).toBe(0);expect(idle.time).toBe(0);
  expect(idle.positions).toEqual(initial.positions);expect(idle.ended).toBe(false);
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('#roster .unit').nth(1).click();
  await expect(page.locator('#commit')).toBeDisabled();
  await page.locator('#arena').click({position:{x:200,y:250}});
  await expect(page.locator('#commit')).toBeEnabled();
  await page.locator('#commit').click();
  await expect(page.locator('#turn')).toHaveText('GO 1');
  await page.waitForTimeout(350);
  const live=await page.evaluate((initialPositions)=>({
    time:game.time,turn:game.turn,moved:game.floor('player').concat(game.floor('enemy')).some((u,i)=>u.x!==initialPositions[i]?.[0]||u.y!==initialPositions[i]?.[1]),
    simultaneous:game.log.some(r=>r.type==='SIMULTANEOUS_PAIR_COMMIT')
  }),initial.positions);
  expect(live.time).toBeGreaterThan(0);expect(live.moved).toBe(true);expect(live.simultaneous).toBe(true);
  await page.locator('#reset').click();
  await page.waitForTimeout(500);
  const reset=await page.evaluate(()=>({time:game.time,turn:game.turn,ended:game.ended,selected:game.selected.length}));
  expect(reset).toEqual({time:0,turn:0,ended:false,selected:0});
  await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
});

test('CP04 different actions and targets for the same two-character go on mobile and desktop',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(PATH);
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await expect(page.locator('#pair')).toHaveText('2 / 2 READY');
 await page.locator('#editFirst').click();
 await page.locator('[data-action=ATTACK]').click();
 await page.locator('#arena').click({position:{x:130,y:120}});
 await expect(page.locator('#editFirst')).toContainText('ATTACK');
 await page.locator('#editSecond').click();
 await page.locator('[data-action=GUARD]').click();
 await page.locator('#arena').click({position:{x:210,y:180}});
 await expect(page.locator('#editSecond')).toContainText('GUARD');
 await expect(page.locator('#commit')).toBeEnabled();
 await page.locator('#commit').click();
 const data=await page.evaluate(()=>{
  const receipt=game.log.find(x=>x.type==='SIMULTANEOUS_PAIR_COMMIT');
  return {turn:game.turn,actions:receipt.playerPlans.map(x=>x.action),
    separated:receipt.playerPlans[0].target.x!==receipt.playerPlans[1].target.x,
    rivals:receipt.rival.length,resolve:game.resolve,errors:game.ended};
 });
 expect(data.turn).toBe(1);
 expect(data.actions).toEqual(['ATTACK','GUARD']);
 expect(data.separated).toBe(true);
 expect(data.rivals).toBe(2);
 expect(data.resolve).toBeGreaterThan(0);
 expect(data.errors).toBe(false);
 expect(errors).toEqual([]);
});

test('CP04 linked BOTH mode preserves original rapid two-character control',async({page})=>{
 await page.goto(PATH);
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#editFirst').click();
 await page.locator('[data-action=GUARD]').click();
 await page.locator('#arena').click({position:{x:100,y:130}});
 await page.locator('#editBoth').click();
 await page.locator('[data-action=MOVE]').click();
 await page.locator('#arena').click({position:{x:150,y:200}});
 await expect(page.locator('#commit')).toBeEnabled();
 await page.locator('#commit').click();
 const plans=await page.evaluate(()=>game.log.find(x=>x.type==='SIMULTANEOUS_PAIR_COMMIT').playerPlans);
 expect(plans.map(p=>p.action)).toEqual(['MOVE','MOVE']);
 expect(plans[0].target.x).not.toBe(plans[1].target.x);
 await page.locator('#reset').click();
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
 await expect(page.locator('#commit')).toBeDisabled();
});

test('CP04 standalone source-parity HTML runs independently with real A/B touch orders',async({page})=>{
  const errors=[];const requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>requests.push(req.url()));
  await page.goto('./crewbound-321/deliveries/CREWBOUND_CP04_PLAY.html');
  await expect(page.locator('h1')).toContainText('3 + 2 + 1');
  await expect(page.locator('#roster .unit')).toHaveCount(6);
  await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
  expect(await page.locator('script[src]').count()).toBe(0);
  expect(await page.evaluate(()=>window.JM_CREWBOUND_321_SIM.CAST_SCHEMA))
    .toBe('JM.CREWBOUND.CP02.UNIQUE_CAST/1');
  await page.locator('#roster .unit').nth(0).click();
  await page.locator('#roster .unit').nth(1).click();
  await page.locator('#editFirst').click();
  await page.locator('[data-action=ATTACK]').click();
  await page.locator('#arena').click({position:{x:140,y:155}});
  await page.locator('#editSecond').click();
  await page.locator('[data-action=GUARD]').click();
  await page.locator('#arena').click({position:{x:215,y:195}});
  await expect(page.locator('#commit')).toBeEnabled();
  await page.locator('#commit').click();
  const state=await page.evaluate(()=>{
    const r=game.log.find(x=>x.type==='SIMULTANEOUS_PAIR_COMMIT');
    return {turn:game.turn,actions:r.playerPlans.map(x=>x.action),
      targets:r.playerPlans.map(x=>x.target.x),rivals:r.rival.length};
  });
  expect(state.turn).toBe(1);
  expect(state.actions).toEqual(['ATTACK','GUARD']);
  expect(state.targets[0]).not.toBe(state.targets[1]);
  expect(state.rivals).toBe(2);
  expect(errors).toEqual([]);
  expect(requests.filter(u=>!u.includes('CREWBOUND_CP04_PLAY.html'))).toEqual([]);
});

test('CP05 relay arena and twelve exclusive combat kits render without missing controls',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(PATH);
 await expect(page.locator('#myRelay')).toHaveText('0.0');
 await expect(page.locator('#theirRelay')).toHaveText('0.0');
 await expect(page.locator('#matchOverlay')).toBeHidden();
 const data=await page.evaluate(()=>({
   zones:game.zones.length,
   kits:Object.keys(window.JM_CREWBOUND_321_COMBAT.KITS).length,
   original:window.JM_CREWBOUND_321_SIM.ORIGINAL_BODY_SHA256,
   names:[...document.querySelectorAll('#roster .unit b')].map(n=>n.textContent)
 }));
 expect(data.zones).toBe(2);expect(data.kits).toBe(12);
 expect(data.names).toEqual(['Kepler','Ironvale','Solace','Locke','Aster','Nox']);
 expect(data.original).toBe('5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7');
 expect(errors).toEqual([]);
});

test('CP05 selected fighter signature triggers a distinct visible arena contact',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(PATH);
 const outcome=await page.evaluate(()=>{
   const a=game.floor('player')[0],b=game.floor('enemy')[0];
   a.x=300;a.y=300;b.x=311;b.y=307;
   a.cooldown=0;a.kitCooldown=0;
   game.strike(a,b);
   updateUI();paint();
   return {move:game.log.find(x=>x.type==='SIGNATURE')?.move,
      glow:a.specialFlash,damage:game.stats.player.damage,hits:game.stats.player.hits}
 });
 expect(outcome.move).toBe('RAIL SLIP');
 expect(outcome.glow).toBeGreaterThan(0);
 expect(outcome.damage).toBeGreaterThan(0);
 expect(outcome.hits).toBe(1);
 expect(errors).toEqual([]);
});

test('CP05 a three-minute finished match reports winner then resets to planning',async({page})=>{
 await page.goto(PATH);
 await page.evaluate(()=>{
   game.time=179.95;
   game.scores.player=12;
   game.scores.enemy=1;
   game.step(.05);updateUI();
 });
 await expect(page.locator('#matchOverlay')).toBeVisible();
 await expect(page.locator('#resultTitle')).toContainText(/VICTORY|RIVALS WIN/);
 await expect(page.locator('#resultSummary')).toContainText('RELAY');
 await page.locator('#playAgain').click();
 await expect(page.locator('#matchOverlay')).toBeHidden();
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
 await expect(page.locator('#commit')).toBeDisabled();
});

test('CP05 360px touch screen has accessible commands, roster, and no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:360,height:700});
 await page.goto(PATH);
 await expect(page.locator('#roster .unit')).toHaveCount(6);
 const size=await page.evaluate(()=>({
   scroll:document.documentElement.scrollWidth,
   client:document.documentElement.clientWidth,
   buttons:[...document.querySelectorAll('#editBoth,#editFirst,#editSecond,#commit,#pause')].map(b=>({
     id:b.id,height:b.getBoundingClientRect().height,width:b.getBoundingClientRect().width}))
 }));
 expect(size.scroll).toBeLessThanOrEqual(size.client+2);
 expect(size.buttons.every(b=>b.height>=44&&b.width>32)).toBe(true);
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#editFirst').click();
 await page.locator('[data-action=ATTACK]').click();
 await page.locator('#arena').click({position:{x:68,y:115}});
 await page.locator('#editSecond').click();
 await page.locator('[data-action=GUARD]').click();
 await page.locator('#arena').click({position:{x:100,y:160}});
 await expect(page.locator('#commit')).toBeEnabled();
});

test('CP05 standalone offline HTML opens with new kits and finishes a match without external JS',async({page})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
 page.on('request',req=>requests.push(req.url()));
 await page.goto('./crewbound-321/deliveries/CREWBOUND_CP05_PLAY.html');
 await expect(page.locator('h1')).toContainText('3 + 2 + 1');
 await expect(page.locator('#roster .unit')).toHaveCount(6);
 await expect(page.locator('#myRelay')).toHaveText('0.0');
 expect(await page.locator('script[src]').count()).toBe(0);
 const kits=await page.evaluate(()=>Object.keys(window.JM_CREWBOUND_321_COMBAT.KITS));
 expect(kits).toHaveLength(12);
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#editFirst').click();
 await page.locator('[data-action=ATTACK]').click();
 await page.locator('#arena').click({position:{x:140,y:145}});
 await page.locator('#editSecond').click();
 await page.locator('[data-action=GUARD]').click();
 await page.locator('#arena').click({position:{x:210,y:190}});
 await page.locator('#commit').click();
 const plans=await page.evaluate(()=>game.log.find(x=>x.type==='SIMULTANEOUS_PAIR_COMMIT').playerPlans);
 expect(plans.map(x=>x.action)).toEqual(['ATTACK','GUARD']);
 await page.evaluate(()=>{game.time=179.95;game.step(.05);updateUI()});
 await expect(page.locator('#matchOverlay')).toBeVisible();
 expect(errors).toEqual([]);
 expect(requests.filter(url=>!url.includes('CREWBOUND_CP05_PLAY.html'))).toEqual([]);
});

test('CP06 pre-match formation editor changes who starts on floor without losing the six',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(PATH);
 await expect(page.locator('#arrange')).toBeEnabled();
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
 const original=await page.evaluate(()=>({
  floor:game.floor('player').map(u=>u.name),flex:game.flex('player').name,turn:game.turn}));
 expect(original.floor).toContain('Kepler');expect(original.flex).toBe('Nox');
 await page.locator('#arrange').click();
 await expect(page.locator('#phase')).toHaveText('ARRANGE CREW');
 await expect(page.locator('#commit')).toBeDisabled();
 await page.locator('#roster .unit').nth(5).click();
 await expect(page.locator('#roster .unit').nth(5)).toHaveAttribute('aria-pressed','true');
 await page.locator('#roster .unit').nth(0).click();
 const changed=await page.evaluate(()=>({
  floor:game.floor('player').map(u=>u.name),flex:game.flex('player').name,
  count:game.team('player').length,receipts:game.log.filter(x=>x.type==='STARTING_LINEUP_SWAP').length}));
 expect(changed.floor).toContain('Nox');expect(changed.floor).not.toContain('Kepler');
 expect(changed.flex).toBe('Kepler');expect(changed.count).toBe(6);
 expect(changed.receipts).toBe(1);
 expect(await page.locator('#roster .unit').nth(0).locator('small').textContent()).toContain('FLEX');
 await page.locator('#arrange').click();
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#roster .unit').nth(5).click();
 await page.locator('#arena').click({position:{x:140,y:140}});
 await expect(page.locator('#commit')).toBeEnabled();
 await page.locator('#commit').click();
 await expect(page.locator('#arrange')).toBeDisabled();
 expect(await page.evaluate(()=>game.log.some(x=>x.type==='LINEUP_LOCKED'))).toBe(true);
 expect(errors).toEqual([]);
});

test('CP06 lineup editor handles rejected role swaps, keyboard/touch and rematch restore',async({page})=>{
 await page.setViewportSize({width:360,height:700});
 await page.goto(PATH);
 await page.locator('#arrange').click();
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await expect(page.locator('#arrangeHelp')).toContainText('share a role');
 const current=await page.evaluate(()=>game.floor('player').map(u=>u.name));
 expect(current).toContain('Kepler');
 await page.locator('#roster .unit').nth(4).click();
 await page.locator('#roster .unit').nth(0).click();
 expect(await page.evaluate(()=>game.floor('player').map(u=>u.name))).toContain('Aster');
 const ui=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
   buttonHeight:document.getElementById('arrange').getBoundingClientRect().height}));
 expect(ui.scroll).toBeLessThanOrEqual(ui.viewport+2);
 expect(ui.buttonHeight).toBeGreaterThanOrEqual(44);
 await page.locator('#reset').click();
 await expect(page.locator('#arrange')).toBeEnabled();
 expect(await page.evaluate(()=>game.floor('player')[0].name)).toBe('Kepler');
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
});

test('CP06 exported offline HTML includes independent formation editor and acts without external game scripts',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./crewbound-321/deliveries/CREWBOUND_CP06_PLAY.html');
 await expect(page.locator('#arrange')).toBeVisible();
 expect(await page.locator('script[src]').count()).toBe(0);
 await page.locator('#arrange').click();
 await page.locator('#roster .unit').nth(3).click();
 await page.locator('#roster .unit').nth(2).click();
 const data=await page.evaluate(()=>({floor:game.floor('player').map(u=>u.name),yard:game.yard('player').map(u=>u.name),
   time:game.time,source:window.JM_CREWBOUND_321_SIM.ORIGINAL_BODY_SHA256}));
 expect(data.floor).toContain('Locke');expect(data.yard).toContain('Solace');
 expect(data.time).toBe(0);
 expect(data.source).toBe('5d022e4a1bde479f25ebcfe74f817a7f277742942f8b71d9ca6f1681893dfee7');
 expect(errors).toEqual([]);
});

test('CP07 exact pair readout matches distinct A/B commands and rival response',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(PATH);
 await expect(page.locator('#planA')).toContainText('choose a fighter');
 await expect(page.locator('#rivalReadback')).toContainText('revealed');
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#editFirst').click();
 await page.locator('[data-action=ATTACK]').click();
 await page.locator('#arena').click({position:{x:120,y:135}});
 await page.locator('#editSecond').click();
 await page.locator('[data-action=GUARD]').click();
 await page.locator('#arena').click({position:{x:215,y:190}});
 await expect(page.locator('#planA')).toContainText('Kepler · ATTACK');
 await expect(page.locator('#planB')).toContainText('Ironvale · GUARD');
 await expect(page.locator('#commit')).toBeEnabled();
 const preview=await page.evaluate(()=>game.pairPreview());
 await page.locator('#commit').click();
 const receipt=await page.evaluate(()=>game.log.find(x=>x.type==='SIMULTANEOUS_PAIR_COMMIT'));
 expect(receipt.playerPlans.map(x=>x.action)).toEqual(['ATTACK','GUARD']);
 expect(receipt.playerPlans.map(x=>x.target)).toEqual(preview.orders.map(x=>x.target));
 await expect(page.locator('#rivalReadback')).toContainText('RIVAL GO 1');
 const rival=await page.evaluate(()=>game.lastRivalPair());
 expect(rival.rival.length).toBe(2);
 expect(errors).toEqual([]);
});

test('CP07 optional first-go guide follows real play and can be turned off or reset',async({page})=>{
 await page.setViewportSize({width:360,height:700});
 await page.goto(PATH);
 await expect(page.locator('#coachToggle')).toBeVisible();
 await page.locator('#coachToggle').click();
 await expect(page.locator('#coachText')).toContainText('STEP 1/3');
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await expect(page.locator('#coachText')).toContainText('STEP 2/3');
 await page.locator('#arena').click({position:{x:155,y:170}});
 await expect(page.locator('#coachText')).toContainText('STEP 3/3');
 await expect(page.locator('#commit')).toBeEnabled();
 await page.locator('#commit').click();
 await expect(page.locator('#coachText')).toContainText('YOUR ORDERS ARE LIVE');
 await page.evaluate(()=>{
   for(let i=0;i<90;i++)game.step(.05);
   updateUI();
 });
 await expect(page.locator('#coachText')).toContainText('FIRST GO COMPLETE');
 await page.locator('#coachToggle').click();
 await expect(page.locator('#coachToggle')).toHaveAttribute('aria-pressed','false');
 await page.locator('#reset').click();
 await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
 await expect(page.locator('#coachToggle')).toHaveAttribute('aria-pressed','false');
 const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,
    width:document.documentElement.clientWidth,button:document.getElementById('coachToggle').getBoundingClientRect().height}));
 expect(size.scroll).toBeLessThanOrEqual(size.width+2);
 expect(size.button).toBeGreaterThanOrEqual(44);
});

test('CP07 standalone review HTML includes same tactical readout with no external game scripts',async({page})=>{
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.goto('./crewbound-321/deliveries/CREWBOUND_CP07_PLAY.html');
 await expect(page.locator('#coachToggle')).toBeVisible();
 await expect(page.locator('#planA')).toContainText('choose a fighter');
 expect(await page.locator('script[src]').count()).toBe(0);
 await page.locator('#coachToggle').click();
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.locator('#arena').click({position:{x:148,y:176}});
 await expect(page.locator('#commit')).toBeEnabled();
 await page.locator('#commit').click();
 await expect(page.locator('#rivalReadback')).toContainText('RIVAL GO 1');
 expect(requests.filter(u=>!u.includes('CREWBOUND_CP07_PLAY.html'))).toEqual([]);
 expect(errors).toEqual([]);
});

test('CP07 missing-target warnings outrank conditional near-pair bonuses',async({page})=>{
 await page.goto(PATH);
 await page.locator('#roster .unit').nth(0).click();
 await page.locator('#roster .unit').nth(1).click();
 await page.evaluate(()=>{
   const [a,b]=game.floor('player');
   b.x=a.x+15;b.y=a.y+15;updateUI();
 });
 expect(await page.evaluate(()=>game.pairPreview().nearPair)).toBe(true);
 expect(await page.evaluate(()=>game.pairPreview().ready)).toBe(false);
 await expect(page.locator('#previewHint')).toContainText('Choose a target');
 await page.locator('#arena').click({position:{x:160,y:135}});
 await expect(page.locator('#previewHint')).toContainText('PAIR IN RANGE');
 await expect(page.locator('#commit')).toBeEnabled();
});
