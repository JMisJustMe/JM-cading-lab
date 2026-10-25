// CP15 donor contact. Execute exactly the frozen JM JourMaze v1.0 to produce
// sealed player-selectable tactic paths, then the Godot recipient executes
// typed consequences on its real battlefield. No JS interpreter on Android.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
const here=new URL('./',import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const originalSHA='56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db';
const donor=await readFile(new URL('./donors/JM_JourMaze.html',here));
assert.equal(sha(donor),originalSHA,'FROZEN_JOURMAZE_SOURCE_MISMATCH');
const script=donor.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(script,'FROZEN_JOURMAZE_EXECUTOR_MISSING');
const jm=runInNewContext(script[1]+'\n;JMJourMaze;',{}, {timeout:1200});
assert.equal(jm.selfTests().passed,5,'JOURMAZE_FOUNDING_SELFTEST_HOLD');
const parentSeal=await readFile(new URL('../codegornization-cp11/godot/KO11Seal.gd',here),'utf8');
const match=parentSeal.match(/const POLICY_SHA = "([a-f0-9]{64})"/);
assert.ok(match,'INHERITED_KO11_POLICY_SEAL_ABSENT');
const ko11SHA=match[1];

// Hand-authored game semantics are separate from original JourMaze algorithm.
// The original algorithm must actually select one distinct route per mode;
// options and score preferences are not probabilities or empirical gameplay data.
const graphs={
 GUARD:{
   start:'FIELD',goal:'GUARD_DONE',preference:'lowest_risk',
   edges:[
    {from:'FIELD',to:'BRACE',risk:0,cost:1,reversible:1},{from:'BRACE',to:'GUARD_DONE',risk:0,cost:1,reversible:1},
    {from:'FIELD',to:'HEAVY_WARD',risk:2,cost:1,reversible:1},{from:'HEAVY_WARD',to:'GUARD_DONE',risk:1,cost:1,reversible:1},
    {from:'FIELD',to:'DASHBOARD_ONLY',risk:9,loss:9,reversible:0}
   ],variants:{
     BRACE:{label:'BRACE',cost:8,shield_seconds:3,heal:0,stun_seconds:0,damage:0,requires:'GROUNDED_BLUE'},
     HEAVY_WARD:{label:'HEAVY WARD',cost:12,shield_seconds:5,heal:0,stun_seconds:0,damage:0,requires:'GROUNDED_BLUE'}
   }
 },
 RECOVER:{
   start:'FIELD',goal:'RECOVER_DONE',preference:'lowest_risk',
   edges:[
    {from:'FIELD',to:'RALLY',risk:0,cost:1,reversible:1},{from:'RALLY',to:'RECOVER_DONE',risk:0,cost:1,reversible:1},
    {from:'FIELD',to:'SURGE_HEAL',risk:2,cost:1,reversible:1},{from:'SURGE_HEAL',to:'RECOVER_DONE',risk:2,cost:1,reversible:1},
    {from:'FIELD',to:'DASHBOARD_ONLY',risk:9,loss:9,reversible:0}
   ],variants:{
     RALLY:{label:'RALLY',cost:9,shield_seconds:0,heal:12,stun_seconds:0,damage:0,requires:'WOUNDED_BLUE'},
     SURGE_HEAL:{label:'SURGE HEAL',cost:14,shield_seconds:0,heal:19,stun_seconds:0,damage:0,requires:'WOUNDED_BLUE'}
   }
 },
 INTERCEPT:{
   start:'FIELD',goal:'COUNTER_DONE',preference:'lowest_risk',
   edges:[
    {from:'FIELD',to:'TRAP',risk:0,cost:1,reversible:1},{from:'TRAP',to:'COUNTER_DONE',risk:0,cost:1,reversible:1},
    {from:'FIELD',to:'DIVE',risk:3,cost:1,reversible:1},{from:'DIVE',to:'COUNTER_DONE',risk:2,cost:1,reversible:1},
    {from:'FIELD',to:'DASHBOARD_ONLY',risk:9,loss:9,reversible:0}
   ],variants:{
     TRAP:{label:'TRAP',cost:10,shield_seconds:0,heal:0,stun_seconds:1.25,damage:4,requires:'NEAR_RED'},
     DIVE:{label:'DIVE',cost:17,shield_seconds:0,heal:0,stun_seconds:1.8,damage:5,requires:'NEAR_RED'}
   }
 }
};
const cards={};
for(const [action,g] of Object.entries(graphs)){
 const output=jm.jourmaze({...g,avoid:['DASHBOARD_ONLY'],require:[]});
 assert.equal(output.body,'JM JourMaze');
 assert.equal(output.routes.length,2,action+'_ALTERNATIVES_MISSING');
 assert.ok(output.bestRoute?.nodes?.length===3,action+'_BEST_ROUTE_MISSING');
 const mid=output.bestRoute.nodes[1];
 const spec=g.variants[mid];
 assert.ok(spec,action+'_ROUTE_NOT_MAPPED_TO_KNOWN_EFFECT');
 const direct=jm.jourmaze({...g,avoid:['DASHBOARD_ONLY',mid]});
 assert.equal(direct.routes.length,1,action+'_AVOID_NOT_EFFECTIVE');
 assert.notEqual(direct.bestRoute.nodes[1],mid,action+'_ROUTE_NOT_DIFFERENT');
 cards[action]={
  action,goal:g.goal,selectedPath:output.bestRoute.nodes,alternatePath:direct.bestRoute.nodes,
  label:spec.label,cost:spec.cost,shield_seconds:spec.shield_seconds,heal:spec.heal,
  stun_seconds:spec.stun_seconds,damage:spec.damage,requires:spec.requires,
  policy:'lowest_risk',scoreMeaning:'illustrative authored comparison, not observed success odds',
  sourceExecution:'JMJourMaze.jourmaze original v1.0'
 };
}
assert.deepEqual(Object.keys(cards),['GUARD','RECOVER','INTERCEPT']);
assert.equal(cards.GUARD.label,'BRACE');
assert.equal(cards.RECOVER.label,'RALLY');
assert.equal(cards.INTERCEPT.label,'TRAP');
const policy={schema:'jm.jourmaze-native-tactics/1',
 source:{originalJourMazeSHA256:originalSHA,originalSelfTests:5,
   KO11PolicySHA256:ko11SHA,historicalKOOriginal:false,
   executionBoundary:'original JourMaze runs in Node build; native Godot reads sealed selected paths, executes native effects'},
 identities:{donor:'JM JourMaze',recipient:'SLINGFALL',ko:'KOCODIFIER'},
 cards};
const payload=JSON.stringify(policy),digest=sha(Buffer.from(payload,'utf8'));
const envelope={schema:'jm.jourmaze-native-tactics.transport/1',payload,payloadSHA256:digest};
await mkdir(new URL('./packets/',here),{recursive:true});
await mkdir(new URL('./evidence/',here),{recursive:true});
await writeFile(new URL('./packets/tactics.json',here),JSON.stringify(envelope,null,2)+'\n');
await writeFile(new URL('./seal/CP15Seal.gd',here),
  'extends RefCounted\nconst PACKET_SHA = "'+digest+'"\nconst JOURMAZE_SHA = "'+originalSHA+'"\nconst KO11_POLICY_SHA = "'+ko11SHA+'"\n');
await writeFile(new URL('./evidence/jourmaze-native-options.json',here),
  JSON.stringify({schema:'jm.cp15.route-options/1',realOriginalExecuted:true,
    donorSha256:originalSHA,ko11Seal:ko11SHA,packetSHA256:digest,
    founderTests:jm.selfTests(),cards,
    caveat:'Live native eligibility is checked at button press; original JourMaze NOT embedded on Android.'},null,2));
console.log('CP15 ORIGINAL JOURMAZE TACTIC ROUTES PASS',JSON.stringify({donor:originalSHA,packet:digest,cards:Object.fromEntries(Object.entries(cards).map(([key,c])=>[key,c.label])),originalSelfTests:5}));
