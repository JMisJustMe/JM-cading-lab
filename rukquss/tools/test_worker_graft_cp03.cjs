/* RUKQUSS CP03 isolated Node runtime proof for the existing Worker carrier.
 * Runs the Cloudflare service-worker event handler in a Node VM; never deploys.
 */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const EXPECTED_BLOB = "151aa2c04267f3a9ded81384ceae53b2e152a212";
const PARENT_BLOB = "a9630dd04c1a72431b15695bd667d126310d12ec";
const REDIRECTS = {
  "/navigator":"https://jmisjustme-estate.pages.dev/navigator/",
  "/games":"https://jmisjustme.github.io/JM-cading-lab/games-beyond/",
  "/apps":"https://jmisjustme.github.io/JM-cading-lab/apps/",
  "/coding":"https://jmisjustme.github.io/JM-cading-lab/coding-estate/everybody/",
  "/theory":"https://jmisjustme.github.io/JM-cading-lab/theory/",
  "/books":"https://jmisjustme.github.io/JM-cading-lab/books/",
  "/music":"https://jmisjustme.github.io/JM-cading-lab/beatbody/",
  "/visual":"https://jmisjustme.github.io/JM-cading-lab/visual-systems-lab/",
  "/author":"https://jmisjustme.github.io/JM-cading-lab/author/",
  "/career":"https://jmisjustme.github.io/JM-cading-lab/career/",
  "/access":"https://jmisjustme.github.io/JM-cading-lab/access/",
};
const checks = [];
function check(label, condition) {assert.ok(condition, label); checks.push(label);}
function workerCarrier(source) {
  let listener;
  vm.runInNewContext(source, {
    addEventListener: (name, callback) => {assert.equal(name,"fetch");assert.equal(listener, undefined);listener=callback;},
    Response, Request, URL, JSON,
  }, {timeout:2500});
  assert.equal(typeof listener,"function");
  return async function send(path, method="GET", host="rukquss.com") {
    let response;
    listener({request:new Request(`https://${host}${path}`,{method}),respondWith:p=>response=Promise.resolve(p)});
    return await response;
  };
}
(async()=>{
  const sourcePath = process.argv[2];
  assert.ok(sourcePath,"Usage: node test_worker_graft_cp03.cjs <candidate-worker-js>");
  const script = fs.readFileSync(sourcePath,"utf8");
  const send = workerCarrier(script);
  const root = await send("/");
  const rootText = await root.text();
  check("GET root 200 HTML",root.status===200 && root.headers.get("content-type").includes("text/html"));
  check("root is enhanced RUKQUSS",rootText.includes("Try the work.") && (rootText.match(/class="experience-card"/g)||[]).length===4);
  check("7 original districts retained",(rootText.match(/class="district" data-terms=/g)||[]).length===7);
  check("HTML includes original legal caveat",rootText.includes("RUKQUSS REALITY LTD is not yet incorporated"));
  check("root no server stack leakage",!rootText.includes("JM_CP01_ROOMS") && !rootText.includes("addEventListener('fetch'"));
  const index=await send("/index.html");
  check("index.html same HTML",index.status===200 && (await index.text())===rootText);
  const head = await send("/","HEAD");
  check("HEAD root no body",head.status===200 && (await head.text())==="");
  check("HTML caching preserved",root.headers.get("cache-control")==="public, max-age=120");
  for(const [path,target] of Object.entries(REDIRECTS)){
    const res=await send(path);
    check("redirect "+path,res.status===302 && res.headers.get("location")===target && res.headers.get("cache-control")==="private, no-store, max-age=0" && res.headers.get("referrer-policy")==="no-referrer");
  }
  const trailing=await send("/music/");
  check("trailing slash preserved",trailing.status===302 && trailing.headers.get("location")===REDIRECTS["/music"]);
  const routeHead=await send("/apps","HEAD");
  check("HEAD redirects preserved",routeHead.status===302 && routeHead.headers.get("location")===REDIRECTS["/apps"]);
  const routePost=await send("/music","POST");
  check("no POST on public redirect",routePost.status===404);
  const unknown=await send("/not-a-route");
  check("unknown remains 404",unknown.status===404 && (await unknown.text())==="Not Found");
  const status=await send("/__jm_status");
  const statusJson=await status.json();
  check("status endpoint preserved",status.status===200 && status.headers.get("cache-control")==="no-store" && statusJson.project==="RUKQUSS REALITY");
  check("status source blob accurate",statusJson.gitBlob===EXPECTED_BLOB && !script.includes("gitBlob:'"+PARENT_BLOB+"'"));
  const alias=await send("/games?origin=visitor","GET","www.rukquss.com");
  check("www redirects to apex with query",alias.status===308 && alias.headers.get("location")==="https://rukquss.com/games?origin=visitor");
  check("no external scripts added",!/<script[^>]*src\s*=/i.test(rootText));
  check("4 card targets exact",["https://rukquss.com/games","https://rukquss.com/apps","https://rukquss.com/music","https://jmisjustme-estate.pages.dev/money-menu/launch/"].every(h=>rootText.includes('href="'+h+'"')));
  check("CP04 social metadata has real line breaks",rootText.includes('\n<meta property="og:type"') && !rootText.includes('\\n<meta property="og:type"'));
  check("CP04 clear search button present",rootText.includes('id="clearFind"') && rootText.includes('Clear district search'));
  check("CP04 escape reset behaviour present",rootText.includes("event.key==='Escape'"));
  check("CP04 touch target CSS present",rootText.includes('.district a{min-height:44px'));
  check("CP04 stale date removed",!rootText.includes('as of 4 November 2026'));
  check("CP05 six functional quick-route controls",(rootText.match(/data-quick-query="/g)||[]).length===6);
  check("CP05 multi-topic search OR semantics",rootText.includes("terms.some(term=>index[i].includes(term))"));
  check("CP05 route synonyms are searchable",["beatmaker","websites","jobs"].every(word=>rootText.includes(word)));
  check("CP05 quick actions are toggleable",rootText.includes("box.value=normalize(box.value)===normalize(query)?'':query"));
  check("CP05 no untrusted HTML insertion",!rootText.includes("innerHTML"));
  check("CP05 existing search and legal source retained",rootText.includes('id="find"') && rootText.includes("RUKQUSS REALITY LTD is not yet incorporated"));
  check("CP05.1 zoom reflow rules present",rootText.includes("/* CP05.1: keep all content visible") && rootText.includes(".split{grid-template-columns:minmax(0,1fr)}"));
  check("CP05.1 mobile search placeholder compact",rootText.includes('placeholder="Search districts…"'));
  check("CP05.2 landscape zoom grid minmax used",rootText.includes("@media(min-width:831px)") && rootText.includes(".split{grid-template-columns:repeat(2,minmax(0,1fr))}"));
  check("CP06 experiences precede district catalogue",rootText.indexOf('id="live"') < rootText.indexOf('id="doors"'));
  check("CP06 hero primary action leads to working experience",rootText.includes('class="action primary" href="#live"'));
  check("CP06 embedded RQ icon has no external dependency",rootText.includes('rel="icon" type="image/svg+xml" href="data:image/svg+xml,'));
  check("CP06 seven districts and old IDs remain",['id="doors"','id="live"','id="route"'].every(x=>rootText.includes(x)));
  check("CP06 source still uses only one inline script",(rootText.match(/<script>/g)||[]).length===1);



  console.log(JSON.stringify({schema:"JM.RUKQUSS.WorkerRuntime.CP03/1",scope:"NODE_ISOLATED_WORKER_VM_NOT_CLOUDFLARE_LIVE",checks:checks.length,pass:checks.length,fail:0,details:checks},null,2));
  if (process.argv.includes("--serve")) {
    // Optional loopback-only visual QA. No external hostname, no Worker deployment.
    const http = require("node:http");
    const server = http.createServer(async (request, response) => {
      try {
        const upstream = await send(request.url, request.method);
        response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
        response.end(request.method === "HEAD" ? undefined : Buffer.from(await upstream.arrayBuffer()));
      } catch (error) {
        response.writeHead(500, {"content-type":"text/plain"});
        response.end("LOCAL_WORKER_PREVIEW_ERROR");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      console.log("CP03_SERVER_READY " + server.address().port);
    });
  }
})().catch(err=>{console.error(err.stack);process.exitCode=1;});
