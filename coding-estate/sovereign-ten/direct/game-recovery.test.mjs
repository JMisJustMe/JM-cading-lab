import test from 'node:test';
import assert from 'node:assert/strict';
import { GameCoding, GameCodingRuntime, JMGameCore, JMGameCoreRuntime } from './game-native.mjs';
const source = `entity Door {\n state = "closed"\n}\nmechanic Break {\n requires door.state == "closed"\n effect door.state = "broken"\n}\nmechanic Open {\n requires door.state == "closed"\n effect door.state = "open"\n}\nmechanic Service {\n requires door.state == "closed"\n effect call damage()\n}`;
function runtime(rules=['Break'],services={}) {
 const game=new GameCodingRuntime(GameCoding.parse(source),{extra:{preserved:[1,2]}},services);
 const core=new JMGameCoreRuntime(JMGameCore.parse(`organ Door {\n rules = [${rules.join(',')}]\n invariants = {\n door.state != "broken"\n }\n}\nsystem Entry {\n organs = [Door]\n events = [open]\n identity = "Entry.v1"\n}`),game);
 return {game,core};
}
test('failed invariant restores full state and preserves attempted trace',()=>{
 const {game,core}=runtime();const before=structuredClone(game.state);
 assert.throws(()=>core.dispatch('Entry','open'),{code:'JMG_INVARIANT_FAILED'});
 assert.deepEqual(game.state,before);
 assert.equal(core.trace.events.at(-1).type,'dispatch.rolled_back');
 assert(game.trace.events.some(x=>x.type==='mechanic.applied'));
 assert(!core.trace.events.some(x=>x.type==='system.completed'));
});
test('successful dispatch remains playable after rejected event',()=>{
 const {game,core}=runtime();assert.throws(()=>core.dispatch('Entry','open'));
 core.program.organs[0].rules=['Open'];const result=core.dispatch('Entry','open');
 assert.equal(game.state.door.state,'open');assert.equal(result.identity,'Entry.v1');assert(result.receipt);
});
test('unknown later rule rolls back earlier rule in same event',()=>{
 const {game,core}=runtime(['Open','Missing']);assert.throws(()=>core.dispatch('Entry','open'),{code:'GC_UNKNOWN_MECHANIC'});
 assert.equal(game.state.door.state,'closed');
});
test('service exception restores mutation but truthfully retains external effect',()=>{
 let outside=0;const {game,core}=runtime(['Service'],{damage:(named,state)=>{outside++;state.extra.preserved.push(3);game.frame=99;throw Error('recipient failed');}});
 assert.throws(()=>core.dispatch('Entry','open'),/recipient failed/);assert.equal(outside,1);
 assert.deepEqual(game.state.extra.preserved,[1,2]);assert.equal(game.frame,0);
 assert.match(core.trace.events.at(-1).payload.scope,/external_service_effects_not_reversed/);
});
test('unhandled event performs no action or recovery side effect',()=>{
 const {game,core}=runtime();assert.throws(()=>core.dispatch('Entry','bad'),{code:'JMG_UNHANDLED_EVENT'});
 assert.equal(game.state.door.state,'closed');assert.equal(core.trace.events.length,0);
});
test('separate organ invariant rejection rolls back whole dispatch',()=>{
 const {game,core}=runtime(['Open']);core.program.organs.push({name:'Second',rules:[],invariants:[{type:'compare',path:'door.state',op:'==',right:{kind:'value',value:'closed'}}]});
 core.program.systems[0].organs.push('Second');assert.throws(()=>core.dispatch('Entry','open'),{code:'JMG_INVARIANT_FAILED'});
 assert.equal(game.state.door.state,'closed');
});
