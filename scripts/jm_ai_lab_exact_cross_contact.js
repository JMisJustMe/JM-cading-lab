#!/usr/bin/env node
const fs=require('fs');
const p='ai-federation/jm-ai-lab-v2.0/00_OPEN_FIRST_JM_AI_LAB_v2_0_FULL_COMPLETE.html';
const s=fs.readFileSync(p,'utf8');
const m=s.match(/classify\(task\)\{([\s\S]*?)\n  \},\n\n  plan\(task\)/);
if(!m) throw Error('exact JM.Agent.classify body not found');
const JM={Knowledge:{ensure:()=>({docs:[{id:'federation-contact'}]})}};
const classify=new Function('JM','task',m[1]);
const contacts=[
 {id:'trace-reentry',text:'The stored evidence says the route caused a consequence, left a trace, persisted, and re-entry changed the next action.',expect:'grounded'},
 {id:'status',text:'Show the current state of the lab.',expect:'status'},
 {id:'generate',text:'Write a short sample about routes.',expect:'generate'}
];
const results=contacts.map(x=>({...x,route:classify(JM,x.text)}));
if(!results.every(x=>x.route===x.expect)) throw Error(JSON.stringify(results));
console.log(JSON.stringify({schema:'jm.ai-lab-exact-cross-contact/0.1',status:'PASS',source:p,extractedFunction:'JM.Agent.classify',results,differentialYield:'AI Lab contributes deterministic task-route classification not supplied by the AILatheo ROD decision itself.',ding:'JM_AI_LAB_EXACT_CROSS_CONTACT_DING'},null,2));
