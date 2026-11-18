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
 const funcs=['normalizeInput','safeWebRoute','isInternal','titleFor','activateTab','openRoute'].map(n=>{
  const matches=navSource.split(/\r?\n/).filter(x=>x.startsWith('function '+n+'('));
  assert.equal(matches.length,1,'original function '+n);
  return matches[0];
 });
 const calls=[],frame={src:'about:blank'},note={children:[],set innerHTML(s){throw Error('Unsafe preview HTML '+s)},replaceChildren(...items){this.children=items}},document={createElement:tag=>({tagName:tag,textContent:''}),createTextNode:text=>({nodeType:3,textContent:text})},nav={activeTab:'home',tabs:[{id:'saved',url:savedUrl,title:'Saved',internal:true}],history:[],trail:[]};
 const ctx={URL,document,location:{href:'https://jmisjustme-estate.pages.dev/navigator/',origin:'https://jmisjustme-estate.pages.dev'},nav,doors:[],
  $:s=>s==='#previewFrame'?frame:s==='#previewNote'?note:{},toast:s=>calls.push(['toast',s]),rememberTab:s=>calls.push(['remember',s]),
  persist:()=>calls.push(['persist']),renderTabs:()=>calls.push(['renderTabs']),showView:s=>calls.push(['view',s]),
  receipt:()=>calls.push(['receipt']),renderAll:()=>calls.push(['renderAll']),
  window:{open:(url,what,features)=>{calls.push(['external',url,features]);return true;}},uid:()=> 'fixture-tab',now:()=> '2026-11-18T00:00:00Z'};
 vm.runInNewContext(funcs.join('\n'),ctx,{filename:'navigator-extracted.js',timeout:2000});
 return {ctx,calls,frame,nav,note};
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
test('Navigator internal preview uses text nodes for hostile route input and keeps code styling',()=>{
 const f=navigatorFixture('/access/');
 const url='https://jmisjustme-estate.pages.dev/games-beyond/?q=%3Csvg%20onload%3Dalert(1)%3E';
 vm.runInNewContext('openRoute('+JSON.stringify(url)+')',f.ctx);
 assert.equal(f.frame.src,url);
 assert.equal(f.note.children.length,2);
 assert.equal(f.note.children[0].nodeType,3);
 assert.equal(f.note.children[0].textContent,'Viewing an internal Estate route: ');
 assert.equal(f.note.children[1].tagName,'code');
 assert.equal(f.note.children[1].textContent,url);
 assert.equal(f.calls.some(x=>x[0]==='external'),false);
});
test('Navigator external URL remains external, not injected into a preview',()=>{
 const f=navigatorFixture('/access/');
 vm.runInNewContext("openRoute('https://example.invalid/route')",f.ctx);
 assert.equal(f.calls.some(x=>x[0]==='external'&&x[1]==='https://example.invalid/route'),true);
 assert.equal(f.note.children.length,0);
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

const estateSource=fs.readFileSync(path.join(root,'estate-app.js'),'utf8');
function estateVM(entries=[]) {
 const lines=estateSource.split(/\r?\n/);
 const helper=(prefix)=>{
  const found=lines.filter(x=>x.startsWith(prefix));
  assert.equal(found.length,1,prefix);return found[0];
 };
 const extract=(start,end)=>{
  const a=estateSource.indexOf(start),b=estateSource.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'extract source '+start);return estateSource.slice(a,b);
 };
 const nodes=new Map();
 const state={libraryQuery:'',mounted:[],favourites:new Set(),recent:[]};
 const ctx={URL,location:{href:'https://jmisjustme-estate.pages.dev/'},state,
  $:selector=>{if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:''});return nodes.get(selector)},
  $$:()=>[],getAllItems:()=>[],libraryEntries:()=>entries,normalise:s=>String(s||'').toLowerCase()};
 const declarations=[
  helper('const escapeHTML = value =>'),
  helper('const safePublicHref ='),
  extract('function renderLibrary(){','\nfunction renderCommand(){'),
  extract('function renderOwner(){','\nfunction miniItem('),
  helper('function miniItem(')
 ];
 vm.runInNewContext(declarations.join('\n'),ctx,{filename:'estate-app-recovered-functions.js',timeout:2500});
 return {ctx,nodes,state};
}
test('Estate public library rejects javascript URL and escapes metadata',()=>{
 const x=estateVM([{path:'javascript:alert(1)',title:'<bad>',meta:'hello',text:'sample'}]);
 vm.runInNewContext('renderLibrary()',x.ctx);
 const markup=x.nodes.get('#libraryResults').innerHTML;
 assert.match(markup,/href="#"/);
 assert.match(markup,/&lt;bad&gt;/);
 assert.doesNotMatch(markup,/href="javascript:/);
});
test('Estate public library preserves legitimate relative routes',()=>{
 const x=estateVM([{path:'./games-beyond/',title:'Games',meta:'JM',text:'route'}]);
 vm.runInNewContext('renderLibrary()',x.ctx);
 assert.match(x.nodes.get('#libraryResults').innerHTML,/href="\.\/games-beyond\/"/);
});
test('Estate Owner Room mounting escapes untrusted IDs and names',()=>{
 const x=estateVM();
 x.state.mounted=[{id:'q" onmouseover="alert(1)',name:'<img src=x>',bytes:256,at:'2026-11-18T00:00:00Z'}];
 vm.runInNewContext('renderOwner()',x.ctx);
 const html=x.nodes.get('#mountedShelf').innerHTML;
 assert.match(html,/data-preview-local="q&quot; onmouseover=&quot;alert\(1\)"/);
 assert.match(html,/&lt;img src=x&gt;/);
 assert.doesNotMatch(html,/data-preview-local="q" onmouseover=/);
});
test('Estate recent-route button IDs remain attribute-safe',()=>{
 const x=estateVM();
 const html=vm.runInNewContext("miniItem({name:'Recent',id:'x\\\" onclick=\\\"evil()'})",x.ctx);
 assert.match(html,/data-mini-open="x&quot; onclick=&quot;evil\(\)"/);
 assert.doesNotMatch(html,/data-mini-open="x" onclick=/);
});

const characterSource=fs.readFileSync(path.join(root,'games-beyond/puka/puka-character-v06.js'),'utf8');
function pukaCharacterMarkup(rank,symbol,suit){
 const start=characterSource.indexOf('  const safeText='),end=characterSource.indexOf('  function enrichHero(',start);
 assert.ok(start>=0&&end>start,'existing character markup source is recoverable');
 const code=characterSource.slice(start,end);
 const sandbox={};vm.runInNewContext(code,sandbox,{filename:'puka-original-character-v06.js',timeout:2000});
 return vm.runInNewContext('faceMarkup('+[rank,symbol,suit].map(x=>JSON.stringify(x)).join(',')+')',sandbox);
}
test('PUKA original character markup safely escapes hostile card symbol',()=>{
 const html=pukaCharacterMarkup('2','<img src=x onerror=alert(1)>','spades');
 assert.doesNotMatch(html,/<img\b/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(html,/&lt;img/);
});
test('PUKA original character artwork preserves suits and court glyphs',()=>{
 const html=pukaCharacterMarkup('Q','♠','hearts');
 assert.match(html,/spirit-hearts/);assert.match(html,/>Q</);
 assert.doesNotMatch(html,/spirit-undefined/);
});
test('PUKA original character suit cannot inject HTML attributes',()=>{
 const html=pukaCharacterMarkup('3','♥','spades" onclick="alert(1)');
 assert.match(html,/spirit-spades/);
 assert.doesNotMatch(html,/onclick=/);
});


function storageRenderingFixture(){
 const nodes=new Map();
 const element=tag=>({
  tagName:tag,className:'',id:'',dataset:{},textContent:'',value:'',children:[],
  set innerHTML(value){throw new Error('UNSAFE_RENDER_INNERHTML:'+String(value).slice(0,30))},
  append(...items){this.children.push(...items)},
  replaceChildren(...items){this.children=items},
  setAttribute(name,value){this[name]=String(value)}
 });
 const document={
  createElement:element,createTextNode:text=>({nodeType:3,textContent:text}),
  querySelectorAll:()=>[],
 };
 const $=id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)};
 const nav={activeTab:'tab-1',tabs:[{id:'tab-1',title:'<img src=x onerror=alert(1)>'}],
  history:[{id:'h1',title:'<svg onload=alert(2)>',url:'https://example.invalid/?q=<script>',at:'2026-11-18T00:00:00Z'}],
  bookmarks:[{id:'b1',title:'<iframe>',url:'https://example.invalid/?q=<script>'}]};
 const receipts=[{action:'OPEN_ROUTE',detail:'<script>bad()</script>',bodyId:'<svg>',at:'2026-11-18T00:00:00Z'}];
 const stringline={projects:[{id:'p1',name:'<img>',status:'STANDING',headChat:'<script>',headRecord:'Original',keeper:'<svg>',bodies:[{id:'body1',name:'<iframe>',type:'Game',role:'<img>',status:'SEED',route:'/games-beyond/'}]}],lifecycle:['SEED','PROVEN']};
 const keys=['domText','renderTabs','renderBookmarks','renderHistory','renderReceipts','renderStringline'];
 const source=navSource;
 const expressions=keys.map(name=>{
  const start=source.indexOf('function '+name+'(');assert.ok(start>=0,'function '+name);
  const next=source.indexOf('\nfunction ',start+10);
  const rest=next<0?source.slice(start):source.slice(start,next);
  return rest;
 });
 const ctx={URL,document,$,nav,receipts,stringline,
  uid:()=> 'new',now:()=> '2026-11-18T00:00:00Z',renderTabs(){},showView(){},rememberTab(){},persist(){},openRoute(){},activateTab(){},closeTab(){},addBookmark(){}};
 vm.runInNewContext(expressions.join('\n'),ctx,{filename:'navigator-original-safe-renderers.js',timeout:3000});
 return {ctx,nodes,nav,receipts,stringline};
}
function allText(node){
 if(!node)return'';
 return String(node.textContent??'')+(node.children||[]).map(allText).join('');
}
test('Navigator saved-data renderers use text-only DOM for hostile titles, routes and receipts',()=>{
 const {ctx,nodes}=storageRenderingFixture();
 for(const method of ['renderTabs','renderBookmarks','renderHistory','renderReceipts','renderStringline'])
  vm.runInNewContext(method+'()',ctx,{timeout:2000});
 assert.match(allText(nodes.get('#tabs')),/<img src=x onerror=alert\(1\)>/);
 assert.match(allText(nodes.get('#historyList')),/<svg onload=alert\(2\)>/);
 assert.match(allText(nodes.get('#receiptList')),/<script>bad\(\)<\/script>/);
 assert.match(allText(nodes.get('#stringGrid')),/<iframe>/);
 assert.equal(nodes.get('#bodyProject').children[0].value,'p1');
 assert.equal(nodes.get('#bodyStatus').children.length,2);
});
test('Navigator saved-data button handlers and element identities are retained',()=>{
 const {ctx,nodes}=storageRenderingFixture();
 vm.runInNewContext("renderTabs();renderBookmarks();renderHistory();renderStringline()",ctx);
 const tab=nodes.get('#tabs').children[0],close=tab.children[1],bookmark=nodes.get('#bookmarkList').children[0];
 assert.equal(tab.className,'tab active');assert.equal(tab.dataset.tab,'tab-1');
 assert.equal(close.dataset.close,'tab-1');assert.equal(bookmark.children[1].children[0].dataset.bookOpen,'b1');
 const project=nodes.get('#stringGrid').children[0];assert.equal(project.className,'card');
});
