#!/usr/bin/env python3
"""JM Multi-Carrier Control Organ v0.1

Generic build-time carrier controller for JM software bodies.

Keeper:
    DO NOT CHOOSE A FORMAT. CHOOSE THE POWERS THE BODY NEEDS.

Laws:
    BODY != CARRIER.
    DIRECT FIRST. ENHANCE SECOND. ESCALATE THIRD.
    BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW.

The controller takes one JSON plan and can:
- recover a source body from ordinary HTML or base64(gzip(html)) chunks;
- verify the source body before mutation;
- apply deterministic forward-body replacements;
- verify the resulting body exactly;
- publish a direct HTTPS document (no runtime reconstruction);
- emit a portable HTML carrier from the same verified body;
- validate PWA metadata as an enhancement layer;
- record requested carrier powers and mirror intentions;
- write a machine-readable DING/HOLD receipt.

It deliberately does NOT make PWA/native/mirror machinery a prerequisite for the
web body to launch. The direct document remains the floor.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
import shutil
from pathlib import Path
from typing import Any


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve(base: Path, value: str) -> Path:
    p = Path(value)
    return p if p.is_absolute() else (base / p)


def read_source(plan: dict[str, Any], repo: Path) -> tuple[bytes, dict[str, Any]]:
    src = plan.get("source") or {}
    kind = src.get("kind")

    if kind == "html":
        path = resolve(repo, src["path"])
        body = path.read_bytes()
        provenance = {"kind": kind, "path": str(path)}

    elif kind == "gzip_base64_manifest":
        manifest_path = resolve(repo, src["manifest"])
        manifest = load_json(manifest_path)
        chunks = manifest.get("chunks") or []
        if not chunks:
            raise SystemExit("HOLD: source carrier manifest has no chunks")

        joined = "".join(
            (manifest_path.parent / name).read_text(encoding="utf-8")
            for name in chunks
        )
        clean = "".join(joined.split())
        rem = len(clean) % 4
        if rem == 1:
            raise SystemExit("HOLD: impossible Base64 length")
        clean += "=" * ((4 - rem) % 4)

        try:
            compressed = base64.b64decode(clean, validate=True)
        except Exception as exc:
            raise SystemExit(f"HOLD: Base64 decode failed: {exc}")
        try:
            body = gzip.decompress(compressed)
        except Exception as exc:
            raise SystemExit(f"HOLD: gzip decompress failed: {exc}")

        provenance = {
            "kind": kind,
            "manifest": str(manifest_path),
            "manifest_version": manifest.get("version"),
            "chunks": list(chunks),
            "manifest_body_sha256": manifest.get("body_sha256"),
        }
        manifest_expected = str(manifest.get("body_sha256") or "").lower()
        if manifest_expected and sha256_bytes(body) != manifest_expected:
            raise SystemExit(
                f"HOLD: manifest source hash mismatch expected={manifest_expected} got={sha256_bytes(body)}"
            )
    else:
        raise SystemExit(f"HOLD: unsupported source kind {kind!r}")

    expected = str(src.get("expected_sha256") or "").lower()
    got = sha256_bytes(body)
    if expected and got != expected:
        raise SystemExit(f"HOLD: source hash mismatch expected={expected} got={got}")

    provenance.update({"sha256": got, "bytes": len(body)})
    return body, provenance


def apply_transforms(text: str, plan: dict[str, Any]) -> tuple[str, list[dict[str, Any]]]:
    out = text
    applied: list[dict[str, Any]] = []
    for idx, item in enumerate(plan.get("transforms") or [], start=1):
        op = item.get("op", "replace")
        if op != "replace":
            raise SystemExit(f"HOLD: transform {idx} unsupported op={op!r}")
        old = str(item["old"])
        new = str(item["new"])
        count = int(item.get("count", 1))
        present = out.count(old)
        if present < count:
            raise SystemExit(
                f"HOLD: transform {idx} source missing; need={count} present={present}: {old[:100]!r}"
            )
        out = out.replace(old, new, count)
        applied.append({
            "index": idx,
            "op": op,
            "count": count,
            "old_sha256": sha256_bytes(old.encode("utf-8")),
            "new_sha256": sha256_bytes(new.encode("utf-8")),
        })
    return out, applied


def validate_body(body: bytes, plan: dict[str, Any]) -> dict[str, Any]:
    rules = plan.get("validate") or {}
    text = body.decode("utf-8")
    got = sha256_bytes(body)
    expected = str(rules.get("expected_sha256") or "").lower()
    if expected and got != expected:
        raise SystemExit(f"HOLD: target body hash mismatch expected={expected} got={got}")

    missing = [s for s in rules.get("required_strings") or [] if s not in text]
    present_forbidden = [s for s in rules.get("forbidden_strings") or [] if s in text]
    if missing:
        raise SystemExit(f"HOLD: required body invariants missing: {missing}")
    if present_forbidden:
        raise SystemExit(f"HOLD: forbidden stale body invariants present: {present_forbidden}")

    return {
        "sha256": got,
        "bytes": len(body),
        "required_strings": len(rules.get("required_strings") or []),
        "forbidden_strings": len(rules.get("forbidden_strings") or []),
    }


def validate_pwa(plan: dict[str, Any], repo: Path) -> dict[str, Any]:
    pwa = ((plan.get("powers") or {}).get("pwa") or {})
    if not pwa.get("enabled"):
        return {"enabled": False}

    manifest_path = resolve(repo, pwa["manifest"])
    manifest = load_json(manifest_path)
    required = ["name", "short_name", "start_url", "scope", "display"]
    missing = [k for k in required if not manifest.get(k)]
    if missing:
        raise SystemExit(f"HOLD: PWA manifest missing fields: {missing}")

    sw = pwa.get("service_worker")
    sw_path = resolve(repo, sw) if sw else None
    if sw_path and not sw_path.exists():
        raise SystemExit(f"HOLD: declared service worker missing: {sw_path}")

    return {
        "enabled": True,
        "manifest": str(manifest_path),
        "manifest_sha256": sha256_bytes(manifest_path.read_bytes()),
        "service_worker": str(sw_path) if sw_path else None,
        "service_worker_sha256": sha256_bytes(sw_path.read_bytes()) if sw_path else None,
        "display": manifest.get("display"),
        "start_url": manifest.get("start_url"),
        "scope": manifest.get("scope"),
    }


def write_outputs(body: bytes, plan: dict[str, Any], repo: Path) -> dict[str, Any]:
    outputs = plan.get("outputs") or {}
    result: dict[str, Any] = {}

    direct = outputs.get("direct_https")
    if direct:
        path = resolve(repo, direct)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        result["direct_https"] = {
            "path": str(path),
            "sha256": sha256_bytes(path.read_bytes()),
            "bytes": path.stat().st_size,
            "runtime_reconstruction": False,
        }

    portable = outputs.get("portable_html")
    if portable:
        path = resolve(repo, portable)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)
        result["portable_html"] = {
            "path": str(path),
            "sha256": sha256_bytes(path.read_bytes()),
            "bytes": path.stat().st_size,
        }

    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", required=True, help="JSON carrier plan relative to repository root")
    ap.add_argument("--repo-root", default=".")
    args = ap.parse_args()

    repo = Path(args.repo_root).resolve()
    plan_path = resolve(repo, args.plan)
    plan = load_json(plan_path)

    schema = plan.get("schema")
    if schema != "jm.multi-carrier-plan/1.0":
        raise SystemExit(f"HOLD: unsupported plan schema {schema!r}")

    source, source_receipt = read_source(plan, repo)
    text = source.decode("utf-8")
    transformed, applied = apply_transforms(text, plan)
    body = transformed.encode("utf-8")
    body_receipt = validate_body(body, plan)
    pwa_receipt = validate_pwa(plan, repo)
    output_receipt = write_outputs(body, plan, repo)

    powers = plan.get("powers") or {}
    mirrors = powers.get("mirrors") or []
    receipt = {
        "schema": "jm.multi-carrier-receipt/1.0",
        "status": "DING",
        "keeper": "DO NOT CHOOSE A FORMAT. CHOOSE THE POWERS THE BODY NEEDS.",
        "laws": [
            "BODY != CARRIER",
            "DIRECT FIRST. ENHANCE SECOND. ESCALATE THIRD.",
            "BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW",
        ],
        "app": {
            "id": plan.get("app_id"),
            "name": plan.get("name"),
            "version": plan.get("version"),
        },
        "plan": {"path": str(plan_path), "sha256": sha256_bytes(plan_path.read_bytes())},
        "source": source_receipt,
        "transforms": applied,
        "verified_body": body_receipt,
        "powers": {
            "direct_https": bool((powers.get("direct_https") or {}).get("enabled", False)),
            "pwa": pwa_receipt,
            "portable": bool((powers.get("portable") or {}).get("enabled", False)),
            "native_ready": bool((powers.get("native") or {}).get("ready", False)),
            "mirrors": mirrors,
        },
        "outputs": output_receipt,
    }

    receipt_path_value = (plan.get("outputs") or {}).get("receipt")
    if not receipt_path_value:
        raise SystemExit("HOLD: plan must declare outputs.receipt")
    receipt_path = resolve(repo, receipt_path_value)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
