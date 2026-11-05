// JM Apps & Tools CP04: additive bus-only import; synthetic browser contexts, no owner data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { chromium } from 'playwright';

const source=fs.readFileSync('estate-publication/apps-tools-convergence/JM_APPS_TOOLS_SHARED_PACKET_SPINE_v0_1.js','utf8');
const BUS='jm.apps.tools.shared.bus.v1';
const ENV='jm.apps.tools.env.evidence-governance.v1';
const pkt=(id,environment='evidence-governance')=>({schema:'jm.packet/1.0',id,created_at:'2026-11-04T00:00:00Z',kind:'cp04.synthetic',source:'JM synthetic QA',payload:{value:id},meta:{environment}});
function memory(initial={}){
 const map=new Map(Object.entries(initial));const events=[];let fail=null;
 const storage={getItem:k=>map.has(k)?map.get(k):null,setItem(k,v){if(fail?.(k))throw Error('SIMULATED_QUOTA');map.set(k,String(v))},removeItem:k=>map.delete(k)};
 const win={dispatchEvent:e=>events.push(e.type)};
 vm.runInNewContext(source,{window:win,localStorage:storage,Event:class{constructor(type){this.type=type}},CustomEvent:class{constructor(type){this.type=type}},Date,Math,console,Blob,setTimeout,URL,document:{}});
 return {api:win.JMAppsToolsSpine,map,events,failOn:f=>fail=f,clearFault:()=>fail=null};
}
function unit(){
 const state='{"rooms":{"gem":{"source":"KEEP"}},"active":"gem"}';
 const original=[pkt('original')];const t=memory({[BUS]:JSON.stringify(original),[ENV]:state});
 const result=t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[pkt('fresh')]});
 assert.equal(result.added,1);assert.deepEqual(Array.from(t.api.read(),p=>p.id),['original','fresh']);
 assert.equal(t.map.get(ENV),state,'import bus must not modify the workroom');
 const after=t.map.get(BUS);
 assert.equal(t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[pkt('fresh')]}).added,0);
 assert.equal(t.map.get(BUS),after,'repeated import idempotent');
 const changed=pkt('original');changed.payload.value='SPOOF';
 assert.throws(()=>t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[changed]}),/COLLISION_HOLD/);
 assert.equal(t.map.get(BUS),after,'same-ID different content cannot overwrite existing packet');
 assert.throws(()=>t.api.mergeBus({schema:'bad',packets:[pkt('other')]}),/SCHEMA_HOLD/);
 assert.throws(()=>t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[pkt('x'),pkt('x')]}),/DUPLICATE_HOLD/);
 assert.throws(()=>t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:Array.from({length:250},(_,i)=>pkt('more-'+i))}),/FULL_EXPORT_BEFORE_IMPORT/);
 assert.equal(t.map.get(BUS),after);
 const priorEvents=t.events.filter(x=>x==='jm:bus-imported').length;
 t.failOn(k=>k===BUS);
 assert.throws(()=>t.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[pkt('blocked')]}),/SIMULATED_QUOTA/);
 assert.equal(t.map.get(BUS),after,'quota rejection must retain existing bus');
 assert.equal(t.events.filter(x=>x==='jm:bus-imported').length,priorEvents,'no false import event');
 const corrupt=memory({[BUS]:'{unreadable source'});
 assert.throws(()=>corrupt.api.mergeBus({schema:'jm.apps.tools.bus/1.0',packets:[pkt('x')]}),/UNREADABLE_HOLD/);
 assert.equal(corrupt.map.get(BUS),'{unreadable source');
 console.log('CP04 source-VM 9 safety and continuity assertions PASS');
}
async function browser(){
 const host=process.env.JM_CP04_BASE||'http://127.0.0.1:4178';
 const envs=['evidence-governance','creation-publication','contact-practice','route-ftr'];
 const b=await chromium.launch({headless:true,...(process.env.JM_CP04_CHROME_CHANNEL?{channel:process.env.JM_CP04_CHROME_CHANNEL}:{})});let passed=0;
 try{
  for(const viewport of [{width:390,height:844},{width:1366,height:900}]){
   for(const env of envs){
    const ctx=await b.newContext({viewport,acceptDownloads:true});
    const page=await ctx.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    const res=await page.goto(host+'/estate-publication/apps-tools-convergence/'+env+'/index.html',{waitUntil:'domcontentloaded'});
    assert.equal(res.status(),200);
    await page.getByRole('button',{name:/^Import Bus/i}).waitFor();
    const stateValue='CP04 PRESERVE '+env+' '+viewport.width;
    await page.locator('[data-field]').first().fill(stateValue);
    const original=await page.evaluate(({env})=>window.JMAppsToolsSpine.emit('cp04.synthetic','JM '+env,{value:'original'},{environment:env}),{env});
    const incoming=pkt('new-'+env+'-'+viewport.width,env);
    const obj={schema:'jm.apps.tools.bus/1.0',packets:[incoming]};
    const picker=page.locator('.toolbar input[type=file]').nth(1);
    const before=await page.evaluate(env=>localStorage.getItem('jm.apps.tools.env.'+env+'.v1'),env);
    await picker.setInputFiles({name:'cp04-bus.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});
    await page.waitForFunction(()=>document.querySelector('#continuityStatus')?.textContent?.includes('Imported 1 new shared packet'),{timeout:10000});
    const ids=await page.evaluate(()=>window.JMAppsToolsSpine.read().map(x=>x.id));
    assert.deepEqual(ids,[original.id,incoming.id]);
    assert.equal(await page.evaluate(env=>localStorage.getItem('jm.apps.tools.env.'+env+'.v1'),env),before);
    await picker.setInputFiles({name:'again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(obj))});
    await page.waitForFunction(()=>document.querySelector('#continuityStatus')?.textContent?.includes('Imported 0 new shared packet'),{timeout:10000});
    const damaged={...incoming,payload:{value:'SPOOF'}};
    await picker.setInputFiles({name:'collision.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({schema:obj.schema,packets:[damaged]}))});
    await page.waitForFunction(()=>document.querySelector('#continuityStatus')?.textContent?.includes('COLLISION_HOLD'),{timeout:10000});
    assert.deepEqual(await page.evaluate(()=>window.JMAppsToolsSpine.read().map(x=>x.id)),ids);
    withWait: {
     const promise=page.waitForEvent('download');
     await page.getByRole('button',{name:'EXPORT BUS'}).click();
     const download=await promise;
     const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
     assert.deepEqual(exported.packets.map(x=>x.id),ids);
    }
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('[data-field]').first().inputValue(),stateValue);
    assert.deepEqual(await page.evaluate(()=>window.JMAppsToolsSpine.read().map(x=>x.id)),ids);
    assert.equal(errors.length,0,errors.join('|'));
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    assert.equal(overflow,false,env+' overflow '+viewport.width);
    console.log('CP04 browser PASS',viewport.width,env,'import, idempotency, collision HOLD, export, reload, room-state custody');
    passed++;
    await ctx.close();
   }
  }
 }finally{await b.close()}
 assert.equal(passed,8);
 console.log('CP04 8/8 synthetic browser workrooms PASS');
}
unit();
await browser();
