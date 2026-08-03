#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COMPASS = ROOT / "android-compass-live"
ROUTEOS = ROOT / "routeos-live-estate"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(f"FAIL: {message}")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


contract_path = COMPASS / "proof/COMPASS_ROUTEOS_DOORWAY_CONTRACT_v2.2A.json"
contract = json.loads(read(contract_path))
require(contract["body"] == "JM Estate Compass RouteOS Doorway", "contract body")
require(contract["version"] == "v2.2A", "contract version")
require(
    contract["frozenParent"]["commit"]
    == "2af4683bf2783901775e6b972ebbaded77e5a603",
    "frozen parent commit",
)

compass_gradle = read(COMPASS / "app/build.gradle")
for token in (
    "applicationId 'com.jmestate.estatecompass'",
    "versionCode 2200",
    "versionName '2.2.0'",
    "minSdk 26",
    "targetSdk 35",
):
    require(token in compass_gradle, f"Compass Gradle token {token}")

compass_manifest = read(COMPASS / "app/src/main/AndroidManifest.xml")
require(
    '<package android:name="com.jmisjustme.routeos.gameestate" />'
    in compass_manifest,
    "RouteOS package visibility declaration",
)
require("android.permission.INTERNET" not in compass_manifest, "Compass stays offline")

routeos_manifest = read(ROUTEOS / "app/src/main/AndroidManifest.xml")
require("android.permission.INTERNET" not in routeos_manifest, "RouteOS stays offline")
require('android:scheme="jmrouteos"' in routeos_manifest, "RouteOS scheme")
require('android:host="cartridge"' in routeos_manifest, "RouteOS host")

main_activity = read(
    COMPASS
    / "app/src/main/java/com/jmestate/estatecompass/MainActivity.java"
)
for token in (
    'toolbarButton("ROUTEOS"',
    'ROUTEOS_PACKAGE = "com.jmisjustme.routeos.gameestate"',
    'ROUTEOS_FIVE_CROWNS = "five-crowns"',
    'ROUTEOS_ESTATE_ROUTER = "estate-router"',
    "showRouteOSMenu",
    "loadBuiltInShelf",
    "openRouteOSCartridgeNative",
    "replaceMountedBody",
    "restorePreviousBody",
    "openRouteOSShelf",
):
    require(token in main_activity, f"native doorway token {token}")

shelf = COMPASS / "app/src/main/assets/estate-shelf.html"
donor = (
    ROUTEOS
    / "compass-mount/JM_ROUTEOS_ESTATE_SHELF_v2_1A.html"
)
require(shelf.read_bytes() == donor.read_bytes(), "frozen shelf byte identity")
shelf_text = read(shelf)
for token in (
    'data-cartridge="five-crowns"',
    'data-cartridge="estate-router"',
    "AndroidCompass.openRouteOSCartridge",
    "You do not need to remember package names or route syntax",
    "No supreme body.",
):
    require(token in shelf_text, f"shelf token {token}")
require("<script src=" not in shelf_text.lower(), "shelf has no remote script")

print("COMPASS_ROUTEOS_DOORWAY_STATIC_PASS")
print(f"compass_package={contract['compass']['package']}")
print(f"routeos_package={contract['routeos']['package']}")
print(f"shelf_sha256={sha256(shelf)}")
print("routes=five-crowns,estate-router")
print("private_body_mount=preserved")
