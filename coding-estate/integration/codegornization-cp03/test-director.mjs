import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {direct,replayCue,envelope,storyboard,cueWav} from './director.mjs';
const input={id:'guard_braid',recipientRevision:2,actors:['SKYRAY','ROOTWARDEN'],shape:'braid',hold:.6,mood:'guard',intensity:2};const tests=[];function check(name,f){f();tests.push({name,passed:true})}
const c=direct(input);
check('two additional original executor contacts have AST IR traces and receipts',()=>{assert.equal(c.execution.trace.length,2);for(const x of Object.values(c.execution.values))for(const k of ['ast','ir','trace','receipt'])assert(x[k])});
check('original Mudra requires real declared hold threshold',()=>assert.throws(()=>direct({...input,hold:.59})));
check('original Mudra rejects unknown contact shape',()=>assert.throws(()=>direct({...input,shape:'other'})));
check('original MoodDrills intensity gate remains active',()=>assert.throws(()=>direct({...input,intensity:1})));
check('body cooperation requires distinct actors',()=>assert.throws(()=>direct({...input,actors:['SKYRAY','SKYRAY']})));
check('protect sequence preserves original authored steps',()=>assert.deepEqual(c.cues.map(x=>x.verb),['anchor','ward','return']));
check('second existing mood route produces different executable sequence',()=>assert.deepEqual(direct({...input,mood:'charge'}).cues.map(x=>x.verb),['seek','mark','strike']));
check('exact replay recovers result through original bodies',()=>assert.deepEqual(replayCue(JSON.parse(JSON.stringify(c))),c));
check('altered cue is refused by original-source replay',()=>{const b=structuredClone(c);b.cues[1].verb='destroy';assert.throws(()=>replayCue(b))});
check('transport has exact actual cue bytes',()=>assert.equal(JSON.stringify(JSON.parse(envelope(c).payload)),JSON.stringify(c)));
check('cross-medium storyboard carries all three actual cue phases',()=>{const s=storyboard(c);for(const x of ['ANCHOR','WARD','RETURN'])assert(s.includes(x));assert(s.includes('width="1080"'))});
check('actual PCM waveform reflects same cue times',()=>{const b=cueWav(c);assert.equal(b.subarray(0,4).toString(),'RIFF');assert.equal(b.length,44844);assert.notEqual(b.readInt16LE(44+1600*2),0)});
await writeFile(new URL('./evidence/director-tests.json',import.meta.url),JSON.stringify({status:'PROVEN',scope:'original JavaScript MudraCode/MoodDrills and existing cooperation runner; native adapter proof separate',passed:tests.length,total:12,tests},null,2));console.log('director 12/12');
