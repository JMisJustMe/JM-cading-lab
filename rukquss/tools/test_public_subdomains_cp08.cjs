/* RUKQUSS CP08: isolated Node VM test of candidate public alias Worker.
 * No public DNS, Cloudflare bindings, deployment or private-system access.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const crypto=require("node:crypto");
const source=fs.readFileSync(process.argv[2],"utf8");
assert.ok(source.includes("CP08_PUBLIC_SUBDOMAINS_DRAFT_ONLY"));
let handler=null;
vm.runInNewContext(source,{
  addEventListener:(name,fn)=>{
    assert.equal(name,"fetch");
    assert.equal(handler,null);
    handler=fn;
  },
  URL,Request,Response,JSON,Object
},{timeout:2500});
assert.equal(typeof handler,"function");
let passed=0;
function check(name,actual,expected){
  assert.equal(actual,expected,name);passed++;
}
async function invoke(host,path="/",method="GET"){
  let result;
  handler({
    request:new Request("https://"+host+path,{method}),
    respondWith:(promise)=>{result=Promise.resolve(promise);}
  });
  return await result;
}
(async()=>{
  const routes={
    "games.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/games-beyond/",
    "apps.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/apps/",
    "music.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/beatbody/",
    "coding.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/coding-estate/everybody/",
    "theory.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/theory/",
    "books.rukquss.com":"https://jmisjustme.github.io/JM-cading-lab/books/"
  };
  for(const [host,target] of Object.entries(routes)){
    for(const path of ["/","/index.html","/?utm=ignored"]){
      const r=await invoke(host,path);
      check(host+path+" exact 302",r.status,302);
      check(host+path+" exact final original",r.headers.get("location"),target);
      check(host+path+" no private cache",r.headers.get("cache-control"),"private, no-store, max-age=0");
      check(host+path+" no body",await r.text(),"");
    }
    const head=await invoke(host,"/","HEAD");
    check(host+" HEAD allowed",head.status,302);
    check(host+" HEAD empty",await head.text(),"");
    const post=await invoke(host,"/","POST");
    check(host+" POST forbidden",post.status,404);
    const nested=await invoke(host,"/private");
    check(host+" unknown path forbidden",nested.status,404);
    const options=await invoke(host,"/","OPTIONS");
    check(host+" OPTIONS forbidden",options.status,404);
    const nestedIndex=await invoke(host,"/index.html/");
    check(host+" disguised index forbidden",nestedIndex.status,404);
    const status=await invoke(host,"/__jm_status");
    check(host+" internal status hidden",status.status,404);
  }
  for(const host of ["not-a-door.rukquss.com","reserved-host.rukquss.com","unknown.rukquss.com"]){
    const r=await invoke(host);
    check(host+" never receives public homepage",r.status,404);
  }
  const apex=await invoke("rukquss.com");
  check("original apex HTML 200",apex.status,200);
  const html=await apex.text();
  check("original RUKQUSS experience present",html.includes('id="live"'),true);
  check("original seven districts kept",(html.match(/class="district" data-terms=/g)||[]).length,7);
  check("original four experiences kept",(html.match(/class="experience-card"/g)||[]).length,4);
  check("host alias code not leaked in HTML",html.includes("jmCp08PublicAliases"),false);
  check("single original route authority remains",source.includes("const jmResolved=JM_CP01_ROOMS[jmPublicPath]"),true);
  const ww=await invoke("www.rukquss.com","/games?x=1");
  check("www 308 canonical",ww.status,308);
  check("www path and query retained",ww.headers.get("location"),"https://rukquss.com/games?x=1");
  const oldRoutes={
    "/games":"https://jmisjustme.github.io/JM-cading-lab/games-beyond/",
    "/apps":"https://jmisjustme.github.io/JM-cading-lab/apps/",
    "/music":"https://jmisjustme.github.io/JM-cading-lab/beatbody/",
    "/coding":"https://jmisjustme.github.io/JM-cading-lab/coding-estate/everybody/",
    "/theory":"https://jmisjustme.github.io/JM-cading-lab/theory/",
    "/books":"https://jmisjustme.github.io/JM-cading-lab/books/"
  };
  for(const [path,target] of Object.entries(oldRoutes)){
    const r=await invoke("rukquss.com",path);
    check("apex original path "+path,r.status,302);
    check("apex original path destination "+path,r.headers.get("location"),target);
  }
  const status=await invoke("rukquss.com","/__jm_status");
  check("existing RUKQUSS status exists",status.status,200);
  const payload=await status.json();
  check("existing RUKQUSS source blob untouched",payload.gitBlob,"3609c8027013544852a9490053bb009cf97f2993");
  console.log(JSON.stringify({schema:"JM.RUKQUSS.Subdomains.LocalVM.CP10/1",passed,failed:0,aliases_tested:6,original_routes_preserved:11,private_subdomains_untouched:true,scope:"LOCAL_WORKER_VM_NOT_LIVE",candidate_sha256:crypto.createHash("sha256").update(source).digest("hex")}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
