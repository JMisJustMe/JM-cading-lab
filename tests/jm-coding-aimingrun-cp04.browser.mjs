// CP04 original player-input receipt → native coding → actual game physics in Chromium.
// Real browser / local origin; not physical owner Fold, public Pages or release acceptance.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),dest=resolve(root,'qa','jm-coding-aimingrun-cp04');
await mkdir(dest,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{const p=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(p!==root&&!p.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  const bytes=await readFile(p);res.writeHead(200,{'content-type':mime[extname(p)]||'application/octet-stream','cache-control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('not found');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const url='http://127.0.0.1:'+server.address().port+'/games-beyond/bodies/aiming-run-cp04.html';
const profiles=[{name:'phone-fold-portrait',width:390,height:844,touch:true},
 {name:'unfolded-tablet',width:820,height:610,touch:true},
 {name:'laptop',width:1440,height:900,touch:false}];
const report={schema:'JM.AimingRun.CP04.RealShotBrowser/1.0',boundary:'True browser pointer release through original Aiming Run game script in emulated device viewports. No physical device proof.',profiles:[],passed:0,failed:0};
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const p of profiles){
  const checks=[],errors=[],record={name:p.name,checks,errors};report.profiles.push(record);
  const ctx=await browser.newContext({viewport:{width:p.width,height:p.height},hasTouch:p.touch,isMobile:p.touch&&p.width<500});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text())});
  const check=(name,valid)=>{checks.push({name,pass:!!valid});if(!valid)throw Error(p.name+' '+name);};
  try{
   const res=await page.goto(url,{waitUntil:'networkidle',timeout:45000});check('HTTP source companion 200',res.status()===200);
   await page.waitForFunction(()=>!document.querySelector('#arm-shot').disabled,{timeout:16000});
   const game=page.frameLocator('#game');
   await game.locator('#arena').waitFor({state:'visible'});
   const initial=await page.locator('#game').evaluate(el=>{const s=el.contentWindow.AimingRun.state;return {amp:s.tracks[0].targetAmp,shots:s.shots,hits:s.hits,score:s.score}});
   check('original game initial source state unchanged',initial.amp===44&&initial.shots===0&&initial.score===0);
   await page.locator('#arm-shot').click();
   await game.locator('#startRun').click();
   const canvas=game.locator('#arena'),box=await canvas.boundingBox();
   if(!box)throw Error('NO_ORIGINAL_CANVAS_BOUNDING_BOX');
   const localX=Math.max(74,box.width*.105),localY=box.height*.72;
   const cx=box.x+localX,cy=box.y+localY;
   await page.mouse.move(cx,cy);await page.mouse.down();
   await page.mouse.move(cx-43,cy+52,{steps:8});await page.mouse.up();
   await page.waitForFunction(()=>document.querySelector('#shot-receipt').textContent.includes('REAL_SHOT_CHANGED_LIVE_TARGET_MOTION'),{timeout:12000});
   const shot=JSON.parse(await page.locator('#shot-receipt').textContent());
   check('one original shot event captured through real pointer input',shot.ok&&shot.event.type==='shot_release'&&shot.event.power>0);
   check('shot pressure comes from original observed power',shot.producer.pressure===shot.event.power+5);
   const live=await page.locator('#game').evaluate(el=>{const s=el.contentWindow.AimingRun.state,t=s.tracks[s.trackIndex],target=s.target;return {
     amp:t.targetAmp,score:s.score,hits:s.hits,shots:s.shots,event:s.events[0]?.type,
     age:target?.age,y:target?.y,
     expected:target?.baseY+Math.sin(target.age*.004*t.targetSpeed*s.tuning.targetMotion+target.phase)*t.targetAmp}});
   check('original-game input event, not proof harness, increased shots',live.shots===1&&live.event==='shot_release');
   check('original targetAmp mutated inside actual game',live.amp!==initial.amp&&live.amp===shot.after.targetAmp);
   check('real game target motion consumes new vertical amplitude',live.age>0&&Math.abs(live.y-live.expected)<.001);
   check('no manufactured hits or game score',live.hits===0&&live.score===0);
   await page.locator('#restore-shot').click();
   let refused=JSON.parse(await page.locator('#shot-receipt').textContent());
   check('restore refused while actual game running',refused.ok===false&&/PAUSE_BEFORE_RESTORE/.test(refused.diagnostic));
   await game.locator('#startRun').click();
   await page.locator('#restore-shot').click();
   const saved=JSON.parse(await page.locator('#shot-receipt').textContent());
   check('after pause exact original amplitude restored',saved.ok===true&&await page.locator('#game').evaluate(el=>el.contentWindow.AimingRun.state.tracks[0].targetAmp)===44);
   check('no outer horizontal crop',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
   check('no uncaught browser/page errors',errors.length===0);
   await page.screenshot({path:dest+'/'+p.name+'.png',fullPage:true});
  }catch(err){record.failure=String(err.message??err);report.failed++;}
  finally{report.passed+=checks.filter(x=>x.pass).length;await ctx.close();}
 }
}finally{if(browser)await browser.close();await new Promise(ok=>server.close(ok))}
await writeFile(dest+'/receipt.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));if(report.failed)process.exitCode=1;
