import {ContactBand, GlyphBody, FormulaGate, RouteFrame, StateField} from './donors/field-primitives-native.mjs';
import {ContactCode} from './donors/embodied-native.mjs';
import {need, stable, digest} from './donors/native-core.mjs';
import {cooperate, equal} from './cooperate.mjs';

export const SOURCES=Object.freeze({
 ContactBand:'band Conduct {\n range 0..10\n zone soft 0..3.49 route mend\n zone firm 3.49..7.49 route lance\n zone hard 7.49..10 route nova\n}',
 GlyphBody:'glyph Mend "~" pressure=soft route=mend\nglyph Lance "!" pressure=firm route=lance\nglyph Nova "*" pressure=wide route=nova',
 ContactCode:'contact Conduct {\n target = field\n pressure >= 1\n hold >= 0.35\n effect contact.accepted = true\n}',
 FormulaGate:'gate Conduct(force, focus) {\n formula force + focus\n pass when result >= 7\n onpass target.authorized = true\n onfail target.authorized = false\n}',
 RouteFrame:'frame Conduct {\n entry check\n step check when target.authorized == true goto commit else reject\n step commit do target.hit = true end\n step reject do target.hit = false end\n}',
 StateField:'field Pattern {\n state dormant\n state live\n transition Activate dormant -> live when target.authorized == true\n}'
});
export const ORIGINALS={ContactBand, GlyphBody, ContactCode, FormulaGate, RouteFrame, StateField};
const adapters=Object.fromEntries(Object.entries(ORIGINALS).map(([name,body])=>[name,(...args)=>body.execute(...args)]));
const plan=[
 {id:'band',body:'ContactBand',args:i=>[SOURCES.ContactBand,i.pressure]},
 {id:'glyph',body:'GlyphBody',args:i=>[SOURCES.GlyphBody,i.glyph]},
 {id:'contact',body:'ContactCode',args:i=>[SOURCES.ContactCode,{target:'field',pressure:i.pressure,hold:i.hold},{}]},
 {id:'gate',body:'FormulaGate',args:(i,v)=>[SOURCES.FormulaGate,{force:v.band.state.pressure,focus:v.contact.passed?5:0},{target:{authorized:false}}]},
 {id:'route',body:'RouteFrame',args:(i,v)=>[SOURCES.RouteFrame,v.gate.state]},
 {id:'field',body:'StateField',args:(i,v)=>{need(v.contact.passed&&v.route.state.target.hit,'CONTACT_HOLD');return[SOURCES.StateField,'Activate',v.route.state]}}
];
export const sourceDigest=digest(SOURCES);
export function conduct(input, before) {
 need(input && /^[A-Za-z0-9_-]{1,60}$/.test(input.id),'BAD_ID');
 need(Number.isFinite(input.pressure)&&input.pressure>=1&&input.pressure<=10,'BAD_PRESSURE');
 need(Number.isFinite(input.hold)&&input.hold>=.35&&input.hold<=3,'BAD_DURATION');
 need(['~','!','*'].includes(input.glyph),'BAD_GLYPH');
 need(before&&Number.isFinite(before.energy)&&before.energy>=22&&before.energy<=100,'ENERGY_HOLD');
 need(Number.isInteger(before.revision)&&before.revision>=0,'BAD_REVISION');
 const exact={id:input.id,glyph:input.glyph,pressure:input.pressure,hold:input.hold};
 const result=cooperate(adapters,plan,exact), v=result.values;
 const route=v.glyph.state.nextRoute, strength=+(input.pressure+input.hold*2).toFixed(3);
 const pattern={id:input.id,route,strength,duration:4+input.hold*2,radius:80+input.pressure*8,color:({'~':'#79f6d4','!':'#ffd080','*':'#ff9bd6'})[input.glyph],notes:({'~':[60,64,67],'!':[55,62,69],'*':[60,67,74,79]})[input.glyph],state:v.field.state.fields.Pattern};
 const record={schema:'jm.conduct/1',sourceDigest,input:exact,before:structuredClone(before),after:{energy:before.energy-22,revision:before.revision+1},pattern,trace:result.trace};
 record.digest=digest(record);return record;
}
export function replay(record){
 need(record?.schema==='jm.conduct/1'&&record.sourceDigest===sourceDigest,'SOURCE_DRIFT');
 const actual=conduct(record.input,record.before);
 need(equal(actual,record),'REPLAY_MISMATCH');return actual;
}
export function replayLedger(records){
 need(Array.isArray(records)&&records.length<=200,'LEDGER_LIMIT');const ids=new Set();
 return records.map((r,i)=>{need(!ids.has(r?.input?.id),'DUPLICATE_OPERATION');ids.add(r.input.id);need(r.before.revision===i,'REVISION_GAP');return replay(r)});
}
export function cardSVG(record){
 const p=replay(record).pattern; // All rendered values derive from finite, closed inputs.
 const shape=p.route==='mend'?'<path d="M210 105v100m-50-50h100"/>':p.route==='lance'?'<path d="M130 200l160-95-65 120 5-60z"/>':'<path d="M210 95l15 40 45-15-25 40 35 30-45-2-25 40-10-45-45 2 35-30-25-40 40 15z"/>';
 return `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280" viewBox="0 0 420 280"><rect width="420" height="280" rx="22" fill="#0c1928"/><g fill="none" stroke="${p.color}" stroke-width="6" stroke-linecap="round">${shape}</g><text x="24" y="40" font-family="sans-serif" font-size="19" fill="${p.color}">JM FIELDWEAVE · ${p.route.toUpperCase()}</text><text x="24" y="252" font-family="sans-serif" font-size="14" fill="white">Strength ${p.strength} · ${p.duration.toFixed(1)}s · ${record.digest}</text></svg>`;
}
export function score(record){const p=replay(record).pattern;return {schema:'jm.conduct.score/1',source:record.digest,bpm:108,events:p.notes.map((midi,i)=>({midi,start:i*.22,duration:.5,velocity:.55}))};}
export function wav(record){
 const events=score(record).events,rate=22050,n=Math.ceil((events.at(-1).start+.6)*rate),buf=new ArrayBuffer(44+n*2),v=new DataView(buf);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};str(0,'RIFF');v.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){let a=0;for(const e of events){const t=i/rate-e.start;if(t>=0&&t<e.duration)a+=Math.sin(t*2*Math.PI*440*2**((e.midi-69)/12))*Math.min(1,t/.012)*(1-t/e.duration)*.22;}v.setInt16(44+i*2,Math.max(-1,Math.min(1,a))*32767,true)}
 return new Uint8Array(buf);
}
