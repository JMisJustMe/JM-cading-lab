/* JM CREWBOUND CP05 exact standalone-HTML source-parity and syntax verification.
   This validates CURRENT CP05. Original CP04 validator stays as historical evidence. */
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const names=["index.html","roster.js","cast.js","art.js","combat-kit.js","sim.js"];
const raw={};const shas={};
for(const name of names){
 raw[name]=fs.readFileSync(path.join(root,name),"utf8");
 shas[name]=crypto.createHash("sha1")
  .update("blob "+Buffer.byteLength(raw[name])+"\0").update(raw[name]).digest("hex");
}
let html=raw["index.html"];
for(const name of names.slice(1)){
 const marker='<script src="./'+name+'"></script>';
 assert.equal(html.split(marker).length,2,"one source script marker "+name);
 assert.ok(!raw[name].toLowerCase().includes("</script"),"unsafe inline boundary "+name);
 html=html.replace(marker,
  '<script>\n/* CP05 source: '+name+' Git blob '+shas[name]+' */\n'+raw[name]+'\n</script>');
}
const link='href="./cast.html"';
assert.equal(html.split(link).length,2);
html=html.replace(link,'href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/cast.html"');
const provenance={
 schema:"JM.CREWBOUND.CP05.STANDALONE_DELIVERY/1",
 source_branch:"jm/crewbound-cp05-living-match",
 source_files_blob_sha1:shas,
 role:"offline review, not a replacement or public release",
 ancestors:"CP03 PR 784 + CP04 PR 785; historic v0.5 and COMBOUND preserved"};
html=html.replace("<head>","<head>\n<!-- "+JSON.stringify(provenance)+" -->");
assert.ok(!html.includes('<script src="./'),"all local JS must be embedded");
const target=path.join(__dirname,"CREWBOUND_CP05_PLAY.html"),shipped=fs.readFileSync(target,"utf8");
assert.equal(shipped,html,"published delivery-role HTML does not match source");
const blocks=[...shipped.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(blocks.length,6,"five modules plus one browser runtime");
blocks.forEach((match,index)=>new vm.Script(match[1],{filename:"CREWBOUND_CP05_INLINE_"+index+".js"}));
console.log("CP05_OFFLINE_SOURCE_PARITY PASS | scripts 6/6 | bytes "+Buffer.byteLength(shipped));
