#!/usr/bin/env python3
"""Resilient front-end for the Estate Head Cloudflare deployment rail.

The canonical live Estate remains the first donor. When a governed public route
is absent from the current edge, the matching repository body is used rather
than aborting the whole preservation build or inventing a replacement.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import shutil
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("deploy_estate_head_public.py")
spec = importlib.util.spec_from_file_location("jm_estate_head_deploy_base", MODULE_PATH)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Cannot load {MODULE_PATH}")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

SEGMENT_DIR = Path("estate-head-public")
SEGMENTS = [SEGMENT_DIR / f"estate-head-public-v0.2.1.json.part{i:02d}" for i in range(1, 5)]
EXPECTED_SHA256 = "7dcfadf6b9e17dc0621194bd33a6ea9dd95bbcd35fa41d6e3db32b6f4c312676"


def decode_segmented_subset() -> dict:
    missing = [str(path) for path in SEGMENTS if not path.exists()]
    if missing:
        raise RuntimeError(f"Estate Head segmented carrier missing: {', '.join(missing)}")
    text = "".join(path.read_text(encoding="utf-8") for path in SEGMENTS)
    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    if digest != EXPECTED_SHA256:
        raise RuntimeError(f"Estate Head segmented carrier SHA mismatch: {digest}")
    data = json.loads(text)
    if len(data.get("bodies", [])) != 61:
        raise RuntimeError(f"Estate Head body count mismatch: {len(data.get('bodies', []))}")
    if len(data.get("project_heads", [])) != 11:
        raise RuntimeError(f"Estate Head Project Head count mismatch: {len(data.get('project_heads', []))}")
    gaps = data.get("gap_snapshot", {}).get("current_classification", {})
    if gaps != {"PARTIAL": 20, "OPEN": 35, "RESOLVED": 1}:
        raise RuntimeError(f"Estate Head gap snapshot mismatch: {gaps}")
    print(f"ESTATE HEAD CARRIER: segmented JSON PASS · sha256 {digest} · 61 bodies · 11 Project Heads")
    return data


def repository_fallback(route: str) -> bytes:
    candidates = [Path(route) / "index.html"]
    if route == "navigator":
        candidates.append(Path("JM3232_NAVIGATOR.html"))
    for candidate in candidates:
        if candidate.exists():
            print(f"ROUTE {route}: repository fallback {candidate}")
            return candidate.read_bytes()
    raise RuntimeError(f"Public route {route!r} is absent from live Estate and has no governed repository fallback")


def resilient_mirror_live() -> None:
    if base.OUT.exists():
        shutil.rmtree(base.OUT)
    (base.OUT / "assets").mkdir(parents=True)
    (base.OUT / "data").mkdir(parents=True)
    root = base.fetch(base.BASE)
    text = root.decode("utf-8", "replace")
    base.write("index.html", root)
    print("ROUTE /: live donor PASS")
    refs = set(base.re.findall(r'''(?:src|href)=["']([^"']+)["']''', text, flags=base.re.I))
    copied_assets = 0
    for ref in sorted(refs):
        if ref.startswith(("data:", "mailto:", "tel:", "#")):
            continue
        full = base.urljoin(base.BASE, ref)
        parsed = base.urlparse(full)
        if parsed.netloc != base.urlparse(base.BASE).netloc:
            continue
        path = parsed.path.lstrip("/")
        if not path or path.endswith("/"):
            continue
        data = base.fetch(full, required=False)
        if data:
            base.write(path, data)
            copied_assets += 1
    print(f"ROOT ASSETS: {copied_assets} live references preserved")
    for path in ["404.html", "manifest.webmanifest", "robots.txt", "sitemap.xml", "assets/jm-mark.svg", "data/estate-canonical-site.json", "data/estate-public.json", "data/installed-districts-public.json", "data/installed-private.schema.json", "data/source-chambers.schema.json", "data/storage-policy.json"]:
        data = base.fetch(base.urljoin(base.BASE, path), required=False)
        if data:
            base.write(path, data)
    route_ledger = []
    for route in base.ROUTES:
        data = base.fetch(base.urljoin(base.BASE, f"{route}/"), required=False)
        source = "live"
        if not data:
            data = repository_fallback(route)
            source = "repository-fallback"
        base.write(f"{route}/index.html", data)
        route_ledger.append({"route": f"/{route}/", "source": source, "bytes": len(data)})
        print(f"ROUTE /{route}/: {source} PASS ({len(data)} bytes)")
    for path in ["navigator/stringline.json", "navigator/JM3232_NAVIGATOR_REGISTRY.json", "recovery/JM3232_NAVIGATOR_REGISTRY.json"]:
        data = base.fetch(base.urljoin(base.BASE, path), required=False)
        if not data and Path(path).exists():
            data = Path(path).read_bytes()
        if data:
            base.write(path, data)
    receipt = {"schema": "JM.EstateHeadLiveMirror/0.2.1", "canonical_donor": base.BASE, "routes": route_ledger, "law": "Live first; governed repository fallback second; invention never."}
    base.write("data/estate-head-mirror-ledger.json", (json.dumps(receipt, indent=2) + "\n").encode())


base.decode_subset = decode_segmented_subset
base.mirror_live = resilient_mirror_live

if __name__ == "__main__":
    base.main()
