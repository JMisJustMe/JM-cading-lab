/* CREWBOUND CP04 delivery-role authenticity: rebuild exact offline HTML from living source.
   No rewriting, no network, no publication. Uses the CP04 source SHA-1 blobs as exact inputs. */
"use strict";
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const names=["index.html","roster.js","cast.js","art.js","sim.js"];
const text={};const blobs={};
for(const name of names){
 const raw=fs.readFileSync(path.join(root,name),"utf8");
 text[name]=raw;
 const bytes=Buffer.byteLength(raw);
 blobs[name]=crypto.createHash("sha1").update("blob "+bytes+"\0").update(raw).digest("hex");
}
let html=text["index.html"];
for(const name of names.slice(1)){
 const pattern='<script src="./'+name+'"></script>';
 assert.equal(html.split(pattern).length,2,"exact single script dependency "+name);
 assert.ok(!text[name].toLowerCase().includes("</script"),"unsafe embedded script token "+name);
 html=html.replace(pattern,'<script>\n/* CP04 source: '+name+' Git blob '+blobs[name]+' */\n'+text[name]+'\n</script>');
}
const gallery='href="./cast.html"';
assert.equal(html.split(gallery).length,2,"single gallery link");
html=html.replace(gallery,'href="https://jmisjustme.github.io/JM-cading-lab/games-beyond/crewbound-321/cast.html"');
const provenance={schema:"JM.CREWBOUND.CP04.STANDALONE_DELIVERY/1",
  source_branch:"jm/crewbound-cp04-independent-pair-plans",
  source_head:"8a692aefbd2fac1638dbc6caeb12e78fbd34b6cc",
  source_files_blob_sha1:blobs,
  role:"review-only HTML, not standalone new keeper, not main or public live version",
  parent:"CP03 PR 784 and CP04 PR 785"};
html=html.replace("<head>","<head>\n<!-- "+JSON.stringify(provenance)+" -->");
assert.doesNotMatch(html,/<script src="\.\//,"unembedded game JavaScript");
const target=path.join(__dirname,"CREWBOUND_CP04_PLAY.html");
const shipped=fs.readFileSync(target,"utf8");
assert.equal(shipped,html,"committed portable HTML must match source files byte-for-byte");
const scriptMatches=[...shipped.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scriptMatches.length,5,"original 4 modules + browser runtime");
scriptMatches.forEach((m,i)=>new vm.Script(m[1],{filename:"cp04-portable-script-"+i+".js"}));
assert.match(shipped,/CP04/);
console.log("CP04_OFFLINE_SOURCE_PARITY PASS 5/5 scripts syntax PASS",Buffer.byteLength(shipped),"bytes");
