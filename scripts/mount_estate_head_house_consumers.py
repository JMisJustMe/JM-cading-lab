#!/usr/bin/env python3
"""Mount one public-safe Estate Head consumer into every public House."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "registry/estate-head-public-current.json"
ESTATE_MAP = ROOT / "registry/estate-map.json"
CONSUMER = ROOT / "estate-head-public-consumer.js"
RECEIPT = ROOT / "registry/estate-head-house-consumption-receipt.json"
RECEIPT_MD = ROOT / "docs/JM_ESTATE_HEAD_HOUSE_CONSUMPTION_RECEIPT.md"
PAGES = {"apps/index.html":"../estate-head-public-consumer.js","games-beyond/index.html":"../estate-head-public-consumer.js","games-beyond/routeos/index.html":"../../estate-head-public-consumer.js","theory/index.html":"../estate-head-public-consumer.js","lyrics/index.html":"../estate-head-public-consumer.js","recovery/index.html":"../estate-head-public-consumer.js","author/index.html":"../estate-head-public-consumer.js","coding-estate/everybody/00_OPEN_FIRST.html":"../../estate-head-public-consumer.js","cading.html":"./estate-head-public-consumer.js"}

def read_json(path): return json.loads(path.read_text(encoding="utf-8"))
def write_json(path,value): path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")

def main():
    contract=read_json(CONTRACT); estate=read_json(ESTATE_MAP)
    if not contract.get("current_public_subset_version") or "private" not in contract.get("boundary","").lower(): raise RuntimeError("Estate Head public boundary missing")
    CONSUMER.write_text(r"""(() => {'use strict';const s=document.currentScript;if(!s)return;const u=new URL('./registry/estate-head-public-current.json',s.src);const clean=v=>String(v||'').replace(/^\/+/, '').replace(/index\.html$/,'');fetch(u,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(`Estate Head ${r.status}`);return r.json()}).then(c=>{window.JM_ESTATE_HEAD_PUBLIC=c;document.documentElement.dataset.estateHeadAuthority=c.current_public_subset_version||'current';document.documentElement.dataset.estateHeadConsumption=c.deployment_state||'unknown';const p=clean(location.pathname.includes('/JM-cading-lab/')?location.pathname.split('/JM-cading-lab/').pop():location.pathname);const h=(c.public_house_routes||[]).find(x=>clean(x.path)===p);if(h){document.documentElement.dataset.estateHouseState=h.state||'REGISTERED';document.documentElement.dataset.estateHouseName=h.body||''}const t=document.querySelector('.brand small,.head span,.topbar .brand small,header small');if(t&&!t.dataset.estateHeadStamped){t.dataset.estateHeadStamped='true';t.textContent=`${t.textContent.trim()} · EH ${c.current_public_subset_version||'current'}`}document.dispatchEvent(new CustomEvent('jm:estate-head-authority',{detail:{contract:c,house:h}}))}).catch(e=>{document.documentElement.dataset.estateHeadConsumption='sovereign-fallback';console.warn('Estate Head authority unavailable; House kept its sovereign fallback.',e)})})();
""",encoding="utf-8")
    consumers=[]
    for relative,source in PAGES.items():
        path=ROOT/relative
        if not path.exists(): raise RuntimeError(f"Public House page missing: {relative}")
        text=path.read_text(encoding="utf-8"); tag=f'<script src="{source}" data-jm-estate-head-consumer></script>'
        if "data-jm-estate-head-consumer" not in text:
            closing=text.lower().rfind("</body>")
            if closing<0: raise RuntimeError(f"Public House has no closing body: {relative}")
            path.write_text(text[:closing]+tag+text[closing:],encoding="utf-8")
        consumers.append(relative)
    routes=[{"body":r.get("body"),"path":r.get("path"),"state":r.get("state")} for r in estate.get("live_github_routes",[]) if r.get("path")]
    contract.update({"deployment_state":"PUBLIC_HOUSE_CONSUMPTION_LIVE_IN_REPOSITORY","public_house_consumers":consumers,"public_house_routes":routes,"public_consumers":["registry/estate-map.json","estate-app.js","index.html","sw.js","estate-head-public-consumer.js",*consumers],"house_consumption_receipt":"registry/estate-head-house-consumption-receipt.json","boundary":"Public contract only. No private source routes, owner notes, custody paths or raw gap evidence are included. Repository and public-House consumption are live; Cloudflare edge publication is claimed only after a separate live-door verification."})
    write_json(CONTRACT,contract)
    authority=estate.setdefault("estate_head_public_authority",{}); authority.update({"schema":contract.get("schema"),"version":contract.get("current_public_subset_version"),"body_count":contract.get("body_count"),"project_head_count":contract.get("project_head_count"),"contract":"registry/estate-head-public-current.json","consumption_state":"PUBLIC_HOUSE_CONSUMPTION_LIVE_IN_REPOSITORY","public_house_consumers":consumers,"boundary":contract["boundary"],"projection_rule":"Each public House reads the shared authority contract while retaining sovereign design, detail and fallback behaviour."})
    for d in estate.get("registered_departments",[]):
        if d.get("body")=="Estate Head & Command": d.update({"state":"PUBLIC_HOUSE_AUTHORITY_LIVE","boundary":contract["boundary"],"public_house_consumers":len(consumers)})
    write_json(ESTATE_MAP,estate)
    now=datetime.now(timezone.utc).replace(microsecond=0).isoformat(); receipt={"schema":"JM.EstateHeadHouseConsumptionReceipt/1.0","generated_at":now,"contract_version":contract["current_public_subset_version"],"body_count":contract.get("body_count"),"project_head_count":contract.get("project_head_count"),"consumer_script":"estate-head-public-consumer.js","public_house_consumers":consumers,"public_house_routes":routes,"state":"PUBLIC_HOUSE_CONSUMPTION_LIVE_IN_REPOSITORY","boundary":"This proves repository and House integration. Cloudflare edge publication requires separate live verification."}; write_json(RECEIPT,receipt)
    RECEIPT_MD.parent.mkdir(parents=True,exist_ok=True); RECEIPT_MD.write_text(f"# JM Estate Head — Public House Consumption Receipt\n\n- **Generated:** {now}\n- **Contract:** {contract['current_public_subset_version']}\n- **Public Houses consuming authority:** {len(consumers)}\n- **Registered bodies:** {contract.get('body_count')}\n- **Project Heads:** {contract.get('project_head_count')}\n- **State:** PUBLIC HOUSE CONSUMPTION LIVE IN REPOSITORY\n\n> One authority contract. Many sovereign House surfaces. None flattened.\n\nCloudflare edge publication remains a separate live-door verification.\n",encoding="utf-8")
    print(json.dumps({"status":"PASS","contract":contract["current_public_subset_version"],"houses":len(consumers)}))
if __name__=="__main__": main()
