#!/usr/bin/env python3
"""Apply the bounded JM Owner Vault v0.1 graft to the existing Web Estate.

This tool intentionally edits only three existing public-crown files:
- index.html: load the optional Owner Vault client bridge.
- sw.js: cache the bridge but never cache private /api/owner/ responses.
- authoritative Cloudflare workflow: deploy the bridge and trigger when Functions change.

It is idempotent and fails if expected anchors disappear, so a changed crown is reviewed
rather than silently rewritten.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def patch_index() -> bool:
    path = "index.html"
    text = read(path)
    tag = '<script defer src="./estate-owner-vault.js"></script>'
    if tag in text:
        return False
    anchor = '<script type="module" src="./estate-app.js"></script>'
    if anchor not in text:
        raise SystemExit("Owner Vault graft refused: estate-app.js script anchor not found in index.html")
    text = text.replace(anchor, anchor + tag, 1)
    write(path, text)
    return True


def patch_service_worker() -> bool:
    path = "sw.js"
    text = read(path)
    original = text

    if "'./estate-owner-vault.js'," not in text:
        anchor = "  './estate-app.js',\n"
        if anchor not in text:
            raise SystemExit("Owner Vault graft refused: estate-app.js cache anchor not found in sw.js")
        text = text.replace(anchor, anchor + "  './estate-owner-vault.js',\n", 1)

    cache_match = re.search(r"const CACHE='([^']+)';", text)
    if not cache_match:
        raise SystemExit("Owner Vault graft refused: service-worker cache name not found")
    if cache_match.group(1) != "jm-web-estate-v1.4.7-owner-vault-v0-1":
        text = text[: cache_match.start()] + "const CACHE='jm-web-estate-v1.4.7-owner-vault-v0-1';" + text[cache_match.end() :]

    old_fetch = """self.addEventListener('fetch', event => {\n  if(event.request.method !== 'GET') return;\n  event.respondWith(fresh(event.request));\n});"""
    new_fetch = """self.addEventListener('fetch', event => {\n  if(event.request.method !== 'GET') return;\n  const url = new URL(event.request.url);\n  if(url.pathname.startsWith('/api/owner/')) return;\n  event.respondWith(fresh(event.request));\n});"""
    if "url.pathname.startsWith('/api/owner/')" not in text:
        if old_fetch not in text:
            raise SystemExit("Owner Vault graft refused: service-worker fetch anchor changed")
        text = text.replace(old_fetch, new_fetch, 1)

    if text != original:
        write(path, text)
        return True
    return False


def patch_authoritative_workflow() -> bool:
    path = ".github/workflows/deploy-cloudflare-authoritative-public-source.yml"
    text = read(path)
    original = text

    if '      - "functions/**"\n' not in text:
        anchor = '      - "estate-*.js"\n'
        if anchor not in text:
            raise SystemExit("Owner Vault graft refused: authoritative workflow path anchor not found")
        text = text.replace(anchor, anchor + '      - "functions/**"\n', 1)

    copy_anchor = "            index.html estate-app.js estate-accessibility.js estate-head-public-consumer.js \\\n"
    if "estate-owner-vault.js" not in text.split("for file in", 1)[1].split("; do", 1)[0]:
        if copy_anchor not in text:
            raise SystemExit("Owner Vault graft refused: authoritative workflow root-copy anchor not found")
        replacement = "            index.html estate-app.js estate-owner-vault.js estate-accessibility.js estate-head-public-consumer.js \\\n"
        text = text.replace(copy_anchor, replacement, 1)

    check_anchor = "              ('index.html', 'Your work no longer lives as scattered HTMLs'),\n"
    vault_check = "              ('estate-owner-vault.js', 'JM Owner Vault'),\n"
    if vault_check not in text:
        if check_anchor not in text:
            raise SystemExit("Owner Vault graft refused: authoritative workflow source-proof anchor not found")
        text = text.replace(check_anchor, check_anchor + vault_check, 1)

    if text != original:
        write(path, text)
        return True
    return False


def main() -> None:
    changes = []
    if patch_index():
        changes.append("index.html")
    if patch_service_worker():
        changes.append("sw.js")
    if patch_authoritative_workflow():
        changes.append(".github/workflows/deploy-cloudflare-authoritative-public-source.yml")

    if changes:
        print("JM Owner Vault v0.1 graft applied:")
        for item in changes:
            print(f"  - {item}")
    else:
        print("JM Owner Vault v0.1 graft already present; no files changed.")

    print("Boundary: no R2 object, owner secret, deployment, public claim or Ding was created by this patch tool.")


if __name__ == "__main__":
    main()
