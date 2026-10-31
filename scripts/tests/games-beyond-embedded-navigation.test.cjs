const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('games-beyond/app.js','utf8');
const code=source.slice(source.indexOf('function wireOriginalEmbeddedRooms('),source.indexOf('function runtimeLayer('));
const context=vm.createContext({TextDecoder,Uint8Array,atob});
vm.runInContext(code,context);
function fixture(rooms){
 const opened=[],nodes={viewerTitle:{textContent:''},roomFrame:{srcdoc:'old'},viewerWrap:{style:{}}};
 const doc={defaultView:{openRoom:id=>{opened.push(id);nodes.viewerTitle.textContent=id}},getElementById:id=>nodes[id]};
 const body={html:'const ROOMS = '+JSON.stringify(rooms)+';\nfunction b64ToUtf8'};
 const original=body.html;context.wireOriginalEmbeddedRooms(doc,body);
 return {doc,opened,nodes,body,original};
}
const room=(id,path,html)=>({id,path,html_b64:Buffer.from(html).toString('base64')});
const redirect=name=>`<script>location.href='${name}';</script>`;
test('six historical redirects resolve to the embedded original with no source mutation',()=>{
 const rooms=Array.from({length:6},(_,i)=>room('r'+i,'estate/'+i+'.html',redirect((i+1)+'.html')));
 rooms.push(room('r6','estate/6.html','<html>substantive original</html>'));
 const f=fixture(rooms);
 for(let i=0;i<6;i++){f.doc.defaultView.openRoom('r'+i);assert.equal(f.opened.at(-1),'r6');assert.match(f.nodes.viewerTitle.textContent,/redirects resolved locally/)}
 assert.equal(f.body.html,f.original);
});
test('substantive room opens through its original function',()=>{
 const f=fixture([room('live','a.html','<html>live</html>')]);f.doc.defaultView.openRoom('live');assert.deepEqual(f.opened,['live']);
});
for(const [name,rooms] of [
 ['missing',[room('a','x/a.html',redirect('missing.html'))]],
 ['cycle',[room('a','x/a.html',redirect('b.html')),room('b','x/b.html',redirect('a.html'))]],
 ['external',[room('a','x/a.html',redirect('https://elsewhere.invalid/b.html'))]],
 ['traversal',[room('a','x/a.html',redirect('../b.html'))]],
])test(name+' target fails closed without network navigation',()=>{
 const f=fixture(rooms);f.doc.defaultView.openRoom('a');assert.deepEqual(f.opened,[]);assert.match(f.nodes.viewerTitle.textContent,/Navigation HOLD/);assert.equal(f.nodes.roomFrame.srcdoc,'');assert.equal(f.body.html,f.original);
});
test('unknown room fails closed',()=>{const f=fixture([]);f.doc.defaultView.openRoom('absent');assert.deepEqual(f.opened,[]);assert.match(f.nodes.viewerTitle.textContent,/HOLD/)});
test('only exact original source openings activate host assistance',()=>{
 assert.match(source,/if\(!override&&await isOriginalJMStudios\(b\)\)notes.push\(wireOriginalEmbeddedRooms\(doc,b\)\)/);
});
