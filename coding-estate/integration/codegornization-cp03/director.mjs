import {MudraCode,MoodDrills} from '../codegornization-cp02/donors/embodied-native.mjs';
import {cooperate,equal} from '../codegornization-cp02/cooperate.mjs';
import {createHash} from 'node:crypto';
export const BODY_SHA256='7452922aa3ba8dcccfba518d5dd4ace00f07a355c5375282db66b3922c8d15bc';
export const PROGRAMS={
 mudra:'mudra Braid {\nshape = braid\nhold = 0.6\nroute = link\nstate = poised\n}',
 mood:'drill Guard {\nmood = guard\nintensity = 2\nsteps = [anchor, ward, return]\nshift = steadfast\nroute = protect\n}\ndrill Charge {\nmood = charge\nintensity = 2\nsteps = [seek, mark, strike]\nshift = resolute\nroute = focus\n}'
};
const sha=x=>createHash('sha256').update(x).digest('hex');
export const PROGRAM_SEAL=sha(JSON.stringify(PROGRAMS));
export function direct(input){
 if(!/^[A-Za-z0-9_-]{1,60}$/.test(input.id)||!Number.isInteger(input.recipientRevision)||input.recipientRevision<0)throw Error('DIRECTOR_ID_OR_REVISION');
 if(!Array.isArray(input.actors)||input.actors.length!==2||new Set(input.actors).size!==2||input.actors.some(x=>!['SKYRAY','ROOTWARDEN','PRISMWISP'].includes(x)))throw Error('TWO_DISTINCT_ACTORS_REQUIRED');
 const execution=cooperate({MudraCode:(s,v)=>MudraCode.execute(s,v),MoodDrills:(s,v)=>MoodDrills.execute(s,v)},[
  {id:'intent',body:'MudraCode',args:i=>[PROGRAMS.mudra,{shape:i.shape,hold:i.hold}]},
  {id:'sequence',body:'MoodDrills',args:(i,v)=>{if(v.intent.state.nextRoute!=='link')throw Error('INTENT_ROUTE');return[PROGRAMS.mood,{mood:i.mood,intensity:i.intensity}]}}
 ],input);
 const mood=execution.values.sequence.state;
 return {schema:'jm.cooperation.choreography/1',id:input.id,bodySHA256:BODY_SHA256,programSeal:PROGRAM_SEAL,expectedRecipientRevision:input.recipientRevision,input:structuredClone(input),intent:execution.values.intent.state,mode:mood.nextRoute,actors:input.actors,cues:mood.completed.map((verb,index)=>({index,time:index*.45,verb,actors:input.actors})),execution};
}
export function replayCue(cue){const actual=direct(cue.input);if(!equal(actual,cue))throw Error('CUE_REPLAY_MISMATCH');return actual}
export function envelope(cue){replayCue(cue);const payload=JSON.stringify(cue);return{schema:'jm.targetbridge.choreography/1',payload,payloadSHA256:sha(payload)}}
export function storyboard(cue){replayCue(cue);return '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="360" viewBox="0 0 1080 360"><rect width="1080" height="360" fill="#0b202c"/>'+cue.cues.map(c=>`<g transform="translate(${c.index*360},0)"><rect x="10" y="10" width="340" height="340" rx="20" fill="#153445" stroke="#82d6c5"/><text x="28" y="48" fill="white" font-size="20">${c.index+1} · ${c.verb.toUpperCase()}</text><path d="M80 160 L140 130 L200 160 L140 180 Z" fill="#ffd080"/><path d="M260 150 L260 230 M225 230 L260 200 L295 230" stroke="#82d6a0" stroke-width="12" fill="none"/><circle cx="260" cy="140" r="34" fill="#82d6a0"/><path d="M145 180 Q200 ${220-c.index*35} 260 180" stroke="#ddc3ff" stroke-width="5" fill="none"/><text x="28" y="285" fill="#b6d9e6" font-size="15">${c.time.toFixed(2)}s · ${cue.mode}</text></g>`).join('')+'</svg>'}
export function cueWav(cue){replayCue(cue);const rate=16000,n=Math.round(1.4*rate),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){let v=0;for(const c of cue.cues){const t=i/rate-c.time;if(t>=0&&t<.22)v+=Math.sin(t*2*Math.PI*[261.63,329.63,392][c.index])*Math.exp(-t*18)*.3}b.writeInt16LE(Math.max(-32767,Math.min(32767,Math.round(v*32767))),44+i*2)}return b}
