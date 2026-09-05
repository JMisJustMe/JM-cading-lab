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

const A=(who,action,street='preflop',extra={})=>({who,action,street,...extra});
const proofSave={
  version:'0.12A',xp:220,suit:'spades',mode:'auto',handNo:4,sessionNo:1,bankroll:{player:980,ai:1020},
  profile:{hands:4,folds:0,calls:1,checks:0,raises:4,showdowns:2,decisions:5,sizedRaises:4,allIns:0},
  history:[
    {handNo:4,endReason:'showdown',winner:'player',street:'river',result:'synthetic proof hand',playerHole:['2-clubs','3-clubs'],houseHole:['A-spades','A-hearts'],board:['4-clubs'],actions:[A('player','raise'),A('ai','call'),A('player','raise','flop'),A('ai','call','flop')]},
    {handNo:3,endReason:'fold',winner:'player',street:'flop',result:'synthetic proof fold',playerHole:['5-clubs','6-clubs'],houseHole:['K-spades','Q-spades'],board:[],actions:[A('player','raise'),A('ai','fold')]},
    {handNo:2,endReason:'showdown',winner:'ai',street:'river',result:'synthetic proof hand',playerHole:['7-clubs','8-clubs'],houseHole:['J-spades','10-spades'],board:[],actions:[A('player','call'),A('ai','check'),A('player','raise','flop'),A('ai','call','flop')]}
  ],trace:[],state:null
};

const calibrationLab={
  version:'0.15A',
  draft:{signal:'uncertain',confidence:'low'},
  reads:[
    {id:'c1',handNo:9,street:'river',signal:'strong',confidence:'high',observation:'House raised publicly.',privateCards:['A-spades','A-hearts'],resolution:{kind:'corrected',status:'CONTRADICTED BY SHOWDOWN RESULT'}},
    {id:'c2',handNo:8,street:'turn',signal:'bluff',confidence:'high',observation:'Visible pressure increased.',hiddenMotive:'fabricated-private-note',resolution:{kind:'corrected',status:'NOT SUPPORTED BY RESULT'}},
    {id:'c3',handNo:7,street:'flop',signal:'pressure',confidence:'medium',observation:'House raised.',resolution:{kind:'supported',status:'SUPPORTED BY LATER ACTION'}},
    {id:'c4',handNo:6,street:'preflop',signal:'uncertain',confidence:'low',observation:'Insufficient sample.',resolution:{kind:'uncertain',status:'DISCIPLINED UNCERTAINTY'}}
  ]
};

test('@puka-human-game visible-action membrane produces revisable table reads without hidden-card leakage',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=collectRuntimeErrors(page);
  await page.goto(`${door}?human-game-qa=${Date.now()}`,{waitUntil:'networkidle'});
  await expect(page.locator('#tableRead')).toBeAttached();
  await expect(page.locator('#tendency')).toContainText('NO READ EARNED YET');

  await page.addInitScript(saved=>{
    localStorage.setItem('jm-puka-v12a',JSON.stringify(saved));
  },proofSave);
  await page.reload({waitUntil:'networkidle'});

  await expect(page.locator('#evidenceCount')).toContainText('3 hands');
  await expect(page.locator('#tendency')).toContainText('PRESSURE-FORWARD SO FAR');
  await page.locator('#evidenceDrawer > summary').click();
  await expect(page.locator('#evidenceDrawer')).toHaveAttribute('open','');
  await expect(page.locator('#tableReadCount')).toContainText('visible actions');
  await expect(page.locator('#tableReadGrid')).toContainText('PRESSURE-FORWARD SO FAR');
  await expect(page.locator('#tableReadGrid')).toContainText('NEXT TEST');
  await expect(page.locator('#tableReadGrid')).toContainText('Strong card distribution');
  await expect(page.locator('#tableReadWhy')).toContainText('WHY? — HAND 4');
  await expect(page.locator('#tableReadBoundary')).toContainText('do not reveal hidden cards');

  const tableReadText=await page.locator('#tableRead').innerText();
  for(const hidden of ['A-spades','A-hearts','K-spades','Q-spades','J-spades','10-spades'])expect(tableReadText).not.toContain(hidden);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('puka-human-game-v02-android-evidence.png'),fullPage:false});
  expect(errors).toEqual([]);
  await context.close();
});

test('@puka-human-game v0.16A counterread calibrates confidence from declared-read consequence without promoting hidden state',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const page=await context.newPage();
  const errors=collectRuntimeErrors(page);
  await page.addInitScript(({game,lab})=>{
    localStorage.setItem('jm-puka-v12a',JSON.stringify(game));
    localStorage.setItem('jm-puka-read-lab-v01',JSON.stringify(lab));
  },{game:proofSave,lab:calibrationLab});
  await page.goto(`${door}?counterread-qa=${Date.now()}`,{waitUntil:'networkidle'});
  await page.locator('#evidenceDrawer > summary').click();

  await expect(page.locator('#pukaReadLabDock')).toBeAttached();
  await expect(page.locator('#pukaReadCalibration')).toBeAttached();
  await expect(page.locator('#prcTested')).toHaveText('4');
  await expect(page.locator('#prcSupported')).toHaveText('1');
  await expect(page.locator('#prcCorrected')).toHaveText('2');
  await expect(page.locator('#prcUncertain')).toHaveText('1');
  await expect(page.locator('#prcHeadline')).toHaveText('HIGH CONFIDENCE IS RUNNING AHEAD');
  await expect(page.locator('#prcDetail')).toContainText('Lower certainty');
  await expect(page.locator('#pukaReadCalibration')).toContainText('SUPPORTED ≠ PROVED');
  await expect(page.locator('#pukaReadCalibration')).toContainText('CORRECTION IS MODEL FEEDBACK');

  const calibrationText=await page.locator('#pukaReadCalibration').innerText();
  expect(calibrationText).not.toContain('A-spades');
  expect(calibrationText).not.toContain('A-hearts');
  expect(calibrationText).not.toContain('fabricated-private-note');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:testInfo.outputPath('puka-v016a-counterread-android.png'),fullPage:false});
  expect(errors).toEqual([]);
  await context.close();
});
