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
import os
import shutil
import time
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


def lyrics_house_pass(text: str) -> bool:
    identity = "JM Lyrics & Music House" in text or "LYRICS &amp; MUSIC HOUSE" in text
    working_desk = 'id="lyricText"' in text and 'id="save"' in text and 'id="export"' in text
    boundary = "Public-source boundary" in text or "Public projection does not impersonate" in text
    return identity and working_desk and boundary


def resilient_build() -> None:
    resilient_mirror_live()
    shutil.rmtree(base.OUT / "lyrics", ignore_errors=True)
    shutil.copytree("lyrics", base.OUT / "lyrics")
    data = decode_segmented_subset()
    (base.OUT / "estate-head").mkdir(parents=True, exist_ok=True)
    shutil.copy2("estate-head-public/index.html", base.OUT / "estate-head/index.html")
    shutil.copy2("estate-head-public/estate-head-consumer-v021.js", base.OUT / "assets/estate-head-consumer-v021.js")
    (base.OUT / "data/estate-head-public-v0.2.1.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    current = json.loads(Path("registry/estate-head-public-current.json").read_text())
    current["deployment_state"] = "PUBLIC_CONSUMED"
    current["public_subset_path"] = "/data/estate-head-public-v0.2.1.json"
    current["public_head_route"] = "/estate-head/"
    (base.OUT / "data/estate-head-public-current.json").write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
    for rel in ["index.html", *[f"{route}/index.html" for route in base.ROUTES]]:
        base.inject(base.OUT / rel)
    (base.OUT / "_headers").write_text("""/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(self), geolocation=()
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/data/estate-head-*
  Cache-Control: no-cache
/estate-head/*
  Cache-Control: no-cache
/lyrics/*
  Cache-Control: no-cache
""")
    (base.OUT / "_redirects").write_text("/* /index.html 200\n")
    (base.OUT / "sw.js").write_text("""const CACHE='jm-independent-estate-head-v021-3';
const CORE=['./','./index.html','./navigator/','./apps/','./theory/','./lyrics/','./recovery/','./estate-head/','./assets/estate-head-consumer-v021.js','./data/estate-head-public-current.json','./data/estate-head-public-v0.2.1.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html'))))});
""")
    assert "JM ESTATE HEAD v0.2.1" in (base.OUT / "estate-head/index.html").read_text()
    lyric_text = (base.OUT / "lyrics/index.html").read_text()
    assert lyrics_house_pass(lyric_text), "Lyrics House structural proof failed"
    for rel in ["index.html", *[f"{route}/index.html" for route in base.ROUTES]]:
        assert base.MARKER in (base.OUT / rel).read_text()
    print("Lyrics House structure + Estate Head deployment body PASS")


def resilient_prove() -> None:
    run = os.environ.get("GITHUB_RUN_ID", "local")
    for attempt in range(1, 46):
        stamp = f"{run}-{attempt}"
        head = base.get_text("estate-head/", stamp)
        current = base.get_text("data/estate-head-public-current.json", stamp)
        pages = {route: base.get_text(f"{route}/", stamp) for route in ["apps", "theory", "lyrics", "recovery"]}
        if (
            "JM ESTATE HEAD v0.2.1" in head
            and '"deployment_state": "PUBLIC_CONSUMED"' in current
            and all("/assets/estate-head-consumer-v021.js" in page for page in pages.values())
            and lyrics_house_pass(pages["lyrics"])
        ):
            print("Canonical Cloudflare Estate Head consumption PASS")
            return
        time.sleep(2)
    raise SystemExit("Canonical Estate Head proof did not pass")


base.decode_subset = decode_segmented_subset
base.mirror_live = resilient_mirror_live
base.build = resilient_build
base.prove = resilient_prove

if __name__ == "__main__":
    base.main()
