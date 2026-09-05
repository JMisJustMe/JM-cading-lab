'use strict';
const P=require('./puka-pattern-window-v01.js');
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
const read=(signal,kind,confidence='medium',street='flop')=>({signal,confidence,street,resolution:{kind,status:'PUBLIC CONSEQUENCE'}});
assert(P.version==='0.17A','version missing');
let r=P.compare([],6);
assert(r.current.available===0&&r.headline==='WINDOW NEEDS MORE CONTACT','empty-window state wrong');
r=P.compare([
  read('strong','supported'),read('strong','corrected'),read('pressure','open'),read('uncertain','uncertain')
],6);
assert(r.current.contradictionSignals.includes('strong'),'same-signal contradiction not detected');
assert(r.headline==='CONTRADICTION IS PART OF THE PATTERN','contradiction did not outrank pattern claim');
r=P.compare([
  read('pressure','supported'),read('weak','supported'),read('strong','supported'),read('pressure','open')
],6);
assert(r.headline==='REPEATED SUPPORT — STILL PROVISIONAL','repeated support not surfaced');
assert(/not hidden-state certainty/i.test(r.detail),'support language overreached');
r=P.compare([
  read('strong','corrected'),read('weak','corrected'),read('pressure','corrected'),
  read('strong','supported'),read('weak','supported'),read('pressure','supported'),
  read('strong','supported'),read('weak','supported'),read('pressure','supported')
],6);
assert(r.shifted===true,'recent-versus-long direction shift not detected');
assert(r.headline==='RECENT CONTACT CHANGED THE READ','shift headline missing');
r=P.compare([read('uncertain','uncertain'),read('uncertain','uncertain'),read('pressure','open')],3);
assert(r.headline==='THE WINDOW IS CORRECTLY OPEN','disciplined open window not recognised');
const hostile=P.compare([{signal:'bluff',confidence:'high',street:'turn',privateNote:'SECRET',holeCards:['As','Ad'],resolution:{kind:'supported',status:'X'}}],3);
assert(!JSON.stringify(hostile).includes('SECRET')&&!JSON.stringify(hostile).includes('As'),'hidden/private fields crossed comparative membrane');
assert(P.compare([read('strong','supported')],6).law.includes('PATTERN != PROOF'),'claim boundary missing');
console.log('PUKA v0.17A PATTERN WINDOW CODE DING PASS');
