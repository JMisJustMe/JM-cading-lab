(() => {
  'use strict';

  const VERSION = '0.2';
  const ACTIONS = new Set(['fold','check','call','raise']);
  const STREETS = new Set(['preflop','flop','turn','river']);

  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  const pct = (n,d) => d ? Math.round((n/d)*100) : 0;
  const copy = value => JSON.parse(JSON.stringify(value));

  function cleanAction(row){
    if(!row || !ACTIONS.has(row.action) || !['player','ai'].includes(row.who)) return null;
    const out = {
      who: row.who,
      action: row.action,
      street: STREETS.has(row.street) ? row.street : 'preflop'
    };
    for(const key of ['potAfter','toCall','paid','totalBet','increment']){
      const n = Number(row[key]);
      if(Number.isFinite(n)) out[key] = Math.max(0,n);
    }
    if(row.allIn === true) out.allIn = true;
    return out;
  }

  function cleanHand(hand){
    const actions = Array.isArray(hand?.actions) ? hand.actions.map(cleanAction).filter(Boolean) : [];
    return {
      handNo: Number.isFinite(Number(hand?.handNo)) ? Number(hand.handNo) : null,
      endReason: ['fold','showdown','all-in'].includes(hand?.endReason) ? hand.endReason : null,
      winner: ['player','ai','split'].includes(hand?.winner) ? hand.winner : null,
      actions
    };
  }

  function normalize(input={}){
    const history = Array.isArray(input.history) ? input.history.map(cleanHand).slice(0,20) : [];
    const currentActions = Array.isArray(input.currentActions) ? input.currentActions.map(cleanAction).filter(Boolean) : [];
    return {
      history,
      currentActions,
      currentHandNo: Number.isFinite(Number(input.currentHandNo)) ? Number(input.currentHandNo) : null,
      currentStreet: STREETS.has(input.currentStreet) ? input.currentStreet : null
    };
  }

  function flatten(source){
    const rows=[];
    for(const hand of [...source.history].reverse()){
      for(const action of hand.actions) rows.push({...action,handNo:hand.handNo,completed:true});
    }
    for(const action of source.currentActions) rows.push({...action,handNo:source.currentHandNo,completed:false});
    return rows;
  }

  function confidence(sample,dominance=.5){
    if(sample < 4) return {band:'INSUFFICIENT',score:Math.min(24,sample*6),phrase:'not enough contact yet'};
    const sampleWeight = sample < 8 ? 34 : sample < 16 ? 52 : sample < 28 ? 68 : 78;
    const consistency = Math.round(clamp(Math.abs(dominance-.5)*2,0,1)*16);
    const score = clamp(sampleWeight+consistency,0,92);
    return {
      band: score >= 78 ? 'HIGH' : score >= 58 ? 'MEDIUM' : 'LOW',
      score,
      phrase: score >= 78 ? 'repeated visible pattern' : score >= 58 ? 'meaningful but revisable pattern' : 'early provisional pattern'
    };
  }

  function actionMix(rows){
    const counts={fold:0,check:0,call:0,raise:0,allIn:0};
    const byStreet={preflop:0,flop:0,turn:0,river:0};
    for(const row of rows){
      counts[row.action]++;
      if(row.allIn) counts.allIn++;
      byStreet[row.street]++;
    }
    const total=rows.length;
    return {
      total,
      counts,
      byStreet,
      raiseRate:pct(counts.raise,total),
      foldRate:pct(counts.fold,total),
      callRate:pct(counts.call,total),
      checkRate:pct(counts.check,total),
      continueRate:pct(counts.call+counts.raise,total)
    };
  }

  function movement(rows){
    if(rows.length < 10) return {label:'NOT ENOUGH HISTORY',detail:'More visible actions are needed before a recent-vs-earlier shift is worth naming.'};
    const split=Math.max(4,Math.floor(rows.length/2));
    const older=actionMix(rows.slice(0,rows.length-split));
    const recent=actionMix(rows.slice(-split));
    const delta=recent.raiseRate-older.raiseRate;
    if(delta >= 18) return {label:'RECENT PRESSURE UP',detail:`Raise share is ${Math.abs(delta)} points higher in the recent sample. That is a change in observed action mix, not proof of motive.`};
    if(delta <= -18) return {label:'RECENT PRESSURE DOWN',detail:`Raise share is ${Math.abs(delta)} points lower in the recent sample. Cards, price and position remain plausible alternatives.`};
    return {label:'MIX STABLE SO FAR',detail:'Recent action mix has not moved enough to earn a strong change claim.'};
  }

  function pressureRead(mix){
    if(mix.total < 4){
      return {
        headline:'NO READ EARNED YET',
        observation:`${mix.total} voluntary action${mix.total===1?'':'s'} observed.`,
        interpretation:'The sample is too small to prefer a behavioural tendency.',
        alternatives:['Card distribution can dominate a tiny sample.','Position and price may be doing most of the work.'],
        testNext:'Collect several more actions across more than one street before leaning on a read.',
        dominance:.5
      };
    }
    if(mix.raiseRate >= 36){
      return {
        headline:'PRESSURE-FORWARD SO FAR',
        observation:`Raises are ${mix.raiseRate}% of ${mix.total} visible actions.`,
        interpretation:'The current table sample supports a pressure-heavy tendency.',
        alternatives:['Strong card distribution may be inflating the raise share.','Position or favourable prices may explain part of the aggression.'],
        testNext:'See whether the raise share survives weaker positions, different streets and hands where the price changes.',
        dominance:mix.raiseRate/100
      };
    }
    if(mix.foldRate >= 38){
      return {
        headline:'SELECTIVE / RELEASE-HEAVY SO FAR',
        observation:`Folds are ${mix.foldRate}% of ${mix.total} visible actions.`,
        interpretation:'The current sample shows frequent relinquishing rather than sustained pressure.',
        alternatives:['The player may simply have faced poor cards or unattractive prices.','A short run of large bets can create the same action pattern.'],
        testNext:'Compare future folds at small prices versus large prices before treating this as a stable tendency.',
        dominance:mix.foldRate/100
      };
    }
    if(mix.callRate >= 42){
      return {
        headline:'CALL-LED CONTINUATION SO FAR',
        observation:`Calls are ${mix.callRate}% of ${mix.total} visible actions.`,
        interpretation:'The current sample prefers continuing by matching pressure more often than creating it.',
        alternatives:['The game state may have offered many natural call spots.','Raise opportunities may have been limited by stack or price.'],
        testNext:'Watch whether calls remain dominant when a clean raise option is available.',
        dominance:mix.callRate/100
      };
    }
    if(mix.checkRate >= 45){
      return {
        headline:'LOW-COST / CHECK-HEAVY SO FAR',
        observation:`Checks are ${mix.checkRate}% of ${mix.total} visible actions.`,
        interpretation:'The sample currently contains many no-cost continuations.',
        alternatives:['Frequent free options may be structural rather than behavioural.','Board texture and position can produce long check sequences.'],
        testNext:'Compare behaviour once meaningful price pressure appears.',
        dominance:mix.checkRate/100
      };
    }
    return {
      headline:'MIXED ACTION PROFILE',
      observation:`Raise ${mix.raiseRate}% · call ${mix.callRate}% · check ${mix.checkRate}% · fold ${mix.foldRate}%.`,
      interpretation:'No single action family dominates enough to deserve a stronger behavioural label.',
      alternatives:['Different situations may be pulling behaviour in different directions.','The sample can still be too small for stable separation by street and price.'],
      testNext:'Keep collecting action lines and look for repeated behaviour under similar pressure rather than forcing one global label.',
      dominance:.5
    };
  }

  function buildActorRead(actor,allRows){
    const rows=allRows.filter(r=>r.who===actor);
    const mix=actionMix(rows);
    const read=pressureRead(mix);
    const conf=confidence(mix.total,read.dominance);
    return {
      actor,
      label:actor==='player'?'YOU':'HOUSE MIND',
      sample:mix.total,
      confidence:conf,
      headline:read.headline,
      observation:read.observation,
      interpretation:read.interpretation,
      alternatives:read.alternatives,
      testNext:read.testNext,
      movement:movement(rows),
      metrics:{
        raiseRate:mix.raiseRate,
        callRate:mix.callRate,
        checkRate:mix.checkRate,
        foldRate:mix.foldRate,
        allIns:mix.counts.allIn,
        byStreet:mix.byStreet
      }
    };
  }

  function lastHandWhy(source){
    const hand=source.history[0];
    if(!hand) return {
      title:'WHY? — WAITING FOR CONTACT',
      observation:'No completed hand is available yet.',
      interpretation:'No behavioural explanation has been earned.',
      alternatives:['Play a hand first.'],
      next:'Finish a hand, then inspect the visible action line.'
    };
    const mix=actionMix(hand.actions);
    const raises=hand.actions.filter(a=>a.action==='raise').length;
    const folds=hand.actions.filter(a=>a.action==='fold').length;
    return {
      title:`WHY? — HAND ${hand.handNo ?? '—'}`,
      observation:`Visible line: ${hand.actions.length} actions · ${raises} raise${raises===1?'':'s'} · ${folds} fold${folds===1?'':'s'} · ended by ${hand.endReason||'known result'}.`,
      interpretation: raises>=2 ? 'The hand contained repeated pressure. That supports describing the line as pressure-rich; it does not prove confidence, bluffing or a particular hidden hand.' : folds ? 'The hand ended with surrender. The fold is fact; fear, weakness, discipline or deception are interpretations unless separately supported.' : 'The line contains limited pressure evidence, so motive should remain open.',
      alternatives:['Cards and price may explain the line without any stable behavioural tendency.','Position, stack depth and prior action can change what the same button press means.'],
      next:'Compare this line with future hands under similar visible conditions and update the read if the pattern fails to repeat.'
    };
  }

  function analyze(input={}){
    const source=normalize(input);
    const rows=flatten(source);
    return {
      version:VERSION,
      source:'VISIBLE_ACTION_HISTORY_ONLY',
      law:'OBSERVATION != INTERPRETATION != FACT',
      keeper:'READ THE HUMAN GAME WITHOUT PRETENDING THE READ IS THE HUMAN.',
      totalVisibleActions:rows.length,
      player:buildActorRead('player',rows),
      house:buildActorRead('ai',rows),
      why:lastHandWhy(source),
      boundary:'Behavioural reads are revisable interpretations of visible actions. They do not reveal hidden cards, diagnose personality, prove motive, or become poker-state authority.'
    };
  }

  window.PUKAHumanGame={VERSION,analyze,cleanAction,normalize,confidence};
})();
