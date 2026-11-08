/* JM CREWBOUND CP06 · deterministic single-file HTML source and syntax proof.
   This tests the CURRENT CP06 export only. CP05 evidence remains historical. */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const crypto=require("node:crypto"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const names=["index.html","roster.js","cast.js","art.js","combat-kit.js","sim.js"];
const contents={},sha={};
for(const n of names){
 contents[n]=fs.readFileSync(path.join(root,n),"utf8");
 sha[n]=crypto.createHash("sha1")
   .update("blob "+Buffer.byteLength(contents[n])+"\0")
   .update(contents[n]).digest("hex");
}
let html=contents["index.html"];
for(const n of names.slice(1)){
 const marker='<script src="./'+n+'"></script>';
 assert.equal(html.split(marker).length,2,"exactly one module "+n);
 assert.ok(!contents[n].toLowerCase().includes("</script"),"embedded script boundary "+n);
 html=html.replace(marker,'<script>\n/* CP06 source: '+n+' Git blob '+sha[n]+' */\n'+contents[n]+'\n</script>');
}
const gallery='href="./cast.html"';
assert.equal(html.split(gallery).length,2,"original gallery link");
html=html.replace(gallery,'href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/cast.html"');
const meta={schema:"JM.CREWBOUND.CP06.OFFLINE_HTML/1",
  branch:"jm/crewbound-cp06-formation-training",
  source_files_blob_sha1:sha,
  custody:"review only, GitHub modular source authoritative",
  ancestry:"CREWBOUND v0.5 preserved; PR #784/#785/#794 separate"};
html=html.replace("<head>","<head>\n<!-- "+JSON.stringify(meta)+" -->");
assert.ok(!html.includes('<script src="./'),"offline source has no external game JS");
const file=path.join(__dirname,"CREWBOUND_CP06_PLAY.html");
const shipped=fs.readFileSync(file,"utf8");
assert.equal(shipped,html,"CP06 portable source differs from authoritative modules");
const scripts=[...shipped.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,6,"five source modules and inline UI");
scripts.forEach((m,i)=>new vm.Script(m[1],{filename:"cp06-inline-"+i+".js"}));
assert.ok(shipped.includes('id="arrange"'),"lineup controls missing");
console.log("CP06_OFFLINE_SOURCE_PARITY PASS | 6/6 inline JS syntax | bytes "+Buffer.byteLength(shipped));
