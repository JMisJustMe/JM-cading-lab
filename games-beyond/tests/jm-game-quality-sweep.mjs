/**
 * JM Games&Beyond CP24 — source-contact sweep of original direct HTML bodies.
 * NOT an Estate-wide census or a certificate of visual quality or device play.
 * Source presence and declared input routes are never promoted to runtime proof.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const dir=join(dirname(fileURLToPath(import.meta.url)), '..', 'bodies');
const names=readdirSync(dir).filter(n=>n.endsWith('.html')).sort();
const assessments=[];
for(const name of names){
 const s=readFileSync(join(dir,name),'utf8');
 const canvas=/<canvas\b/i.test(s);
 const report={
  file:name,
  bytes:Buffer.byteLength(s),
  kind:canvas?'canvas_game_or_loop':'source_tool_or_other',
  viewport:/<meta\s+name=["']viewport["']/i.test(s),
  touch:/pointerdown|touchstart|touch-action/i.test(s),
  keyboard:/keydown|keyboard\.aim_release/i.test(s),
  safeArea:/safe-area-inset/i.test(s),
  reducedMotion:/prefers-reduced-motion/i.test(s),
  control44:/min-height:\s*(?:44|4[5-9]|[5-9]\d)px/i.test(s),
  sourceOnly:true
 };
 report.openGates=canvas?Object.entries({
   viewport:report.viewport,touch:report.touch,keyboard:report.keyboard,
   safeArea:report.safeArea,reducedMotion:report.reducedMotion,control44:report.control44
 }).filter(([_,pass])=>!pass).map(([key])=>key):[];
 assessments.push(report);
}
const byName=Object.fromEntries(assessments.map(x=>[x.file,x]));
const requireBody=(name)=>{const x=byName[name];assert(x,'exact body missing: '+name);return x;};
const drag=requireBody('drag-aim-loop-kernel-v0-9-9.html');
const fight=requireBody('fight-clash-v0-4.html');
const future=requireBody('futarized-v1-2.html');
for(const body of [drag,fight,future]) {
 assert(body.viewport&&body.touch&&body.keyboard&&body.safeArea&&body.reducedMotion,
   'CP24 contact regression: '+body.file+' '+body.openGates.join(','));
}
const src=(name)=>readFileSync(join(dir,name),'utf8');
assert.match(src(drag.file),/keyboard\.aim_release/);
assert.match(src(drag.file),/state\.keyboardPreview=true/);
assert.match(src(fight.file),/releaseHeldContact/);
assert.match(src(fight.file),/if\(e\.type==='pointercancel'\)\{hold\.moveX=0/);
assert.match(src(future.file),/releaseAimGesture/);
assert.match(src(future.file),/\.controls \.btn\{min-height:44px\}/);
const holds=assessments.filter(a=>a.kind.startsWith('canvas_')&&a.openGates.length);
console.log('JM_GAMES_CP24_SOURCE_SWEEP',JSON.stringify({
 scope:'DIRECT_GAME_BODIES_ONLY_NOT_ESTATE_CENSUS',
 checked:assessments.length,canvasBodies:assessments.filter(a=>a.kind.startsWith('canvas_')).length,
 receiverSourceChecks:'3/3',unresolvedSourceGates:holds.map(a=>({file:a.file,gates:a.openGates})),
 deviceAndAestheticClaim:'HOLD',assessments
},null,2));
