/** JM FUTARIZED v1.2 CP18: DOM-origin text never becomes executable HTML. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const source=fs.readFileSync(path.join(here,'..','bodies','futarized-v1-2.html'),'utf8');
const originalLine=needle=>{
 const matches=source.split(/\r?\n/).filter(row=>row.includes(needle));
 assert.equal(matches.length,1,'one original declaration '+needle);
 return matches[0];
};
function domMock(){
 const views=new Map();
 const make=tag=>({tagName:tag,textContent:'',className:''});
 const get=name=>{
   if(!views.has(name))views.set(name,{
     textContent:'',value:'',children:[],
     set innerHTML(v){throw new Error('UNSAFE_INNER_HTML: '+v)},
     replaceChildren(...xs){this.children=xs},
   });
   return views.get(name);
 };
 return {views,get,document:{createElement:make,createTextNode:text=>({nodeType:3,textContent:text})}};
}
test('toast preserves visible style while placing hostile text as a text node',()=>{
 const dom=domMock(), ctx={document:dom.document,$:dom.get,setTimeout:()=>0};
 vm.runInNewContext(originalLine('function toast(msg)'),ctx,{timeout:1500});
 vm.runInNewContext("toast('<img src=x onerror=alert(1)>')",ctx);
 const children=dom.get('#footerLine').children;
 assert.equal(children.length,1);assert.equal(children[0].className,'toast');
 assert.equal(children[0].textContent,'<img src=x onerror=alert(1)>');
});
test('trace renderer keeps literal syntax lines, not interpreted HTML',()=>{
 const dom=domMock(),traces=['001 FUTARIZED > <svg onload=alert(1)>'];
 const ctx={document:dom.document,$:dom.get,traces};
 vm.runInNewContext(originalLine('function renderTrace()'),ctx,{timeout:1500});
 vm.runInNewContext('renderTrace()',ctx);
 assert.equal(dom.get('#traceList').children[0].textContent,traces[0]);
 assert.equal(dom.get('#traceList').children[0].tagName,'div');
});
test('trace renderer keeps original empty-state message',()=>{
 const dom=domMock(),ctx={document:dom.document,$:dom.get,traces:[]};
 vm.runInNewContext(originalLine('function renderTrace()'),ctx,{timeout:1500});
 vm.runInNewContext('renderTrace()',ctx);
 assert.equal(dom.get('#traceList').children[0].textContent,'No trace yet.');
});
test('typed stage-four TOP command remains a literal text node',()=>{
 const dom=domMock(),command='<svg onload=alert(1)>';
 dom.get('#topCommandInput').value=command;
 const start=source.indexOf("$('#runTopCommand').onclick=()=>{");
 assert.ok(start>0,'original TOP command route found');
 const end=source.indexOf('};',start)+2;assert.ok(end>start);
 const calls=[];
 const ctx={document:dom.document,$:dom.get,
   mountModule:x=>calls.push(['mount',x]),
   sideOn:x=>calls.push(['side',x]),
   log:(x,y)=>calls.push(['log',x,y])};
 vm.runInNewContext(source.slice(start,end),ctx,{timeout:1500});
 dom.get('#runTopCommand').onclick();
 const nodes=dom.get('#sideGrammarText').children;
 assert.equal(nodes[0].textContent,'TOP COMMAND');
 assert.equal(nodes[1].textContent,' '+command);
 assert.ok(calls.some(x=>x[0]==='log'&&x[2].includes(command)));
});
