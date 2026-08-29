#!/usr/bin/env bash
set -euo pipefail

ROOT='estate-publication/apps-tools-games/JM3232-Navigator-Browser-Bridge-v0.1'
LIVE="$ROOT/live-contact"
BODY="$ROOT/source-carriage/reconstructed/JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1"
OUT="$LIVE/pages-navigator"
PROJECT='jm-inline-contact-probe'
BRANCH='navigator-live-contact'
ALIAS='https://navigator-live-contact.jm-inline-contact-probe.pages.dev'

python "$ROOT/source-carriage/reconstruct_navigator_bridge.py"
python - <<'PY'
from pathlib import Path
import hashlib,json
root=Path('estate-publication/apps-tools-games/JM3232-Navigator-Browser-Bridge-v0.1')
b=root/'source-carriage/reconstructed/JM3232_NAVIGATOR_BROWSER_BRIDGE_v0_1'
m=json.loads((root/'SOURCE_PUBLICATION_MANIFEST.json').read_text())
sm=json.loads((b/'data/SOURCE_MANIFEST.json').read_text())
assert len([p for p in b.rglob('*') if p.is_file()])==35
assert sm['counts']['search_documents']==881
assert sm['counts']['lexicon_entries']==640
assert sm['counts']['browser_bodies']==20
for n,h in m['source_authorities'].items():
    assert hashlib.sha256((b/'source_authorities'/n).read_bytes()).hexdigest()==h
print('canonical Navigator authority PASS')
PY

rm -rf "$OUT"; mkdir -p "$OUT/data"
cp "$LIVE/worker.mjs" "$OUT/_worker.js"
cp "$BODY/data/search_index.json" "$OUT/data/search_index.json"
cp "$BODY/data/SOURCE_MANIFEST.json" "$OUT/data/SOURCE_MANIFEST.json"
cp "$BODY/data/build_meta.json" "$OUT/data/build_meta.json"
cp "$BODY/public/navigator-stringdoor-v0.1.html" "$OUT/navigator-stringdoor-v0.1.html"
cp "$BODY/00_OPEN_FIRST.html" "$OUT/index.html"
node --check "$OUT/_worker.js"

# Prove the same ten-tool surface locally before touching the host.
npx wrangler pages dev "$OUT" --ip 127.0.0.1 --port 8791 --kv=NAV_RUNTIME >/tmp/nav-local.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for A in $(seq 1 30); do curl --fail --silent http://127.0.0.1:8791/health >/tmp/nav-local-health.json 2>/dev/null && break; sleep 1; done
node - <<'NODE'
const base='http://127.0.0.1:8791';
async function rpc(id,method,params={}){const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});const j=await r.json();if(!r.ok||j.error)throw new Error(JSON.stringify(j));return j.result;}
if((await rpc(1,'tools/list')).tools.length!==10) throw new Error('ten-tool surface lost');
if(!(await rpc(2,'tools/call',{name:'search',arguments:{query:'Radius Lexicon',limit:1}})).structuredContent.results.length) throw new Error('search failed');
await rpc(3,'tools/call',{name:'navigator_create_stringreceipt',arguments:{action:'LOCAL_PREDEPLOY_PROOF',target_id:'RL-RADIUS-LEXICON',outcome:'PASS',evidence:{route:'existing-host'}}});
const s=await rpc(4,'tools/call',{name:'navigator_bridge_status',arguments:{}}); if(!s.structuredContent.runtime.receipt_chain_valid) throw new Error('chain failed');
console.log('local ten-tool/search/durable-chain PASS');
NODE
kill $PID 2>/dev/null || true
trap - EXIT

# Reuse the already-proven JM inline-contact Cloudflare project.
npx wrangler pages deployment list --project-name="$PROJECT" --json >/tmp/nav-existing-deployments.json
node -e 'const d=require("/tmp/nav-existing-deployments.json");if(!Array.isArray(d)||!d.length)process.exit(1);console.log(`existing probe deployments: ${d.length}`)'

# Resolve one isolated durable KV namespace. Create it only if absent.
LIST=$(npx wrangler kv namespace list 2>&1)
KV_ID=$(printf '%s\n' "$LIST" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=s.indexOf("[");const b=s.lastIndexOf("]");if(a<0||b<a)return;try{const rows=JSON.parse(s.slice(a,b+1));const hit=rows.find(x=>x.title==="jm-navigator-live-contact-runtime");if(hit)process.stdout.write(hit.id)}catch{}})')
if [[ -z "$KV_ID" ]]; then
  CREATE=$(npx wrangler kv namespace create jm-navigator-live-contact-runtime 2>&1)
  printf '%s\n' "$CREATE"
  KV_ID=$(printf '%s\n' "$CREATE" | grep -Eo '[a-f0-9]{32}' | tail -n 1 || true)
fi
[[ -n "$KV_ID" ]] || { echo 'Navigator KV namespace unavailable to current Cloudflare credential.' >&2; exit 1; }

cat > "$LIVE/wrangler.jsonc" <<EOF
{
  "name": "$PROJECT",
  "pages_build_output_dir": "./pages-navigator",
  "compatibility_date": "2026-08-29",
  "kv_namespaces": [{"binding":"NAV_RUNTIME","id":"$KV_ID"}]
}
EOF

pushd "$LIVE" >/dev/null
DEPLOY=$(npx wrangler pages deploy pages-navigator --project-name="$PROJECT" --branch="$BRANCH" --commit-dirty=true 2>&1)
popd >/dev/null
printf '%s\n' "$DEPLOY"
CLEAN=$(printf '%s\n' "$DEPLOY" | sed -r 's/\x1B\[[0-9;]*[mK]//g')
PREVIEW_URL=$(printf '%s\n' "$CLEAN" | grep -Eo 'https://[A-Za-z0-9.-]+\.pages\.dev' | tail -n 1 || true)
[[ -n "$PREVIEW_URL" ]] || { echo 'No Pages deployment URL recovered.' >&2; exit 1; }

PUBLIC_BASE="$PREVIEW_URL"
for A in $(seq 1 15); do
  CODE=$(curl --silent --output /tmp/nav-alias-health.json --write-out '%{http_code}' "$ALIAS/health" || true)
  if [[ "$CODE" == '200' ]] && grep -q LIVE_HTTPS_MCP_READY /tmp/nav-alias-health.json; then PUBLIC_BASE="$ALIAS"; break; fi
  sleep 2
done
export PUBLIC_BASE
curl --fail --silent "$PUBLIC_BASE/health" | tee /tmp/nav-public-health.json

node - <<'NODE'
import fs from 'node:fs';
const base=process.env.PUBLIC_BASE;
async function rpc(id,method,params={}){const r=await fetch(base+'/mcp',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});const j=await r.json();if(!r.ok||j.error)throw new Error(`${method}: ${JSON.stringify(j)}`);return j.result;}
const init=await rpc(1,'initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'JM Navigator public proof',version:'1'}});
const tools=await rpc(2,'tools/list');
const resources=await rpc(3,'resources/list');
const read=await rpc(4,'resources/read',{uri:'ui://jm3232-navigator/stringdoor-v0.1.html'});
const search=await rpc(5,'tools/call',{name:'search',arguments:{query:'Radius Lexicon',limit:3}});
const receipt=await rpc(6,'tools/call',{name:'navigator_create_stringreceipt',arguments:{action:'PUBLIC_HTTPS_MCP_CONTACT_PROOF',target_id:'RL-RADIUS-LEXICON',outcome:'PASS',evidence:{surface:'Cloudflare Pages',mcpUrl:base+'/mcp'}}});
const mark=await rpc(7,'tools/call',{name:'navigator_create_stringmark',arguments:{target_id:'RL-RADIUS-LEXICON',label:'Live-contact proof',note:'Public HTTPS MCP state proof'}});
const save=await rpc(8,'tools/call',{name:'navigator_export_savepack',arguments:{name:'JM3232_NAVIGATOR_LIVE_CONTACT_PROOF',include_receipts:true}});
const status=await rpc(9,'tools/call',{name:'navigator_bridge_status',arguments:{}});
if(!init.serverInfo.name.includes('Navigator')||tools.tools.length!==10||resources.resources.length!==1||!read.contents[0].text.includes('JM3232')||!search.structuredContent.results.length) throw new Error('public read contract failed');
if(!receipt.structuredContent.hash||!mark.structuredContent.stringmark.id||!save.structuredContent.sha256||!status.structuredContent.runtime.receipt_chain_valid) throw new Error('public durable-write contract failed');
const proof={pass:true,publicBase:base,mcpUrl:base+'/mcp',protocol:init.protocolVersion,toolCount:10,resourceCount:1,searchTop:search.structuredContent.results[0].id,receiptId:receipt.structuredContent.id,stringmarkId:mark.structuredContent.stringmark.id,savepackSha256:save.structuredContent.sha256,runtime:status.structuredContent.runtime,canonicalArchive:{bytes:433440,sha256:'c821e3fad085291d35113c9d0543aee1b1fc58435b574a1a134398824c42b283',members:35},httpsMcpDing:true,chatgptAccountApprovalProvenHere:false,ownerInProductContactProvenHere:false};
fs.writeFileSync('NAVIGATOR_LIVE_HTTPS_MCP_PROOF_v0_1.json',JSON.stringify(proof,null,2)+'\n');
console.log(JSON.stringify(proof,null,2));
NODE
