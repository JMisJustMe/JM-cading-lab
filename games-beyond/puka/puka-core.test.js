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

const equity=P.estimateEquity([by('A-spades'),by('K-spades')],[by('Q-spades'),by('J-spades'),by('2-hearts')],160);
assert(equity.pct>=0&&equity.pct<=100,'Visible-card equity estimate out of range');
assert(equity.samples===160,'Equity sample count not honoured');

const game=new P.PukaGame({bankroll:{player:1200,ai:800},xp:25,suit:'spades'});
game.newHand();
assert(game.state.players.player.stack<=1190,'Player bankroll did not seed the hand');
assert(game.state.players.ai.stack<=790,'House bankroll did not seed the hand');
assert(game.raiseOptions('player').length>0,'Player raise sizing options missing');
const activeSaved=game.persistable();
const activeRestored=new P.PukaGame(activeSaved);
assert(activeRestored.state&&activeRestored.state.handNo===game.state.handNo,'Active hand lifecycle restore failed');
assert(activeRestored.state.players.player.hole.map(c=>c.id).join('|')===game.state.players.player.hole.map(c=>c.id).join('|'),'Restored private cards changed');
assert(activeRestored.state.pot===game.state.pot,'Restored pot changed');

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
assert(game.history.length===1,'Completed hand did not enter history');
const saved=game.persistable();
const restored=new P.PukaGame(saved);
assert(restored.meta.bankroll.player===game.meta.bankroll.player,'Persistent player purse failed restore');
assert(restored.room===game.room,'Royal room failed restore');
assert(restored.history.length===game.history.length,'Hand history failed restore');
assert(game.trace.entries.some(e=>e.kind==='observation'),'TraceBox observation missing');

const foldGame=new P.PukaGame({bankroll:{player:1000,ai:1000}});
foldGame.newHand();
foldGame.playerAction('fold');
assert(foldGame.state.ended&&foldGame.state.endReason==='fold','Fold did not end hand');
assert(foldGame.history[0].houseHole===null,'Fold history leaked unrevealed House cards');

const allInGame=new P.PukaGame({bankroll:{player:100,ai:100}});
allInGame.newHand();
allInGame.aiDecision=()=> 'call';
const allIn=allInGame.raiseOptions('player').find(x=>x.allIn)||allInGame.raiseOptions('player').at(-1);
assert(allIn&&allIn.target===100,'All-in sizing target missing');
allInGame.playerAction('raise',allIn.target);
assert(allInGame.state.ended,'Heads-up all-in did not run to completion');
assert(allInGame.state.board.length===5,'All-in did not run out five community cards');
assert(allInGame.state.endReason==='all-in','All-in showdown reason missing');
assert(allInGame.profile.sizedRaises===1,'Sized raise profile count missing');
assert(allInGame.profile.allIns>=1,'All-in profile count missing');

const snap=allInGame.snapshot();
assert(typeof snap.teaching.equityPct==='number','Teacher equity field missing');
assert(snap.review&&snap.review.line.includes('visible-card equity estimate'),'Decision review missing equity context');
assert(snap.mastery.sizedRaises>=1,'Mastery did not carry sized raises');
assert(P.LESSONS.length===P.ROYAL_LADDER.length,'Royal lesson ladder does not match rank ladder');
assert(P.ROYAL_LADDER[0].room==='Lower Dormitory','Royal room floor missing');
assert(P.ROYAL_LADDER.at(-1).room==='Throne Room','Royal room crown missing');
console.log('PUKA v0.12A FULL TABLE CORE DING PASS');
