import { test, expect } from '@playwright/test';

const door='puka/00_OPEN_FIRST.html';

function collectRuntimeErrors(page){
  const errors=[];
  page.on('pageerror',error=>errors.push(`pageerror:${error.message}`));
  page.on('console',message=>{if(message.type()==='error')errors.push(`console:${message.text()}`)});
  return errors;
}

async function expectNoHorizontalOverflow(page){
  const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
  expect(overflow).toBe(0);
}

const patternLab={
  version:'0.15A',
  draft:{signal:'uncertain',confidence:'low'},
  reads:[
    {id:'p1',handNo:12,street:'river',signal:'strong',confidence:'high',observation:'Visible pressure.',resolution:{kind:'supported',status:'SUPPORTED BY SHOWDOWN RESULT'}},
    {id:'p2',handNo:11,street:'turn',signal:'strong',confidence:'high',observation:'Visible pressure.',privateNote:'SECRET_PATTERN_NOTE',holeCards:['A-spades','A-hearts'],resolution:{kind:'corrected',status:'CONTRADICTED BY SHOWDOWN RESULT'}},
    {id:'p3',handNo:10,street:'flop',signal:'pressure',confidence:'medium',observation:'House raised.',resolution:{kind:'open',status:'NOT CONFIRMED'}},
    {id:'p4',handNo:9,street:'preflop',signal:'uncertain',confidence:'low',observation:'Insufficient sample.',resolution:{kind:'uncertain',status:'DISCIPLINED UNCERTAINTY'}},
    {id:'p5',handNo:8,street:'river',signal:'weak',confidence:'medium',observation:'House checked.',resolution:{kind:'supported',status:'CONSISTENT WITH HOUSE FOLD'}},
    {id:'p6',handNo:7,street:'turn',signal:'pressure',confidence:'medium',observation:'House raised.',resolution:{kind:'supported',status:'SUPPORTED BY LATER ACTION'}}
  ]
};

test('@puka-human-game v0.17A pattern window keeps contradiction visible without hidden-field leakage',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=collectRuntimeErrors(page);
  await page.addInitScript(lab=>localStorage.setItem('jm-puka-read-lab-v01',JSON.stringify(lab)),patternLab);
  await page.goto(`${door}?pattern-window-qa=${Date.now()}`,{waitUntil:'networkidle'});

  await expect(page.locator('#pukaPatternWindow')).toBeAttached();
  await page.locator('#evidenceDrawer > summary').click();
  await expect(page.locator('#evidenceDrawer')).toHaveAttribute('open','');
  await expect(page.locator('#ppwAvailable')).toHaveText('6');
  await expect(page.locator('#ppwHeadline')).toHaveText('CONTRADICTION IS PART OF THE PATTERN');
  await expect(page.locator('#ppwContradictions')).toContainText('STRONG · SUPPORTED + CORRECTED');
  await expect(page.locator('#pukaPatternWindow')).toContainText('PATTERN ≠ PROOF');

  const panelText=await page.locator('#pukaPatternWindow').innerText();
  expect(panelText).not.toContain('SECRET_PATTERN_NOTE');
  expect(panelText).not.toContain('A-spades');
  expect(panelText).not.toContain('A-hearts');

  const sizeButtons=page.locator('#pukaPatternWindow [data-ppw-size]');
  await expect(sizeButtons).toHaveCount(3);
  for(let i=0;i<3;i++)expect(await sizeButtons.nth(i).evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  await page.locator('#pukaPatternWindow [data-ppw-size="3"]').click();
  await expect(page.locator('#pukaPatternWindow [data-ppw-size="3"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#ppwAvailable')).toHaveText('3');
  await expect(page.locator('#ppwHeadline')).toHaveText('CONTRADICTION IS PART OF THE PATTERN');

  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('puka-v017a-pattern-window-android.png'),fullPage:false});
  expect(errors).toEqual([]);
  await context.close();
});
