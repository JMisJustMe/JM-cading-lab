// Existing Playwright job: real first-open and touch-return proof on a served host.
// npx playwright... is provisioned by .github/workflows/prove-ailatheo-v3.yml
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.BASE_URL||'http://127.0.0.1:4177';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  const exceptions=[];
  page.on('pageerror',e=>exceptions.push(e.message));
  const response=await page.goto(base+'/navigator/estate-integration/',{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus')?.textContent.startsWith('NATIVE EXECUTION PASS'),null,{timeout:30000});
  assert.equal(await page.locator('#jmOperatorPreview').isVisible(),true);
  const frame=page.frameLocator('#jmOperatorPreview');
  const start=await frame.locator('#state').innerText();
  assert.match(start,/OneBody carrier ready/);
  await frame.locator('#contact').click();
  const after=await frame.locator('#state').innerText();
  assert.match(after,/VISIBLE CONSEQUENCE/);
  assert.ok(!await page.locator('#jmOperatorDownload').isDisabled());
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#jmOperatorDownload').click()]);
  assert.match(download.suggestedFilename(),/OPEN_FIRST\.html$/);
  await page.locator('#jmOperatorMode').selectOption('compile-js');
  await page.locator('#jmOperatorIntent').fill('test = generated.✓');
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus')?.textContent.startsWith('EMITTED_SOURCE'),null,{timeout:15000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/generated/);
  assert.equal(await page.locator('#jmOperatorPreview').isVisible(),false);
  await page.locator('#jmOperatorMode').selectOption('gamecore');
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus')?.textContent.startsWith('NATIVE_GAMECORE_STATE_CHANGED'),null,{timeout:15000});
  assert.match(await page.locator('#jmOperatorStatus').innerText(),/JMGameCore/);
  await page.locator('#jmOperatorMode').selectOption('os');
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus')?.textContent.startsWith('NATIVE_OS_CONTACT_EXECUTED'),null,{timeout:15000});
  await page.locator('#jmOperatorMode').selectOption('route');
  await page.locator('#jmOperatorIntent').fill('build a touch game with trace');
  await page.locator('#jmOperatorRun').click();
  await page.waitForFunction(()=>document.getElementById('jmOperatorStatus')?.textContent.startsWith('PLAN_ONLY'),null,{timeout:15000});
  const original=await page.locator('#routes').locator('a').count();
  assert.ok(original>0,'ORIGINAL_ESTATE_ROUTES_LOST');
  assert.deepEqual(exceptions,[],'BROWSER_ERRORS');
  console.log(JSON.stringify({state:'BROWSER_NATIVE_OPERATOR_PASS',viewport:'390x844',existingRouteCards:original,sceneFirstOpen:true,actualTouchConsequence:true,standaloneExport:true,sourceCompiler:true,gamecore:true,os:true,route:true,exceptions},null,2));
}finally{await browser.close()}
