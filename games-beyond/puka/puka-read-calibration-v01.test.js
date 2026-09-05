'use strict';
const R=require('./puka-read-calibration-v01.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
assert(R.version==='0.16A','version missing');
let s=R.summarise([]);
assert(s.resolved===0&&s.headline==='BUILD A TESTED READ SAMPLE','empty state wrong');
const read=(signal,confidence,kind,status='X')=>({signal,confidence,resolution:{kind,status}});
s=R.summarise([
 read('strong','high','corrected'),
 read('bluff','high','corrected'),
 read('uncertain','low','uncertain'),
 read('pressure','medium','supported')
]);
assert(s.resolved===4,'resolved count wrong');
assert(s.byConfidence.high.corrected===2,'high correction count wrong');
assert(s.headline==='HIGH CONFIDENCE IS RUNNING AHEAD','overconfidence calibration not detected');
assert(/Lower certainty/.test(s.detail),'correction guidance missing');
s=R.summarise([
 read('strong','high','supported'),
 read('pressure','high','supported'),
 read('weak','high','supported'),
 read('uncertain','low','uncertain')
]);
assert(s.headline==='HIGH CONFIDENCE IS EARNING SUPPORT','supported confidence calibration not detected');
assert(/not hidden-state proof/i.test(s.detail),'support was overclaimed');
s=R.summarise([
 read('uncertain','low','uncertain'),
 read('uncertain','medium','uncertain'),
 read('pressure','low','open')
]);
assert(s.headline==='UNCERTAINTY IS ACTIVE DISCIPLINE','uncertainty not rewarded as disciplined state');
assert(s.law.includes('SUPPORTED != PROVED'),'claim boundary missing');
console.log('PUKA v0.16A READ CALIBRATION UNIT DING PASS');
