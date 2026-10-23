/**
 * JM M002 CP17 — real productions in three independent media.
 * Inherits CURRENT-native CP10 composed Contact, ChoiceBox, CombiBind,
 * JMLogic and OneBody. This Node producer is separate from CP17 offline
 * browser adaptations. No original THEOGRAPHY engine or author identity claim.
 */
import {createHash} from 'node:crypto';
import {executeCP10Composition} from './m002-cp10-multi-mechanism.mjs';
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const sha=x=>createHash('sha256').update(x).digest('hex');
const media=['book','music','cartoon'];
const prefix='jm.m002.cp17';
export const CP17_MEDIA_AUTHORITY=Object.freeze({
 currentNative:'CP10 actual Contact Kernel + ChoiceBox + CombiBind + JMLogic + OneBody',
 media,formats:['printable text/html','PCM WAV audio/wav','SVG with executable motion'],
 hold:'Finished published book/song/cartoon, original independent THEOGRAPHY, physical Android and cloud return untested'
});
function validateSource(e,kind){
 if(!e||e.medium!==kind||e.status!=='NATIVE_COMPOSITION_EXECUTED'||
  !e.combibind?.state||e.combibind.state.collapsed!==false||
  e.logic.allowed!==true||!e.oneBody?.receipt?.ok||
  e.contact?.state?.earned?.length<2||!e.artifact)
  throw Error('CP17_SOURCE_PROOF_HOLD');
}
function htmlBook(e,changes={}){
 const scenes=e.artifact.scenes;
 if(!Array.isArray(scenes)||!scenes.length)throw Error('CP17_BOOK_SOURCE_HOLD');
 const title=changes.title||e.subject+' — The Return';
 if(typeof title!=='string'||title.length>120)throw Error('CP17_BOOK_TITLE_HOLD');
 const edited=changes.chapters||scenes.map((v,i)=>({heading:'Chapter '+(i+1),paragraph:v.paragraph}));
 if(!Array.isArray(edited)||!edited.length||edited.length>12||
  edited.some(p=>typeof p.heading!=='string'||p.heading.length>120||
    typeof p.paragraph!=='string'||p.paragraph.length>15000))
  throw Error('CP17_BOOK_EDIT_HOLD');
 const text='<!doctype html><html lang="en"><meta charset="utf-8"><title>'+esc(title)+
 '</title><style>body{font:18px/1.65 Georgia,serif;max-width:720px;margin:6vh auto;padding:0 25px;color:#152b39}h1{text-align:center}h2{break-before:page}</style>'+
 '<h1>'+esc(title)+'</h1><p>'+esc(e.subject)+' · '+esc(e.chosen)+' · JM CP17</p>'+
 edited.map(c=>'<section><h2>'+esc(c.heading)+'</h2><p>'+esc(c.paragraph)+'</p></section>').join('')+'</html>';
 return {body:Buffer.from(text),editable:{schema:prefix+'.book-work/1',title,chapters:edited,subject:e.subject,choice:e.chosen}};
}
function wavMusic(e,changes={}){
 const src=e.artifact.measures;
 if(!Array.isArray(src)||!src.length)throw Error('CP17_MUSIC_SOURCE_HOLD');
 const tempo=changes.tempo||e.artifact.tempo;
 if(!Number.isInteger(tempo)||tempo<60||tempo>180)throw Error('CP17_TEMPO_HOLD');
 const hz=src.map(v=>v.hz||v.frequencyHz||261.63);
 if(hz.some(v=>!Number.isFinite(v)||v<20||v>18000))throw Error('CP17_MUSIC_NOTES_HOLD');
 const pattern=changes.pattern||Array.from({length:16},(_,i)=>i%4===0);
 if(!Array.isArray(pattern)||pattern.length!==16||pattern.some(v=>typeof v!=='boolean'))
  throw Error('CP17_MUSIC_PATTERN_HOLD');
 const rate=22050,duration=4*4*60/tempo,n=Math.round(rate*duration),out=Buffer.alloc(44+n*2);
 out.write('RIFF',0);out.writeUInt32LE(36+n*2,4);out.write('WAVEfmt ',8);
 out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(1,22);
 out.writeUInt32LE(rate,24);out.writeUInt32LE(rate*2,28);
 out.writeUInt16LE(2,32);out.writeUInt16LE(16,34);out.write('data',36);
 out.writeUInt32LE(n*2,40);
 const stepDuration=60/tempo/4;
 for(let i=0;i<n;i++){
  const t=i/rate,step=Math.floor(t/stepDuration),local=t-step*stepDuration;
  const freq=hz[step%hz.length],gate=pattern[step%16];
  let signal=gate?.28*Math.sin(2*Math.PI*freq*local)*Math.exp(-5*local):0;
  if(step%4===0)signal+=.5*Math.sin(2*Math.PI*(80-35*Math.min(1,local/.12))*local)*Math.exp(-20*local);
  if(step%8===4)signal+=.12*Math.sin(2*Math.PI*1760*local)*Math.exp(-20*local);
  out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,signal))*32767),44+i*2);
 }
 return {body:out,editable:{schema:prefix+'.music-work/1',tempo,pattern,notes:hz,subject:e.subject,choice:e.chosen}};
}
function svgCartoon(e,changes={}){
 const source=e.artifact.beats;
 if(!Array.isArray(source)||!source.length)throw Error('CP17_CARTOON_SOURCE_HOLD');
 const frames=changes.frames||source.map((v,i)=>({x:80+i*Math.min(130,550/Math.max(1,source.length-1)),
  y:240-(i%3)*30,caption:v.motion}));
 if(!Array.isArray(frames)||frames.length<2||frames.length>12||
  frames.some(x=>!Number.isFinite(x.x)||x.x<40||x.x>680||
    !Number.isFinite(x.y)||x.y<50||x.y>335||
    typeof x.caption!=='string'||x.caption.length>130))throw Error('CP17_CARTOON_FRAMES_HOLD');
 const s=(a)=>a.map(v=>v.toFixed(1)).join(';'),xs=s(frames.map(f=>f.x)),ys=s(frames.map(f=>f.y-35));
 const dt=(frames.length*1.3).toFixed(2),svg='<svg xmlns="http://www.w3.org/2000/svg" width="720" height="405" viewBox="0 0 720 405">'+
 '<rect width="720" height="405" fill="#16374a"/><path d="M0 318 Q220 250 420 285 T720 230 V405 H0Z" fill="#205f66"/>'+
 '<path d="M35 335 Q250 300 640 175" fill="none" stroke="#acead6" stroke-width="4" stroke-dasharray="6 10"/>'+
 '<circle cx="'+frames[0].x+'" cy="'+(frames[0].y-35)+'" r="26" fill="#b4ffe8">'+
 '<animate attributeName="cx" values="'+xs+';'+frames[0].x+'" dur="'+dt+'s" repeatCount="indefinite"/>'+
 '<animate attributeName="cy" values="'+ys+';'+(frames[0].y-35)+'" dur="'+dt+'s" repeatCount="indefinite"/></circle>'+
 '<text x="22" y="38" font-family="sans-serif" font-size="22" fill="white">'+esc(e.subject)+' · '+esc(e.chosen)+'</text>'+
 '<text x="22" y="382" font-family="sans-serif" font-size="16" fill="white">'+esc(frames.at(-1).caption)+'</text></svg>';
 return {body:Buffer.from(svg),editable:{schema:prefix+'.cartoon-work/1',frames,subject:e.subject,choice:e.chosen}};
}
export function executeCP17Media(spec,edits={}){
 if(!media.includes(spec?.medium))throw Error('CP17_UNDECLARED_MEDIUM_HOLD');
 const composed=executeCP10Composition(spec);
 if(composed.status!=='NATIVE_COMPOSITION_EXECUTED'){
  if(composed.logic.allowed||composed.artifact!==null)
   throw Error('CP17_DENIAL_CONTRADICTION_HOLD');
  return {schema:prefix+'.materialization/1',status:'WORLD_LAW_HELD',media:spec.medium,
   artifact:null,source:composed.oneBody.receipt,changed:false};
 }
 validateSource(composed,spec.medium);
 const produced=spec.medium==='book'?htmlBook(composed,edits):
   spec.medium==='music'?wavMusic(composed,edits):svgCartoon(composed,edits);
 if(!produced.body.length)throw Error('CP17_EMPTY_NATIVE_OUTPUT_HOLD');
 return {schema:prefix+'.materialization/1',status:'REAL_MEDIA_MATERIALIZED',
  medium:spec.medium,mime:spec.medium==='book'?'text/html':spec.medium==='music'?'audio/wav':'image/svg+xml',
  sha256:sha(produced.body),length:produced.body.length,bytes:produced.body,
  editable:produced.editable,source:{subject:composed.subject,choice:composed.chosen,
   kernel:composed.contact.state.earned.length,oneBody:composed.oneBody.receipt.ok}};
}
export function returnCP17Edition(store,name,result,{expectedSha256=null,approve=false}={}){
 if(!approve)throw Error('CP17_OWNER_APPROVAL_HOLD');
 if(!media.includes(name)||result?.status!=='REAL_MEDIA_MATERIALIZED'||result.medium!==name||
  !Buffer.isBuffer(result.bytes)||sha(result.bytes)!==result.sha256)
  throw Error('CP17_RESTORED_MEDIA_DIGEST_HOLD');
 const prev=store[name]||null;
 if(prev&&prev.sha256!==result.sha256&&expectedSha256!==prev.sha256)
  throw Error('CP17_EXISTING_EDITION_CONFLICT_HOLD');
 const before=prev?structuredClone(prev):null;
 const v={sha256:result.sha256,editable:structuredClone(result.editable),revision:(before?.revision||0)+1};
 store[name]=v;
 if(store[name].sha256!==result.sha256)throw Error('CP17_NATIVE_RETURN_READBACK_HOLD');
 return {status:'SCOPED_CREATIVE_RETURN',medium:name,before,after:structuredClone(v),unchangedOtherMedia:true};
}
