// JM T-BOYS five-path CP03 — exact canonical Game-CODING + JM GameCore execution.
// New receiving test only. Both sovereign runtime implementations are imported unchanged.
import assert from 'node:assert/strict';
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime, gameChain } from '../../../coding-estate/sovereign-ten/direct/game-native.mjs';
const GAME = `
entity TboysField {
 holder = "NEUTRAL"
 guard = 0
 near = false
}
mechanic CaptureField {
 requires tboysField.near == true
 effect tboysField.holder = "JM_CREW"
}
mechanic GuardCore {
 requires tboysField.holder == "JM_CREW"
 effect tboysField.guard = 12
}
collision ZoneContact {
 when tboysField.near == true
 then trigger CaptureField
}
combo CaptureAndGuard {
 steps = [CaptureField, GuardCore]
}
update ReturnNeutral {
 every 60 frames
 do tboysField.holder = "NEUTRAL"
}
`;
const CORE = `
organ FieldContactOrgan {
 handles = [TboysField]
 rules = [CaptureField, GuardCore]
 invariants = {
 tboysField.guard >= 0
 }
}
system TboysContact {
 organs = [FieldContactOrgan]
 events = [ZoneContact]
 identity = "TBOYS.CoreClash.FivePath.CP03"
}
`;
const run = near => {
 const original = {tboysField:{holder:'NEUTRAL',near,guard:0}};
 const r=gameChain(GAME, CORE, original);
 return {before:original,after:r.game.state,execution:r.dispatch.executions,receipt:r.game.receipt,coreReceipt:r.dispatch.receipt,digest:r.digest};
};
let checks=0;const proofs=[];
const good=run(true);assert.equal(good.after.tboysField.holder,'JM_CREW');assert.equal(good.after.tboysField.guard,12);assert.equal(good.execution.length,2);assert(good.execution.every(e=>e.applied===true));checks+=4;
const hold=run(false);assert.equal(hold.after.tboysField.holder,'NEUTRAL');assert.equal(hold.after.tboysField.guard,0);assert(hold.execution.every(e=>e.applied===false));checks+=3;
for(let seed=0;seed<32;seed++){let near=seed%2===0;let a=run(near),b=run(near);assert.deepEqual(a.after,b.after);assert.equal(a.digest,b.digest);assert.equal(a.receipt.traceDigest,b.receipt.traceDigest);assert.equal(a.after.tboysField.guard,near?12:0);proofs.push({seed,near,holder:a.after.tboysField.holder,guard:a.after.tboysField.guard,digest:a.digest});checks+=4;}
const ast=GameCoding.parse(GAME),ir=GameCoding.lower(ast);assert.equal(ir.mechanicNodes.length,2);assert.equal(ir.collisionNodes.length,1);checks+=2;
const cAst=JMGameCore.parse(CORE);const core=new JMGameCoreRuntime(cAst,new GameCodingRuntime(ast,{tboysField:{near:true,holder:'NEUTRAL',guard:0}}));
assert.throws(()=>core.dispatch('TboysContact','UNKNOWN'));checks++;
const result={schema:'jm.tboys.fivepath.cp03.canonical-native-proof/1',implementation:'SOURCE_IMPORT_UNMODIFIED_JM_GAME_CODING_AND_JM_GAMECORE',checks,seed_pairs:32,positive:good.after,negative:hold.after,proofs,scope:'Actual native engine parse/IR/dispatch/state consequence in Node; browser and phone owners still HOLD'};
console.log(JSON.stringify(result,null,2));
