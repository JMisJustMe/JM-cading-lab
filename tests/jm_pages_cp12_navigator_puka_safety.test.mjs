import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
// JM CP12 exact source fixtures: no live browser, device control or deployment.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const navSource=fs.readFileSync(path.join(root,'navigator/index.html'),'utf8');
const pukaSource=fs.readFileSync(path.join(root,'games-beyond/puka/puka-cards-v05.js'),'utf8');
function navigatorFixture(savedUrl) {
 const funcs=['normalizeInput','safeWebRoute','isInternal','activateTab','openRoute'].map(n=>{
  const matches=navSource.split(/\r?\n/).filter(x=>x.startsWith('function '+n+'('));
  assert.equal(matches.length,1,'original function '+n);
  return matches[0];
 });
 const calls=[],frame={src:'about:blank'},nav={activeTab:'home',tabs:[{id:'saved',url:savedUrl,title:'Saved',internal:true}]};
 const ctx={URL,location:{href:'https://jmisjustme-estate.pages.dev/navigator/',origin:'https://jmisjustme-estate.pages.dev'},nav,doors:[],
  $:s=>s==='#previewFrame'?frame:{},toast:s=>calls.push(['toast',s]),rememberTab:s=>calls.push(['remember',s]),
  persist:()=>calls.push(['persist']),renderTabs:()=>calls.push(['renderTabs']),showView:s=>calls.push(['view',s]),
  receipt:()=>calls.push(['receipt']),renderAll:()=>calls.push(['renderAll']),
  window:{open:(url,what,features)=>{calls.push(['external',url,features]);return true;}},uid:()=> 'fixture-tab',now:()=> '2026-11-18T00:00:00Z'};
 vm.runInNewContext(funcs.join('\n'),ctx,{filename:'navigator-extracted.js',timeout:2000});
 return {ctx,calls,frame,nav};
}
test('Navigator accepts same-origin web links but rejects script schemes',()=>{
 const x=navigatorFixture('/access/');
 assert.equal(vm.runInNewContext("safeWebRoute('/games-beyond/')",x.ctx),true);
 assert.equal(vm.runInNewContext("isInternal('/games-beyond/')",x.ctx),true);
 assert.equal(vm.runInNewContext("isInternal('https://example.invalid/')",x.ctx),false);
 assert.equal(vm.runInNewContext("safeWebRoute('javascript:alert(1)')",x.ctx),false);
});
test('Navigator blocks unsafe stored tabs without opening browser or iframe',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,<svg onload=alert(1)>','file:///etc/passwd','vbscript:msgbox(1)','blob:https://example.invalid/foo','jm://other']){
  const x=navigatorFixture(url);vm.runInNewContext("activateTab('saved')",x.ctx);
  assert.equal(x.nav.activeTab,'home',url);assert.equal(x.frame.src,'about:blank',url);
  assert.equal(x.calls.some(y=>y[0]==='external'),false,url);
  assert.equal(x.calls.some(y=>y[0]==='toast'),true,url);
 }
});
test('Navigator preserves legitimate internal and external saved routes',()=>{
 const a=navigatorFixture('https://jmisjustme-estate.pages.dev/access/');
 vm.runInNewContext("activateTab('saved')",a.ctx);
 assert.equal(a.frame.src,'https://jmisjustme-estate.pages.dev/access/');
 const b=navigatorFixture('https://example.invalid/info');b.nav.tabs[0].internal=false;
 vm.runInNewContext("activateTab('saved')",b.ctx);
 assert.equal(b.calls.filter(x=>x[0]==='external').length,1);
});
test('Navigator preserves bounded Stringline command',()=>{
 const x=navigatorFixture('jm://stringline');vm.runInNewContext("activateTab('saved')",x.ctx);
 assert.equal(x.calls.some(y=>y[0]==='view'&&y[1]==='stringline'),true);
});
function renderPuka(rank,symbol,meta){
 let trigger;const card={dataset:{},classList:{contains:()=>false},innerHTML:'',
 querySelector:s=>s==='b'?{childNodes:[{textContent:rank}],textContent:rank}:s==='.pip'?{textContent:symbol}:s==='small'?{textContent:meta}:null};
 const document={documentElement:{dataset:{}},querySelectorAll:s=>s==='.playing-card'?[card]:[],
 querySelector:s=>s==='.identity > span'?{textContent:'♥'}:null};
 const ctx={document,MutationObserver:class{constructor(fn){trigger=fn}observe(){}},addEventListener(){},requestAnimationFrame(){}};
 vm.runInNewContext(pukaSource,ctx,{filename:'puka-cards-v05.js',timeout:2000});
 trigger();return card;
}
test('PUKA preserves numeric and court art',()=>{
 const a=renderPuka('5','♥','Practice');assert.match(a.innerHTML,/pip-field/);assert.match(a.innerHTML,/♥/);
 const b=renderPuka('Q','♣','Royal');assert.match(b.innerHTML,/court-svg/);assert.match(b.innerHTML,/QUEEN/);
});
test('PUKA escapes injected markup in DOM-derived rank suit and metadata',()=>{
 const x=renderPuka('<img src=x onerror=alert(1)>','<svg onload=alert(2)>','<script>bad()</script>');
 assert.doesNotMatch(x.innerHTML,/<img\b|<svg onload\b|<script\b/);
 assert.match(x.innerHTML,/&lt;img/);assert.match(x.innerHTML,/&lt;svg/);assert.match(x.innerHTML,/&lt;script/);
});
test('PUKA escapes quotes and ampersands while preserving king card',()=>{
 const x=renderPuka('K','♠',"Owner's & Friends \"Cards\"");
 assert.match(x.innerHTML,/KING/);
 assert.match(x.innerHTML,/Owner&#39;s &amp; Friends &quot;Cards&quot;/);
});
