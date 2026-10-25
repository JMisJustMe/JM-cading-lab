// JM CP17 — actual original JudgeMaker/JangleMonitor/JourMaze on the six
// distinct Godot-native player tactics, 32 independent processes (192 returns).
// Each original runs in Node. NONE of these JS bodies runs inside Android.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {dirname} from 'node:path';
const here=new URL('./',import.meta.url);
const cp11=new URL('../codegornization-cp11/',here);
const evidence=new URL('godot/evidence/cp16-32/',cp11);
const digest=x=>createHash('sha256').update(x).digest('hex');
const originals=[
 {name:'JudgeMaker',variable:'JMJudgeMaker',file:new URL('../codegornization-cp12-converged/donors/JM_JudgeMaker.html',here),sha256:'f0dbce602b239e84c415350d16675127b27d771842b5cd12819432fee874dde6'},
 {name:'JangleMonitor',variable:'JMJangleMonitor',file:new URL('donors/JM_JangleMonitor.html',here),sha256:'cdb57ae2376e219f253b2f57382d11d4b378b305c408a6468d6757d2a9e88302'},
 {name:'JourMaze',variable:'JMJourMaze',file:new URL('donors/JM_JourMaze.html',here),sha256:'56c5ff4f76a222eb32d6b01d955ed0fe45d5389e5c14cba12f8e7618157545db'}
];
const organs={};
for(const p of originals){
 const bytes=await readFile(p.file);
 assert.equal(digest(bytes),p.sha256,'FOUNDING_DONOR_SOURCE_DRIFT_'+p.name);
 const s=bytes.toString('utf8').match(/<script>([\s\S]*?)<\/script>/i);
 assert.ok(s,'FOUNDING_EXECUTOR_MISSING_'+p.name);
 const actual=runInNewContext(s[1]+'\n;'+p.variable+';',{}, {timeout:2000});
 const tests=actual.selfTests();
 assert.equal(tests.total,5);assert.equal(tests.passed,5);
 organs[p.name]=actual;
}
const Judge=organs.JudgeMaker,Monitor=organs.JangleMonitor,Maze=organs.JourMaze;
const mode={GUARD:{false:{name:'BRACE',cost:8,shield:3},true:{name:'HEAVY WARD',cost:12,shield:5}},
 RECOVER:{false:{name:'RALLY',cost:9,heal:12},true:{name:'SURGE HEAL',cost:14,heal:19}},
 INTERCEPT:{false:{name:'TRAP',cost:10,stun:1.25,damage:4},true:{name:'DIVE',cost:17,stun:1.8,damage:5}}};
const shaJour=originals[2].sha256;
const native32=JSON.parse(await readFile(new URL('SUMMARY.json',evidence)));
assert.equal(native32.schema,'jm.cp16-32-real-native-runs/1');
assert.equal(native32.runs,32);
assert.equal(native32.routeActions,192);
assert.equal(native32.failedNativeChecks,0);
const checkpoint=[];
let qualifies=0,judgeRejected=0,identityBreaks=0,routeHolds=0;
function consequence(r,card,action){
 const before=r?.before?.targets,after=r?.after?.targets;
 if(!Array.isArray(before)||!Array.isArray(after)||!before.length||before.length!==after.length)return false;
 return before.every(b=>{
   const a=after.find(x=>x.id===b.id);if(!a)return false;
   if(action==='GUARD')return a.shield>b.shield && Math.abs((a.shield-b.shield)-card.shield)<0.0001 && a.hp===b.hp;
   if(action==='RECOVER')return a.hp>b.hp && a.hp-b.hp<=card.heal && a.shield===b.shield;
   if(action==='INTERCEPT')return a.hp===b.hp-card.damage && a.stun>=card.stun && a.stun>b.stun;
   return false;
 });
}
function candidate(r,card,action,power){
 const before=r?.before,after=r?.after;
 return {schema:r?.schema,jourSHA:r?.originalJourMazeSHA256,
   nativeAction:r?.selected,mode:power?'POWER':'SAFE',label:r?.variant,
   path:r?.selectedPath,engine:r?.engine,host:r?.host,
   packetSHA:r?.routePacketSHA256,koSHA:r?.ko11PolicySHA256,
   cost:r?.cost,spent:typeof before?.energy==='number'&&typeof after?.energy==='number'?
   +(before.energy-after.energy).toFixed(4):undefined,
   changed:consequence(r,card,action),
   targetCount:after?.targets?.length};
}
for(let index=0;index<32;index++){
 const file='run-'+String(index).padStart(2,'0')+'.json';
 const raw=await readFile(new URL(file,evidence));
 const d=JSON.parse(raw.toString('utf8'));
 assert.equal(d.schema,'jm.cp16-native-32-run/1');assert.equal(d.runIndex,index);
 assert.equal(d.failed,0);assert.equal(d.cases.length,6);
 const row={run:index,rawSHA256:digest(raw),nativePassed:d.passed,cases:[]};
 const set=new Set();
 for(const item of d.cases){
   const action=item.action;
   assert.ok(action in mode,'UNDECLARED_NATIVE_ACTION');
   const power=!!item.power,card=mode[action][String(power)];
   const key=action+(power?'_POWER':'_SAFE');
   assert.ok(!set.has(key),'DUPLICATED_GAMEPLAY_CONTACT');
   set.add(key);
   const r=item.receipt;
   const schema=power?'jm.cp16-power-native-return/1':'jm.jourmaze-player-native-return/1';
   assert.equal(r.schema,schema);
   assert.equal(r.selected,action);
   assert.equal(r.variant,card.name);
   assert.equal(r.cost,card.cost);
   assert.equal(r.originalJourMazeSHA256,shaJour);
   assert.equal(r.before.energy-r.after.energy,card.cost);
   assert.equal(r.host,'Linux');
   assert.ok(r.engine.startsWith('4.5.'));
   assert.ok(Array.isArray(r.selectedPath)&&r.selectedPath.length===3);
   assert.ok(consequence(r,card,action),'NATIVE_CONSEQUENCE_HOLD_'+key);
   const input=candidate(r,card,action,power);
   const contract={name:'original JudgeMaker actual native '+key,threshold:1,criteria:[
      {path:'schema',op:'equals',value:schema,required:true},
      {path:'jourSHA',op:'equals',value:shaJour,required:true},
      {path:'nativeAction',op:'equals',value:action,required:true},
      {path:'mode',op:'equals',value:power?'POWER':'SAFE',required:true},
      {path:'label',op:'equals',value:card.name,required:true},
      {path:'cost',op:'equals',value:card.cost,required:true},
      {path:'spent',op:'equals',value:card.cost,required:true},
      {path:'changed',op:'equals',value:true,required:true},
      {path:'targetCount',op:'gte',value:1,required:true},
      {path:'engine',op:'truthy',required:true},
      {path:'host',op:'equals',value:'Linux',required:true},
      {path:'packetSHA',op:'truthy',required:true},
      {path:'koSHA',op:'truthy',required:true}
    ]};
    assert.equal(Judge.metaJudge(contract).verdict,'QUALIFIED');
    const verdict=Judge.judge(input,contract);
    assert.equal(verdict.verdict,'QUALIFIED','FOUNDING_JUDGE_HOLD_'+key);
    qualifies++;
    for(const mutated of [
      {...input,jourSHA:'0'.repeat(64)},
      {...input,spent:0},
      {...input,changed:false},
      {...input,packetSHA:undefined}
    ]) {
      const v=Judge.judge(mutated,contract);
      assert.notEqual(v.verdict,'QUALIFIED','FALSE_JUDGE_CROWN_'+key);
      judgeRejected++;
    }
    // Original JangleMonitor tests invariants rather than re-adjudicating truth.
    const state={sourceSHA:r.originalJourMazeSHA256,
      koSHA:r.ko11PolicySHA256,packetSHA:r.routePacketSHA256,
      identity:'JM JourMaze -> SLINGFALL',action,variant:card.name,
      mutable:{energy:r.before.energy,targets:r.before.targets.length}};
    const invariants=[
      {path:'sourceSHA',mode:'equalsOriginal',hard:true},
      {path:'koSHA',mode:'equalsOriginal',hard:true},
      {path:'packetSHA',mode:'equalsOriginal',hard:true},
      {path:'identity',mode:'equalsOriginal',hard:true},
      {path:'action',mode:'equalsOriginal',hard:true},
      {path:'variant',mode:'equalsOriginal',hard:true},
      {path:'mutable.energy',mode:'equalsOriginal',hard:false}
    ];
    const lawful=Monitor.monitor(state,{invariants,disturbances:[
      {op:'set',path:'mutable.energy',value:r.after.energy}]});
    assert.equal(lawful.identitySurvived,true);
    assert.equal(lawful.breakpoint,null);
    assert.equal(lawful.softBoundary,1);
    const forged=Monitor.monitor(state,{invariants,disturbances:[
      {op:'set',path:'packetSHA',value:'0'.repeat(64)}]});
    assert.equal(forged.breakpoint,1);
    assert.equal(forged.identitySurvived,false);
    identityBreaks++;
    // Original JourMaze computes a real-to-provenance custody route;
    // edges are policy choices, not actual service transfers.
    const gate='VERIFIED_'+card.name.replace(/\s/g,'_');
    const graph={start:'NATIVE_RETURN',goal:'CUSTODY',preference:'minimum_loss',
      require:[gate],avoid:['UNVERIFIED'],
      edges:[
        {from:'NATIVE_RETURN',to:'JUDGE',cost:1,loss:0,reversible:1},
        {from:'JUDGE',to:'JANGLE',cost:1,loss:0,reversible:1},
        {from:'JANGLE',to:gate,cost:1,loss:0,reversible:1},
        {from:gate,to:'TRACE',cost:1,loss:0,reversible:1},
        {from:'TRACE',to:'CUSTODY',cost:1,loss:0,reversible:1},
        {from:'JANGLE',to:'UNVERIFIED',cost:1,loss:8,reversible:0},
        {from:'UNVERIFIED',to:'CUSTODY',cost:1,loss:8,reversible:0},
        {from:'JANGLE',to:'NATIVE_RETURN',cost:1,loss:0,reversible:1}
      ]};
    const route=Maze.jourmaze(graph);
    assert.ok(route.bestRoute);
    assert.ok(route.bestRoute.nodes.includes(gate));
    assert.equal(route.bestRoute.nodes.at(-1),'CUSTODY');
    assert.ok(route.cycles.length>0);
    const forbidden=Maze.jourmaze({...graph,avoid:[gate,'UNVERIFIED']});
    assert.equal(forbidden.bestRoute,null);
    routeHolds++;
    row.cases.push({action,variant:card.name,power,nativeReceiptSHA256:digest(JSON.stringify(r)),
      verdict:verdict.verdict,identitySurvived:lawful.identitySurvived,
      tamperBreakpoint:forged.breakpoint,route:route.bestRoute.nodes,
      sourceCaseHolds:4,returnState:'CI_QUALIFIED_NATIVE_GODOT_NOT_OWNER_FOLD'});
 }
 assert.equal(set.size,6);
 checkpoint.push(row);
 console.log('CP17 six native effects + three originals '+String(index+1).padStart(2,'0')+'/32 PASS');
}
assert.equal(qualifies,192);assert.equal(judgeRejected,768);
assert.equal(identityBreaks,192);assert.equal(routeHolds,192);
const proof={schema:'jm.cp17.original-triad-six-native-32/1',
 conclusion:'CI_32_NATIVE_PROCESSES_192_EFFECTS_3_ORIGINAL_EXECUTORS',
 ancestors:{cp16:'1e9a0a211fd2f3f8adac3ab3542e41d6d7004b9d',
   cp13:'cd4ced0307bd54eddffd17597c682a718a7ae7c3'},
 sources:originals.map(p=>({name:p.name,sha256:p.sha256,originalSelfTests:'5/5'})),
 execution:{actualNativeProcesses:32,nativeConsequences:192,
   originalJudgeQualified:qualifies,originalJudgeHolds:judgeRejected,
   originalJangleBreakpoints:identityBreaks,originalJourMazeBlocked:routeHolds},
 caveats:{onDeviceOriginalExecutors:'NOT RUNNING IN GODOT OR ANDROID',
   physicalOwnerFold:'NOT TESTED',senderAuthentication:'NOT ESTABLISHED',
   publicEstateUpdate:'NOT DEPLOYED',production:'NOT MERGED'},
 receipts:checkpoint};
const output=new URL('evidence/CP17_SIX_TACTIC_TRIAD_32_NATIVE_QUALIFICATION.json',here);
await mkdir(dirname(fileURLToPath(output)),{recursive:true});
await writeFile(output,JSON.stringify(proof,null,2)+'\n');
console.log('JM CP17 ORIGINAL THREE BODIES × 32 REAL GODOT RUNS × 6 EFFECTS PASS',JSON.stringify(proof.execution));
