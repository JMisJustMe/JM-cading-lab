/** JM FOURFOLD → APP//COMMONS CP05 — real-origin RECEIVER proof.
 * Existing JM APP//COMMONS browser JS is SHA-identical to protected CP04 Library head.
 * Input is a MINIMISED REPRESENTATIVE WITNESS from the separately proved CP04
 * actual PUSH event, not full original game source and NOT a fresh game action.
 * This test checks recipient real HTTP/localStorage/process restart with no shim.
 * Source apps and their release authorities remain distinct and unchanged.
 */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const source=process.env.JM_COMMONS_HTML;
if(!source||!fs.existsSync(source))throw Error('HOLD: ORIGINAL_COMMONS_SOURCE_NOT_RECOVERED');
const html=fs.readFileSync(source,'utf8');
const script=html.split('<script>').at(-1)?.split('</script>')[0];
const originalJS='edb8b585e984f87e2ee8b6378c306ec28f32919fe07ad64b99c82e0e0f00c4fc';
if(crypto.createHash('sha256').update(script).digest('hex')!==originalJS)throw Error('HOLD: RECIPIENT_RUNTIME_NOT_CURRENT_PROVEN');
const receipt={schema:'JM.FOURFOLD.APP_COMMONS.ORIGIN_CONTACT/CP05',sourceRuntimeSHA256:originalJS,
  sourceScope:'Original APP//COMMONS CP04 browser runtime; public historical carrier with exact JS identity to protected current Library HTML',
  producerScope:'Minimised metadata projection of separately proved FOURFOLD CP04 PUSH event; actual game executable NOT rerun here',
  physicalDevice:false,hostedMCP:false,claimsNativeBrowserOrigin:true,profiles:[],passed:0,failed:0};
const out=path.resolve('qa/jm-fourfold-commons-cp05');
fs.mkdirSync(out,{recursive:true});
const witness=JSON.stringify({
 schema:'JM.FOURFOLD.AppCommonsIntake/CP04',
 provenance:'MINIMISED_CP04_PROVENANCE_WITNESS_NOT_GAME_CODE',
 route:{producer:'FOURFOLD ARENA',receiver:'JM APP//COMMONS CP04',kind:'read-only gameplay event custody'},
 capsule:{
  schema:'JM.GameContact.FOURFOLD.CP03/1.0',
  source:{body:'FOURFOLD ARENA',version:'v0.22.1 Owner Contact Polish RC1'},
  nativeProof:{parse:'success',compiler:'success',runtime:'success'},
  game:{crew:['PUSH','PULL','PROJECT','FOLD'],units:Array.from({length:8},(_,i)=>({slot:i+1})),
    lastPacket:{actorTeam:'player',actions:[{fighter:'PUSH',role:'PRIMARY',force:.78}]}}
 }
},null,2);
const server=http.createServer((req,res)=>{
 if(req.url!=='/JM_APP_COMMONS_CP04.html'){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
 res.end(html);
});
const listen=()=>new Promise(r=>server.listen(0,'127.0.0.1',r));
const launch=(dir,viewport,touch)=>chromium.launchPersistentContext(dir,{
  headless:true,viewport,hasTouch:touch,isMobile:touch&&viewport.width<500,
  acceptDownloads:true,args:['--no-sandbox']});
const checks=(rec,name,result)=>{rec.checks.push({name,passed:!!result});if(!result)throw Error('HOLD '+rec.profile+' / '+name);};
const profiles=[['phone390',390,844,true],['tablet820',820,1180,true],['desktop1365',1365,900,false]];
await listen();
const url='http://127.0.0.1:'+server.address().port+'/JM_APP_COMMONS_CP04.html';
try{
 for(const [name,width,height,touch] of profiles){
  const rec={profile:name,viewport:[width,height],touch,checks:[],pageErrors:[]};
  receipt.profiles.push(rec);
  const dirs=[fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp05-sender-')),
              fs.mkdtempSync(path.join(os.tmpdir(),'jm-cp05-recipient-'))];
  const viewport={width,height};
  let ctx=null;
  const boot=async i=>{
    const browser=await launch(dirs[i],viewport,touch);
    const page=browser.pages()[0]||await browser.newPage();
    page.on('pageerror',e=>rec.pageErrors.push(String(e)));
    const response=await page.goto(url,{waitUntil:'load',timeout:45000});
    checks(rec,'real-http-origin-'+i,response?.status()===200&&await page.evaluate(()=>location.protocol==='http:'&&localStorage!==undefined));
    return [browser,page];
  };
  try{
    let [a,producer]=await boot(0);ctx=a;
    checks(rec,'producer-browser-workroom-original',await producer.locator('#source').inputValue()==='');
    await producer.locator('#projectName').fill('FOURFOLD CONTACT CP05');
    await producer.locator('#source').fill(witness);
    await producer.locator('#inspectBtn').click();
    await producer.locator('#saveBtn').click();
    checks(rec,'source-saved-with-real-localStorage',await producer.evaluate((s)=>{
      const value=JSON.parse(localStorage.getItem('jm.appcommons.cp01.project')||'null');
      return value?.source===s&&value.snapshots?.length===1;
    },witness));
    await producer.locator('[data-tab="passport"]').click();
    const [download]=await Promise.all([producer.waitForEvent('download'),producer.locator('#exportBtn').click()]);
    const portable=fs.readFileSync(await download.path(),'utf8');
    const passport=JSON.parse(portable);
    checks(rec,'genuine-native-capsule-checksum',typeof passport.checksum==='string'&&passport.checksum.length===64);
    checks(rec,'genuine-native-capsule-source-identity',passport.payload?.source===witness&&passport.payload?.schema==='JM.AppCommons.Capsule/0.1');
    await a.close();ctx=null;

    let [b,receiver]=await boot(1);ctx=b;
    checks(rec,'independent-receiver-blank',await receiver.locator('#source').inputValue()==='');
    await receiver.locator('[data-tab="passport"]').click();
    const paste=receiver.locator('#capsulePaste');
    await paste.fill(portable);
    await receiver.locator('#stagePasteBtn').click();
    checks(rec,'native-checksum-verified-before-apply',(await receiver.locator('#importStatus').innerText()).includes('VERIFIED'));
    checks(rec,'staged-without-changing-source',(await receiver.locator('#source').inputValue())==='');
    const tampered=structuredClone(passport);tampered.payload.source+='\nFORGED';
    await paste.fill(JSON.stringify(tampered));
    await receiver.locator('#stagePasteBtn').click();
    checks(rec,'tampered-capsule-rejected',await receiver.locator('#applyImportBtn').isDisabled());
    checks(rec,'tamper-did-not-mutate-receiver',await receiver.locator('#source').inputValue()==='');
    await paste.fill(portable);await receiver.locator('#stagePasteBtn').click();
    receiver.once('dialog',dialog=>dialog.dismiss());
    await receiver.locator('#applyImportBtn').click();
    checks(rec,'denied-import-left-source-untouched',await receiver.locator('#source').inputValue()==='');
    receiver.once('dialog',dialog=>dialog.accept());
    await receiver.locator('#applyImportBtn').click();
    checks(rec,'approved-import-writes-real-source',await receiver.locator('#source').inputValue()===witness);
    checks(rec,'recipient-localStorage-native-disk-write',await receiver.evaluate(s=>{
      const state=JSON.parse(localStorage.getItem('jm.appcommons.cp01.project')||'null');
      return state?.source===s&&state.snapshots?.length===1;
    },witness));
    await receiver.locator('[data-tab="proof"]').click();
    await receiver.locator('#proofBtn').click();
    checks(rec,'app-receiving-internal-proof',await receiver.locator('#proofState').innerText()==='LOCAL PASS');
    if(name==='phone390')await receiver.screenshot({path:path.join(out,'cp05-real-origin-phone.png'),fullPage:true});
    await b.close();ctx=null;

    // A new full Chromium process, *same actual disk profile*, no storage reinjection.
    [b,receiver]=await boot(1);ctx=b;
    checks(rec,'cold-process-source-survives',(await receiver.locator('#source').inputValue())===witness);
    await receiver.locator('[data-tab="lineage"]').click();
    checks(rec,'cold-process-protected-snapshot',await receiver.locator('#snapshots .snap').count()===1&&
      (await receiver.locator('#snapshots').innerText()).includes('DIGEST OK'));
    await receiver.reload({waitUntil:'load'});
    checks(rec,'real-origin-page-reload-persists',await receiver.locator('#source').inputValue()===witness);
    await receiver.locator('[data-tab="proof"]').click();
    await receiver.locator('#proofBtn').click();
    checks(rec,'cold-process-six-line-local-proof',await receiver.locator('#proofState').innerText()==='LOCAL PASS');
    // Verify genuine disk corruption enters HOLD and retains corrupt bytes.
    const damaged=await receiver.evaluate(()=>{
      const key='jm.appcommons.cp01.project';
      const state=JSON.parse(localStorage.getItem(key));
      state.snapshots[0].text='TAMPERED CP05';
      const data=JSON.stringify(state);localStorage.setItem(key,data);return data;
    });
    await b.close();ctx=null;
    [b,receiver]=await boot(1);ctx=b;
    checks(rec,'tampered-native-storage-enters-HOLD',(await receiver.locator('#notification').innerText()).includes('HOLD'));
    checks(rec,'damaged-disk-bytes-not-overwritten',await receiver.evaluate(()=>localStorage.getItem('jm.appcommons.cp01.project'))===damaged);
    checks(rec,'zero-page-script-errors',rec.pageErrors.length===0);
    await b.close();ctx=null;
  }catch(error){
    rec.error=String(error);
    try{if(ctx){const p=ctx.pages()[0];if(p)await p.screenshot({path:path.join(out,name+'-failed.png')});}}catch{}
  }finally{
    if(ctx)await ctx.close().catch(()=>{});
    for(const dir of dirs)fs.rmSync(dir,{recursive:true,force:true});
  }
  console.log(name,rec.checks.length,rec.error||'PASS');
 }
}finally{
 await new Promise(resolve=>server.close(resolve));
 receipt.passed=receipt.profiles.flatMap(x=>x.checks).filter(x=>x.passed).length;
 receipt.failed=receipt.profiles.flatMap(x=>x.checks).filter(x=>!x.passed).length+receipt.profiles.filter(x=>x.error).length;
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify({suite:receipt.schema,passed:receipt.passed,failed:receipt.failed,profiles:receipt.profiles.map(x=>({name:x.profile,checks:x.checks.length,error:x.error||null})),physicalDevice:false}));
 if(receipt.failed)process.exitCode=1;
}