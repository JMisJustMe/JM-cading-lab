import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { CANONICAL, validateSourcePath, targetsFromEstateMap, sourceCheck, liveCheck, audit } from '../jm-external-access-guard.mjs';

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
