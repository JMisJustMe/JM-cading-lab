#!/usr/bin/env python3
import argparse, hashlib, json, pathlib, subprocess, sys

ROOT=pathlib.Path(__file__).resolve().parents[3]
ADAPTER=ROOT/"agent-runtime"/"host-adapters"/"codex-repository-agent"/"JM_CODEX_REPOSITORY_AGENT_ADAPTER_v0_1.json"

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def stable(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",",":"))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--query",required=True)
    ap.add_argument("--target",default=".")
    ap.add_argument("--compact",action="store_true")
    args=ap.parse_args()

    adapter=json.loads(ADAPTER.read_text(encoding="utf-8"))
    instruction_paths=[
        ROOT/"AGENTS.md",
        ROOT/".github"/"copilot-instructions.md",
        ROOT/"services"/"jm-ecostate-build-mesh-mcp-v0_5"/"AGENTS.md",
    ]
    missing=[str(p.relative_to(ROOT)) for p in instruction_paths if not p.exists()]
    if missing:
        print("JM CODEX/REPOSITORY ADAPTER: FAIL missing instructions "+repr(missing),file=sys.stderr)
        return 1

    core_text=subprocess.check_output([
        "python3","agent-runtime/jm_agent_runtime.py","--core-only","--surface","codex-repository","--query",args.query
    ],cwd=ROOT,text=True).strip()
    core=json.loads(core_text)

    envelope={
        "schema":"JM.RepositoryAgentSession/0.1",
        "authority_class":"HOST_ADAPTER_NOT_SOURCE_AUTHORITY",
        "adapter":{
            "schema":adapter["schema"],
            "target_surface":adapter["target_surface"],
            "live_codex_contact":False,
        },
        "repository":{
            "target":args.target,
            "instruction_carriers":[
                {"path":str(p.relative_to(ROOT)),"sha256":sha(p)}
                for p in instruction_paths
            ],
        },
        "core_sha256":hashlib.sha256(core_text.encode("utf-8")).hexdigest(),
        "core":core,
        "required_host_actions":[
            "inherit the nearest applicable AGENTS.md before material change",
            "recover current authority before rebuild",
            "preserve host-adapter/source-authority separation",
            "run repository tests required by the changed scope",
            "return consequence/readback before claiming completion"
        ],
        "proof_boundary":"Wrapper FUNCTION proof only; exact Codex/repository host contact remains OPEN."
    }
    print(stable(envelope) if args.compact else json.dumps(envelope,ensure_ascii=False,sort_keys=True,indent=2))
    return 0

if __name__=="__main__":
    raise SystemExit(main())
