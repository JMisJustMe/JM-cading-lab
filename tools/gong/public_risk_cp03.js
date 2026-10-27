/* JM GONG CP03 public-safe risk projection.
 * Distinct implementation of conservative source-delta classification.
 * Source lineage: protected CP02 artifact comparator, CP01 GONG retest policy,
 * zezu.nwona DONG autolink. This file does not contain those private parents.
 * Author: JM / Theodore Benjamin Scott. Advisory only; no Fold PASS claims.
 */
'use strict';
const crypto=require('node:crypto');
const H=data=>crypto.createHash('sha256').update(data).digest('hex');
const DIRECT=['touch_routing','viewport','permission','persistence','network','native_packaging','new_device_surface','input_modality','third_party','file_access','gpu','security','hosting','major_structure','service_worker','cross_origin','unknown_high_risk'];
const LOCAL=['styling','markup','script_logic','formatting_plus','accessibility','text_or_content','media'];
const SAFE=['unchanged','whitespace_only','comment_only'];
const hazards={
 touch_routing:/\b(?:touch\w*|pointer\w*|gesture\w*|onpointer\w*|ontouch\w*|touchAction|touch-action|preventDefault\s*\(|setPointerCapture\s*\()/i,
 viewport:/\b(?:viewport|visualViewport|window\.inner(?:Width|Height)|screen\.orientation|resizeObserver|devicePixelRatio|orientationchange)/i,
 permission:/\b(?:requestPermission|mediaDevices|geolocation|bluetooth|requestDevice|requestPort|clipboard\.write|requestFullscreen)/i,
 persistence:/\b(?:localStorage|sessionStorage|indexedDB|caches\.|openDatabase|storage\.persist)/i,
 network:/\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|navigator\.onLine)/i,
 third_party:/\bhttps?:\/\/[^\s"'<>]+/i,
 file_access:/\b(?:FileReader|showOpenFilePicker|showSaveFilePicker|webkitdirectory|readAsArrayBuffer|createObjectURL)/i,
 gpu:/\b(?:webgl\w*|WebGL|WebGPU|\.getContext\s*\(\s*['"](?:2d|webgl|webgl2)|requestAdapter)/i,
 service_worker:/\b(?:serviceWorker|SharedWorker|new Worker\s*\(|importScripts)/i,
 cross_origin:/\b(?:postMessage|MessageChannel|crossOrigin|document\.domain|withCredentials)/i,
 security:/\b(?:innerHTML|outerHTML|eval\s*\(|new Function\s*\(|document\.write|dangerouslySetInnerHTML|Content-Security-Policy)/i,
 input_modality:/\b(?:addEventListener\s*\(\s*['"](?:click|key|mouse|pointer|touch)|on(?:click|key|mouse)|keyboard|gamepad|pointer|touch)/i,
};
const sorted=x=>[...new Set(x)].sort();
function diffSnippet(a,b){
 let start=0;while(start<a.length&&start<b.length&&a.charCodeAt(start)===b.charCodeAt(start))start++;
 let tail=0;while(tail<a.length-start&&tail<b.length-start&&a.charCodeAt(a.length-1-tail)===b.charCodeAt(b.length-1-tail))tail++;
 const ctx=120;return a.slice(Math.max(0,start-ctx),a.length-tail+ctx)+'\n'+b.slice(Math.max(0,start-ctx),b.length-tail+ctx);
}
function classify(name,oldBuffer,newBuffer){
 if(oldBuffer?.equals(newBuffer))return{changes:['unchanged'],regions:0,notes:[]};
 const ext=require('node:path').extname(name).toLowerCase();
 if(['.wasm','.apk','.aab','.so'].includes(ext))return{changes:['native_packaging'],regions:1,notes:[]};
  if(!['.html','.htm','.js','.mjs','.cjs','.ts','.tsx','.jsx','.json','.jsonc','.css','.scss','.vue','.svelte'].includes(ext))return{changes:['unknown_high_risk'],regions:1,notes:['PUBLIC_PROJECTION_UNKNOWN_EXTENSION']};
 if(oldBuffer.includes(0)||newBuffer.includes(0))return{changes:['unknown_high_risk'],regions:1,notes:['BINARY_IN_TEXT_ASSET']};
 const a=oldBuffer.toString('utf8'),b=newBuffer.toString('utf8');
 if(a.length+b.length>4_000_000)return{changes:['unknown_high_risk'],regions:1,notes:['DIFF_TOO_LARGE_FOR_PROJECTION']};
 const segment=diffSnippet(a,b),found=[];
 let type=['.css','.scss'].includes(ext)?'styling':(['.html','.htm'].includes(ext)?'markup':'script_logic');
 if(ext==='.html'||ext==='.htm'){
  if(/<script\b|<\/script\b|on\w+\s*=/.test(segment))type='script_logic';
  else if(/<style\b|<\/style\b|style\s*=/.test(segment))type='styling';
  else if(/aria-|role=|tabindex=/.test(segment))type='accessibility';
  else if(!/<[^>]+>/.test(segment))type='text_or_content';
  const viewport=t=>(t.match(/<meta\b[^>]*name\s*=\s*['"]viewport['"][^>]*>/gi)||[]).join('\n');
  if(viewport(a)!==viewport(b))found.push('viewport');
 }
 found.push(type);
 for(const [key,re] of Object.entries(hazards)){
  if(key==='viewport'&&/\.html?$/.test(ext))continue;
  if(re.test(segment))found.push(key);
 }
 if(/<script\b[^>]*src\s*=|\bimport\s*\(|\brequire\s*\(/i.test(segment))found.push('third_party');
 if(/\btype\s*=\s*['"]file['"]/i.test(segment))found.push('file_access');
 return{changes:sorted(found),regions:1,notes:['PUBLIC_SAFE_HEURISTIC_NOT_SEMANTIC_PROOF']};
}
module.exports={H,DIRECT,LOCAL,SAFE,classify};