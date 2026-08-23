'use strict';

global.window = {};
require('./puka-core.js');
const P = global.window.PUKA;

function assert(ok, message){
  if(!ok) throw new Error(message);
}

const deck = P.makeDeck();
assert(P.verifyDeck(deck), 'Deck verification failed');
assert(deck.length === 52, 'Deck must contain 52 cards');
assert(new Set(deck.map(c => c.id)).size === 52, 'Card ids must be unique');

const by = id => deck.find(c => c.id === id);
const wheel = P.evaluate([
  by('A-spades'), by('2-hearts'), by('3-clubs'), by('4-diamonds'), by('5-spades')
]);
assert(wheel.name === 'Straight' && wheel.score[1] === 5, 'Ace-low straight failed');

const bestSeven = P.evaluate([
  by('9-spades'), by('10-spades'), by('J-spades'), by('Q-spades'), by('K-spades'),
  by('2-hearts'), by('2-clubs')
]);
assert(bestSeven.name === 'Straight Flush', 'Best-of-seven evaluator failed');

const game = new P.PukaGame({});
game.newHand();
let guard = 0;
while(!game.state.ended && guard++ < 40){
  assert(game.state.turn === 'player', 'Control did not return to player');
  const legal = game.legal('player');
  const action = legal.includes('check') ? 'check' : legal.includes('call') ? 'call' : 'fold';
  game.playerAction(action);
}
assert(game.state.ended, 'Teaching hand did not terminate');
assert(game.trace.entries.some(e => e.kind === 'observation'), 'TraceBox observation missing');
assert(P.ROYAL_LADDER[0].name === 'Pauper', 'Royal ladder floor missing');
assert(P.ROYAL_LADDER.at(-1).name === 'King / Queen', 'Royal ladder crown missing');

console.log('PUKA CODE DING PASS');
