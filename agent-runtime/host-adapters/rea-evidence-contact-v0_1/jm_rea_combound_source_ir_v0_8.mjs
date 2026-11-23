#!/usr/bin/env node
/* JM×REA v0.8: TypeScript AST mechanics proof from exact private COMBOUND source.
 * Separate from REA itself. Never copies game HTML to GitHub or Library. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ORIGINAL='53b6c3d87ebecd647cc59f679d20ca4a0f52cfb7053e8e5bb114b711d1c5e428';
const CANDIDATE='66a05d8cf1fbb6e42ba71a9b44b087ed152969940888228800f281ce68a336b1';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const hold=(v,m)=>{if(!v)throw Error('JM_V08_SOURCE_HOLD:'+m)};
let ts;try{ts=require(process.env.JM_TYPESCRIPT_MODULE||'typescript');}
catch{throw Error('JM_V08_SOURCE_HOLD:TYPESCRIPT_COMPILER_API_NOT_INSTALLED');}
function inspect(path,expected){
 const bytes=fs.readFileSync(path);hold(hash(bytes)===expected,'GAME_SOURCE_HASH');
 const html=bytes.toString('utf8'),re=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi;
 let count=0,match,runtimes=[];
 while((match=re.exec(html))!==null){
  const source=match[1],base=match.index+match[0].indexOf('>')+1;
  const tree=ts.createSourceFile('inline_'+count+'.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  let runtime;
  const walk=n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='Runtime'&&
    ts.isObjectLiteralExpression(n.initializer))runtime=n.initializer;
    ts.forEachChild(n,walk)};
  walk(tree);
  if(runtime){
   const methods=[];
   for(const node of runtime.properties){
    if(!node.body)continue;
    const name=node.name?.getText(tree)?.replace(/^['"]|['"]$/g,'');
    if(!name)continue;
    const calls=new Set(),rules=new Set();
    const visit=n=>{if(ts.isCallExpression(n))calls.add(n.expression.getText(tree));
      if(ts.isPropertyAccessExpression(n)){
       const s=n.getText(tree);if(s.startsWith('JM_IR.rules.'))rules.add(s);
      }ts.forEachChild(n,visit)};
    visit(node.body);
    methods.push({name,line:html.slice(0,base+node.getStart(tree)).split('\n').length,
      body_sha256:hash(node.getText(tree)),calls:[...calls].sort(),rules:[...rules].sort()});
   }runtimes.push(methods);
  }count++;
 }
 hold(runtimes.length===1,'AMBIGUOUS_RUNTIME');
 const methods=runtimes[0],lookup=new Map(methods.map(m=>[m.name,m]));
 const required=['beginDrag','moveDrag','releaseDrag','commitShot','registerCrewUse'];
 required.forEach(n=>hold(lookup.has(n),'MISSING_'+n));
 const edges=methods.flatMap(m=>m.calls.flatMap(s=>{
  const match=/^this\.([A-Za-z_$][\w$]*)$/.exec(s),target=match?.[1];
  return target&&lookup.has(target)?[{from:m.name,to:target,relation:'calls'}]:[];
 }));
 for(const [a,b] of [['releaseDrag','moveDrag'],['releaseDrag','commitShot'],['commitShot','registerCrewUse']])
  hold(edges.some(e=>e.from===a&&e.to===b),'MECHANICS_LINK_MISSING_'+a);
 return {sha256:expected,methods,edges,inline_scripts:count};
}
export function run(original,candidate,output){
 hold(original&&candidate&&output?.startsWith('/')&&!fs.existsSync(output),'WRITE_ONCE_ABSOLUTE');
 const a=inspect(original,ORIGINAL),b=inspect(candidate,CANDIDATE);
 const newer=new Map(b.methods.map(x=>[x.name,x]));
 for(const method of a.methods)
  hold(newer.get(method.name)?.body_sha256===method.body_sha256,'RUNTIME_DRIFT_'+method.name);
 const names=['beginDrag','moveDrag','releaseDrag','commitShot','registerCrewUse'];
 const report={schema:'JM.REA.COMBOUND.StaticMechanicsIR/0.8',engine:'TYPESCRIPT_AST_NOT_REA',
  original_sha256:ORIGINAL,candidate_sha256:CANDIDATE,
  original_methods:a.methods.length,unchanged_methods:a.methods.length,inline_scripts:a.inline_scripts,
  mechanics_relationships:a.edges.filter(x=>names.includes(x.from)&&names.includes(x.to)),
  functions:a.methods.filter(x=>names.includes(x.name)).map(m=>({
   name:m.name,line:m.line,body_sha256:m.body_sha256,
   calls:m.calls.filter(x=>x.startsWith('this.')),rule_reads:m.rules})),
  contains_private_html:false,rea_evidence_verified:false};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('JM_REAL_GAME_STATIC_IR:',report.original_methods,'methods,',
  report.mechanics_relationships.length,'calls');return report;
}
if(process.argv[1]&&import.meta.url==='file://'+process.argv[1]){
 try{run(...process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=2}
}
