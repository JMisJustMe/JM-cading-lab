/* JM CREWBOUND CP09 — exact portable HTML parity, syntax and provenance.
   The modular GitHub source remains authoritative; this is a delivery copy. */
"use strict";
const fs=require("node:fs"),path=require("node:path");
const crypto=require("node:crypto"),vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const names=["index.html","roster.js","cast.js","art.js",
 "combat-kit.js","sim.js","continuity.js","feedback.js"];
const src={},sha={};
for(const name of names){
 const contents=fs.readFileSync(path.join(root,name),"utf8");
 src[name]=contents;
 sha[name]=crypto.createHash("sha1")
   .update("blob "+Buffer.byteLength(contents)+"\0")
   .update(contents).digest("hex");
}
let html=src["index.html"];
for(const name of names.slice(1)){
 const marker='<script src="./'+name+'"></script>';
 assert.equal(html.split(marker).length,2,"single source module "+name);
 assert.ok(!src[name].toLowerCase().includes("</script"),"unsafe embedded script boundary "+name);
 html=html.replace(marker,
  '<script>\n/* CP09 source: '+name+' Git blob '+sha[name]+' */\n'+src[name]+'\n</script>');
}
const originalGallery='href="./cast.html"';
assert.equal(html.split(originalGallery).length,2,"original cast gallery route");
html=html.replace(originalGallery,
 'href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/cast.html"');
const proof={
 schema:"JM.CREWBOUND.CP09.OFFLINE_HTML/1",
 branch:"jm/crewbound-cp09-combat-feel",
 source_files_blob_sha1:sha,
 role:"owner quick-check delivery; modular source remains authoritative",
 ancestor:"Original CREWBOUND v0.5 and COMBOUND distinct; protected CP03-CP08 preserved"
};
html=html.replace("<head>","<head>\n<!-- "+JSON.stringify(proof)+" -->");
assert.ok(!html.includes('<script src="./'),"unexpected sidecar game scripts");
const shipped=fs.readFileSync(path.join(__dirname,"CREWBOUND_CP09_PLAY.html"),"utf8");
assert.equal(shipped,html,"CP09 HTML differs from exact current source modules");
const scripts=[...shipped.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,8,"seven source modules plus one browser runtime");
scripts.forEach((m,i)=>new vm.Script(m[1],{filename:"crewbound-cp09-inline-"+i+".js"}));
for(const id of ["fxMode","fxHelp","arena","coachToggle","saveMatch","commit","myRelay"])
 assert.ok(shipped.includes('id="'+id+'"'),"missing game or feedback UI "+id);
console.log("CREWBOUND_CP09_SOURCE_PARITY PASS | 8/8 inline JS syntax | bytes "+Buffer.byteLength(shipped));
