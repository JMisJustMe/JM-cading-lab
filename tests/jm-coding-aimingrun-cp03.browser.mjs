/* CP03 Browser QA: real Aiming Run HTML in iframe over loopback HTTP.
 * Device-size Chromium simulation, NOT physical Samsung Fold owner proof.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),output=resolve(root,'qa','jm-coding-aimingrun-cp03');
await mkdir(output,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep)){res.writeHead(403);res.end('blocked');return}
  const body=await readFile(path);
  res.writeHead(200,{'content-type':types[extname(path)]??'application/octet-stream','cache-control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('not-found')}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/games-beyond/bodies/aiming-run-cp03.html';
const profiles=[{name:'fold-portrait',width:390,height:844,touch:true},
 {name:'fold-unfolded',width:820,height:610,touch:true},{name:'laptop',width:1440,height:900,touch:false}];
const receipt={schema:'JM.AimingRun.CP03.BrowserRecipientProof/1.0',
 game:'Original Aiming Run v0.1A within same-origin iframe',claimBoundary:'Real Chromium on GitHub runner, NOT owner phone/Fold hardware or live public release.',profiles:[],passed:0,failed:0};
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const p of profiles){
  const errors=[],checks=[],ctx=await browser.newContext({viewport:{width:p.width,height:p.height},isMobile:p.touch&&p.width<500,hasTouch:p.touch});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  const check=(name,ok)=>{checks.push({name,pass:!!ok});if(!ok)throw Error(p.name+': '+name)};
  const record={profile:p.name,checks,errors};receipt.profiles.push(record);
  try{
   const res=await page.goto(base,{waitUntil:'networkidle',timeout:45000});
   check('HTTP actual CP03 companion',res.status()===200);
   await page.waitForFunction(()=>!document.querySelector('#apply').disabled,{timeout:20000});
   const game=page.frameLocator('#game');
   await game.locator('#startRun').waitFor({state:'visible',timeout:20000});
   const before=await page.locator('#game').evaluate(el=>{const a=el.contentWindow.AimingRun;return {source:a.projectBody(),speed:a.state.tracks[a.state.trackIndex].targetSpeed,score:a.state.score,hits:a.state.hits,shots:a.state.shots}});
   check('original source identity and track readback',before.source.name==='Aiming Run'&&before.source.track.id==='moving-target'&&before.speed===1);
   check('game original score starts independently',before.score===0&&before.hits===0&&before.shots===0);
   await page.locator('#apply').click();
   await page.waitForFunction(()=>document.querySelector('#receipt').textContent.includes('RECIPIENT_TARGET_MOTION_CHANGED'));
   const after=await page.locator('#game').evaluate(el=>{const a=el.contentWindow.AimingRun;return {speed:a.state.tracks[a.state.trackIndex].targetSpeed,score:a.state.score,hits:a.state.hits,shots:a.state.shots}});
   check('CP02 pressure genuinely changes original game track speed',after.speed===1.32);
   check('original scoring and shots untouched',after.score===before.score&&after.hits===before.hits&&after.shots===before.shots);
   await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.startRun());
   await page.waitForTimeout(220);
   const motion=await page.locator('#game').evaluate(el=>{
    const {state}=el.contentWindow.AimingRun,t=state.tracks[state.trackIndex],target=state.target;
    return {running:state.running,speed:t.targetSpeed,age:target.age,y:target.y,
      predicted:target.baseY+Math.sin(target.age*.004*t.targetSpeed*state.tuning.targetMotion+target.phase)*t.targetAmp}
   });
   check('real original game clock advanced under altered target speed',motion.running&&motion.age>0&&motion.speed===1.32);
   check('actual original sinusoidal target physics used CP03 speed',Math.abs(motion.y-motion.predicted)<0.001);
   await page.locator('#restore').click();
   const held=JSON.parse(await page.locator('#receipt').textContent());
   check('no overwrite while original game is running',!held.ok&&held.status==='HOLD_NO_RESTORE_WRITE');
   await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.startRun());
   await page.locator('#restore').click();
   const restored=await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.state.tracks[0].targetSpeed);
   check('exact target speed restoration after pause',restored===before.speed);
   await page.locator('#energy').fill('1');await page.locator('#by').fill('2');await page.locator('#threshold').fill('7');
   await page.locator('#apply').click();
   const slower=await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.state.tracks[0].targetSpeed);
   check('failed threshold gives genuinely slower original target',slower===.85);
   await page.locator('#restore').click();
   check('second exact restore',await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.state.tracks[0].targetSpeed)===1);
   check('no horizontal outer viewport crop',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
   check('no uncaught browser errors',errors.length===0);
   await page.screenshot({path:output+'/'+p.name+'.png',fullPage:true});
  }catch(error){record.failure=String(error.message??error);receipt.failed++;}finally{receipt.passed+=checks.filter(x=>x.pass).length;await ctx.close();}
 }
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok))}
await writeFile(output+'/receipt.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify(receipt,null,2));
if(receipt.failed)process.exitCode=1;
