import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { test } from 'node:test';

const theory=fs.readFileSync('theory/owner-register-97.js','utf8');
const theoryPage=fs.readFileSync('theory/index.html','utf8');
const theoryReader=fs.readFileSync('theory/owner-register-97-reader.html','utf8');
const gameHome=fs.readFileSync('games-beyond/index.html','utf8');
const gameCatalog=fs.readFileSync('games-beyond/all-games.html','utf8');
const gameApp=fs.readFileSync('games-beyond/app.js','utf8');
const appHome=fs.readFileSync('apps/index.html','utf8');
const bookHome=fs.readFileSync('books/index.html','utf8');

class Element {
  constructor(tag='div'){this.tag=tag;this.textContent='';this.value='';this.disabled=false;this.children=[];this.events={};this.files=[];}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  addEventListener(name,fn){this.events[name]=fn;}
}
function fixture(overrides={}) {
  const rows=Array.from({length:97},(_,n)=>({
    id:'JM-THE-'+String(n+1).padStart(3,'0'),
    name:'Synthetic theory '+(n+1),
    family:n%2===0?'Synthetic Family A':'Synthetic Family B',
    type:'Test only',
    keeper:'Fixture, not an original theory manuscript',
    original_source_contact:n<58?'RETRIEVAL_INDEX_SOURCE_CARD':'REGISTER_OR_SHELF_SOURCE_ONLY',
    source_card_anomaly:n===4?'INCORRECT_MATCH_HOLD':null
  }));
  return {schema:'JM.H02.Theory97.OwnerCustody/1.0',entries:rows,...overrides};
}
function boot(){
  const ids=['jmOwnerTheory97File','jmOwnerTheory97Search','jmOwnerTheory97Clear',
    'jmOwnerTheory97Status','jmOwnerTheory97Rows','jmOwnerTheory97BookDoor'];
  const elements=new Map(ids.map(id=>[id,new Element()]));
  const document={getElementById:id=>elements.get(id),createElement:tag=>new Element(tag)};
  vm.runInNewContext(theory,{document},{timeout:500});
  const [picker,search,clear,status,list,bookDoor]=ids.map(id=>elements.get(id));
  return {picker,search,clear,status,list,bookDoor};
}
async function choose(u,obj){
  u.picker.files=[{size:120000,text:async()=>JSON.stringify(obj)}];
  await u.picker.events.change();
}

test('H02 original Theory home contains only local owner-controlled import; no source upload',()=>{
  assert.match(theoryPage,/sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"/);
  assert.doesNotMatch(theoryPage,/sandbox="[^"]*allow-same-origin/);
  assert.doesNotMatch(theoryPage,/script src="\.\/owner-register-97\.js/);
  assert.match(theoryReader,/id="jmOwnerTheory97File"/);
  assert.match(theoryReader,/<script>/);
  assert.doesNotMatch(theoryReader,/<script[^>]*src=/);
  const liveReaderScript=theoryReader.match(/<script>([\s\S]*?)<\/script>/)?.[1]?.trim();
  assert.equal(liveReaderScript,theory.trim(),"The offline reader must inherit the exact same script donor");
  assert.match(theoryReader,/script-src 'unsafe-inline'/);
  assert.match(theoryReader,/connect-src 'none'/);
  assert.match(theoryReader,/default-src 'none'/);
  assert.match(theoryPage,/47 original-source seats and four remaining holds/);
  assert.doesNotMatch(theory,/\bfetch\s*\(|XMLHttpRequest|localStorage|indexedDB|sendBeacon|WebSocket|eval\s*\(/);
});

test('H02 owner-import renders all 97 entries and 58/39 grade accurately',async()=>{
  const u=boot();await choose(u,fixture());
  assert.equal(u.list.children.length,97);
  assert.match(u.status.textContent,/97 of 97 theory identities shown/);
  assert.match(u.status.textContent,/58 source cards \/ 39 register-shelf/);
  assert.equal(u.search.disabled,false);
  assert.match(u.list.children[4].children[1].textContent,/SOURCE MATCH HOLD/);
});

test('H02 owner-only exact archived candidates and strict book link require trusted Drive URLs',async()=>{
  const x=fixture();
  x.authority={strict51_private_body_reading:{owner_google_drive_url:'https://drive.google.com/file/d/1zDFonGjiDnvVX7A3PXlxvJp1zq8gQPXX/view'}};
  x.entries[0].cp12_archived_candidates={files:[
    {filename:'exact-source-candidate.pdf',owner_drive:'https://drive.google.com/file/d/1qhE_Fo2yCx8-Qnc4Xcd4aSvaVQmu1CfB/view'},
    {filename:'rejected-source.pdf',owner_drive:'javascript:alert(1)'},
    {filename:'untrusted-web.pdf',owner_drive:'https://example.org/file/d/123/view'}
  ]};
  const u=boot();await choose(u,x);
  const links=u.list.children[0].children.filter(y=>y.tag==='a');
  assert.equal(links.length,1);
  assert.match(links[0].href,/^https:\/\/drive\.google\.com\/file\/d\//);
  assert.equal(links[0].target,'_blank');
  assert.equal(links[0].rel,'noopener noreferrer');
  assert.equal(u.bookDoor.children.length,1);
  assert.match(u.bookDoor.children[0].href,/^https:\/\/drive\.google\.com\/file\/d\//);
  u.clear.events.click();
  assert.equal(u.bookDoor.children.length,0);
  assert.equal(u.list.children.length,0);
});

test('H02 filtering works and clear abandons local in-memory register',async()=>{
  const u=boot();await choose(u,fixture());
  u.search.value='Synthetic theory 97';u.search.events.input();
  assert.equal(u.list.children.length,1);
  u.clear.events.click();
  assert.equal(u.list.children.length,0);
  assert.equal(u.search.disabled,true);
});

test('H02 invalid identity, duplicate ID and incomplete 96-row set must HOLD',async()=>{
  for(const bad of [
    fixture({entries:fixture().entries.slice(0,96)}),
    fixture({entries:fixture().entries.map((x,i)=>i===96?{...x,id:'JM-THE-001'}:x)}),
    fixture({entries:fixture().entries.map((x,i)=>i===96?{...x,name:''}:x)})
  ]){
    const u=boot();await choose(u,bad);
    assert.equal(u.list.children.length,0);
    assert.match(u.status.textContent,/HOLD/);
  }
});

test('H04 catalogue has 143-source access and reuses real original House importer',()=>{
  assert.match(gameCatalog,/143-record total/);
  assert.match(gameCatalog,/jm-room=proof#view-proof/);
  assert.match(gameHome,/IMPORT ORIGINAL GAME HTML · LOCAL/);
  assert.match(gameHome,/jm-room=proof#view-proof/);
  assert.match(gameHome,/id="importHtml"/);
  assert.match(gameApp,/async function importOriginalHtml\(file\)/);
  assert.match(gameApp,/await importHouse\(\{text:async\(\)=>JSON\.stringify\(\{bodies:\[item\]\}\)\}\)/);
  assert.match(gameApp,/view\(p\.get\('jm-room'\)==='proof'/);
  assert.match(gameApp,/Protected JM Studios bodies require the original verified-pair import/);
});

test('H05 and books retain their existing independent seats rather than count inflation',()=>{
  assert.match(appHome,/45<\/b><span>registered non-game rooms/);
  assert.match(appHome,/29<\/b><span>full \+ preserved bodies/);
  assert.match(appHome,/id="jmCorrectHouseCrosslinks"/);
  assert.match(appHome,/\.\.\/theory\/#jmOwnerTheory97/);
  assert.match(appHome,/\.\.\/games-beyond\/all-games\.html/);
  assert.match(appHome,/\.\.\/books\//);
  assert.match(appHome,/\.\.\/visual-story\//);
  assert.match(bookHome,/56<\/b><small>primary Book \/ Written bodies/);
  assert.match(bookHome,/98<\/b><small>Liebury \/ Bookcase routes/);
});

test('H04 exact public T-Boys Estate Clash v0.2.3 player reuses its original 56,072-byte donor, never crowns v0.2.4',()=>{
  const bytes=fs.readFileSync('games-beyond/bodies/tboys-estate-clash-v0-2-3-original.html');
  assert.equal(bytes.length,56072);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),'52263e0e63a25b3ba394faeff0c1b525a9a3a68d7a62290a9c2baca75b755608');
  assert.match(gameCatalog,/T-Boys: Estate Clash/);
  assert.match(gameCatalog,/bodies\/tboys-estate-clash-v0-2-3-original\.html/);
  assert.match(gameCatalog,/Later v0\.2\.4 dossier\/source remains separate and not verified by this player/);
  assert.match(bytes.toString('utf8'),/<button id="startBtn">ENTER THE FIGHT<\/button>/);
});
