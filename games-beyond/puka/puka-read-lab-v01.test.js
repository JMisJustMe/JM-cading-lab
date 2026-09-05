'use strict';

const fs=require('fs');
const path=require('path');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const R=require('./puka-read-lab-v01.js');

assert(R.version==='0.15A','Read Lab version missing');
assert(R.SIGNALS.bluff&&R.SIGNALS.uncertain,'Bluff/uncertainty signals missing');

const sanitized=R.safeAction({who:'ai',action:'raise',street:'flop',potAfter:120,totalBet:80,hole:['A-spades'],motive:'bluff',privateSeed:'SECRET'});
assert(sanitized.who==='ai'&&sanitized.action==='raise','Visible action lost');
assert(!('hole' in sanitized)&&!('motive' in sanitized)&&!('privateSeed' in sanitized),'Private/unknown fields crossed Read Lab membrane');

const packet=R.packetFromGame({
  history:[{handNo:1,winner:'player',endReason:'fold',houseHole:['A-spades'],actions:[{who:'ai',action:'raise',street:'preflop',totalBet:40,secret:'NO'}]}],
  state:{handNo:2,street:'flop',players:{ai:{hole:['K-spades']}},actions:[{who:'ai',action:'call',street:'flop',paid:20,hiddenCard:'NO'}]}
});
const packetText=JSON.stringify(packet);
assert(!packetText.includes('A-spades')&&!packetText.includes('K-spades'),'Hidden card identity leaked into Read Lab packet');
assert(!packetText.includes('secret')&&!packetText.includes('hiddenCard'),'Unknown private field leaked into Read Lab packet');

const baseRead=(signal,actionCount=1)=>({handNo:7,street:'turn',signal,confidence:'medium',actionCount,resolution:null});
let read=baseRead('strong');
R.resolveEntry(read,{state:{handNo:7,ended:true,endReason:'showdown',winner:'ai',actions:[]}});
assert(read.resolution?.kind==='supported'&&/SHOWDOWN RESULT/.test(read.resolution.status),'Strong read did not receive bounded showdown support');
assert(/not proof of motive/i.test(read.resolution.detail),'Showdown support overclaimed motive');

read=baseRead('weak');
R.resolveEntry(read,{state:{handNo:7,ended:true,endReason:'showdown',winner:'ai',actions:[]}});
assert(read.resolution?.kind==='corrected','Contradicted read was not corrected');

read=baseRead('pressure',1);
R.resolveEntry(read,{state:{handNo:7,ended:true,endReason:'fold',winner:'player',actions:[{who:'player',action:'check',street:'turn'},{who:'ai',action:'raise',street:'turn',totalBet:100}]}});
assert(read.resolution?.status==='SUPPORTED BY LATER ACTION','Later visible pressure did not support pressure read');
assert(/not hidden strength/i.test(read.resolution.detail),'Pressure result collapsed into hidden strength');

read=baseRead('bluff');
R.resolveEntry(read,{state:{handNo:7,ended:true,endReason:'showdown',winner:'player',actions:[]}});
assert(read.resolution?.status==='CONSISTENT, NOT PROVED','Bluff candidate was not bounded at showdown');
assert(/does not prove motive/i.test(read.resolution.detail),'Bluff candidate promoted into motive');

read=baseRead('uncertain');
R.resolveEntry(read,{state:{handNo:7,ended:true,endReason:'fold',winner:'ai',actions:[]}});
assert(read.resolution?.status==='DISCIPLINED UNCERTAINTY','Uncertainty was not preserved as a valid read state');

const html=fs.readFileSync(path.join(__dirname,'00_OPEN_FIRST.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert(html.includes('puka-read-lab-v01.css')&&html.includes('puka-read-lab-v01.js'),'Canonical OPEN_FIRST door does not load Read Lab');
assert(html.includes('PUKA v0.16A'),'Inherited Read Lab is not carried by current OPEN_FIRST descendant');
assert(sw.includes("jm-puka-v16a")&&sw.includes('puka-read-lab-v01.js')&&sw.includes('puka-read-lab-v01.css'),'Current offline carrier does not preserve the v0.15A Read Lab');

console.log('PUKA v0.15A READ LAB INHERITANCE DING PASS UNDER v0.16A');
