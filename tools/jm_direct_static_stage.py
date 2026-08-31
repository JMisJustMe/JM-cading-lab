#!/usr/bin/env python3
"""JM Direct Static Stage

Build-time body/ carrier adapter for source bodies stored as base64(gzip(html)) chunks.
Heavy reconstruction and deterministic forward patches happen in CI; the published
runtime receives ordinary HTML directly.

Law: BODY != CARRIER. BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW.
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import json
from pathlib import Path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def decode_body(manifest_path: Path) -> tuple[bytes, dict]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    chunks = manifest.get("chunks") or []
    expected = str(manifest.get("body_sha256") or "").lower()
    if not chunks or len(expected) != 64:
        raise SystemExit("HOLD: invalid carrier manifest")

    joined = "".join(
        (manifest_path.parent / name).read_text(encoding="utf-8").strip()
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

    got = sha256_bytes(body)
    if got != expected:
        raise SystemExit(f"HOLD: body hash mismatch expected={expected} got={got}")
    return body, manifest


def apply_patch_spec(text: str, patch_path: Path | None) -> tuple[str, dict | None]:
    if patch_path is None:
        return text, None
    spec = json.loads(patch_path.read_text(encoding="utf-8"))
    out = text
    applied = []
    for item in spec.get("replacements", []):
        old = item["old"]
        new = item["new"]
        count = int(item.get("count", 1))
        present = out.count(old)
        if present < count:
            raise SystemExit(f"HOLD: forward patch source missing: {old[:80]!r}")
        out = out.replace(old, new, count)
        applied.append({"old": old[:120], "new": new[:120], "count": count})

    expected = str(spec.get("expected_body_sha256") or "").lower()
    got = sha256_bytes(out.encode("utf-8"))
    if expected and got != expected:
        raise SystemExit(f"HOLD: patched body hash mismatch expected={expected} got={got}")
    spec["applied"] = applied
    spec["result_body_sha256"] = got
    return out, spec


def inject_manifest_link(html: str, href: str) -> tuple[str, bool]:
    if "rel=\"manifest\"" in html or "rel='manifest'" in html:
        return html, False
    marker = "</head>"
    low = html.lower()
    if marker not in low:
        raise SystemExit("HOLD: HTML has no </head> for PWA metadata injection")
    idx = low.index(marker)
    tag = f'\n<link rel="manifest" href="{href}" />\n'
    return html[:idx] + tag + html[idx:], True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--receipt", required=True)
    ap.add_argument("--manifest-href", default="./manifest.webmanifest")
    ap.add_argument("--patches")
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    body, manifest = decode_body(manifest_path)
    source_sha = sha256_bytes(body)
    source_text = body.decode("utf-8")

    patched_text, patch_spec = apply_patch_spec(source_text, Path(args.patches) if args.patches else None)
    body_for_carrier = patched_text.encode("utf-8")
    body_for_carrier_sha = sha256_bytes(body_for_carrier)

    staged_text, injected = inject_manifest_link(patched_text, args.manifest_href)
    staged = staged_text.encode("utf-8")

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(staged)

    receipt = {
        "schema": "jm.direct-static-carrier/1.1",
        "law": "BODY != CARRIER; BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW",
        "source": {
            "manifest": str(manifest_path),
            "version": manifest.get("version"),
            "body_sha256": source_sha,
            "bytes": len(body),
        },
        "forward_body": {
            "patch_spec": str(args.patches) if args.patches else None,
            "body_sha256": body_for_carrier_sha,
            "bytes": len(body_for_carrier),
            "target_version": (patch_spec or {}).get("target_version"),
        },
        "carrier": {
            "kind": "DIRECT_HTTPS_STATIC_HTML",
            "output": str(out),
            "sha256": sha256_bytes(staged),
            "bytes": len(staged),
            "runtime_reconstruction": False,
            "manifest_link_injected": injected,
        },
        "status": "DING",
    }
    rp = Path(args.receipt)
    rp.parent.mkdir(parents=True, exist_ok=True)
    rp.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
