import { test, expect } from '@playwright/test';

const door='/puka/00_OPEN_FIRST.html';
const contexts=[
  {name:'gb-android-portrait-390x844',width:390,height:844,mode:'portrait',mobile:true,touch:true},
  {name:'gb-android-landscape-844x390',width:844,height:390,mode:'royal',mobile:true,touch:true},
  {name:'gb-desktop-1440x1000',width:1440,height:1000,mode:'royal',mobile:false,touch:false},
  {name:'visual-lab-android-412x915',width:412,height:915,mode:'portrait',mobile:true,touch:true},
  {name:'visual-lab-desktop-1440x900',width:1440,height:900,mode:'royal',mobile:false,touch:false}
];

function collectRuntimeErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));
  page.on('console',message=>{if(message.type()==='error') errors.push(`console:${message.text()}`)});
  return errors;
}

async function createProofPage(browser,{width,height,mobile,touch}){
  const context=await browser.newContext({
    viewport:{width,height},
    deviceScaleFactor:1,
    isMobile:mobile,
    hasTouch:touch
  });
  const page=await context.newPage();
  return {context,page};
}

async function openFresh(page,width,height){
  await page.goto(`${door}?puka-estate-qa=${width}x${height}-${Date.now()}`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableState')).toBeVisible();
  await expect(page.locator('#modeName')).toBeVisible();
  const actual=await page.evaluate(()=>[innerWidth,innerHeight]);
  expect(actual,`proof must use the requested real output viewport ${width}x${height}`).toEqual([width,height]);
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

async function expectProtectedTableField(page){
  const field=await page.locator('.table-wrap').evaluate(node=>{
    const rect=node.getBoundingClientRect();
    return {width:Math.round(rect.width),height:Math.round(rect.height)};
  });
  expect(field.width,'protected PUKA table field must not collapse below the Visual Lab crown floor').toBeGreaterThanOrEqual(100);
  expect(field.height,'protected PUKA table field must not collapse below the Visual Lab crown floor').toBeGreaterThanOrEqual(150);
}

test('@puka-estate-conformance real output contexts, fit and visual evidence',async({browser},testInfo)=>{
  for(const proof of contexts){
    const {context,page}=await createProofPage(browser,proof);
    const errors=collectRuntimeErrors(page);
    await openFresh(page,proof.width,proof.height);
    await expect(page.locator('html')).toHaveAttribute('data-puka-mode',proof.mode);
    await expectNoHorizontalOverflow(page);
    await expectContactFloor(page);
    await expectProtectedTableField(page);
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.locator('[data-next-hand]')).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`puka-${proof.name}-ready.png`),fullPage:false});
    expect(errors,`${proof.name} runtime must remain free of console/page errors`).toEqual([]);
    await context.close();
  }
});

test('@puka-estate-conformance Android touch hand survives portrait-landscape return',async({browser},testInfo)=>{
  const proof={width:390,height:844,mobile:true,touch:true};
  const {context,page}=await createProofPage(browser,proof);
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
  await page.screenshot({path:testInfo.outputPath('puka-android-portrait-active.png'),fullPage:false});

  await page.setViewportSize({width:844,height:390});
  await expect(page.locator('html')).toHaveAttribute('data-puka-mode','royal');
  await expect(page.locator('#dealerLine')).toHaveText(hand);
  await expect(page.locator('.you .playing-card')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await expectContactFloor(page);
  await expectProtectedTableField(page);
  await page.screenshot({path:testInfo.outputPath('puka-android-landscape-active.png'),fullPage:false});

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('html')).toHaveAttribute('data-puka-mode','portrait');
  await expect(page.locator('#dealerLine')).toHaveText(hand);
  await expect(page.locator('.you .playing-card')).toHaveCount(2);
  await expectNoHorizontalOverflow(page);
  await expectContactFloor(page);
  await expectProtectedTableField(page);
  await page.screenshot({path:testInfo.outputPath('puka-android-portrait-return.png'),fullPage:false});
  expect(errors,'Android touch orientation/contact route must remain free of console/page errors').toEqual([]);
  await context.close();
});
