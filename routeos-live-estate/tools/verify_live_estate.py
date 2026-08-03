#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"

required = [
    ROOT / "README.md",
    ROOT / "proof/BUILD_CONTRACT.json",
    ROOT / "app/build.gradle",
    ROOT / "app/src/main/AndroidManifest.xml",
    ROOT / "app/src/main/java/com/jmisjustme/routeos/gameestate/MainActivity.java",
    ASSETS / "index.html",
    ASSETS / "app.css",
    ASSETS / "core.js",
    ASSETS / "app.js",
    ASSETS / "cartridges.json",
]
for path in required:
    assert path.is_file(), f"missing required file: {path.relative_to(ROOT)}"
    assert path.stat().st_size > 0, f"empty required file: {path.relative_to(ROOT)}"

manifest_xml = (ROOT / "app/src/main/AndroidManifest.xml").read_text()
gradle = (ROOT / "app/build.gradle").read_text()
java = (ROOT / "app/src/main/java/com/jmisjustme/routeos/gameestate/MainActivity.java").read_text()
html = (ASSETS / "index.html").read_text()
css = (ASSETS / "app.css").read_text()
core = (ASSETS / "core.js").read_text()
app = (ASSETS / "app.js").read_text()
registry = json.loads((ASSETS / "cartridges.json").read_text())
contract = json.loads((ROOT / "proof/BUILD_CONTRACT.json").read_text())

assert "com.jmisjustme.routeos.gameestate" in gradle
assert "applicationId 'com.jmisjustme.routeos.gameestate'" in gradle
assert 'android:scheme="jmrouteos"' in manifest_xml
assert 'android:host="cartridge"' in manifest_xml
assert "android.permission.INTERNET" not in manifest_xml, "offline host must not request internet permission"
assert 'ROUTEOS_SCHEME = "jmrouteos"' in java
assert 'ROUTEOS_HOST = "cartridge"' in java
assert 'COMPASS_PACKAGE = "com.jmestate.estatecompass"' in java
assert "returnToCompass" in java
assert "shouldInterceptRequest" in java
assert "setAllowFileAccess(false)" in java
assert "setAllowContentAccess(false)" in java

assert registry["hostPackage"] == "com.jmisjustme.routeos.gameestate"
assert registry["deepLinkBase"] == "jmrouteos://cartridge/"
assert registry["defaultCartridge"] in {"five-crowns", "library"}
assert len(registry["cartridges"]) >= 1
five_crowns = next(
    (item for item in registry["cartridges"] if item["id"] == "five-crowns"),
    None,
)
assert five_crowns is not None
assert five_crowns["frozenParent"] == "110909c7199bcfbd7007ed56437d05a8aea5967b"
assert five_crowns["permanentAnchor"] == "anchor/routeos-kernel-jm-native-v1-9a-orchestrationroute-ding-pass"
assert {
    "routeos-five-crowns",
    "routeos-v1.9a",
    "orchestrationroute",
}.issubset(set(five_crowns["aliases"]))

crowns = ["PrimitiveRoute", "DispatchRoute", "EntryRoute", "KernelContractRoute", "OrchestrationRoute"]
for crown in crowns:
    assert crown in core, f"missing crown in simulation: {crown}"
assert "renderCrowns" in app and "CROWNS.map" in app, "interface must render the crown registry"

freeze_heads = [
    "3c759841606244876e57140254e896c9de7e927b",
    "989d204383ad7e3ea03c749aa0472d6f3c10b199",
    "3a3476f7b6823f814085eda19ee3fc42cd430668",
    "9b36b7f526101df1b94446e632bb3d1d54fdc7b4",
    "110909c7199bcfbd7007ed56437d05a8aea5967b",
]
for head in freeze_heads:
    assert head in core or head in html, f"missing freeze head: {head}"

for required_id in [
    "gameCanvas", "crownRail", "traceList", "routeMessage",
    "crownCards", "progressValue", "faultValue", "recoveryValue", "winPanel"
]:
    assert re.search(rf'id="{re.escape(required_id)}"', html), f"missing interface id: {required_id}"

assert "@media (max-width: 760px)" in css
assert "prefers-reduced-motion" in css
assert "class Simulation" in core
assert "class Renderer" in app
assert "class Store" in app
assert "localStorage" in app
assert "window.RouteOSEstateApp" in app
assert "FaultHold" in core and "RecoveryBody" in core
assert "mounted, frozen, locked and anchored" in core

remote_resources = re.findall(r'<(?:script|link)[^>]+(?:src|href)=["\']https?://', html, re.I)
assert not remote_resources, "cartridge assets must be fully offline"

assert contract["frozen_parent"]["commit"] == five_crowns["frozenParent"]
assert contract["native_contract"]["primary_uri"] == "jmrouteos://cartridge/five-crowns"
assert contract["play_contract"]["ordered_crowns"] == crowns

hashes = {}
for path in required:
    hashes[str(path.relative_to(ROOT))] = hashlib.sha256(path.read_bytes()).hexdigest()

print("RouteOS Five Crowns live-estate static authority: PASS")
print(json.dumps({
    "files": len(hashes),
    "registered_cartridges": len(registry["cartridges"]),
    "sha256": hashes,
}, indent=2, sort_keys=True))
