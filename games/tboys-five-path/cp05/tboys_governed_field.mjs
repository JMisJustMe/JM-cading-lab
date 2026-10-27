// JM T-BOYS CP05: governed field contact through three distinct sovereign JM implementations.
// Exact existing language-native.mjs and game-native.mjs imported unchanged; never simulate their result.
import assert from 'node:assert/strict';
import { JMLogic, JM32 } from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime } from '../../../coding-estate/sovereign-ten/direct/game-native.mjs';

export const LOGIC_SOURCE = `
rule ChargeReady {
 when tboysField.focus >= 2
 then tboysField.ready = true
 recover {
  tboysField.ready = false
 }
}
`;
export const POLICY_SOURCE = `
policy CaptureAdmission {
 clause CaptureReady {
  when tboysField.ready == true and tboysField.near == true
  oblige tboysField.allowed = true
 }
 clause HoldFar {
  when tboysField.near != true
  oblige tboysField.allowed = false
 }
 clause HoldUnready {
  when tboysField.ready != true
  oblige tboysField.allowed = false
 }
}
`;
export const GAME_SOURCE = `
entity TboysField {
 holder = "NEUTRAL"
 guard = 0
 ready = false
 allowed = false
 near = false
 focus = 0
}
mechanic ClaimZone {
 requires tboysField.allowed == true
 effect tboysField.holder = "JM_CREW"
}
mechanic RaiseGuard {
 requires tboysField.holder == "JM_CREW"
 effect tboysField.guard = 18
}
collision Contact {
 when tboysField.near == true
 then trigger ClaimZone
}
combo ChargeAndCapture {
 steps = [ClaimZone, RaiseGuard]
}
`;
export const CORE_SOURCE = `
organ ContactOrgan {
 handles = [TboysField]
 rules = [ClaimZone, RaiseGuard]
 invariants = {
  tboysField.guard >= 0
 }
}
system TboysGovernedField {
 organs = [ContactOrgan]
 events = [Contact]
 identity = "TBOYS.CoreClash.CP05.GovernedField"
}
`;
export function nativeFieldContact(near, focus) {
 const initial={tboysField:{holder:'NEUTRAL',guard:0,ready:false,allowed:false,near:!!near,focus:Math.max(0,Math.min(3,Number(focus)||0))}};
 const l=JMLogic.execute(LOGIC_SOURCE, initial);
 const p=JM32.execute(POLICY_SOURCE,l.runtime.state);
 const g=new GameCodingRuntime(GameCoding.parse(GAME_SOURCE),p.runtime.state);
 const core=new JMGameCoreRuntime(JMGameCore.parse(CORE_SOURCE),g);
 const dispatched=core.dispatch('TboysGovernedField','Contact');
 return { holder:g.state.tboysField.holder,guard:g.state.tboysField.guard,allowed:g.state.tboysField.allowed,ready:g.state.tboysField.ready,near:!!near,focus:initial.tboysField.focus,
 receipts:{logic:l.runtime.receipt,policy:p.runtime.receipt,game:g.result().receipt,core:dispatched.receipt},
 decisions:{logic:l.runtime.decisions.map(d=>d.matched),policy:p.runtime.decisions.map(d=>d.clauseName),mechanics:dispatched.executions.map(x=>x.applied)},
 paths:{logic:l.ir.graphs.length,policy:p.ir.graphs.length,game:GameCoding.lower(g.program).mechanicNodes.length,core:JMGameCore.lower(core.program).organNodes.length}};
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replaceAll('\\','/'))) {
 let checks=0,trace=[];
 const expect=(value,label)=>{assert.ok(value,label);checks++};
 for(const near of [false,true])for(const focus of [0,1,2,3]){
   const r=nativeFieldContact(near,focus),earned=near&&focus>=2;
   expect(r.allowed===earned,'policy admission');
   expect(r.ready===(focus>=2),'logic ready');
   expect(r.guard===(earned?18:0),'native guard');
   expect(r.holder===(earned?'JM_CREW':'NEUTRAL'),'native territory');
   expect(r.decisions.mechanics[0]===earned && r.decisions.mechanics[1]===earned,'mechanic execution');
   expect(r.receipts.logic.traceDigest.length===16&&r.receipts.policy.traceDigest.length===16,'native receipts');
   trace.push({near,focus,earned,result:r});
 }
 for(let i=0;i<64;i++){const near=i%3!==0,focus=i%4,a=nativeFieldContact(near,focus),b=nativeFieldContact(near,focus);
 expect(JSON.stringify(a)===JSON.stringify(b),'stable native reexecution');}
 expect(GameCoding.lower(GameCoding.parse(GAME_SOURCE)).mechanicNodes.length===2,'Game-CODING source IR');
 expect(JMLogic.lower(JMLogic.parse(LOGIC_SOURCE)).graphs.length===1,'JMLogic source IR');
 expect(JM32.lower(JM32.parse(POLICY_SOURCE)).graphs.length===1,'JM32 source IR');
 expect(JMGameCore.lower(JMGameCore.parse(CORE_SOURCE)).organNodes.length===1,'GameCore source IR');
 const invalid=nativeFieldContact(true,1);expect(!invalid.allowed&&invalid.guard===0,'denied no guard');
 console.log(JSON.stringify({schema:'jm.tboys.cp05.multi-sovereign-native/1',checks,failed:0,branches:8,seed_replay_pairs:64,source:'DIRECT imports of 3 canonical JM executable files; four sovereign bodies JMLogic JM32 Game-CODING GameCore',trace,claim:'NODE REAL EXECUTION; HTML/PHYSICAL OWNER CONTACT SEPARATE'},null,2));
}
