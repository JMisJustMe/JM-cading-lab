import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {chromium} from 'playwright-core';
import {RouteScript,RouteVM,RouteOS} from '../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
const root=process.cwd(),chrome=[process.env.CHROME_PATH,'/usr/bin/google-chrome','/usr/bin/google-chrome-stable','/usr/bin/chromium'].find(x=>x&&existsSync(x));
assert.ok(chrome,'Real Chromium required');
const caseId=Number(process.env.CP11_ROUTE_CASE??0);
assert.ok(Number.isInteger(caseId)&&caseId>=0&&caseId<8);
const widths=[320,360,390,658],width=widths[caseId%4];
const src=String.raw`
route RiftEvadeRoute {
 start:
  branch combat.health <= 35 -> rescue
  branch combat.resonance >= 40 -> charged
  goto ordinary
 rescue:
  movement.distance = 3.2
  movement.ward = 2.4
  movement.mode = "rescue"
  end
 charged:
  movement.distance = 2.5
  movement.ward = 1.45
  movement.mode = "charged"
  end
 ordinary:
  movement.distance = 1.8
  movement.ward = 0.85
  movement.mode = "ordinary"
  end
}
`;
const g=RouteScript.lower(RouteScript.parse(src)).graphs[0];
const code=RouteVM.compile(g);
assert.equal(RouteVM.verify(code),true);
const tampered=structuredClone(code);tampered.instructions[0].operands[0]='RiftEvadeRoute:FAKE';
assert.throws(()=>RouteVM.verify(tampered),e=>e.code==='RVM_BAD_CHECKSUM');
assert.throws(()=>RouteScript.parse('route Bad {\n start:\n goto nowhere\n}'),e=>e.code==='RS_UNKNOWN_TARGET');
const os=new RouteOS();os.registerRoute('RiftEvadeRoute',code,g);
function plan(health,resonance){
 return os.callService('RiftEvadeRoute',{combat:{health,resonance},movement:{distance:1.8,ward:.85,mode:'ordinary'}});
}
const p0=plan(100,0),p1=plan(100,40),p2=plan(35,40);
assert.deepEqual([p0.state.movement.distance,p0.state.movement.ward,p0.state.movement.mode],[1.8,.85,'ordinary']);
assert.deepEqual([p1.state.movement.distance,p1.state.movement.ward,p1.state.movement.mode],[2.5,1.45,'charged']);
assert.deepEqual([p2.state.movement.distance,p2.state.movement.ward,p2.state.movement.mode],[3.2,2.4,'rescue']);
assert.equal(p1.execution.bytecode.header.checksum,code.header.checksum);
assert.ok(p1.traceId&&p1.execution.receipt.traceDigest);
assert.throws(()=>os.callService('NotRegistered',{}),e=>e.code==='ROS_UNKNOWN_SERVICE');

let port;const html='/engine/demo/cp11-routed-evade-v0.6.html';
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!p.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{
  let content=readFileSync(p);
  if(url.pathname===html)content=Buffer.from(content.toString()
   .replace("const BASE='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@95a529c26341751af3d26f1a4499a1481801c047/engine/';","const BASE='http://127.0.0.1:"+port+"/engine/';")
   .replace("const THREE_URL='https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';","const THREE_URL='http://127.0.0.1:"+port+"/node_modules/three/build/three.module.js';")
   .replace("const NATIVE_GAME_URL='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@60dc75159e901a208e55f80071269dd24cfc238d/coding-estate/sovereign-ten/direct/game-native.mjs';","const NATIVE_GAME_URL='http://127.0.0.1:"+port+"/coding-estate/sovereign-ten/direct/game-native.mjs';")
   .replace("const NATIVE_LOGIC_URL='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@60dc75159e901a208e55f80071269dd24cfc238d/coding-estate/sovereign-ten/direct/language-native.mjs';","const NATIVE_LOGIC_URL='http://127.0.0.1:"+port+"/coding-estate/sovereign-ten/direct/language-native.mjs';")
   .replace("const NATIVE_ROUTE_URL='https://cdn.jsdelivr.net/gh/JMisJustMe/JM-cading-lab@60dc75159e901a208e55f80071269dd24cfc238d/coding-estate/sovereign-ten/direct/route-proof-native.mjs';","const NATIVE_ROUTE_URL='http://127.0.0.1:"+port+"/coding-estate/sovereign-ten/direct/route-proof-native.mjs';"));
  res.setHeader('Content-Type',extname(p)==='.html'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  res.end(content);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));port=server.address().port;
let browser;
try{
 browser=await chromium.launch({headless:true,executablePath:chrome,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width,height:Math.max(750,width*1.7)},deviceScaleFactor:1,hasTouch:true,isMobile:true});
 const errors=[];page.on('pageerror',e=>errors.push('PAGE '+e.message));page.on('console',m=>{if(m.type()==='error')errors.push('CONSOLE '+m.text())});
 await page.goto('http://127.0.0.1:'+port+html);
 await page.waitForFunction(()=>window.__CP11?.state==='LIVE_WEBGL'&&window.__CP11.native?.online&&window.__CP11.route?.online,{timeout:50000});
 const b=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(b.version,'JM.CP11.LivingForm/0.6');
 assert.equal(b.route.routeVMChecksum,code.header.checksum);
 assert.ok(b.compiledOrgans>=38&&b.drawCalls>20);
 assert.equal(b.route.routeScriptNodes,4);
 assert.equal(b.native.gameNodes,3);
 const doc=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth}));
 assert.ok(doc.doc<=doc.width+1,'no sideways overflow');
 // Real UI -> verified RouteOS -> typed movement -> actual Rootwarden coordinates.
 await page.locator('#dash').click();
 await page.waitForFunction(()=>window.__CP11.route.ordinary===1,{timeout:5000});
 const regular=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(regular.route.lastMode,'ordinary');
 assert.equal(regular.route.lastDistance,1.8);
 assert.ok(regular.contacts.some(c=>c.type==='JM_ROUTEOS_DISPATCH'&&c.detail.distance===1.8));
 // Earn actual native Resonance with two source-compiled game combat hits.
 async function fire(n){
  await page.locator('#pulse').click();
  await page.waitForFunction(n=>window.__CP11.hits>=n,n,{timeout:35000});
  await page.waitForTimeout(650);
 }
 await fire(1);await fire(2);
 const earned=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(earned.native.resonance,40);
 await page.waitForFunction(()=>document.querySelector('#dash').disabled===false,{timeout:12000});
 // Press S for world-forward; charged route should move > ordinary distance.
 await page.keyboard.down('s');await page.locator('#dash').click();await page.keyboard.up('s');
 await page.waitForFunction(()=>window.__CP11.route.charged===1,{timeout:5000});
 const charged=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(charged.route.lastDistance,2.5);
 assert.equal(charged.route.lastWard,1.45);
 assert.equal(charged.route.routeOSCalls,2);
 assert.ok(charged.route.routeTraceDigest);
 assert.ok(charged.contacts.some(c=>c.type==='DASH_EVADE'&&c.detail.route==='charged'));
 assert.ok(charged.contacts.some(c=>c.type==='JM_ROUTEOS_DISPATCH'&&c.detail.mode==='charged'));
 mkdirSync('cp11-route-evidence',{recursive:true});
 await page.screenshot({path:'cp11-route-evidence/route-'+caseId+'.png',fullPage:true});
 // Inherited 3-body double pulse still executes after routed dash.
 await fire(4);
 const impact=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(impact.native.strikes,1);
 assert.equal(impact.hits,4);
 await page.locator('#restart').click();
 await page.waitForFunction(()=>window.__CP11.native.resets===1,{timeout:5000});
 const reset=await page.evaluate(()=>structuredClone(window.__CP11));
 assert.equal(reset.hits,0);assert.equal(reset.native.resonance,0);
 assert.equal(reset.route.routeOSCalls,2,'route owner persists across gameplay restart without losing donor');
 assert.deepEqual(errors,[]);
 console.log('JM_CP11_ROUTEOS_WEBGL_PASS '+JSON.stringify({caseId,width,routeModes:[p0.state.movement.mode,p1.state.movement.mode,p2.state.movement.mode],webglDrawCalls:b.drawCalls,dash:{ordinary:1.8,charged:2.5,trace:charged.route.routeTraceDigest},originalThreeBodies:impact.native.strikes,reset:true,errors}));
} finally{
 if(browser)await browser.close();
 await new Promise(ok=>server.close(ok));
}
