/* RUKQUSS CP11 release rehearsal: read-only rollback simulation.
 * Tests the actual original Worker snapshot and isolated staged candidate.
 * Never calls Cloudflare, binds a domain, edits files, merges or deploys.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const crypto=require("node:crypto");

const ORIGINAL_SHA="36b5ffd592ea24570fdb654e1a067e6967bf9495479196270a2bb1f1c5ad7da5";
const CP11_CANDIDATE_SHA="76ddafc059107b25f1fe3d992a7f7a58eedac5f0d2bc4bd766aeb0965fcbf0a8";
const original=fs.readFileSync(process.argv[2]);
const staged=fs.readFileSync(process.argv[3]);
const digest=data=>crypto.createHash("sha256").update(data).digest("hex");
let passed=0;
const check=(label,actual,expected)=>{assert.equal(actual,expected,label);passed++;};
function verifyRestoreBytes(data){
  if(digest(data)!==ORIGINAL_SHA)throw new Error("CP11 HOLD: rollback snapshot changed");
  if(data.includes(Buffer.from("CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY")))throw new Error("CP11 HOLD: candidate was mistaken for original");
  return true;
}
check("exact original bytes verified",verifyRestoreBytes(original),true);
check("exact candidate bytes verified",digest(staged),CP11_CANDIDATE_SHA);
check("candidate is genuinely different",digest(staged)===digest(original),false);
check("new marker in candidate",staged.includes(Buffer.from("CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY")),true);
check("candidate cannot pass restore guard",(()=>{
  try{verifyRestoreBytes(staged);return false}catch{return true}
})(),true);
check("altered rollback cannot pass restore guard",(()=>{
  try{verifyRestoreBytes(Buffer.concat([original,Buffer.from("X")]));return false}catch{return true}
})(),true);
function load(content){
  let listener;
  vm.runInNewContext(content.toString("utf8"),{
    addEventListener:(event,handle)=>{check("fetch listener",event,"fetch");listener=handle;},
    URL,Request,Response,JSON,Object
  },{timeout:3000});
  assert.equal(typeof listener,"function");
  return async (path,method="GET")=>{
    let promised;
    listener({request:new Request("https://rukquss.com"+path,{method}),
              respondWith:x=>{promised=Promise.resolve(x);}});
    if(!promised)throw new Error("CP11 HOLD: handler did not respond");
    return await promised;
  };
}
const originalServe=load(original);
const candidateServe=load(staged);
const restored=Buffer.from(original); // Simulation: separate verified original bytes, no API call.
check("restored bytes match original",digest(restored),ORIGINAL_SHA);
const restoredServe=load(restored);
const match=original.toString("utf8").match(/const JM_CP01_ROOMS = (\{[^;\n]+\});/);
if(!match)throw new Error("CP11 HOLD: original route registry not found");
const routes=JSON.parse(match[1]);
check("original public route count",Object.keys(routes).length,11);
(async()=>{
  for(const [path,target] of Object.entries(routes)){
    for(const [title,serve] of [["original",originalServe],["candidate",candidateServe],["local restored",restoredServe]]){
      const response=await serve(path);
      check(title+" "+path+" returns 302",response.status,302);
      check(title+" "+path+" retains destination",response.headers.get("location"),target);
    }
  }
  for(const [title,serve] of [["original",originalServe],["candidate",candidateServe],["local restored",restoredServe]]){
    let r=await serve("/");
    check(title+" apex HTML 200",r.status,200);
    check(title+" apex HTML present",(await r.text()).includes("<html"),true);
    r=await serve("/__jm_status");
    check(title+" status HTTP",r.status,200);
    const payload=await r.json();
    check(title+" original/candidate provenance",
      payload.gitBlob,
      title==="candidate"?"a93fc401e342ecf76de95a2121715860be125693":"a9630dd04c1a72431b15695bd667d126310d12ec");
    r=await serve("/no-such-page");
    check(title+" unknown public path remains 404",r.status,404);
  }
  console.log(JSON.stringify({
    schema:"JM.RUKQUSS.RollbackRehearsal.CP11/1",
    checks_passed:passed,checks_failed:0,
    original_snapshot_sha256:ORIGINAL_SHA,
    staged_candidate_sha256:CP11_CANDIDATE_SHA,
    local_restored_snapshot_matches_original:true,
    original_public_paths_preserved:11,
    scope:"LOCAL_READ_ONLY_SIMULATION_NOT_CLOUDFLARE_ROLLBACK",
    live_deployment_performed:false
  }));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
