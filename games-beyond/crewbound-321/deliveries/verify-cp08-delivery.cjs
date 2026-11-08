/* CREWBOUND CP08: exact portable HTML SHA-1 Git blob parity and syntax.
   Modular source is keeper; HTML is a checkable delivery, not a new game. */
"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const vm=require("node:vm"),assert=require("node:assert/strict");
const home=path.resolve(__dirname,"..");
const names=["index.html","roster.js","cast.js","art.js","combat-kit.js","sim.js","continuity.js"];
const src={},shas={};
for(const name of names){
 const contents=fs.readFileSync(path.join(home,name),"utf8");src[name]=contents;
 shas[name]=crypto.createHash("sha1").update("blob "+Buffer.byteLength(contents)+"\0").update(contents).digest("hex");
}
let html=src["index.html"];
for(const name of names.slice(1)){
 const marker='<script src="./'+name+'"></script>';
 assert.equal(html.split(marker).length,2,"one module reference: "+name);
 assert.ok(!src[name].toLowerCase().includes("</script"),"unsafe inline delimiter "+name);
 html=html.replace(marker,'<script>\n/* CP08 source: '+name+' Git blob '+shas[name]+' */\n'+src[name]+'\n</script>');
}
const gallery='href="./cast.html"';
assert.equal(html.split(gallery).length,2,"single original gallery door");
html=html.replace(gallery,'href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/cast.html"');
const evidence={
 schema:"JM.CREWBOUND.CP08.OFFLINE_HTML/1",
 branch:"jm/crewbound-cp08-complete-match",
 source_files_blob_sha1:shas,
 role:"standalone owner review, GitHub modular source is keeper",
 ancestor:"CREWBOUND v0.5 preserved, COMBOUND distinct, CP03-CP07 independently protected"
};
html=html.replace("<head>","<head>\n<!-- "+JSON.stringify(evidence)+" -->");
assert.ok(!html.includes('<script src="./'),"unexpected sidecar scripts");
const shipped=fs.readFileSync(path.join(__dirname,"CREWBOUND_CP08_PLAY.html"),"utf8");
assert.equal(shipped,html,"CP08 HTML must match the original GitHub modules exactly");
const scripts=[...shipped.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,7,"six original modules plus UI runtime");
scripts.forEach((m,i)=>new vm.Script(m[1],{filename:"crewbound-cp08-inline-"+i+".js"}));
for(const id of ["careerLine","saveMatch","loadMatch","exportMatch","importMatch","coachToggle","arena"])
 assert.ok(shipped.includes('id="'+id+'"'),"missing playable control "+id);
console.log("CREWBOUND_CP08_SOURCE_PARITY PASS | 7/7 inline scripts | bytes "+Buffer.byteLength(shipped));
