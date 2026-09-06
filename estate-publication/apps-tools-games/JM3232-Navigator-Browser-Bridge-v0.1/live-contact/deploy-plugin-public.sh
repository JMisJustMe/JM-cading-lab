#!/usr/bin/env bash
set -euo pipefail

ROOT='estate-publication/apps-tools-games/JM3232-Navigator-Browser-Bridge-v0.1'
LIVE="$ROOT/live-contact"
OUT="$LIVE/pages-plugin-public"
PROJECT='jm-inline-contact-probe'
BRANCH='navigator-plugin-public'
ALIAS='https://navigator-plugin-public.jm-inline-contact-probe.pages.dev'

rm -rf "$OUT"; mkdir -p "$OUT/privacy" "$OUT/support"
cp "$LIVE/plugin-public-worker.mjs" "$OUT/_worker.js"
cp "$LIVE/plugin-public-privacy.html" "$OUT/privacy/index.html"
cp "$LIVE/plugin-public-support.html" "$OUT/support/index.html"
printf '%s\n' '<!doctype html><meta charset="utf-8"><title>JM3232 Navigator</title><h1>JM3232 Navigator — Public Read-Only Plugin Descendant</h1><p>Production MCP endpoint: <code>/mcp</code></p><p><a href="/privacy/">Privacy</a> · <a href="/support/">Support</a></p>' > "$OUT/index.html"
if [[ -n "${OPENAI_APPS_CHALLENGE:-}" ]]; then
  mkdir -p "$OUT/.well-known"
  printf '%s' "$OPENAI_APPS_CHALLENGE" > "$OUT/.well-known/openai-apps-challenge"
fi
node --check "$OUT/_worker.js"

npx wrangler pages dev "$OUT" --ip 127.0.0.1 --port 8792 >/tmp/nav-plugin-public-local.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for A in $(seq 1 30); do curl --fail --silent http://127.0.0.1:8792/health >/tmp/nav-plugin-health.json 2>/dev/null && break; sleep 1; done
curl --fail --silent http://127.0.0.1:8792/privacy/ >/tmp/nav-plugin-privacy.html
curl --fail --silent http://127.0.0.1:8792/support/ >/tmp/nav-plugin-support.html
node - <<'NODE'
const base='http://127.0.0.1:8792';
async function rpc(id,method,params={}){const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});const j=await r.json();return {r,j};}
let x=await rpc(1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM plugin public proof',version:'2'}}); if(!x.r.ok||x.j.error)throw new Error(JSON.stringify(x.j));
x=await rpc(2,'tools/list'); if(!x.r.ok||x.j.result.tools.length!==5)throw new Error('public tool count mismatch');
if(x.j.result.tools.some(t=>t.annotations?.readOnlyHint!==true||t.annotations?.openWorldHint!==false||t.annotations?.destructiveHint!==false||!t.outputSchema))throw new Error('public tool metadata mismatch');
x=await rpc(3,'resources/list'); if(!x.r.ok||x.j.result.resources.length!==0)throw new Error('public UI resource unexpectedly exposed');
x=await rpc(4,'tools/call',{name:'search',arguments:{query:'Radius Lexicon',limit:1}}); if(!x.r.ok||!x.j.result.structuredContent.results.length)throw new Error('public search failed');
x=await rpc(5,'tools/call',{name:'fetch',arguments:{id:'RL-HORROR-HOTEL-RANBY-STREET'}}); if(!x.r.ok||x.j.error)throw new Error('public fetch failed'); const fetched=JSON.stringify(x.j.result.structuredContent); if(fetched.includes('lyric_face')||fetched.includes('excerpt')||fetched.includes('source_line'))throw new Error('raw source excerpt field exposed');
x=await rpc(6,'tools/call',{name:'navigator_return_lineage',arguments:{id:'RL-HORROR-HOTEL-RANBY-STREET'}}); if(!x.r.ok||x.j.error)throw new Error('public lineage failed'); const lineage=JSON.stringify(x.j.result.structuredContent); if(lineage.includes('excerpt')||lineage.includes('source_line'))throw new Error('raw lineage excerpt exposed');
x=await rpc(7,'tools/call',{name:'navigator_bridge_status',arguments:{}}); if(!x.r.ok||x.j.error)throw new Error('bridge status failed'); const status=JSON.stringify(x.j.result.structuredContent); if(status.includes('receipt_chain_head')||status.includes('registered_bodies')||status.includes('stringmarks'))throw new Error('owner runtime leaked');
x=await rpc(8,'tools/call',{name:'navigator_create_stringreceipt',arguments:{action:'NOPE',target_id:'X',outcome:'NOPE'}}); if(x.r.ok||!x.j.error)throw new Error('write tool unexpectedly exposed');
console.log('public minimized read-only MCP local proof PASS');
NODE
kill $PID 2>/dev/null || true
trap - EXIT

pushd "$LIVE" >/dev/null
DEPLOY=$(npx wrangler pages deploy pages-plugin-public --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true 2>&1)
popd >/dev/null
printf '%s\n' "$DEPLOY"
CLEAN=$(printf '%s\n' "$DEPLOY" | sed -r 's/\x1B\[[0-9;]*[mK]//g')
PREVIEW_URL=$(printf '%s\n' "$CLEAN" | grep -Eo 'https://[A-Za-z0-9.-]+\.pages\.dev' | tail -n 1 || true)
[[ -n "$PREVIEW_URL" ]] || { echo 'No public plugin deployment URL recovered.' >&2; exit 1; }

PUBLIC_BASE="$PREVIEW_URL"
for A in $(seq 1 15); do
  CODE=$(curl --silent --output /tmp/nav-plugin-alias-health.json --write-out '%{http_code}' "$ALIAS/health" || true)
  if [[ "$CODE" == '200' ]] && grep -q PUBLIC_PLUGIN_READ_ONLY_MINIMIZED_READY /tmp/nav-plugin-alias-health.json; then PUBLIC_BASE="$ALIAS"; break; fi
  sleep 2
done
export PUBLIC_BASE
curl --fail --silent "$PUBLIC_BASE/health" | tee /tmp/nav-plugin-public-health.json
curl --fail --silent "$PUBLIC_BASE/privacy/" >/tmp/nav-plugin-public-privacy.html
curl --fail --silent "$PUBLIC_BASE/support/" >/tmp/nav-plugin-public-support.html

grep -q 'Privacy Policy' /tmp/nav-plugin-public-privacy.html
grep -q 'Support' /tmp/nav-plugin-public-support.html

if [[ -n "${OPENAI_APPS_CHALLENGE:-}" ]]; then
  ACTUAL=$(curl --fail --silent "$PUBLIC_BASE/.well-known/openai-apps-challenge")
  [[ "$ACTUAL" == "$OPENAI_APPS_CHALLENGE" ]] || { echo 'OpenAI domain challenge token mismatch.' >&2; exit 1; }
  echo 'OpenAI domain challenge endpoint PASS'
fi

node - <<'NODE'
import fs from 'node:fs';
const base=process.env.PUBLIC_BASE;
async function rpc(id,method,params={}){const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});const j=await r.json();return {r,j};}
let x=await rpc(1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM public plugin proof',version:'2'}}); if(!x.r.ok||x.j.error)throw new Error(JSON.stringify(x.j)); const init=x.j.result;
x=await rpc(2,'tools/list'); if(!x.r.ok||x.j.result.tools.length!==5)throw new Error('tool count'); const tools=x.j.result.tools;
x=await rpc(3,'resources/list'); if(!x.r.ok||x.j.result.resources.length!==0)throw new Error('resource count'); const resources=x.j.result;
x=await rpc(4,'tools/call',{name:'search',arguments:{query:'Radius Lexicon',limit:1}}); if(!x.r.ok||!x.j.result.structuredContent.results.length)throw new Error('search'); const search=x.j.result;
x=await rpc(5,'tools/call',{name:'fetch',arguments:{id:'RL-HORROR-HOTEL-RANBY-STREET'}}); if(!x.r.ok||x.j.error)throw new Error('fetch'); const fetched=JSON.stringify(x.j.result.structuredContent); if(fetched.includes('lyric_face')||fetched.includes('excerpt')||fetched.includes('source_line'))throw new Error('raw source excerpt exposure');
x=await rpc(6,'tools/call',{name:'navigator_return_lineage',arguments:{id:'RL-HORROR-HOTEL-RANBY-STREET'}}); if(!x.r.ok||x.j.error)throw new Error('lineage'); const lineage=JSON.stringify(x.j.result.structuredContent); if(lineage.includes('excerpt')||lineage.includes('source_line'))throw new Error('raw lineage excerpt exposure');
x=await rpc(7,'tools/call',{name:'navigator_bridge_status',arguments:{}}); if(!x.r.ok||x.j.error)throw new Error('status'); const status=JSON.stringify(x.j.result.structuredContent); if(status.includes('receipt_chain_head')||status.includes('registered_bodies')||status.includes('stringmarks'))throw new Error('owner runtime exposure');
x=await rpc(8,'tools/call',{name:'navigator_create_stringreceipt',arguments:{action:'NOPE',target_id:'X',outcome:'NOPE'}}); if(x.r.ok||!x.j.error)throw new Error('write exposure');
if(tools.some(t=>t.annotations.readOnlyHint!==true||t.annotations.openWorldHint!==false||t.annotations.destructiveHint!==false||!t.outputSchema))throw new Error('metadata');
const proof={pass:true,publicBase:base,mcpUrl:base+'/mcp',protocol:init.protocolVersion,toolCount:5,resourceCount:resources.resources.length,searchTop:search.structuredContent.results[0].id,readOnly:true,responseMinimized:true,rawSourceExcerptExposed:false,ownerRuntimeExposed:false,sharedMutableUserState:false,writeToolsExposed:false,privacyUrl:base+'/privacy/',supportUrl:base+'/support/',domainChallengePrepared:true,sourceOwnerEndpoint:'https://navigator-live-contact.jm-inline-contact-probe.pages.dev/mcp'};
fs.writeFileSync('NAVIGATOR_PLUGIN_PUBLIC_PROOF_v0_1.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
NODE
