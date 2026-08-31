#!/usr/bin/env python3
"""JM Direct Static Stage

Build-time carrier adapter for bodies stored as base64(gzip(html)) chunks.
Heavy reconstruction happens in CI; the published runtime receives normal HTML directly.

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


def inject_manifest_link(html: str, href: str) -> tuple[str, bool]:
    if "rel=\"manifest\"" in html or "rel='manifest'" in html:
        return html, False
    marker = "</head>"
    if marker.lower() not in html.lower():
        raise SystemExit("HOLD: HTML has no </head> for PWA metadata injection")
    idx = html.lower().index(marker.lower())
    tag = f'\n<link rel="manifest" href="{href}" />\n'
    return html[:idx] + tag + html[idx:], True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--receipt", required=True)
    ap.add_argument("--manifest-href", default="./manifest.webmanifest")
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    body, manifest = decode_body(manifest_path)
    source_sha = sha256_bytes(body)
    source_text = body.decode("utf-8")
    staged_text, injected = inject_manifest_link(source_text, args.manifest_href)
    staged = staged_text.encode("utf-8")

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(staged)

    receipt = {
        "schema": "jm.direct-static-carrier/1.0",
        "law": "BODY != CARRIER; BUILD COMPLEXITY MAY BE HIGH; LAUNCH COMPLEXITY SHOULD BE LOW",
        "source": {
            "manifest": str(manifest_path),
            "version": manifest.get("version"),
            "body_sha256": source_sha,
            "bytes": len(body),
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
