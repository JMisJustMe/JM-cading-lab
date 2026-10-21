import fs from 'node:fs';
import assert from 'node:assert/strict';
import {executeTheogamyContact,executeNativeContacts,sharedReentry,THEOGAMY_AUTHORITY} from './theogamy-contact.mjs';
const getJSON=name=>JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
const manifest=getJSON('./REGISTRY.json'),registry={...manifest,bodies:manifest.parts.flatMap(name=>getJSON('./'+name).bodies)};
const world={schema:'jm.meetpoint.world/0.1',mode:'ai',age:27,
 players:[{id:'P1',island:'B',x:550,y:83,goal:{x:11,y:3}}],
 islands:{A:{built:['shelter'],stock:{wood:7}},B:{built:['workshop','dock'],stock:{ore:6}},C:{built:[],stock:{}}},
 events:[]};
const prior=JSON.stringify(world);
const x=executeTheogamyContact({registry,objective:'game parser renderer visual touch compiler os recovery',world});
assert.equal(x.schema,'jm.theogamy.shared-contact/0.1');
assert.equal(x.adoption.passed,true);
assert.equal(x.adoption.proofs.length,3);
assert.equal(x.contact.parser.meaning,'contact.open');
assert.equal(x.contact.game.changed,true);
assert.equal(x.contact.rendererContact.consequenceReadable,true);
assert.equal(x.reentry.state.players[0].x,495);
assert.deepEqual(x.reentry.state.islands,world.islands);
assert.equal(x.reentry.state.mode,'ai');
assert.equal(JSON.stringify(world),prior);
assert(x.route.route.some(x=>x.id==='parser'));
assert(x.route.route.some(x=>x.id==='tracebox'));
assert.equal(x.gardles.native,'HOLD_SOURCE_NOT_MOUNTED');
assert.equal(x.gardles.substituted,false);
assert.equal(x.contact.rendererContact.gpu3D,'NOT_TESTED');
assert.equal(x.proof,'HOST_EXECUTION_ONLY');
assert.equal(THEOGAMY_AUTHORITY.source,'JM Shared Mechanisms v1.2 — All-Game Exchange Lab');
assert.throws(()=>sharedReentry({...world,schema:'wrong'}),/WORLD_SCHEMA/);
console.log(JSON.stringify({schema:'jm.theogamy.contact-test/0.1',checks:18,failures:0,
 outcome:'HOST_EXECUTION_ONLY',adoption:x.adoption.proofs.map(p=>p.name),gardles:x.gardles},null,2));
