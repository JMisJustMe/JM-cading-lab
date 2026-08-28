import { test, expect } from '@playwright/test';

const door='/puka/00_OPEN_FIRST.html';
const viewports=[[390,844,'portrait'],[844,390,'royal'],[1440,1000,'royal']];

function collectRuntimeErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));
  page.on('console',message=>{if(message.type()==='error') errors.push(`console:${message.text()}`)});
  return errors;
}

async function openFresh(page,width,height){
  await page.setViewportSize({width,height});
  await page.goto(`${door}?puka-estate-qa=${width}x${height}-${Date.now()}`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableState')).toBeVisible();
  await expect(page.locator('#modeName')).toBeVisible();
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>{
    const widest=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
    return widest-window.innerWidth;
  });
  expect(overflow,'horizontal overflow must be exactly zero at an estate acceptance viewport').toBe(0);
}

async function expectContactFloor(page){
  const undersized=await page.locator('button,summary').evaluateAll(nodes=>nodes.flatMap(node=>{
    const style=getComputedStyle(node);
    const rect=node.getBoundingClientRect();
    if(style.display==='none'||style.visibility==='hidden'||rect.width===0||rect.height===0) return [];
    return rect.height<43.5?[`${node.tagName.toLowerCase()}#${node.id||''}.${node.className||''}:${rect.height.toFixed(1)}px`]:[];
  }));
  expect(undersized,'visible interactive contacts must meet the 44px estate floor').toEqual([]);
}

test('@puka-estate-conformance responsive fit and contact floor',async({page})=>{
  const errors=collectRuntimeErrors(page);
  for(const [width,height,mode] of viewports){
    await openFresh(page,width,height);
    await expect(page.locator('html')).toHaveAttribute('data-puka-mode',mode);
    await expectNoHorizontalOverflow(page);
    await expectContactFloor(page);
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.locator('[data-next-hand]')).toBeVisible();
  }
  expect(errors,'browser runtime must remain free of console/page errors').toEqual([]);
});

test('@puka-estate-conformance table contact survives portrait-landscape return',async({page})=>{
  const errors=collectRuntimeErrors(page);
  await openFresh(page,390,844);
  await page.locator('[data-quick-suit="spades"]').click();
  await page.locator('[data-next-hand]').click();
  await expect(page.locator('html')).toHaveAttribute('data-hand-state','active');
  await expect(page.locator('.you .playing-card')).toHaveCount(2);
  await expect(page.locator('.opponent .playing-card.back')).toHaveCount(2);
  const hand=await page.locator('#dealerLine').textContent();
  expect(hand).toMatch(/^HAND \d+ · /);
  await expectContactFloor(page);

  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('html')).toHaveAttribute('data-puka-mode','royal');
  await expect(page.locator('#dealerLine')).toHaveText(hand);
  await expect(page.locator('.you .playing-card')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await expectContactFloor(page);

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('html')).toHaveAttribute('data-puka-mode','portrait');
  await expect(page.locator('#dealerLine')).toHaveText(hand);
  await expect(page.locator('.you .playing-card')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await expectContactFloor(page);
  expect(errors,'orientation/contact route must remain free of console/page errors').toEqual([]);
});
