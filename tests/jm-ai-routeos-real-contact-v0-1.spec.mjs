import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.ROUTEOS_BASE_URL || 'http://127.0.0.1:4177';
const STORE = 'JM_ROUTEOS_PUBLIC_RUNTIME_v0_8';
const MANIFEST_PATH = 'ai-host-contact/routeos-body-contact/ROUTEOS_CONTACT_GOAL_v0_1.json';
const OUT_DIR = 'ai-host-contact/routeos-body-contact';
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1280,height:900}});

const state = async () => await page.evaluate((key) => {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}, STORE);

const checks = {};
const trace = [];
const snap = async (label) => {
  const s = await state();
  trace.push({label, state:s});
  return s;
};

try {
  await page.goto(BASE + '/games-beyond/routeos/runtime/', {waitUntil:'networkidle'});
  await page.evaluate((key)=>localStorage.removeItem(key), STORE);
  await page.reload({waitUntil:'networkidle'});

  // Reality mismatch: SAVE is requested before a cartridge exists.
  await page.locator('[data-screen="play"]').click();
  await page.locator('#saveBtn').click();
  await page.waitForTimeout(100);
  const mismatch = await snap('premature-save-attempt');
  checks.premature_save_refused = Object.keys(mismatch?.saves || {}).length === 0;
  if (!checks.premature_save_refused) throw new Error('RouteOS unexpectedly created a save without an active cartridge');

  // Recover the remaining route from actual contact.
  await page.locator('[data-screen="bay"]').click();
  await page.locator('[data-launch="seed-runner"]').click();
  await page.waitForTimeout(150);

  // Produce a real game-state change before saving.
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(650);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(120);

  await page.locator('#saveBtn').click();
  await page.waitForTimeout(100);
  const afterSave = await snap('after-save');
  const save = afterSave.saves?.['seed-runner'];
  checks.save_exists = Boolean(save);
  checks.namespace_exact = save?.namespace === 'routeos.seed-runner.jm';
  checks.player_moved = Number(save?.state?.player?.x) > 120;
  const savedX = Number(save?.state?.player?.x);

  await page.locator('#suspendBtn').click();
  await page.waitForTimeout(100);
  const afterSuspend = await snap('after-suspend');
  checks.quick_resume_created = afterSuspend.quickResume?.recordType === 'RouteOSQuickResume'
    && afterSuspend.quickResume?.cartridgeId === 'seed-runner';

  await page.locator('#quickResume').click();
  await page.waitForTimeout(120);
  const afterResume = await snap('after-resume');
  checks.quick_resume_consumed = afterResume.quickResume === null;

  const types = (afterResume.receipts || []).map(r=>r.type);
  checks.lifecycle_receipts = ['BOOT','READY','PLAY','SAVE','SUSPEND','RESUME'].every(t=>types.includes(t));

  // Cold browser document reload: localStorage is the RouteOS persistence boundary.
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#openVault').click();
  await page.waitForTimeout(100);
  const afterReload = await snap('after-cold-browser-reload');
  const vaultText = await page.locator('#saveList').innerText();
  checks.save_survives_reload = Boolean(afterReload.saves?.['seed-runner']);
  checks.visible_vault_namespace = vaultText.includes('routeos.seed-runner.jm');
  checks.visible_vault_title = vaultText.includes('Seed Runner');

  const pass = Object.values(checks).every(Boolean);
  if (!pass) throw new Error('RouteOS contact gate failed: ' + JSON.stringify(checks));

  const receipt = {
    schema:'JM.AI.RouteOSRealContactReceipt/0.1',
    status:'PASS',
    existing_body:manifest.existing_body,
    goal:manifest.goal,
    github:{
      run_id:process.env.GITHUB_RUN_ID || null,
      run_attempt:process.env.GITHUB_RUN_ATTEMPT || null,
      branch:process.env.GITHUB_REF_NAME || null,
      source_commit:process.env.GITHUB_SHA || null
    },
    mismatch:{
      attempted:'SAVE without active cartridge',
      observed:'no save created',
      recovery:'launch Seed Runner, mutate live game state, then continue save/suspend/resume route'
    },
    checks,
    observed:{
      saved_player_x:savedX,
      save_namespace:save.namespace,
      receipt_types:types,
      persisted_store:STORE
    },
    authority:manifest.authority,
    boundary:{
      routeos_source_changed:false,
      browser_local_storage_changed:true,
      claim:'Existing RouteOS UI and native persistence/lifecycle functions performed the state changes on a real hosted browser runner.'
    },
    ding:'JM_AI_ROUTEOS_REAL_STATE_CONTACT_DING'
  };
  fs.mkdirSync(OUT_DIR,{recursive:true});
  fs.writeFileSync(OUT_DIR + '/ROUTEOS_STATE_SNAPSHOT_v0_1.json', JSON.stringify(afterReload,null,2)+'\n');
  fs.writeFileSync(OUT_DIR + '/ROUTEOS_REAL_CONTACT_RECEIPT_v0_1.json', JSON.stringify(receipt,null,2)+'\n');
  console.log(JSON.stringify(receipt,null,2));
} finally {
  await browser.close();
}
