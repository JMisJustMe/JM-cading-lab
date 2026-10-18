// JM Commercial Discovery 002 — repository-local QA.
// No dependencies, no payment actions, no contact data, no invented runtime proof.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext,Script} from 'node:vm';
const base=dirname(fileURLToPath(import.meta.url));
const root=resolve(base,'../..');
const page=readFileSync(join(base,'index.html'),'utf8');
const menu=readFileSync(join(root,'money-menu/index.html'),'utf8');
const register=JSON.parse(readFileSync(join(base,'JM_COMMERCIAL_OFFER_REGISTER_v0_2.json'),'utf8'));
const ledger=readFileSync(join(base,'REVENUE_LAUNCH_001_LEDGER.csv'),'utf8');
const failures=[];
function check(name,fn){try{fn();console.log('PASS '+name);}catch(e){failures.push(name+': '+e.message);console.error('FAIL '+name+': '+e.message);}}
check('machine register contains eight evidence-gated offers',()=>{
 assert.equal(register.offers.length,8);
 assert.equal(new Set(register.offers.map(o=>o.id)).size,8);
 assert.equal(register.latest_known.stripe_mode,'sandbox_only');
 assert.equal(register.latest_known.paid_orders_confirmed,0);
 assert.ok(register.offers.every(o=>o.next_gate&&o.price_status));
});
check('public sales ledger is safe and empty',()=>{
 assert.match(ledger,/PUBLIC AGGREGATE ONLY/);
 assert.match(ledger,/confirmed_live_paid_orders/);
 assert.doesNotMatch(ledger,/@|cs_live_|pi_live_|sk_live_|\d{4}-\d{2}-\d{2},/);
});
check('existing governed Money Menu preserved',()=>{
 assert.match(menu,/242 governed routes|242 routes/);
 assert.match(menu,/const PAYLOAD=/);
 assert.match(menu,/JM Money Menu — Public Contact Carrier v1.2/);
 assert.match(menu,/href="launch\/"/);
});
check('explicit no-live-payment boundary',()=>{
 assert.match(page,/No live Stripe purchase link/);
 assert.doesNotMatch(page,/buy\.stripe\.com|book\.stripe\.com|cs_live_|pk_live_|sk_live_/i);
 assert.match(page,/Not yet purchasable/);
});
check('source attribution & distinct offers',()=>{
 for(const s of ['Fight Clash','FOURFOLD','Secrets of Silence','Lyric Home','Beatmaker','Mobile Field Test','Control Grammar Audit','Existing HTML Repair']) assert.ok(page.includes(s),'missing '+s);
 assert.match(page,/No company incorporation/);
});
check('no covert form network or storage',()=>{
 assert.doesNotMatch(page,/fetch\s*\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|<form[^>]*action=/i);
 assert.match(page,/you review and send the message yourself/i);
 assert.match(page,/mailto:jayemmlyrikz@gmail\.com/);
});
check('relative site links resolve',()=>{
 const targets=[...page.matchAll(/href="([^"]+)"/g)].map(m=>m[1]).filter(s=>!s.startsWith('#')&&!s.startsWith('mailto:'));
 for(const p of targets){
  assert.ok(p.startsWith('../'),'unexpected external link '+p);
  const abs=resolve(base,decodeURIComponent(p));
  let candidate=abs;
  if(p.endsWith('/')) candidate=join(abs,'index.html');
  assert.ok(existsSync(candidate),'missing linked route '+p+' → '+candidate);
 }
});
check('basic accessibility and phone layout',()=>{
 for(const x of ['name="viewport"','aria-pressed','aria-label="Filter offers"','role="status"','prefers-reduced-motion','@media(max-width:650px)']) assert.ok(page.includes(x),'missing '+x);
});
const match=page.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
check('embedded browser script syntax',()=>{assert.ok(match,'missing script');new Script(match[1],{filename:'launch-inline.js'});});
check('offer selection / filter / email draft runtime',()=>{
 const listeners=(name)=>({dataset:{},hidden:false,value:'',textContent:'',_listeners:{},focus(){this.focused=true;},select(){},scrollIntoView(){},addEventListener(ev,fn){this._listeners[ev]=fn;},setAttribute(key,val){this[key]=val;}});
 const categories=['play','play','create','create','read','services','services','services'];
 const cardEls=categories.map(c=>{const el=listeners();el.dataset.category=c;return el;});
 const filterEls=['all','play','create','read','services'].map(f=>{const el=listeners();el.dataset.filter=f;return el;});
 const enquireEls=['Fight Clash — Founders Collection','Secrets of Silence — Digital Edition'].map(v=>{const el=listeners();el.dataset.enquire=v;return el;});
 const names=['chosenOffer','status','enquiry','customerNeed','customerName','replyContact','customerTerms','compose','copy'];
 const ids=Object.fromEntries(names.map(x=>[x,listeners()]));
 ids.customerNeed.value='Please tell me how I can trial this on Android.';
 const doc={querySelectorAll(sel){return sel==='[data-filter]'?filterEls:sel==='[data-category]'?cardEls:sel==='[data-enquire]'?enquireEls:[];},getElementById(id){return ids[id]||null;}};
 const loc={search:'?interest=play',href:'https://example.test/money-menu/launch/'};
 runInNewContext(match[1],{document:doc,location:loc,URLSearchParams,encodeURIComponent,navigator:{},matchMedia(){return {matches:true}}});
 assert.equal(filterEls[1]['aria-pressed'],'true');
 assert.equal(cardEls[0].hidden,false);
 assert.equal(cardEls[3].hidden,true);
 enquireEls[0]._listeners.click();
 assert.equal(ids.chosenOffer.value,'Fight Clash — Founders Collection');
 assert.equal(ids.customerNeed.focused,true);
 ids.compose._listeners.click();
 assert.ok(loc.href.startsWith('mailto:jayemmlyrikz@gmail.com?subject='));
 const qp=new URLSearchParams(loc.href.split('?')[1]);
 assert.match(qp.get('subject'),/Fight Clash/);
 assert.match(qp.get('body'),/Please tell me how I can trial/);
 assert.match(qp.get('body'),/not a contract/i);
 filterEls[3]._listeners.click();
 assert.equal(cardEls[4].hidden,false);
 assert.equal(cardEls[0].hidden,true);
});
console.log('\nJM Commercial Discovery 002: '+(failures.length?'FAIL '+failures.length:'PASS 10/10')+' checks');
if(failures.length)process.exitCode=1;
