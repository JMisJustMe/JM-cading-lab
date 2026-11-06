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
  const live=await page.evaluate(()=>({
    time:game.time,turn:game.turn,moved:game.floor('player').concat(game.floor('enemy')).some((u,i)=>u.x!==initial.positions[i]?.[0]||u.y!==initial.positions[i]?.[1]),
    simultaneous:game.log.some(r=>r.type==='SIMULTANEOUS_PAIR_COMMIT')
  }));
  expect(live.time).toBeGreaterThan(0);expect(live.moved).toBe(true);expect(live.simultaneous).toBe(true);
  await page.locator('#reset').click();
  await page.waitForTimeout(500);
  const reset=await page.evaluate(()=>({time:game.time,turn:game.turn,ended:game.ended,selected:game.selected.length}));
  expect(reset).toEqual({time:0,turn:0,ended:false,selected:0});
  await expect(page.locator('#phase')).toHaveText('READY · PICK 2');
});
