// CP16: original sovereign JM JourMaze executes SIX route decisions; never port
// or rewrite its search kernel. CP15 safe contact retained, power paths additive.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const here=new URL('./',import.meta.url),sha=b=>createHash('sha256').update(b).digest('hex');
const frozen='56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db';
const donor=await readFile(new URL('../codegornization-cp15/donors/JM_JourMaze.html',here));
assert.equal(sha(donor),frozen,'FROZEN_JOURMAZE_DRIFT');
const raw=donor.toString().match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(raw);
const JMJourMaze=runInNewContext(raw[1]+'\n;JMJourMaze;',{}, {timeout:2000});
const originalTests=JMJourMaze.selfTests();
assert.equal(originalTests.passed,5);assert.equal(originalTests.total,5);
const cp15=JSON.parse(await readFile(new URL('../codegornization-cp15/packets/tactics.json',here)));
assert.equal(cp15.schema,'jm.jourmaze-native-tactics.transport/1');
const baseSHA=sha(Buffer.from(cp15.payload,'utf8'));
assert.equal(cp15.payloadSHA256,baseSHA,'CP15_BASE_PACKET_DRIFT');
const safe=JSON.parse(cp15.payload);
assert.equal(safe.source.originalJourMazeSHA256,frozen);
const effects={
 GUARD:{base:'BRACE',power:'HEAVY_WARD',goal:'GUARD_DONE',label:'HEAVY WARD',
   cost:12,shield_seconds:5,heal:0,stun_seconds:0,damage:0,requires:'GROUNDED_BLUE'},
 RECOVER:{base:'RALLY',power:'SURGE_HEAL',goal:'RECOVER_DONE',label:'SURGE HEAL',
   cost:14,shield_seconds:0,heal:19,stun_seconds:0,damage:0,requires:'WOUNDED_BLUE'},
 INTERCEPT:{base:'TRAP',power:'DIVE',goal:'COUNTER_DONE',label:'DIVE',
   cost:17,shield_seconds:0,heal:0,stun_seconds:1.8,damage:5,requires:'NEAR_RED'}
};
const cards={};
for(const [action,e] of Object.entries(effects)){
 const paths=[
  {from:'FIELD',to:e.base,cost:1,risk:0,reversible:1},
  {from:e.base,to:e.goal,cost:1,risk:0,reversible:1},
  {from:'FIELD',to:e.power,cost:1,risk:3,reversible:1},
  {from:e.power,to:e.goal,cost:1,risk:3,reversible:1},
  {from:'FIELD',to:'DEADEND',cost:1,risk:9,reversible:0}
 ];
 const common={start:'FIELD',goal:e.goal,edges:paths,preference:'lowest_risk',maxDepth:4,avoid:['DEADEND']};
 const found=JMJourMaze.jourmaze(common);
 const powerful=JMJourMaze.jourmaze({...common,avoid:['DEADEND',e.base]});
 assert.equal(found.routes.length,2,action+'_TWO_PATHS');
 assert.equal(found.bestRoute.nodes[1],e.base,action+'_SAFE_PRECEDENCE');
 assert.equal(powerful.routes.length,1,action+'_POWER_ROUTE');
 assert.equal(powerful.bestRoute.nodes[1],e.power,action+'_POWER_SELECTION');
 assert.equal(safe.cards[action].label.replace(' ','_'),e.base,'CP15_SAFE_VARIANT_DRIFT');
 cards[action]={action,label:e.label,cost:e.cost,shield_seconds:e.shield_seconds,
   heal:e.heal,stun_seconds:e.stun_seconds,damage:e.damage,requires:e.requires,
   goal:e.goal,selectedPath:powerful.bestRoute.nodes,safePath:found.bestRoute.nodes,
   preference:'lowest_risk + explicit safe-route avoidance',
   originalExecutor:'JMJourMaze.jourmaze v1.0'};
}
const policy={schema:'jm.cp16-route-power/1',originalJourMazeSHA256:frozen,
 inheritedCP15PacketSHA256:baseSHA,ko11PolicySHA256:safe.source.KO11PolicySHA256,
 identities:{routeDonor:'JM JourMaze',gameRecipient:'SLINGFALL',ko:'KOCODIFIER'},
 originalSelfTests:5,cards,
 scope:'original JS executes at build time; Godot executes sealed native effects on touch'};
const payload=JSON.stringify(policy),digest=sha(Buffer.from(payload,'utf8'));
await mkdir(new URL('packets/',here),{recursive:true});
await mkdir(new URL('seal/',here),{recursive:true});
await mkdir(new URL('evidence/',here),{recursive:true});
await writeFile(new URL('packets/cp16_power_routes.json',here),JSON.stringify({schema:'jm.cp16-route-power-transport/1',payload,payloadSHA256:digest},null,2)+'\n');
await writeFile(new URL('seal/CP16Seal.gd',here),'extends RefCounted\nconst PACKET_SHA = "'+digest+'"\nconst ORIGINAL_JOURMAZE_SHA = "'+frozen+'"\nconst CP15_PACKET_SHA = "'+baseSHA+'"\nconst KO11_POLICY_SHA = "'+safe.source.KO11PolicySHA256+'"\n');
await writeFile(new URL('evidence/cp16-donor-execution.json',here),JSON.stringify({schema:'jm.cp16-six-native-routes/1',originalSelfTests:originalTests,sha256:frozen,cp15SHA256:baseSHA,packetSHA256:digest,cards,originalExecuted:true,ownerDeviceNotTested:true},null,2)+'\n');
console.log('CP16 SIX ROUTES ORIGINAL JOURMAZE PASS',JSON.stringify({originalSelfTests:5,cards:Object.fromEntries(Object.entries(cards).map(([k,v])=>[k,v.label])),sha256:digest}));
