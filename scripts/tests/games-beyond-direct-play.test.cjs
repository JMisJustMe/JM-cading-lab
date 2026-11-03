const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('games-beyond/app.js','utf8');
const route=source.slice(source.indexOf('async function openRequestedHouseBody(){'),source.indexOf('// CP09 owner-source contact:'));
assert.ok(route.startsWith('async function openRequestedHouseBody(){'),'original deep-link route must exist');
function scenario(query,body={id:'western-sniper',mounted:true,html:'<!doctype html><html></html>'}){
 const nodes={status:{textContent:'22 MOUNTED',dataset:{}},search:{value:''},bodyDialog:{open:false}};
 const events=[];
 const scope={URL,location:{href:'https://example.test/games-beyond/'+query},$:id=>nodes[id],
  view:(name)=>events.push('view:'+name),findBody:id=>id===body?.id?body:null,
  renderRooms:()=>events.push('render'),toast:(message,bad)=>events.push('toast:'+message),
  openBody:async id=>{events.push('open:'+id);nodes.bodyDialog.open=true;}};
 vm.runInNewContext(route+';globalThis.invoke=openRequestedHouseBody;',scope);
 return {run:()=>scope.invoke(),nodes,events};
}
test('mounted exact deep link calls existing openBody and marks dialog open',async()=>{
 const x=scenario('?jm-play=western-sniper');await x.run();
 assert.deepEqual(x.events,['view:rooms','open:western-sniper']);
 assert.equal(x.nodes.status.dataset.directPlay,'western-sniper');
 assert.match(x.nodes.status.textContent,/DIRECT PLAY OPEN/);
});
test('no deep link does not open a body',async()=>{
 const x=scenario('');await x.run();assert.deepEqual(x.events,[]);
});
test('unknown body is held, not invented',async()=>{
 const x=scenario('?jm-play=not-present');await x.run();
 assert.equal(x.events.some(v=>v.startsWith('open:')),false);
 assert.match(x.nodes.status.textContent,/PLAY HOLD/);
});
test('unmounted body is held',async()=>{
 const x=scenario('?jm-play=western-sniper',{id:'western-sniper',mounted:false,html:'<!doctype html>'});
 await x.run();assert.equal(x.events.some(v=>v.startsWith('open:')),false);
});
test('invalid identity is held',async()=>{
 const x=scenario('?jm-play=%3Cscript%3E');await x.run();
 assert.equal(x.events.some(v=>v.startsWith('open:')),false);
});
test('competing source editor request is held',async()=>{
 const x=scenario('?jm-play=western-sniper&jm-edit=western-sniper');await x.run();
 assert.equal(x.events.some(v=>v.startsWith('open:')),false);
});
test('host shows game dialog before inserting exact srcdoc',()=>{
 const opened=source.slice(source.indexOf('async function openBody('),source.indexOf('function closeBody('));
 assert.ok(opened.indexOf("if(!dialog.open)dialog.showModal()")>=0);
 assert.ok(opened.indexOf("if(!dialog.open)dialog.showModal()")<opened.indexOf("$('bodyFrame').srcdoc=override??b.html"));
 assert.match(opened,/runtimeLayer\(doc,b\)/);
 assert.match(opened,/await receipt\('BODY_OPENED_ACCESSIBLE_WRAPPER'/);
});

test('House dialog assigns dedicated flexible third row to the exact game iframe',()=>{
 const html=fs.readFileSync('games-beyond/index.html','utf8');
 assert.match(html,/\.bodyDialog\{[^}]*grid-template-rows:auto auto minmax\(0,1fr\)/);
 assert.match(html,/\.bodyFrame\{[^}]*min-height:0/);
});
