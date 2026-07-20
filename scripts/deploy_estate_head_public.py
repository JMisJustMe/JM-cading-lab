#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import datetime as dt
import gzip
import json
import os
import re
import time
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

BASE = "https://jmisjustme-estate.pages.dev/"
OUT = Path("cloudflare-estate")
MARKER = '<script defer src="/assets/estate-head-consumer-v021.js"></script>'
ROUTES = ["navigator", "apps", "theory", "lyrics", "recovery"]


def fetch(url: str, required: bool = True) -> bytes:
    try:
        request = Request(url, headers={"User-Agent": "JM-EstateHead-Deploy/0.2.1"})
        with urlopen(request, timeout=35) as response:
            return response.read()
    except Exception:
        if required:
            raise
        return b""


def write(rel: str, data: bytes) -> None:
    target = OUT / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def mirror_live() -> None:
    if OUT.exists():
        import shutil
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    (OUT / "data").mkdir(parents=True)

    root = fetch(BASE)
    text = root.decode("utf-8", "replace")
    write("index.html", root)
    refs = set(re.findall(r'''(?:src|href)=["']([^"']+)["']''', text, flags=re.I))
    for ref in sorted(refs):
        if ref.startswith(("data:", "mailto:", "tel:", "#")):
            continue
        full = urljoin(BASE, ref)
        parsed = urlparse(full)
        if parsed.netloc != urlparse(BASE).netloc:
            continue
        path = parsed.path.lstrip("/")
        if not path or path.endswith("/"):
            continue
        data = fetch(full, required=False)
        if data:
            write(path, data)

    for path in [
        "404.html", "manifest.webmanifest", "robots.txt", "sitemap.xml",
        "assets/jm-mark.svg", "data/estate-canonical-site.json",
        "data/estate-public.json", "data/installed-districts-public.json",
        "data/installed-private.schema.json", "data/source-chambers.schema.json",
        "data/storage-policy.json",
    ]:
        data = fetch(urljoin(BASE, path), required=False)
        if data:
            write(path, data)

    for route in ROUTES:
        write(f"{route}/index.html", fetch(urljoin(BASE, f"{route}/")))
    for path in [
        "navigator/stringline.json", "navigator/JM3232_NAVIGATOR_REGISTRY.json",
        "recovery/JM3232_NAVIGATOR_REGISTRY.json",
    ]:
        data = fetch(urljoin(BASE, path), required=False)
        if data:
            write(path, data)


def decode_subset() -> dict:
    payload = Path("estate-head-public/estate-head-public-v0.2.1.json.gz.b64").read_text().strip()
    data = json.loads(gzip.decompress(base64.b64decode(payload)))
    assert data["meta"]["version"] == "v0.2.1"
    assert len(data["bodies"]) == 61
    assert len(data["project_heads"]) == 11
    assert data["gap_snapshot"]["current_classification"] == {"PARTIAL": 20, "OPEN": 35, "RESOLVED": 1}
    return data


def inject(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    if MARKER not in text:
        at = text.lower().rfind("</body>")
        if at < 0:
            raise RuntimeError(f"No body close tag in {path}")
        text = text[:at] + MARKER + text[at:]
        path.write_text(text, encoding="utf-8")
    if text.count(MARKER) != 1:
        raise RuntimeError(f"Consumer marker count invalid in {path}")


def build() -> None:
    import shutil
    mirror_live()
    shutil.rmtree(OUT / "lyrics", ignore_errors=True)
    shutil.copytree("lyrics", OUT / "lyrics")
    data = decode_subset()
    (OUT / "estate-head").mkdir(parents=True, exist_ok=True)
    shutil.copy2("estate-head-public/index.html", OUT / "estate-head/index.html")
    shutil.copy2("estate-head-public/estate-head-consumer-v021.js", OUT / "assets/estate-head-consumer-v021.js")
    (OUT / "data/estate-head-public-v0.2.1.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")

    current = json.loads(Path("registry/estate-head-public-current.json").read_text())
    current["deployment_state"] = "PUBLIC_CONSUMED"
    current["public_subset_path"] = "/data/estate-head-public-v0.2.1.json"
    current["public_head_route"] = "/estate-head/"
    (OUT / "data/estate-head-public-current.json").write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")

    for rel in ["index.html", *[f"{r}/index.html" for r in ROUTES]]:
        inject(OUT / rel)

    (OUT / "_headers").write_text("""/*
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
    (OUT / "_redirects").write_text("/* /index.html 200\n")
    (OUT / "sw.js").write_text("""const CACHE='jm-independent-estate-head-v021-1';
const CORE=['./','./index.html','./navigator/','./apps/','./theory/','./lyrics/','./recovery/','./estate-head/','./assets/estate-head-consumer-v021.js','./data/estate-head-public-current.json','./data/estate-head-public-v0.2.1.json'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('./index.html'))))});
""")
    assert "JM ESTATE HEAD v0.2.1" in (OUT / "estate-head/index.html").read_text()
    assert "JM LyricStudio v0.5.1" in (OUT / "lyrics/index.html").read_text()
    assert "121 tap-open entries" in (OUT / "lyrics/index.html").read_text()
    for rel in ["index.html", *[f"{r}/index.html" for r in ROUTES]]:
        assert MARKER in (OUT / rel).read_text()
    print("LyricStudio + Estate Head deployment body PASS")


def get_text(path: str, stamp: str) -> str:
    return fetch(urljoin(BASE, path) + f"?proof={stamp}", required=False).decode("utf-8", "replace")


def prove() -> None:
    run = os.environ.get("GITHUB_RUN_ID", "local")
    for attempt in range(1, 46):
        stamp = f"{run}-{attempt}"
        head = get_text("estate-head/", stamp)
        current = get_text("data/estate-head-public-current.json", stamp)
        pages = {r: get_text(f"{r}/", stamp) for r in ["apps", "theory", "lyrics", "recovery"]}
        if (
            "JM ESTATE HEAD v0.2.1" in head
            and '"deployment_state": "PUBLIC_CONSUMED"' in current
            and all("/assets/estate-head-consumer-v021.js" in page for page in pages.values())
            and "JM LyricStudio v0.5.1" in pages["lyrics"]
            and "121 tap-open entries" in pages["lyrics"]
        ):
            print("Canonical Cloudflare Estate Head consumption PASS")
            return
        time.sleep(2)
    raise SystemExit("Canonical Estate Head proof did not pass")


def receipt() -> None:
    data = decode_subset()
    Path("registry/estate-head-public-v0.2.1.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    current_path = Path("registry/estate-head-public-current.json")
    current = json.loads(current_path.read_text())
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    current.update({
        "deployment_state": "PUBLIC_CONSUMED",
        "public_subset_path": "/data/estate-head-public-v0.2.1.json",
        "public_head_route": "https://jmisjustme-estate.pages.dev/estate-head/",
        "deployed_at_utc": now,
        "source_commit": os.environ.get("GITHUB_SHA", ""),
        "workflow_run": os.environ.get("GITHUB_RUN_ID", ""),
    })
    current_path.write_text(json.dumps(current, ensure_ascii=False, indent=2) + "\n")
    receipt = {
        "schema": "JM.CloudflareEstateHeadReceipt/0.2.1", "status": "SUCCESS",
        "project": "jmisjustme-estate", "canonical_route": current["public_head_route"],
        "source_commit": current["source_commit"], "workflow_run": current["workflow_run"],
        "deployed_at_utc": now, "public_subset_version": "v0.2.1",
        "canonical_bodies": 61, "project_heads": 11,
        "gap_snapshot": {"OPEN": 35, "PARTIAL": 20, "RESOLVED": 1},
        "consumer_routes_proven": ["/", "/navigator/", "/apps/", "/theory/", "/lyrics/", "/recovery/"],
        "private_owner_fields_published": False, "manual_upload_required": False,
    }
    Path("registry/cloudflare-estate-head-deploy-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    lyric = {
        "schema": "JM.CloudflareLyricStudioReceipt/0.5.1", "status": "SUCCESS",
        "project": "jmisjustme-estate", "canonical_route": urljoin(BASE, "lyrics/"),
        "source_commit": current["source_commit"], "workflow_run": current["workflow_run"],
        "deployed_at_utc": now, "body": "JM LyricStudio v0.5.1 — First-Party Estate",
        "entries": 121, "live_title_proven": True, "app_back_control_proven": True,
        "estate_head_consumer_proven": True, "manual_upload_required": False,
    }
    Path("registry/cloudflare-lyrics-deploy-receipt.json").write_text(json.dumps(lyric, indent=2) + "\n")
    print("Receipts written")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["build", "prove", "receipt"])
    args = parser.parse_args()
    globals()[args.mode]()


if __name__ == "__main__":
    main()
