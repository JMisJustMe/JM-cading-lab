import { test, expect } from '@playwright/test';
const GAME='./bodies/futarized-v1-2.html';

// Isolated Stage 4 contact only; this does NOT award earned-stage or physical-device proof.
test('@boot FUTARIZED miss records the module actually primed before reset', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(GAME);
  const result=await page.evaluate(()=>{
    convergence.active=true;convergence.step=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule='TUG';
    sideOn('LEFT');
    return {receipt:bodyReceipts.find(x=>x.kind==='STAGE4-MISS'),
      status:document.querySelector('#blendStatus').textContent,
      selectedModule:blend.selectedModule,stability:convergence.stability,step:convergence.step};
  });
  expect(result.receipt.received).toEqual({module:'TUG',side:'LEFT'});
  expect(result.receipt.expected).toEqual({module:'AIM',side:'RIGHT'});
  expect(result.status).toContain('Received TUG → LEFT; needed AIM → RIGHT');
  expect(result.selectedModule).toBeNull();
  expect(result.stability).toBe(52);
  expect(result.step).toBe(0);
  expect(errors).toEqual([]);
});

test('@boot FUTARIZED miss distinguishes no primed module from wrong side', async ({page})=>{
  await page.goto(GAME);
  const results=await page.evaluate(()=>{
    convergence.active=true;convergence.step=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule=null;sideOn('LEFT');
    const none={received:bodyReceipts[0].received,status:document.querySelector('#blendStatus').textContent};
    blend.selectedModule='AIM';sideOn('LEFT');
    return {none,wrongSide:bodyReceipts[0].received,stability:convergence.stability};
  });
  expect(results.none.received).toEqual({module:null,side:'LEFT'});
  expect(results.none.status).toContain('Received NONE → LEFT');
  expect(results.wrongSide).toEqual({module:'AIM',side:'LEFT'});
  expect(results.stability).toBe(34);
});

test('@boot FUTARIZED correct link still advances without miss receipt', async ({page})=>{
  await page.goto(GAME);
  const result=await page.evaluate(()=>{
    convergence.active=true;convergence.step=0;convergence.score=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule='AIM';const before=bodyReceipts.filter(x=>x.kind==='STAGE4-MISS').length;
    sideOn('RIGHT');
    return {step:convergence.step,score:convergence.score,stability:convergence.stability,
      selectedModule:blend.selectedModule,latest:bodyReceipts[0].kind,
      missesAdded:bodyReceipts.filter(x=>x.kind==='STAGE4-MISS').length-before};
  });
  expect(result).toEqual({step:1,score:1,stability:77,selectedModule:null,latest:'STAGE4-LINK',missesAdded:0});
});
