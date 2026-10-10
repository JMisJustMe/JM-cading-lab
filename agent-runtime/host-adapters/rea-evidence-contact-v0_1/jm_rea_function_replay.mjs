/* JM × REA v0.4: source-guided differential replay of original JM functions. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {normalise,compatibilityBetween} from '../../../coding-estate/integration/router-core.mjs';
import {TraceBoxRuntime} from '../../../coding-estate/sovereign-ten/direct/route-proof-native.mjs';
import {JM32} from '../../../coding-estate/sovereign-ten/direct/language-native.mjs';

const sha = value => crypto.createHash('sha256').update(Buffer.isBuffer(value)?value:(typeof value==='string'?value:(JSON.stringify(value)??'undefined'))).digest('hex');
const hold=(ok,reason)=>{if(!ok)throw Error('JM_FUNCTION_HOLD:'+reason)};
const stops=new Set('a an the and with to for of in on my this that from into please'.split(' '));
const ascii=c=>!!c&&(/[a-z0-9]/).test(c);
// Independent scanner - never invokes original function
export function reconstructedNormalise(input=''){
 const text=String(input).normalize('NFKD').replace(/[’']/g,'').toLowerCase();
 const out=[];let i=0;
 while(i<text.length){
   if(text.slice(i,i+3)==='c++'){out.push('c++');i+=3;continue;}
   if(!ascii(text[i])){i++;continue;}
   let word='';
   while(i<text.length){
     if(ascii(text[i])){word+=text[i++];continue;}
     if((text[i]==='-'||text[i]==='.')&&ascii(text[i+1])){word+=text[i++];continue;}
     break;
   }
   if(!stops.has(word)&&(word.length>1||word==='c++'))out.push(word);
 }
 return out;
}
export function reconstructedCompatibility(a,b,m={}){
 if(!a||!b)return {mode:'unknown',reason:'BODY_MISSING'};
 if(a.id===b.id)return {mode:'same-body',reason:'IDENTICAL_BODY'};
 for(const p of m.directPairs??[])
   if((p.from===a.id&&p.to===b.id)||(p.bidirectional&&p.from===b.id&&p.to===a.id))
     return {mode:'direct',relation:p.relation};
 for(const r of m.familyRules??[])
   if((r.from===a.family||r.from==='*')&&(r.to===b.family||r.to==='*'))
     return {mode:r.mode,relation:a.family+'→'+b.family};
 return {mode:'adapter-required',relation:a.family+'→'+b.family,
   suggestedAdapters:['polyglot-bridge','combi-bind','jmqgraft']};
}
function fixtures(){
 const tokens=['','hello world','C++ and c++','touch-drag.aim','HELLO WORLD',
 'the apple and the orange',"don’t forget it's JS",'café naïve','a.b---c',
 'hello...world','route.os v0.2I','JS / TS / wasm','北京 中文','42',
 null,undefined,2026,'abc++ c+++ c++code','A.B.C','source-ledger tracebox','áéîôü','😀 abc 😀'];
 let seed=0xabc4123;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const alphabet='abcdEFG123.-+ ’_;/é';
 for(let k=0;k<110;k++){let s='';for(let j=0,n=Math.floor(rand()*45);j<n;j++)
   s+=alphabet[Math.floor(rand()*alphabet.length)];tokens.push(s);}
 const a={id:'alpha',family:'logic'},b={id:'beta',family:'route'};
 const pairs=[[null,b,{}],[a,null,{}],[a,{...a},{}],
 [a,b,{directPairs:[{from:'alpha',to:'beta',relation:'logical'}]}],
 [b,a,{directPairs:[{from:'alpha',to:'beta',relation:'logical'}]}],
 [b,a,{directPairs:[{from:'alpha',to:'beta',relation:'logical',bidirectional:true}]}],
 [a,b,{familyRules:[{from:'logic',to:'route',mode:'guarded'}]}],
 [a,b,{familyRules:[{from:'*',to:'route',mode:'broad'}]}],
 [a,b,{familyRules:[{from:'other',to:'other',mode:'deny'}]}],
 [a,b,{directPairs:[{from:'a',to:'b',relation:'wrong'},{from:'alpha',to:'beta',relation:'second'}]}],
 [a,b,{familyRules:[{from:'logic',to:'*',mode:'priority'},{from:'*',to:'route',mode:'second'}]}]];
 return {tokens,pairs};
}
function anchors(rea,sourceText){
 const root=rea?.normalized_result??rea?.records?.[0]?.normalized_result;
 const graph=root?.semantic_graph;
 hold(Array.isArray(graph?.nodes),'NO_REA_GRAPH');
 return ['normalise','compatibilityBetween'].map(name=>{
   const line=sourceText.split(/\r?\n/).findIndex(s=>s.startsWith('export function '+name+'('))+1;
   hold(line>0,'JM_SOURCE_MISSING_'+name);
   const nodes=graph.nodes.filter(n=>n.kind==='function'&&n.label===name&&
     n.identity?.module_path==='router-core.mjs'&&n.identity?.source_range?.start?.line===line);
   hold(nodes.length===1&&/^jsrg_node_[a-f0-9]{64}$/.test(nodes[0].node_id),'REA_ANCHOR_'+name);
   const links=(graph.relations??[]).filter(e=>e.relation==='calls'&&e.target_node_id===nodes[0].node_id);
   return {name,line,rea_anchor_sha256:sha(nodes[0].node_id),static_call_links:links.length,
     candidate_call_links:links.filter(x=>x.resolution==='candidate').length};
 });
}
const policy=['policy Replay {',' clause Linked {',' when evidence.anchored == true',
 ' oblige verdict.anchored = true',' }',' clause OwnerHold {',
 ' when evidence.ownerVerified != true',' sanction verdict.promotable = false',' }','}'].join('\n');
export function functionReplay(rea,sourceFile,{tokensReplica=reconstructedNormalise,compatReplica=reconstructedCompatibility}={}){
 const bytes=fs.readFileSync(sourceFile);
 const evidence=anchors(rea,bytes.toString('utf8'));
 const {tokens,pairs}=fixtures();
 const store=new TraceBoxRuntime();store.create('JM_REA_REPLAY');
 const mismatches=[];let count=0,matched=0;
 for(const [name,cases,original,replica] of [
  ['normalise',tokens.map(x=>[x]),normalise,tokensReplica],
  ['compatibilityBetween',pairs,compatibilityBetween,compatReplica]
 ]){
   cases.forEach((args,index)=>{
     const expected=original(...args),actual=replica(...args);count++;
     const same=JSON.stringify(expected)===JSON.stringify(actual);
     if(same)matched++;else mismatches.push({name,fixture:index,
       expected_sha256:sha(expected),actual_sha256:sha(actual)});
     store.append('JM_REA_REPLAY',{kind:same?'parity':'mismatch',name,fixture:index,
       expected_sha256:sha(expected),actual_sha256:sha(actual)});
   });
 }
 const verdict=JM32.execute(policy,{evidence:{anchored:true,ownerVerified:false},
   verdict:{anchored:false,promotable:false}}).runtime.state.verdict;
 hold(verdict.anchored&&!verdict.promotable,'JM32_GUARD');
 hold(store.query('JM_REA_REPLAY',{kind:'parity'}).length===matched,'TRACE_REPLAY_DRIFT');
 return {schema:'JM.REA.SourceGuidedReplay/0.4',source_sha256:sha(bytes),
   anchors:evidence,fixture_count:count,matched,failed:mismatches.length,
   mismatches:mismatches.slice(0,16),trace_events:store.replay('JM_REA_REPLAY').length,
   jm32_verdict:verdict,scope:'SOURCE_GUIDED_FIXTURE_PARITY_NOT_GENERAL_BEHAVIOR_OR_BINARY_RECONSTRUCTION'};
}
