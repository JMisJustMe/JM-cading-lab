global.window=global;
require('./puka-human-game-v02.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};

const A=(who,action,street='preflop',extra={})=>({who,action,street,...extra});

const pressure=PUKAHumanGame.analyze({
  history:[
    {handNo:1,endReason:'showdown',winner:'player',houseHole:['A-spades','A-hearts'],actions:[A('player','raise'),A('ai','call'),A('player','raise','flop'),A('ai','call','flop')]},
    {handNo:2,endReason:'fold',winner:'player',houseHole:['K-spades','Q-spades'],actions:[A('player','raise'),A('ai','fold')]},
    {handNo:3,endReason:'showdown',winner:'ai',actions:[A('player','call'),A('ai','check'),A('player','raise','flop'),A('ai','call','flop')]}
  ]
});
assert(pressure.source==='VISIBLE_ACTION_HISTORY_ONLY','source boundary missing');
assert(pressure.law==='OBSERVATION != INTERPRETATION != FACT','founding law missing');
assert(pressure.player.sample===5,'player action sample wrong');
assert(pressure.player.headline==='PRESSURE-FORWARD SO FAR','pressure read not earned');
assert(['LOW','MEDIUM','HIGH'].includes(pressure.player.confidence.band),'confidence band wrong');
assert(pressure.player.alternatives.length>=2,'alternative explanations missing');
assert(/does not prove|not proof|not fixed|not reveal|not/i.test(JSON.stringify(pressure)),'claim boundary language missing');
assert(!JSON.stringify(pressure).includes('A-spades'),'hidden card identity leaked into report');
assert(!JSON.stringify(pressure).includes('K-spades'),'hidden fold card identity leaked into report');

const tiny=PUKAHumanGame.analyze({currentActions:[A('player','raise')]});
assert(tiny.player.confidence.band==='INSUFFICIENT','tiny sample should stay insufficient');
assert(tiny.player.headline==='NO READ EARNED YET','tiny sample overclaimed a read');

const mixed=PUKAHumanGame.analyze({
  history:[{handNo:4,endReason:'showdown',winner:'split',actions:[
    A('player','raise'),A('player','call','flop'),A('player','check','turn'),A('player','fold','river'),
    A('ai','check'),A('ai','raise','flop'),A('ai','call','turn'),A('ai','fold','river')
  ]}]
});
assert(mixed.player.headline==='MIXED ACTION PROFILE','balanced sample should not be forced into a single label');
assert(mixed.why.title.includes('HAND 4'),'last-hand Why layer missing');

const dirty=PUKAHumanGame.normalize({
  history:[{handNo:8,actions:[A('player','raise'),{who:'ai',action:'telepathy',street:'flop'}],houseHole:['2-hearts','2-spades'],privateNote:'secret'}],
  currentActions:[{who:'player',action:'call',street:'river',hiddenCard:'A-clubs'}]
});
assert(dirty.history[0].actions.length===1,'unknown action should be rejected');
assert(!('houseHole' in dirty.history[0]),'hidden hole-card field survived normalization');
assert(!('hiddenCard' in dirty.currentActions[0]),'unknown hidden field survived action cleaning');

console.log('PUKA HUMAN GAME v0.2 DING PASS');
