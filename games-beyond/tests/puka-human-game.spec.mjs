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

test('@puka-human-game visible-action membrane produces revisable table reads without hidden-card leakage',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=collectRuntimeErrors(page);
  await page.goto(`${door}?human-game-qa=${Date.now()}`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableRead')).toBeAttached();
  await expect(page.locator('#tendency')).toContainText('NO READ EARNED YET');

  await page.evaluate(()=>{
    const A=(who,action,street='preflop',extra={})=>({who,action,street,...extra});
    const saved={
      xp:220,suit:'spades',mode:'auto',handNo:4,sessionNo:1,bankroll:{player:980,ai:1020},
      profile:{hands:4,folds:0,calls:1,checks:0,raises:4,showdowns:2,decisions:5,sizedRaises:4,allIns:0},
      history:[
        {handNo:4,endReason:'showdown',winner:'player',playerHole:['2-clubs','3-clubs'],houseHole:['A-spades','A-hearts'],board:['4-clubs'],actions:[A('player','raise'),A('ai','call'),A('player','raise','flop'),A('ai','call','flop')]},
        {handNo:3,endReason:'fold',winner:'player',playerHole:['5-clubs','6-clubs'],houseHole:['K-spades','Q-spades'],board:[],actions:[A('player','raise'),A('ai','fold')]},
        {handNo:2,endReason:'showdown',winner:'ai',playerHole:['7-clubs','8-clubs'],houseHole:['J-spades','10-spades'],board:[],actions:[A('player','call'),A('ai','check'),A('player','raise','flop'),A('ai','call','flop')]}
      ],trace:[]
    };
    localStorage.setItem('jm-puka-v12a',JSON.stringify(saved));
  });
  await page.reload({waitUntil:'networkidle'});
  await expect(page.locator('#tendency')).toContainText('PRESSURE-FORWARD SO FAR');
  await page.locator('#reviewBtn').click();
  await expect(page.locator('#evidenceDrawer')).toHaveAttribute('open','');
  await expect(page.locator('#tableReadCount')).toContainText('visible actions');
  await expect(page.locator('#tableReadGrid')).toContainText('PRESSURE-FORWARD SO FAR');
  await expect(page.locator('#tableReadGrid')).toContainText('NEXT TEST');
  await expect(page.locator('#tableReadGrid')).toContainText('Card distribution');
  await expect(page.locator('#tableReadWhy')).toContainText('WHY? — HAND 4');
  await expect(page.locator('#tableReadBoundary')).toContainText('do not reveal hidden cards');

  const tableReadText=await page.locator('#tableRead').innerText();
  expect(tableReadText).not.toContain('A-spades');
  expect(tableReadText).not.toContain('A-hearts');
  expect(tableReadText).not.toContain('K-spades');
  expect(tableReadText).not.toContain('Q-spades');
  expect(tableReadText).not.toContain('J-spades');
  expect(tableReadText).not.toContain('10-spades');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('puka-human-game-v02-android-evidence.png'),fullPage:false});
  expect(errors).toEqual([]);
  await context.close();
});
