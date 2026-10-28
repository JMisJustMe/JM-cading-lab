#!/usr/bin/env python3
"""Apply the bounded JM Owner Vault v0.1 graft to the existing Web Estate.

The existing authoritative Cloudflare deployment already publishes estate-app.js and
sw.js, so this tool deliberately leaves index.html and deployment workflows untouched.
It makes only two bounded crown edits, without downgrading later descendants:

- estate-app.js: install or update the existing marked bridge to match its authoritative source.
- sw.js: ensure private /api/owner/ requests bypass caching; preserve the current cache version.

The tool is idempotent and fails if its source body is missing. It does not create an R2
bucket, secret, deployment, public claim or Ding.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BEGIN = "// JM_OWNER_VAULT_V0_1_BEGIN"
END = "// JM_OWNER_VAULT_V0_1_END"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def patch_estate_app() -> bool:
    path = "estate-app.js"
    text = read(path)
    bridge = read("estate-owner-vault.js").strip()
    if "JM Owner Vault" not in bridge or "Sync local shelf to vault" not in bridge:
        raise SystemExit("Owner Vault graft refused: source identity gate failed")

    if BEGIN in text and END in text:
        if text.count(BEGIN) != 1 or text.count(END) != 1:
            raise SystemExit("Owner Vault graft refused: repeated crown markers")
        before, remaining = text.split(BEGIN, 1)
        _, after = remaining.split(END, 1)
        updated = before + BEGIN + "\n" + bridge + "\n" + END + after
        if updated == text:
            return False
        write(path, updated)
        return True
    if BEGIN in text or END in text:
        raise SystemExit("Owner Vault graft refused: partial Estate app marker found")
    write(path, text.rstrip() + "\n\n" + BEGIN + "\n" + bridge + "\n" + END + "\n")
    return True


def patch_service_worker() -> bool:
    path = "sw.js"
    text = read(path)
    original = text

    # Never revert the live shell's newer cache/worker lineage. This tool
    # maintains the private API bypass, not the current deploy cache version.

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


def main() -> None:
    changes = []
    if patch_estate_app():
        changes.append("estate-app.js")
    if patch_service_worker():
        changes.append("sw.js")

    if changes:
        print("JM Owner Vault v0.1 graft applied:")
        for item in changes:
            print(f"  - {item}")
    else:
        print("JM Owner Vault v0.1 graft already present; no files changed.")

    print("Boundary: no R2 object, owner secret, deployment, public claim or Ding was created by this patch tool.")


if __name__ == "__main__":
    main()
