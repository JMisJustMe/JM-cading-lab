import { test, expect } from '@playwright/test';
const GAME='./bodies/futarized-v1-2.html';

// The original game intentionally encapsulates state in an IIFE. Use its EXISTING
// read/write QA contact, not inaccessible global bindings. Isolated Stage 4 only.
test('@boot FUTARIZED wrong-link feedback retains the primed module before reset', async ({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(GAME);
  await page.waitForFunction(()=>!!window.__FUTARIZED_QA__);
  const result=await page.evaluate(()=>{
    const {convergence,blend,sideOn}=window.__FUTARIZED_QA__;
    convergence.active=true;convergence.step=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule='TUG';sideOn('LEFT');
    return {status:document.querySelector('#blendStatus').textContent,
      selectedModule:blend.selectedModule,stability:convergence.stability,
      step:convergence.step,trace:document.querySelector('#traceList').textContent};
  });
  expect(result.status).toContain('Received TUG → LEFT; needed AIM → RIGHT');
  expect(result.selectedModule).toBeNull();
  expect(result.stability).toBe(52);
  expect(result.step).toBe(0);
  expect(result.trace).toContain('STAGE4-MISS');
  expect(errors).toEqual([]);
});

test('@boot FUTARIZED distinguishes unprimed from wrong-side contact', async ({page})=>{
  await page.goto(GAME);
  await page.waitForFunction(()=>!!window.__FUTARIZED_QA__);
  const results=await page.evaluate(()=>{
    const {convergence,blend,sideOn}=window.__FUTARIZED_QA__;
    convergence.active=true;convergence.step=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule=null;sideOn('LEFT');
    const none=document.querySelector('#blendStatus').textContent;
    blend.selectedModule='AIM';sideOn('LEFT');
    return {none,wrongSide:document.querySelector('#blendStatus').textContent,
      stability:convergence.stability};
  });
  expect(results.none).toContain('Received NONE → LEFT; needed AIM → RIGHT');
  expect(results.wrongSide).toContain('Received AIM → LEFT; needed AIM → RIGHT');
  expect(results.stability).toBe(34);
});

test('@boot FUTARIZED correct link still advances without false miss', async ({page})=>{
  await page.goto(GAME);
  await page.waitForFunction(()=>!!window.__FUTARIZED_QA__);
  const result=await page.evaluate(()=>{
    const {convergence,blend,sideOn}=window.__FUTARIZED_QA__;
    convergence.active=true;convergence.step=0;convergence.score=0;convergence.stability=70;
    convergence.sequence=[{module:'AIM',side:'RIGHT'},{module:'CARD',side:'TOP'}];
    blend.selectedModule='AIM';sideOn('RIGHT');
    return {step:convergence.step,score:convergence.score,stability:convergence.stability,
      selectedModule:blend.selectedModule,
      prompt:document.querySelector('#convergencePrompt').textContent,
      trace:document.querySelector('#traceList').textContent};
  });
  expect(result.step).toBe(1);
  expect(result.score).toBe(1);
  expect(result.stability).toBe(77);
  expect(result.selectedModule).toBeNull();
  expect(result.prompt).toContain('LINK 2/5');
  expect(result.trace).toContain('STAGE4-LINK');
  expect(result.trace).not.toContain('STAGE4-MISS');
});
