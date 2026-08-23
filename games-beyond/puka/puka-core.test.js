'use strict';

global.window={};
require('./puka-core.js');
const P=global.window.PUKA;
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};

const deck=P.makeDeck();
assert(P.verifyDeck(deck),'Deck verification failed');
assert(deck.length===52,'Deck must contain 52 cards');
assert(new Set(deck.map(c=>c.id)).size===52,'Card ids must be unique');

const by=id=>deck.find(c=>c.id===id);
const wheel=P.evaluate([by('A-spades'),by('2-hearts'),by('3-clubs'),by('4-diamonds'),by('5-spades')]);
assert(wheel.name==='Straight'&&wheel.score[1]===5,'Ace-low straight failed');
const bestSeven=P.evaluate([by('9-spades'),by('10-spades'),by('J-spades'),by('Q-spades'),by('K-spades'),by('2-hearts'),by('2-clubs')]);
assert(bestSeven.name==='Straight Flush','Best-of-seven evaluator failed');

const game=new P.PukaGame({bankroll:{player:1200,ai:800},xp:25,suit:'spades'});
game.newHand();
assert(game.state.players.player.stack<=1190,'Player bankroll did not seed the hand');
assert(game.state.players.ai.stack<=790,'House bankroll did not seed the hand');
let guard=0;
while(!game.state.ended&&guard++<40){
  assert(game.state.turn==='player','Control did not return to player');
  const legal=game.legal('player');
  const action=legal.includes('check')?'check':legal.includes('call')?'call':'fold';
  game.playerAction(action);
}
assert(game.state.ended,'Teaching hand did not terminate');
assert(game.meta.bankroll.player===game.state.players.player.stack,'Player bankroll did not sync after hand');
assert(game.meta.bankroll.ai===game.state.players.ai.stack,'House bankroll did not sync after hand');
const saved=game.persistable();
const restored=new P.PukaGame(saved);
assert(restored.meta.bankroll.player===game.meta.bankroll.player,'Persistent player purse failed restore');
assert(restored.room===game.room,'Royal room failed restore');
assert(game.trace.entries.some(e=>e.kind==='observation'),'TraceBox observation missing');
assert(P.ROYAL_LADDER[0].room==='Lower Dormitory','Royal room floor missing');
assert(P.ROYAL_LADDER.at(-1).room==='Throne Room','Royal room crown missing');
console.log('PUKA v0.2A CODE DING PASS');
