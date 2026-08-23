/*
  PUKA CORE v0.1A
  JM lineage contract:
  recover -> parse/structure -> state -> consequence -> trace -> test -> host
  Host JS serves the game; it does not define the governance.
*/
(() => {
  'use strict';

  const SUITS = {
    hearts:   {symbol:'♥', label:'Hearts',   attribute:'Intuition', archetype:'Warm reader'},
    diamonds: {symbol:'♦', label:'Diamonds', attribute:'Calculation', archetype:'Value reader'},
    clubs:    {symbol:'♣', label:'Clubs',    attribute:'Nerve', archetype:'Pressure maker'},
    spades:   {symbol:'♠', label:'Spades',   attribute:'Discernment', archetype:'Pattern reader'}
  };
  const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const RANK_VALUE = Object.fromEntries(RANKS.map((r,i)=>[r,i+2]));
  const ROYAL_LADDER = [
    {name:'Pauper',xp:0},{name:'Servant',xp:80},{name:'Jester',xp:180},{name:'Squire',xp:320},
    {name:'Knight',xp:520},{name:'Courtier',xp:800},{name:'Heir',xp:1180},{name:'King / Queen',xp:1700}
  ];

  const clone = x => JSON.parse(JSON.stringify(x));
  const rand = n => Math.floor(Math.random()*n);

  function makeDeck(){
    const cards=[];
    for(const [suit,meta] of Object.entries(SUITS)){
      for(const rank of RANKS){
        cards.push({id:`${rank}-${suit}`,rank,suit,symbol:meta.symbol,value:RANK_VALUE[rank]});
      }
    }
    return cards;
  }
  function shuffle(cards){
    const a=[...cards];
    for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}
    return a;
  }
  function verifyDeck(cards){
    const ids=new Set(cards.map(c=>c.id));
    return cards.length===52 && ids.size===52 && Object.keys(SUITS).every(s=>cards.filter(c=>c.suit===s).length===13);
  }

  function compareVec(a,b){
    for(let i=0;i<Math.max(a.length,b.length);i++){
      const d=(a[i]||0)-(b[i]||0); if(d) return Math.sign(d);
    }
    return 0;
  }
  function straightHigh(values){
    let u=[...new Set(values)].sort((a,b)=>b-a);
    if(u.includes(14)) u.push(1);
    let run=1;
    for(let i=1;i<u.length;i++){
      if(u[i]===u[i-1]-1){run++; if(run>=5) return u[i-4];}
      else if(u[i]!==u[i-1]) run=1;
    }
    return 0;
  }
  function eval5(cards){
    const vals=cards.map(c=>c.value).sort((a,b)=>b-a);
    const suits=cards.map(c=>c.suit);
    const counts=new Map(); vals.forEach(v=>counts.set(v,(counts.get(v)||0)+1));
    const groups=[...counts.entries()].sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
    const flush=suits.every(s=>s===suits[0]);
    const sh=straightHigh(vals);
    if(flush&&sh) return {name:'Straight Flush',score:[8,sh]};
    if(groups[0][1]===4) return {name:'Four of a Kind',score:[7,groups[0][0],groups[1][0]]};
    if(groups[0][1]===3&&groups[1][1]===2) return {name:'Full House',score:[6,groups[0][0],groups[1][0]]};
    if(flush) return {name:'Flush',score:[5,...vals]};
    if(sh) return {name:'Straight',score:[4,sh]};
    if(groups[0][1]===3) return {name:'Three of a Kind',score:[3,groups[0][0],...groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)]};
    const pairs=groups.filter(g=>g[1]===2).map(g=>g[0]).sort((a,b)=>b-a);
    if(pairs.length>=2){const kick=groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)[0];return {name:'Two Pair',score:[2,pairs[0],pairs[1],kick]};}
    if(pairs.length===1) return {name:'One Pair',score:[1,pairs[0],...groups.filter(g=>g[1]===1).map(g=>g[0]).sort((a,b)=>b-a)]};
    return {name:'High Card',score:[0,...vals]};
  }
  function combinations(arr,k){
    const out=[];
    function rec(start,p){if(p.length===k){out.push([...p]);return;}for(let i=start;i<=arr.length-(k-p.length);i++){p.push(arr[i]);rec(i+1,p);p.pop();}}
    rec(0,[]); return out;
  }
  function evaluate(cards){
    if(cards.length<5){
      const vals=cards.map(c=>c.value).sort((a,b)=>b-a);
      const pair=vals.length===2&&vals[0]===vals[1];
      return {name:pair?'Pocket Pair':'Unmade Hand',score:pair?[1,vals[0]]:[0,...vals]};
    }
    let best=null;
    for(const five of combinations(cards,5)){
      const e=eval5(five); if(!best||compareVec(e.score,best.score)>0) best=e;
    }
    return best;
  }

  function preflopStrength(hole){
    const [a,b]=hole.map(c=>c.value).sort((x,y)=>y-x);
    const pair=a===b, suited=hole[0].suit===hole[1].suit, gap=a-b;
    let s=(a+b)/28;
    if(pair) s+=0.30+(a/14)*0.18;
    if(suited) s+=0.07;
    if(gap<=2) s+=0.06;
    if(a===14) s+=0.06;
    return Math.max(0,Math.min(1,s));
  }
  function madeStrength(hole,board){
    if(board.length<3) return preflopStrength(hole);
    const e=evaluate([...hole,...board]);
    const category=e.score[0]/8;
    const high=(e.score[1]||0)/14;
    return Math.min(1,0.12+category*0.72+high*0.16);
  }

  class TraceBox{
    constructor(){this.entries=[];}
    add(kind,message,data={}){const row={time:new Date().toISOString(),kind,message,data};this.entries.unshift(row);this.entries=this.entries.slice(0,120);return row;}
    observation(who,action,context={}){return this.add('observation',`${who} ${action}`,context);}
    interpretation(message,confidence='low',data={}){return this.add('interpretation',message,{confidence,...data});}
    fact(message,data={}){return this.add('fact',message,data);}
  }

  class PukaGame{
    constructor(saved={}){
      this.trace=new TraceBox();
      this.profile={...{hands:0,folds:0,calls:0,checks:0,raises:0,showdowns:0},...(saved.profile||{})};
      this.meta={
        xp:Number(saved.xp||0),
        suit:saved.suit&&SUITS[saved.suit]?saved.suit:'spades',
        mode:saved.mode||'auto',
        handNo:Number(saved.handNo||0)
      };
      this.ai={name:'House Mind',aggression:.54,bluff:.12,patience:.58};
      this.state=null;
    }
    get rank(){let r=ROYAL_LADDER[0];for(const x of ROYAL_LADDER) if(this.meta.xp>=x.xp) r=x;return r;}
    get nextRank(){return ROYAL_LADDER.find(x=>x.xp>this.meta.xp)||null;}
    setSuit(s){if(SUITS[s]){this.meta.suit=s;this.trace.fact(`Character suit set to ${SUITS[s].label}.`,{suit:s});}}
    setMode(m){if(['auto','portrait','royal'].includes(m)) this.meta.mode=m;}
    persistable(){return {xp:this.meta.xp,suit:this.meta.suit,mode:this.meta.mode,handNo:this.meta.handNo,profile:this.profile};}

    newHand(){
      let deck=shuffle(makeDeck());
      if(!verifyDeck(deck)) throw new Error('Deck verification failed');
      const handNo=++this.meta.handNo;
      const dealer=handNo%2===1?'player':'ai';
      const s={
        handNo,deck,board:[],street:'preflop',dealer,pot:0,currentBet:0,
        players:{player:{stack:1000,hole:[],streetPut:0,folded:false},ai:{stack:1000,hole:[],streetPut:0,folded:false}},
        pending:[],turn:null,ended:false,winner:null,message:'',lastAggressor:null
      };
      this.state=s;
      s.players.player.hole=[s.deck.pop(),s.deck.pop()];
      s.players.ai.hole=[s.deck.pop(),s.deck.pop()];
      const sb=dealer, bb=dealer==='player'?'ai':'player';
      this.put(sb,10); this.put(bb,20); s.currentBet=20;
      this.trace.add('state',`Hand ${handNo} begins. ${dealer==='player'?'You':'House Mind'} has the button.`,{dealer});
      this.trace.observation(dealer==='player'?'You':'House Mind','posted the small blind',{amount:10});
      this.trace.observation(bb==='player'?'You':'House Mind','posted the big blind',{amount:20});
      const first=dealer; const second=bb;
      s.pending=[first,second]; s.turn=first;
      this.advanceUntilPlayer();
      return this.snapshot();
    }
    put(who,amount){const p=this.state.players[who];const paid=Math.max(0,Math.min(amount,p.stack));p.stack-=paid;p.streetPut+=paid;this.state.pot+=paid;return paid;}
    callAmount(who){return Math.max(0,this.state.currentBet-this.state.players[who].streetPut);}
    legal(who='player'){
      const s=this.state;if(!s||s.ended||s.turn!==who) return [];
      const call=this.callAmount(who), p=s.players[who], out=['fold'];
      if(call===0) out.push('check'); else if(p.stack>0) out.push('call');
      if(p.stack>call+0 && p.stack>0) out.push('raise');
      return out;
    }
    playerAction(action){
      if(!this.legal('player').includes(action)) return this.snapshot();
      this.applyAction('player',action);
      this.advanceUntilPlayer();
      return this.snapshot();
    }
    applyAction(who,action){
      const s=this.state,p=s.players[who],other=who==='player'?'ai':'player',call=this.callAmount(who);
      if(action==='fold'){
        p.folded=true;s.ended=true;s.winner=other;s.message=`${who==='player'?'You fold':'House Mind folds'}. ${other==='player'?'You win':'House Mind wins'} ${s.pot}.`;
        s.players[other].stack+=s.pot;
        this.trace.observation(who==='player'?'You':'House Mind','folded',{street:s.street,pot:s.pot});
        if(who==='player'){this.profile.folds++;this.awardXP(2);} else this.awardXP(14);
        this.profile.hands++;
        return;
      }
      if(action==='check'){
        this.trace.observation(who==='player'?'You':'House Mind','checked',{street:s.street});
        if(who==='player')this.profile.checks++;
        this.removePending(who);
      } else if(action==='call'){
        const paid=this.put(who,call);
        this.trace.observation(who==='player'?'You':'House Mind','called',{street:s.street,amount:paid,pot:s.pot});
        if(who==='player')this.profile.calls++;
        this.removePending(who);
      } else if(action==='raise'){
        const extra=Math.max(20,Math.round(Math.max(20,s.pot*.6)/10)*10);
        const paid=this.put(who,Math.min(p.stack,call+extra));
        s.currentBet=p.streetPut;s.lastAggressor=who;
        this.trace.observation(who==='player'?'You':'House Mind','raised',{street:s.street,paid,totalBet:s.currentBet,pot:s.pot});
        if(who==='player')this.profile.raises++;
        s.pending=[other];s.turn=other;
      }
      if(!s.ended&&s.pending.length===0) this.advanceStreet();
      else if(!s.ended&&s.pending.length){s.turn=s.pending[0];}
    }
    removePending(who){const s=this.state;s.pending=s.pending.filter(x=>x!==who);s.turn=s.pending[0]||null;}
    advanceStreet(){
      const s=this.state;
      if(s.street==='river'){this.showdown();return;}
      const order=['preflop','flop','turn','river']; const next=order[order.indexOf(s.street)+1];
      s.street=next;s.currentBet=0;s.lastAggressor=null;
      s.players.player.streetPut=0;s.players.ai.streetPut=0;
      if(next==='flop') s.board.push(s.deck.pop(),s.deck.pop(),s.deck.pop());
      else s.board.push(s.deck.pop());
      this.trace.add('state',`${next.toUpperCase()} dealt.`,{board:s.board.map(c=>c.id)});
      const first=s.dealer==='player'?'ai':'player'; const second=first==='player'?'ai':'player';
      s.pending=[first,second];s.turn=first;
    }
    advanceUntilPlayer(){
      let guard=0;
      while(this.state&&!this.state.ended&&this.state.turn==='ai'&&guard++<20){
        const action=this.aiDecision(); this.applyAction('ai',action);
      }
      if(guard>=20) throw new Error('AI turn guard exceeded');
    }
    aiDecision(){
      const s=this.state, strength=madeStrength(s.players.ai.hole,s.board),call=this.callAmount('ai');
      const potOdds=call/(Math.max(1,s.pot+call));
      const pressure=this.profile.raises/Math.max(1,this.profile.hands);
      const bluff=Math.random()<this.ai.bluff*(1-Math.min(.6,pressure*.3));
      let action;
      if(call===0){
        action=(strength>.66||bluff)&&Math.random()<this.ai.aggression?'raise':'check';
      } else if(strength+(.16*Math.random())<potOdds+.12){action='fold';}
      else if(strength>.68||bluff){action=Math.random()<this.ai.aggression?'raise':'call';}
      else action='call';
      this.trace.interpretation(
        action==='raise'?'A raise can represent strength, pressure, or a bluff — the action alone does not prove which.':
        action==='fold'?'The fold proves only that House Mind surrendered this hand, not exactly what it held.':
        'Passive action narrows possibilities but does not reveal the hidden cards.',
        'low',{actor:'ai',action,street:s.street}
      );
      return action;
    }
    showdown(){
      const s=this.state, ph=evaluate([...s.players.player.hole,...s.board]), ah=evaluate([...s.players.ai.hole,...s.board]);
      const cmp=compareVec(ph.score,ah.score);
      s.ended=true;this.profile.showdowns++;this.profile.hands++;
      if(cmp>0){s.winner='player';s.players.player.stack+=s.pot;s.message=`Showdown: ${ph.name} beats ${ah.name}. You win ${s.pot}.`;this.awardXP(25);}
      else if(cmp<0){s.winner='ai';s.players.ai.stack+=s.pot;s.message=`Showdown: House Mind's ${ah.name} beats your ${ph.name}.`;this.awardXP(7);}
      else {s.winner='split';const half=Math.floor(s.pot/2);s.players.player.stack+=half;s.players.ai.stack+=s.pot-half;s.message=`Showdown: both hold ${ph.name}. Pot split.`;this.awardXP(12);}
      this.trace.fact(`Showdown reveals House Mind held ${s.players.ai.hole.map(c=>c.rank+c.symbol).join(' ')} for ${ah.name}.`,{cards:s.players.ai.hole.map(c=>c.id),hand:ah.name});
      this.trace.fact(`Your revealed hand is ${ph.name}.`,{hand:ph.name});
    }
    awardXP(n){this.meta.xp+=n;}
    handHint(){
      const s=this.state;if(!s)return 'Choose a suit and deal the first hand.';
      if(s.ended)return 'Review what was observed, what was inferred, and what became known at showdown.';
      const call=this.callAmount('player');
      if(s.street==='preflop') return `Pre-flop: two private cards. ${call?`It costs ${call} to continue.`:'You can check for free.'} Position changes who acts first.`;
      const e=evaluate([...s.players.player.hole,...s.board]);
      return `${s.street}: your current made hand is ${e.name}. That describes cards — not whether an opponent is bluffing.`;
    }
    playerTendency(){
      const p=this.profile,total=Math.max(1,p.calls+p.checks+p.raises+p.folds);
      const ag=p.raises/total, fold=p.folds/total;
      if(total<4)return 'Not enough observed actions yet.';
      if(ag>.42)return 'Observed tendency: pressure-heavy so far. Interpretation: opponents may begin calling wider; this is not a fixed personality fact.';
      if(fold>.38)return 'Observed tendency: selective/fold-heavy so far. Interpretation: opponents may test your blinds more often.';
      return 'Observed tendency: mixed actions so far. No strong behavioural read earned yet.';
    }
    snapshot(){
      const s=this.state;
      return {
        meta:clone(this.meta),rank:clone(this.rank),nextRank:clone(this.nextRank),suit:clone(SUITS[this.meta.suit]),
        state:s?clone(s):null,legal:this.legal('player'),hint:this.handHint(),tendency:this.playerTendency(),trace:clone(this.trace.entries),profile:clone(this.profile)
      };
    }
  }

  window.PUKA = {SUITS,RANKS,ROYAL_LADDER,makeDeck,shuffle,verifyDeck,evaluate,compareVec,PukaGame};
})();
