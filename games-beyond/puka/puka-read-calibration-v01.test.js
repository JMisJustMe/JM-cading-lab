'use strict';
const fs=require('fs');
const path=require('path');
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

const html=fs.readFileSync(path.join(__dirname,'00_OPEN_FIRST.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'sw.js'),'utf8');
assert(html.includes('puka-read-calibration-v01.css')&&html.includes('puka-read-calibration-v01.js'),'Canonical OPEN_FIRST door does not load read calibration');
assert(html.includes('PUKA v0.16A'),'OPEN_FIRST version not advanced to v0.16A');
assert(sw.includes("jm-puka-v16a")&&sw.includes('puka-read-calibration-v01.js')&&sw.includes('puka-read-calibration-v01.css'),'Offline carrier does not include v0.16A calibration organ');
assert(!R.summarise([{signal:'bluff',confidence:'high',resolution:{kind:'supported'}}]).detail.match(/proved|known motive/i),'Calibration language promoted a read into hidden motive proof');

console.log('PUKA v0.16A READ CALIBRATION CODE DING PASS');
