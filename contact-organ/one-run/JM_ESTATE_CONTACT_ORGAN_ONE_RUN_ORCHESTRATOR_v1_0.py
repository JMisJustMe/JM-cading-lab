#!/usr/bin/env python3
from __future__ import annotations
import argparse, hashlib, json, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
REGISTRY = HERE / "JM_ESTATE_CONTACT_ORGAN_ONE_RUN_TARGET_REGISTRY_v1_0.json"
LIBRARIAN_MATERIALIZER_DEFAULT = Path("/mnt/data/JM_ESTATE_LIBRARIAN_CONTACT_ORGAN_MATERIALIZER_v1_0.py")

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024*1024), b""):
            h.update(chunk)
    return h.hexdigest()

def locate(root: Path, basename: str):
    hits = []
    try:
        for p in root.rglob(basename):
            if p.is_file():
                hits.append(p)
    except Exception:
        pass
    return hits

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", default="/mnt/data")
    ap.add_argument("--out-root", default="/mnt/data/JM_CONTACT_ORGAN_ONE_RUN_OUTPUT_v1_0")
    ap.add_argument("--generic-pack-root", default="")
    ap.add_argument("--librarian-materializer", default=str(LIBRARIAN_MATERIALIZER_DEFAULT))
    args = ap.parse_args()

    source_root = Path(args.source_root).resolve()
    out_root = Path(args.out_root).resolve()
    out_root.mkdir(parents=True, exist_ok=True)
    generic_root = Path(args.generic_pack_root).resolve() if args.generic_pack_root else None

    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    rows = []
    materialised = 0
    for t in reg["targets"]:
        hits = locate(source_root, t["sourceFile"])
        row = {
            "recipientId": t["recipientId"],
            "body": t["body"],
            "sourceFile": t["sourceFile"],
            "expectedBytes": t.get("expectedBytes"),
            "expectedSha256": t["expectedSha256"],
            "targetDescendant": t["targetDescendant"],
            "routeClass": t["routeClass"],
            "semanticConsequence": t["semanticConsequence"],
            "protectedParent": True,
            "sourceCandidates": [str(p) for p in hits],
        }
        if not hits:
            row["status"] = "EXACT_SOURCE_BYTES_NOT_WRITABLY_MOUNTED"
            rows.append(row)
            continue

        exact = None
        mismatches = []
        for p in hits:
            try:
                size = p.stat().st_size
                digest = sha256(p)
                ok_bytes = t.get("expectedBytes") is None or size == t["expectedBytes"]
                ok_sha = digest.lower() == t["expectedSha256"].lower()
                if ok_bytes and ok_sha:
                    exact = p
                    row["actualBytes"] = size
                    row["actualSha256"] = digest
                    break
                mismatches.append({"path": str(p), "bytes": size, "sha256": digest, "bytesMatch": ok_bytes, "sha256Match": ok_sha})
            except Exception as e:
                mismatches.append({"path": str(p), "error": repr(e)})
        if exact is None:
            row["status"] = "SOURCE_IDENTITY_GATE_FAIL"
            row["mismatches"] = mismatches
            rows.append(row)
            continue

        if t["recipientId"] == "phone-housekeeper":
            row["status"] = "EXACT_DECLARED_BRIDGE_PRESENT__NATIVE_SOURCE_PACKAGE_CONSEQUENCE_REQUIRED"
            row["claimBoundary"] = "No generic Housekeeper clone. Exact bridge identity is not native SAF execution."
            rows.append(row)
            continue

        if t["recipientId"] == "phone-librarian":
            mat = Path(args.librarian_materializer)
            if not mat.exists():
                row["status"] = "EXACT_SOURCE_PRESENT__LIBRARIAN_MATERIALIZER_NOT_MOUNTED"
                rows.append(row)
                continue
            proc = subprocess.run([sys.executable, str(mat), str(exact), "--out-dir", str(out_root)], capture_output=True, text=True)
            row["materializerExitCode"] = proc.returncode
            row["materializerOutput"] = (proc.stdout or proc.stderr)[-8000:]
            if proc.returncode == 0 and (out_root / t["targetDescendant"]).exists():
                row["status"] = "DESCENDANT_MATERIALISED__OWNER_PHYSICAL_DING_OPEN"
                row["descendantPath"] = str(out_root / t["targetDescendant"])
                row["descendantSha256"] = sha256(out_root / t["targetDescendant"])
                materialised += 1
            else:
                row["status"] = "LIBRARIAN_MATERIALISATION_BLOCKED"
            rows.append(row)
            continue

        if generic_root:
            patcher = generic_root / "patcher" / "JM_APPLY_CONTACT_ORGAN_PATCH_v1_0.py"
            organ = generic_root / "browser" / "JM_ESTATE_CONTACT_ORGAN_v1_0.js"
            cross = generic_root / "browser" / "JM_ESTATE_CROSS_DEVICE_CONTACT_ADAPTER_v1_0.js"
            cfg = generic_root / "recipients" / f"{t['recipientId']}.json"
        else:
            patcher = organ = cross = cfg = Path("/__not_mounted__")

        need_cross = str(t["inheritance"]).startswith("FULL")
        required = [patcher, organ, cfg] + ([cross] if need_cross else [])
        if not all(p.exists() for p in required):
            row["status"] = "EXACT_SOURCE_PRESENT__PATCH_PACK_NOT_WRITABLY_MOUNTED" if not need_cross else "EXACT_SOURCE_PRESENT__CROSS_DEVICE_PATCH_PACK_NOT_WRITABLY_MOUNTED"
            rows.append(row)
            continue

        out = out_root / t["targetDescendant"]
        cmd = [sys.executable, str(patcher), "--source", str(exact), "--config", str(cfg), "--out", str(out), "--organ", str(organ)]
        if need_cross:
            cmd += ["--cross-organ", str(cross)]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        row["patchExitCode"] = proc.returncode
        row["patchOutput"] = (proc.stdout or proc.stderr)[-8000:]
        if proc.returncode == 0 and out.exists():
            row["status"] = "DESCENDANT_MATERIALISED__PHYSICAL_DING_OPEN"
            row["descendantPath"] = str(out)
            row["descendantSha256"] = sha256(out)
            materialised += 1
        else:
            row["status"] = "PATCH_EXECUTION_BLOCKED"
        rows.append(row)

    crown_before = 6
    crown_after = crown_before
    report = {
        "schema": "jm.estate.contact-organ.one-run-reconciliation/1.0",
        "runAt": datetime.now(timezone.utc).isoformat(),
        "sourceRoot": str(source_root),
        "outRoot": str(out_root),
        "processed": len(rows),
        "expectedTargets": len(reg["targets"]),
        "sourceLevelDescendantsCreatedThisRun": materialised,
        "crownBefore": {"materialised": crown_before, "total": 28},
        "crownAfter": {"materialised": crown_after, "total": 28, "reason": "No physical/material body-specific Ding is synthesized by source transformation."},
        "unknown": 0,
        "frozenParentMutations": 0,
        "allTargetsAccounted": len(rows) == len(reg["targets"]),
        "rows": rows,
    }
    rp = out_root / "JM_ESTATE_CONTACT_ORGAN_ONE_RUN_RECONCILIATION_v1_0.json"
    rp.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
