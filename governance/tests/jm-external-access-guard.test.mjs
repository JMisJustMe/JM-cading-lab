import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { CANONICAL, validateSourcePath, targetsFromEstateMap, sourceCheck, liveCheck, audit, verifyPublishedBytes } from '../jm-external-access-guard.mjs';

test('path traversal and fake paths never escape Estate root', () => {
  for (const s of ['../credentials','a/../b','/etc/passwd','a\\b', 'a//b','x?z']) assert.throws(() => validateSourcePath(s));
  assert.equal(validateSourcePath('games-beyond/'), 'games-beyond/index.html');
});

test('canonical six are selected plus registered Estate routes; no duplicate URLs', () => {
  const targets=targetsFromEstateMap({live_github_routes:[{path:'games-beyond/',body:'Games House'},{path:'demo/index.html',body:'Demo'}]});
  assert.equal(targets.filter(t=>t.tier==='canonical').length,6);
  assert.equal(targets.length,7);
  assert.equal(targets.at(-1).path,'demo/index.html');
  assert.equal(CANONICAL.length,6);
});

test('source check is based on real bytes and missing source is FAIL', async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-access-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  assert.equal((await sourceCheck(root,'body.html')).state,'FAIL');
  await writeFile(join(root,'body.html'),'<!doctype html>');
  assert.equal((await sourceCheck(root,'body.html')).state,'PASS');
});

test('live contact distinguishes healthy html from 404 and status-200 non-html', async()=>{
  const html=()=>new Response('<!doctype html><html><head><title>JM</title></head></html>',{status:200,headers:{'content-type':'text/html'}});
  assert.equal((await liveCheck('https://example.org',async()=>html())).state,'PASS');
  assert.equal((await liveCheck('https://example.org',async()=>new Response('gone',{status:404,headers:{'content-type':'text/html'}}))).state,'FAIL');
  assert.equal((await liveCheck('https://example.org',async()=>new Response('ok',{status:200,headers:{'content-type':'application/json'}}))).reason,'NON_HTML_RESPONSE');
});

test('source+HTTP PASS never crowns owner editing, writeback or device contact',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-access-test-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const c of CANONICAL){const p=join(root,c.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,'<!doctype html>');}
  const map={live_github_routes:[]};
  const result=await audit({root,map,online:true,fetcher:async()=>new Response('<!doctype html><html></html>',{status:200,headers:{'content-type':'text/html'}})});
  assert.equal(result.canonical_ready,true);
  assert.equal(result.whole_estate_externally_editable,'NOT_PROVEN');
  for(const x of result.results){assert.equal(x.in_app_writeback,'NOT_TESTED');assert.equal(x.persistent_reentry,'NOT_TESTED');assert.equal(x.owner_device_contact,'NOT_TESTED');}
});


test('a symlink beneath Estate root cannot smuggle an unrelated external file',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-access-link-'));
  const outside=await mkdtemp(join(tmpdir(),'jm-access-outside-'));
  t.after(async()=>{await rm(root,{recursive:true,force:true});await rm(outside,{recursive:true,force:true})});
  await writeFile(join(outside,'private.html'),'<!doctype html><html></html>');
  await symlink(join(outside,'private.html'),join(root,'link.html'));
  assert.deepEqual(await sourceCheck(root,'link.html'),{state:'FAIL',reason:'SYMLINK_ROOT_ESCAPE'});
});

test('a healthy looking HTML page on another origin cannot spoof the requested door',async()=>{
  const fakeResponse={ok:true,status:200,url:'https://unrelated.example/hello',headers:{get:()=> 'text/html'},body:{cancel:async()=>{}}};
  assert.equal((await liveCheck('https://jmisjustme-estate.pages.dev/',async()=>fakeResponse)).reason,'CROSS_ORIGIN_REDIRECT');
});

test('registered JSON is validated as JSON, never falsely judged as HTML',async()=>{
  const j=(value,media='application/json')=>new Response(value,{status:200,headers:{'content-type':media}});
  assert.equal((await liveCheck('https://example.org/contract.json',async()=>j('{"ok":true}'),'json')).state,'PASS');
  assert.equal((await liveCheck('https://example.org/contract.json',async()=>j('not json'),'json')).reason,'MALFORMED_JSON');
  assert.equal((await liveCheck('https://example.org/contract.json',async()=>j('<html></html>','text/html'),'json')).reason,'NON_JSON_RESPONSE');
  assert.equal((await liveCheck('https://example.org/contract.txt',async()=>j('{"ok":true}'),'unsupported')).state,'NOT_TESTED');
});

test('every registered source-to-live route has a separate fail-closed proof gate',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-access-json-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const c of CANONICAL){const p=join(root,c.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,'<!doctype html>');}
  const path='registry/estate-head-public-current.json';
  await mkdir(dirname(join(root,path)),{recursive:true});
  await writeFile(join(root,path),'{"schema":"JM.EstateHeadPublicCurrent/1.1"}');
  const map={live_github_routes:[{path,body:'JM Estate Head — Public Authority'}]};
  const fetcher=async url=>url.endsWith('.json')
    ? new Response('{"schema":"JM.EstateHeadPublicCurrent/1.1"}',{status:200,headers:{'content-type':'application/json'}})
    : new Response('<!doctype html><html></html>',{status:200,headers:{'content-type':'text/html'}});
  const ok=await audit({root,map,online:true,fetcher});
  assert.equal(ok.canonical_ready,true);
  assert.equal(ok.registered_ready,true);
  assert.equal(ok.source_live_failed_routes.length,0);
  assert.equal(ok.whole_estate_externally_editable,'NOT_PROVEN');
  const fail=await audit({root,map,online:true,fetcher:async url=>url.endsWith('.json')
    ? new Response('not json',{status:200,headers:{'content-type':'application/json'}})
    : fetcher(url)});
  assert.equal(fail.canonical_ready,true);
  assert.equal(fail.registered_ready,false);
  assert.equal(fail.source_live_failed_routes[0].reason,'MALFORMED_JSON');
});

test('CP06 exact deployed bytes prove parity for a registered source without claiming edit rights',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-byte-proof-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const path='sample/index.html',content='<!doctype html><html><body>JM exact original</body></html>';
  await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),content);
  const target={path,tier:'registered',url:'https://jmisjustme.github.io/JM-cading-lab/sample/index.html'};
  const response=txt=>new Response(txt,{headers:{'content-type':'text/html'}});
  const good=await verifyPublishedBytes(root,target,async()=>response(content));
  assert.equal(good.state,'PASS');assert.equal(good.reason,'EXACT_STATIC_PARITY');
  assert.equal(good.bytes_source,content.length);assert.equal(good.source_sha256,good.live_sha256);
  const bad=await verifyPublishedBytes(root,target,async()=>response(content+' obsolete'));
  assert.equal(bad.state,'FAIL');assert.equal(bad.reason,'SOURCE_DELIVERY_MISMATCH');
  assert.notEqual(bad.source_sha256,bad.live_sha256);
});

test('CP06 refuses parity claims for a different publishing carrier or unsupported body',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-byte-refusal-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const fetcher=async()=>{throw Error('Must not fetch unsupported carrier')};
  for(const target of [
    {path:'theory/index.html',tier:'canonical',url:'https://jmisjustme-estate.pages.dev/theory/'},
    {path:'secret/private.html',tier:'registered',url:'https://private.invalid/secret'},
    {path:'source/code.js',tier:'registered',url:'https://jmisjustme.github.io/JM-cading-lab/source/code.js'}
  ]) assert.deepEqual(await verifyPublishedBytes(root,target,fetcher),{state:'NOT_TESTED',reason:'NON_EXACT_PUBLIC_SOURCE_CARRIER'});
});

test('CP06 oversized bodies and redirect to unrelated domain cannot create false byte parity',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-byte-bounds-'));t.after(()=>rm(root,{recursive:true,force:true}));
  const path='demo/index.html';await mkdir(join(root,'demo'),{recursive:true});await writeFile(join(root,path),'0123456789');
  const target={path,tier:'registered',url:'https://jmisjustme.github.io/JM-cading-lab/demo/index.html'};
  assert.deepEqual(await verifyPublishedBytes(root,target,async()=>{throw Error('must not fetch')},4),{state:'HOLD',reason:'SOURCE_TOO_LARGE',bytes:10});
  const moved=await verifyPublishedBytes(root,target,async()=>({ok:true,status:200,url:'https://other.example/test',body:{cancel:async()=>{}},headers:{get:()=>null}}));
  assert.equal(moved.state,'FAIL');assert.equal(moved.reason,'CROSS_ORIGIN_REDIRECT');
});

test('CP06 audit separates available public route, byte parity and owner writeback',async t=>{
  const root=await mkdtemp(join(tmpdir(),'jm-byte-audit-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const c of CANONICAL){const p=join(root,c.path);await mkdir(dirname(p),{recursive:true});await writeFile(p,'<!doctype html><html>ok</html>');}
  const path='demo/index.html',body='<!doctype html><html>public</html>';
  await mkdir(dirname(join(root,path)),{recursive:true});await writeFile(join(root,path),body);
  const fetcher=async url=>new Response(url.includes('/demo/')?body:'<!doctype html><html>ok</html>',{headers:{'content-type':'text/html'}});
  const report=await audit({root,map:{live_github_routes:[{path}]},online:true,parity:true,fetcher});
  assert.equal(report.canonical_ready,true);
  assert.equal(report.registered_ready,true);
  assert.equal(report.exact_source_parity_pass,1);
  assert.deepEqual(report.source_delivery_mismatches,[]);
  const registered=report.results.find(x=>x.tier==='registered');
  assert.equal(registered.deployed_source_parity,'EXACT_STATIC_BYTES');
  assert.equal(registered.owner_editor_auth,'NOT_TESTED');
  assert.equal(registered.in_app_writeback,'NOT_TESTED');
  assert.equal(report.whole_estate_externally_editable,'NOT_PROVEN');
});
