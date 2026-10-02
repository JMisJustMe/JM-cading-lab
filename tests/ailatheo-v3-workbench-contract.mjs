import fs from "node:fs";
const html=fs.readFileSync("unified-browser/OPEN_FIRST_AILATHEO_CREATION_WORKBENCH_v3_0_ALPHA.html","utf8");
const required=["SAVE PROJECT","UNDO","EXPORT","TEST PROJECT","PROOF","LINK BODIES","RUN SCENE","PREPARE BUILD","ROUTE TARGET","JMGradle · official Android","Official Gradle · AAB","jm.ailatheo.v3.project","jm.ailatheo.v3.projectProof","JM.TargetBridge/0.1","jm.ailatheo.production-build/1.0"];
for(const token of required) if(!html.includes(token)) throw new Error("MISSING_"+token);
const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);if(dup.length)throw new Error("DUPLICATE_IDS_"+[...new Set(dup)].join(","));
for(const id of ["saveProject","undoProject","exportProject","testProject","proofProject","linkBodies","runScene","routeTarget","prepareBuild","recover"])if(!html.includes("querySelector('#"+id+"').onclick"))throw new Error("DEAD_CONTROL_"+id);
for(const law of ["Prepared ≠ built. Built ≠ installed. Installed ≠ owner runtime Ding.","prior host proof exists; this AILatheo project still requires receiver contact"])if(!html.includes(law))throw new Error("BOUNDARY_MISSING");
console.log(JSON.stringify({passed:true,controls:required.length,uniqueIds:ids.length,deadControlChecks:10,claimBoundaries:2},null,2));