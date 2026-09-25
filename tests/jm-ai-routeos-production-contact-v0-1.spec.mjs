import { chromium } from 'playwright';
import fs from 'node:fs';

const URL = process.env.ROUTEOS_PRODUCTION_URL;
if (!URL) throw new Error('ROUTEOS_PRODUCTION_URL required');
const STORE='JM_ROUTEOS_PUBLIC_RUNTIME_v0_8';
const OUT='ai-host-contact/routeos-body-contact';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});

const state=async()=>await page.evaluate((k)=>{
  const raw=localStorage.getItem(k);
  return raw?JSON.parse(raw):null;
},STORE);

try{
  await page.goto(URL,{waitUntil:'networkidle',timeout:60000});
  const identity=(await page.locator('body').innerText()).includes('RouteOS Console Home');
  if(!identity) throw new Error('Public RouteOS identity missing');

  await page.evaluate((k)=>localStorage.removeItem(k),STORE);
  await page.reload({waitUntil:'networkidle'});

  // Contact mismatch: invalid SAVE before active cartridge.
  await page.locator('[data-screen="play"]').click();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(120);
  const pre=await state();
  const prematureRefused=Object.keys(pre?.saves||{}).length===0;
  if(!prematureRefused) throw new Error('Production RouteOS accepted invalid premature SAVE');

  // Replan from actual state and use native RouteOS UI.
  await page.locator('[data-screen="bay"]').click();
  await page.locator('[data-launch="seed-runner"]').click();
  await page.waitForTimeout(160);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(700);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);

  await page.locator('#saveBtn').click();
  await page.waitForTimeout(120);
  const afterSave=await state();
  const save=afterSave?.saves?.['seed-runner'];

  await page.locator('#suspendBtn').click();
  await page.waitForTimeout(120);
  const afterSuspend=await state();

  await page.locator('#quickResume').click();
  await page.waitForTimeout(140);
  const afterResume=await state();

  await page.reload({waitUntil:'networkidle'});
  await page.locator('#openVault').click();
  await page.waitForTimeout(120);
  const finalState=await state();
  const vaultText=await page.locator('#saveList').innerText();
  const types=(finalState?.receipts||[]).map(x=>x.type);

  const checks={
    public_routeos_identity:identity,
    premature_save_refused:prematureRefused,
    save_exists:Boolean(save),
    namespace_exact:save?.namespace==='routeos.seed-runner.jm',
    player_moved:Number(save?.state?.player?.x)>120,
    quick_resume_created:afterSuspend?.quickResume?.recordType==='RouteOSQuickResume',
    quick_resume_consumed:afterResume?.quickResume===null,
    lifecycle_receipts:['BOOT','READY','PLAY','SAVE','SUSPEND','RESUME'].every(t=>types.includes(t)),
    save_survives_reload:Boolean(finalState?.saves?.['seed-runner']),
    visible_vault_namespace:vaultText.includes('routeos.seed-runner.jm'),
    visible_vault_title:vaultText.includes('Seed Runner')
  };
  if(!Object.values(checks).every(Boolean)) throw new Error('Production RouteOS contact HOLD '+JSON.stringify(checks));

  const receipt={
    schema:'JM.AI.RouteOSProductionContactReceipt/0.1',
    status:'PASS',
    public_url:URL,
    deployed_head_sha:process.env.DEPLOYED_HEAD_SHA||null,
    github_workflow_run:process.env.GITHUB_RUN_ID||null,
    body:{name:'RouteOS Console Home',version:'0.8',source:'games-beyond/routeos/runtime/index.html'},
    mismatch:{
      attempted:'SAVE without active cartridge',
      observed:'no cartridge save created',
      recovery:'launch Seed Runner and continue only after native precondition is satisfied'
    },
    checks,
    observed:{
      saved_player_x:Number(save.state.player.x),
      namespace:save.namespace,
      persisted_store:STORE,
      lifecycle_types:types
    },
    boundary:{
      routeos_source_changed:false,
      public_client_state_changed:true,
      owner_device_contact:false,
      arbitrary_autonomy_claimed:false
    },
    ding:'JM_AI_ROUTEOS_PRODUCTION_PUBLIC_STATE_DING'
  };
  fs.mkdirSync(OUT,{recursive:true});
  fs.writeFileSync(OUT+'/ROUTEOS_PRODUCTION_STATE_SNAPSHOT_v0_1.json',JSON.stringify(finalState,null,2)+'\n');
  fs.writeFileSync(OUT+'/ROUTEOS_PRODUCTION_CONTACT_RECEIPT_v0_1.json',JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
}finally{
  await browser.close();
}
