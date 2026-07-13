#!/usr/bin/env python3
"""Idempotent v0.4.1A installation and handheld-containment recovery patch."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "estate-librarian"

HTML_TARGETS = [
    ROOT / "web/index.html",
    ROOT / "android/app/src/main/assets/index.html",
    ROOT / "OPEN_FIRST_JM_ESTATE_LIBRARIAN_v0_4_1.html",
    ROOT / "OPEN_FIRST_JM_ESTATE_LIBRARIAN_v0_4_1A.html",
]

OLD_NAV = ".bottom-nav{display:none;position:fixed;left:0;right:0;bottom:0;z-index:60;background:rgba(7,16,25,.97);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:7px max(8px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));gap:4px;overflow-x:auto}.bottom-nav button{min-width:76px;flex:1;border:0;background:transparent;color:var(--muted);border-radius:12px;padding:8px 7px;font-size:10px;font-weight:850}"
NEW_NAV = ".bottom-nav{display:none;position:fixed;left:0;right:0;bottom:0;z-index:60;width:100%;max-width:100vw;background:rgba(7,16,25,.97);backdrop-filter:blur(16px);border-top:1px solid var(--line);padding:7px max(4px,env(safe-area-inset-right)) calc(7px + env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left));grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;overflow:hidden}.bottom-nav button{min-width:0;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0;background:transparent;color:var(--muted);border-radius:12px;padding:8px 2px;font-size:9px;font-weight:850}"


def patch_html() -> None:
    source = (ROOT / "web/index.html").read_text(encoding="utf-8")

    if OLD_NAV in source:
        source = source.replace(OLD_NAV, NEW_NAV)
    elif NEW_NAV not in source:
        raise RuntimeError("Bottom-navigation source signature was not recognised")

    source = source.replace(
        "@media(max-width:900px){.desktop-nav{display:none}.bottom-nav{display:flex}.app{padding-bottom:82px}",
        "@media(max-width:900px){.desktop-nav{display:none}.bottom-nav{display:grid}.app{padding-bottom:calc(88px + env(safe-area-inset-bottom))}",
    )

    mobile_marker = "@media(max-width:520px){"
    mobile_recovery = "@media(max-width:520px){.bottom-nav{gap:2px}.bottom-nav button{font-size:8.5px;padding-inline:1px}.bottom-nav button span{font-size:16px}"
    if mobile_marker in source and mobile_recovery not in source:
        source = source.replace(mobile_marker, mobile_recovery, 1)

    replacements = {
        "JM Estate Librarian v0.4.1 — Handheld Professionalisation": "JM Estate Librarian v0.4.1A — Install & Containment Recovery",
        "v0.4.1 · Handheld Professionalisation": "v0.4.1A · Install & Containment Recovery",
        "version:'0.4.1',schema:'jm-estate-register-v0.4.1'": "version:'0.4.1A',schema:'jm-estate-register-v0.4.1a'",
        "JM Estate Librarian v0.4.1 · recovery &gt; storage": "JM Estate Librarian v0.4.1A · recovery &gt; storage",
    }
    for old, new in replacements.items():
        source = source.replace(old, new)

    required = [
        "grid-template-columns:repeat(5,minmax(0,1fr))",
        ".bottom-nav button{min-width:0",
        ".bottom-nav{display:grid}",
        "v0.4.1A · Install & Containment Recovery",
    ]
    for marker in required:
        if marker not in source:
            raise RuntimeError(f"Missing HTML recovery marker: {marker}")

    for target in HTML_TARGETS:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(source, encoding="utf-8")


def patch_android() -> None:
    gradle = ROOT / "android/app/build.gradle"
    text = gradle.read_text(encoding="utf-8")
    text = text.replace("applicationId 'com.jmestate.librarian'", "applicationId 'com.jmestate.librarian.v041a'")
    text = text.replace("versionCode 5", "versionCode 6")
    text = text.replace("versionName '0.4.1'", "versionName '0.4.1A'")
    if "applicationId 'com.jmestate.librarian.v041a'" not in text:
        raise RuntimeError("Side-by-side Android application ID was not applied")
    gradle.write_text(text, encoding="utf-8")

    manifest = ROOT / "android/app/src/main/AndroidManifest.xml"
    text = manifest.read_text(encoding="utf-8")
    text = text.replace('android:label="Estate Librarian"', 'android:label="Estate Librarian 0.4.1A"')
    manifest.write_text(text, encoding="utf-8")


def patch_metadata() -> None:
    webmanifest = ROOT / "web/manifest.webmanifest"
    manifest = json.loads(webmanifest.read_text(encoding="utf-8"))
    manifest["name"] = "JM Estate Librarian v0.4.1A"
    manifest["short_name"] = "Librarian 0.4.1A"
    webmanifest.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    package_path = ROOT / "PACKAGE_MANIFEST.json"
    package = json.loads(package_path.read_text(encoding="utf-8"))
    package["version"] = "0.4.1A"
    package["build"] = "INSTALLATION-AND-HANDHELD-CONTAINMENT-RECOVERY"
    package["lineage"] = {
        "parent": "JM Estate Librarian v0.4.1",
        "parentStatus": "APK_COMPILED_INSTALL_BLOCKED_BY_SIGNER_MISMATCH",
        "method": "side-by-side field recovery; v0.4 anchor preserved",
    }
    package["delivery"]["compiledApk"] = False
    package["proof"] = {
        "parentWebQA": "PASS",
        "bottomNavigationStaticContainment": "PASS",
        "sideBySideApplicationId": "com.jmestate.librarian.v041a",
        "androidCompilation": "PENDING GitHub Actions",
        "physicalAndroidInstall": "PENDING user-device proof",
    }
    package["files"]["openFirst"] = "OPEN_FIRST_JM_ESTATE_LIBRARIAN_v0_4_1A.html"
    package["files"]["apk"] = "releases/JM_ESTATE_LIBRARIAN_v0_4_1A_INSTALL_RECOVERY.apk"
    package["files"]["apkChecksum"] = "releases/JM_ESTATE_LIBRARIAN_v0_4_1A_INSTALL_RECOVERY.apk.sha256"
    package_path.write_text(json.dumps(package, indent=2) + "\n", encoding="utf-8")

    receipt = {
        "receiptType": "JM Estate Librarian v0.4.1A installation recovery receipt",
        "parent": "JM Estate Librarian v0.4.1",
        "problem": {
            "install": "BLOCKED — parent and update APKs used different temporary debug signers",
            "handheld": "BLOCKED — five 76px minimum-width tabs exceeded the phone viewport",
        },
        "repair": {
            "applicationId": "com.jmestate.librarian.v041a",
            "installMode": "SIDE_BY_SIDE_WITH_FROZEN_V0_4",
            "bottomNavigation": "FIVE_EQUAL_MINMAX_ZERO_COLUMNS",
            "horizontalNavScroll": False,
            "permanentReleaseSigning": "SEPARATE GOVERNANCE GATE",
        },
        "proof": {
            "sourcePatch": "PASS",
            "androidCompilation": "PENDING GitHub Actions",
            "physicalInstall": "PENDING user-device proof",
        },
    }
    receipts = ROOT / "receipts"
    receipts.mkdir(exist_ok=True)
    (receipts / "INSTALL_RECOVERY_RECEIPT_v0_4_1A.json").write_text(
        json.dumps(receipt, indent=2) + "\n", encoding="utf-8"
    )

    readme = ROOT / "README.md"
    text = readme.read_text(encoding="utf-8")
    if "## v0.4.1A recovery boundary" not in text:
        text += """

## v0.4.1A recovery boundary

- Android package identity: `com.jmestate.librarian.v041a`.
- Installs beside the frozen v0.4 anchor; it does not overwrite or remove it.
- Bottom navigation uses five equal viewport columns with no horizontal-scroll route.
- This recovery package is a field-test lane. Permanent future updates require the stable release-signing workflow and repository secrets.
"""
    text = text.replace("# JM Estate Librarian v0.4.1", "# JM Estate Librarian v0.4.1A", 1)
    text = text.replace("**Handheld Professionalisation Pass**", "**Installation & Handheld Containment Recovery**", 1)
    readme.write_text(text, encoding="utf-8")


def verify() -> None:
    canonical = (ROOT / "web/index.html").read_bytes()
    for path in HTML_TARGETS[1:]:
        if path.read_bytes() != canonical:
            raise RuntimeError(f"HTML carrier mismatch: {path}")

    if b"min-width:76px" in canonical:
        raise RuntimeError("Old overflowing navigation rule survived")
    if b"overflow-x:auto" in canonical.split(b".bottom-nav", 1)[1].split(b"footer", 1)[0]:
        raise RuntimeError("Bottom navigation still permits horizontal scrolling")


if __name__ == "__main__":
    patch_html()
    patch_android()
    patch_metadata()
    verify()
    print("JM Estate Librarian v0.4.1A recovery patch: PASS")
