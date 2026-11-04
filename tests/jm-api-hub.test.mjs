import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.cwd();
const html=fs.readFileSync(path.join(root,'api-hub/index.html'),'utf8');
const rootHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const access=fs.readFileSync(path.join(root,'access/index.html'),'utf8');
const workflow=fs.readFileSync(path.join(root,'.github/workflows/deploy-estate-sovereign-integrated-v1.yml'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'API House must contain a self-sufficient script');
const fakeDocument=()=>{const elements=new Map();return {getElementById(id){
 if(!elements.has(id))elements.set(id,{id,innerHTML:'',value:'',style:{},addEventListener(){}});
 return elements.get(id);
},title:''};};
const boot=(query='')=>{
 const document=fakeDocument(),location={search:query},ctx={document,location,URLSearchParams,encodeURIComponent};
 vm.createContext(ctx);vm.runInContext(script,ctx,{filename:'api-hub/index.html',timeout:1000});
 return {ctx,document};
};
const {ctx,document}=boot();
const records=vm.runInContext('items.map(x=>({...x}))',ctx);
const checks=[];
function test(name,run){run();checks.push(name);console.log('PASS',name);}
test('22 independent known-body doors',()=>assert.equal(records.length,22));
test('independent IDs are unique',()=>assert.equal(new Set(records.map(x=>x.id)).size,records.length));
test('every body has name, type, role, guide and authorization scope',()=>{
 for(const x of records)assert(x.name&&x.type&&x.role&&x.scope&&x.guide,x.id);
});
test('all external opening routes are HTTPS or deliberately null',()=>{
 for(const x of records){if(x.open)assert.match(x.open,/^https:\/\//);if(x.source)assert.match(x.source,/^https:\/\//);if(x.protocol)assert.match(x.protocol,/^https:\/\//);}
});
test('no unverified phone endpoint exposed',()=>{
 const phone=records.find(x=>x.id==='phone-commander');assert.equal(phone.group,'local');assert.equal(phone.open,null);assert.equal(phone.source.includes('jm_phone_commander.py'),true);
});
test('private TIWIN live URLs not published',()=>{
 assert(!html.includes('tiwin-private-stage-cp09.onrender.com'));
 assert(!html.includes('tiwin-private-s2-contact.onrender.com'));
});
test('no stored credentials, tokens, auth cookies or state persistence',()=>{
 assert(!html.includes('localStorage'));assert(!html.includes('sessionStorage'));
 assert(!html.includes('fetch('));assert(!html.includes('Authorization: Bearer'));
 assert(!html.includes('X-JM-Owner-Key:'));
});
test('all body anchors deep-link to independent URL',()=>{
 for(const x of records){const {document}=boot('?api='+encodeURIComponent(x.id));const markup=document.getElementById('detail').innerHTML;assert(markup.includes(x.name));assert(markup.includes('?api='+x.id));}
});
test('unknown body query retains index, not a false service',()=>{
 const {document}=boot('?api=__DOES_NOT_EXIST__');assert.equal(document.getElementById('overview').style.display,undefined);
});
test('index lists each body and renders direct links',()=>{
 const mark=document.getElementById('cards').innerHTML;
 for(const x of records)assert(mark.includes('?api='+x.id),x.id);
});
test('client filter retains public set and hides private categories',()=>{
 document.getElementById('filter').value='public';
 vm.runInContext('list()',ctx);
 const markup=document.getElementById('cards').innerHTML;
 assert(markup.includes('JM ECOSTATE Build Mesh'));assert(!markup.includes('JM Phone Commander'));
});
test('client text search is case-insensitive',()=>{
 document.getElementById('filter').value='all';
 document.getElementById('search').value='aIlAtHeO';
 vm.runInContext('list()',ctx);
 assert(document.getElementById('cards').innerHTML.includes('AILatheo'));
 assert(!document.getElementById('cards').innerHTML.includes('Phone Commander'));
});
test('canonical Estate top door links to API House',()=>assert(rootHtml.includes('href="./api-hub/"')));
test('existing Access Mesh links to API House',()=>assert(access.includes('href="../api-hub/"')));
test('existing provider-independent GitHub assembly copies and checks the hub',()=>{
 assert(workflow.includes('for dir in access api-hub apps'));
 assert(workflow.includes('test -s cloudflare-estate/api-hub/index.html'));
 assert(workflow.includes('"/api-hub/**"')||workflow.includes('"api-hub/**"'));
});
test('Estate original hosting and owner APIs remain separately referenced',()=>{
 assert(records.some(x=>x.id==='owner-vault'&&x.open.includes('mode=status')));
 assert(records.some(x=>x.id==='ailatheo'&&x.open.includes('action=status')));
 assert(records.some(x=>x.id==='cloud-contact'&&x.open.includes('/ready')));
});
console.log('JM API House: '+checks.length+'/'+checks.length+' PASS');
