#!/usr/bin/env python3
"""JM Carrier Registry Runner v0.1

Runs multiple JM multi-carrier plans as one Estate deployment gate.
One failing body HOLDs the publish pass; successful bodies retain separate receipts.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--registry", required=True)
    ap.add_argument("--repo-root", default=".")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    registry_path = (repo / args.registry).resolve()
    registry = json.loads(registry_path.read_text(encoding="utf-8"))
    if registry.get("schema") != "jm.multi-carrier-registry/1.0":
        raise SystemExit("HOLD: unsupported carrier registry schema")

    entries = [e for e in registry.get("entries", []) if e.get("enabled", True)]
    if not entries:
        raise SystemExit("HOLD: no enabled carrier plans")

    results = []
    for entry in entries:
        plan_rel = entry["plan"]
        print(f"\n=== JM CARRIER PLAN: {entry.get('id', plan_rel)} ===")
        proc = subprocess.run(
            [sys.executable, str(repo / "tools/jm_carrier_control.py"), "--plan", plan_rel, "--repo-root", str(repo)],
            cwd=repo,
            text=True,
        )
        if proc.returncode != 0:
            raise SystemExit(f"HOLD: carrier plan failed: {plan_rel}")

        plan = json.loads((repo / plan_rel).read_text(encoding="utf-8"))
        receipt_rel = plan["outputs"]["receipt"]
        receipt_path = repo / receipt_rel
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        if receipt.get("status") != "DING":
            raise SystemExit(f"HOLD: carrier plan receipt not DING: {plan_rel}")
        results.append({
            "id": entry.get("id") or plan.get("app_id"),
            "plan": plan_rel,
            "plan_sha256": sha256(repo / plan_rel),
            "app_id": plan.get("app_id"),
            "version": plan.get("version"),
            "body_sha256": receipt["verified_body"]["sha256"],
            "receipt": receipt_rel,
            "direct_https": receipt.get("outputs", {}).get("direct_https"),
            "portable_html": receipt.get("outputs", {}).get("portable_html"),
            "pwa": receipt.get("powers", {}).get("pwa"),
            "mirrors": receipt.get("powers", {}).get("mirrors", []),
            "status": "DING",
        })

    out_rel = registry.get("receipt") or "_carrier_outputs/JM-CARRIER-REGISTRY-RECEIPT.json"
    out = repo / out_rel
    out.parent.mkdir(parents=True, exist_ok=True)
    master = {
        "schema": "jm.multi-carrier-registry-receipt/1.0",
        "status": "DING",
        "keeper": "DO NOT CHOOSE A FORMAT. CHOOSE THE POWERS THE BODY NEEDS.",
        "registry": str(registry_path),
        "registry_sha256": sha256(registry_path),
        "enabled_plans": len(entries),
        "results": results,
    }
    out.write_text(json.dumps(master, indent=2) + "\n", encoding="utf-8")
    print("\n=== JM CARRIER REGISTRY DING ===")
    print(json.dumps(master, indent=2))


if __name__ == "__main__":
    main()
