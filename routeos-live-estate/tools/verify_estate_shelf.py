#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "app/src/main/assets"
REGISTRY_ROOT = ASSETS / "estate-registry"

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

required = [
    ROOT / "README.md",
    ROOT / "proof/ESTATE_SHELF_ROUTE_SOURCE_LINEAGE_v2.1A.json",
    ROOT / "app/build.gradle",
    ROOT / "app/src/main/AndroidManifest.xml",
    ROOT / "app/src/main/java/com/jmisjustme/routeos/gameestate/MainActivity.java",
    ASSETS / "index.html",
    ASSETS / "app.css",
    ASSETS / "estate-shelf.css",
    ASSETS / "core.js",
    ASSETS / "estate-router.js",
    ASSETS / "app.js",
    ASSETS / "cartridges.json",
    REGISTRY_ROOT / "REGISTRY.json",
    REGISTRY_ROOT / "COMPATIBILITY.json",
    ROOT / "compass-mount/JM_ROUTEOS_ESTATE_SHELF_v2_1A.html",
]
for path in required:
    assert path.is_file(), f"missing required file: {path.relative_to(ROOT)}"
    assert path.stat().st_size > 0, f"empty required file: {path.relative_to(ROOT)}"

expected_donor_hashes = {
    "REGISTRY.json": "9a5c48c39bda0844e07ab43848405a67b0fdcb4f79e8a39e7848bec47581f27d",
    "COMPATIBILITY.json": "16119062821fcf8c5431a406cf5ddfeaaff0e0093e1b5fb5f8c33909348a1e90",
    "registry-parts/sovereign-ten.json": "a250d4b5b7943eb14c074629d847f3aa74323ea9e25e5f82aa6412f8af1103ce",
    "registry-parts/sovereign-batch-two.json": "296e5ec5af545dd5c7ec3ccfcbe9b0167df54c6bfd9c80b3ebf816280e37db30",
    "registry-parts/sovereign-batch-three.json": "6c19a4e0c6ad951904ad9ceed7c7e443f4ff8a466f8825eb9cb330df13cb2b67",
    "registry-parts/sovereign-batch-four.json": "6e86987ca9cf3028928880ac267e41e6e25653780db5a676bb701c08e2c27350",
    "registry-parts/sovereign-batch-five.json": "6688bbd01e8afcdbc140644f0589b7729f9f106642a78ca5255acbc73a581adb",
    "registry-parts/sovereign-batch-six.json": "8d85441a9df73cc58eac9cf9421f8d11e20f2ed24de54a99c3c8271ae08f2f2a",
}
for relative, expected in expected_donor_hashes.items():
    actual = sha256(REGISTRY_ROOT / relative)
    assert actual == expected, f"donor drift: {relative}: {actual}"

meta = json.loads((REGISTRY_ROOT / "REGISTRY.json").read_text())
compatibility = json.loads((REGISTRY_ROOT / "COMPATIBILITY.json").read_text())
parts = [json.loads((REGISTRY_ROOT / relative).read_text()) for relative in meta["parts"]]
bodies = [body for part in parts for body in part["bodies"]]

assert meta["count"] == 100
assert len(parts) == 6
assert sum(part["count"] for part in parts) == 100
assert len(bodies) == 100
assert len({body["id"] for body in bodies}) == 100
assert len({body["name"] for body in bodies}) == 100
assert meta["defaults"]["supreme"] is False
assert all(meta["proofByBatch"][body["batch"]]["failed"] == 0 for body in bodies)
for mandatory in ["tracebox", "dings", "source-ledger", "gameforge", "glyphplay", "routecore-native", "os-coding"]:
    assert any(body["id"] == mandatory for body in bodies), mandatory

for code in ["IDENTITY_COLLAPSE", "HOST_TAKEOVER", "NO_DING", "ALIAS_INFLATION", "UNGOVERNED_GRAFT"]:
    assert any(rule["code"] == code for rule in compatibility["forbidden"]), code
assert any(pair["from"] == "parser" and pair["to"] == "compiler" for pair in compatibility["directPairs"])
assert any(pair["from"] == "routecore-native" and pair["to"] == "os-coding" for pair in compatibility["directPairs"])

manifest = json.loads((ASSETS / "cartridges.json").read_text())
assert manifest["schema"] == "jm.routeos.cartridge.registry.v1.1"
assert manifest["hostPackage"] == "com.jmisjustme.routeos.gameestate"
assert manifest["deepLinkBase"] == "jmrouteos://cartridge/"
assert len(manifest["cartridges"]) == 2
ids = [item["id"] for item in manifest["cartridges"]]
assert ids == ["five-crowns", "estate-router"]
routes = []
for cartridge in manifest["cartridges"]:
    routes.extend([cartridge["id"], *cartridge.get("aliases", [])])
assert len(routes) == len(set(route.lower() for route in routes))
router_cartridge = next(item for item in manifest["cartridges"] if item["id"] == "estate-router")
assert router_cartridge["view"] == "router"
assert router_cartridge["frozenParent"] == "8cc8cb5143ec8fef766acf464ef860d00d4c0e36"

manifest_xml = (ROOT / "app/src/main/AndroidManifest.xml").read_text()
gradle = (ROOT / "app/build.gradle").read_text()
java = (ROOT / "app/src/main/java/com/jmisjustme/routeos/gameestate/MainActivity.java").read_text()
html = (ASSETS / "index.html").read_text()
app_js = (ASSETS / "app.js").read_text()
router_js = (ASSETS / "estate-router.js").read_text()
shelf_css = (ASSETS / "estate-shelf.css").read_text()
compass_html = (ROOT / "compass-mount/JM_ROUTEOS_ESTATE_SHELF_v2_1A.html").read_text()
lineage = json.loads((ROOT / "proof/ESTATE_SHELF_ROUTE_SOURCE_LINEAGE_v2.1A.json").read_text())

assert "applicationId 'com.jmisjustme.routeos.gameestate'" in gradle
assert "versionCode 2100" in gradle
assert "versionName '2.1.0'" in gradle
assert "android.permission.INTERNET" not in manifest_xml
assert 'android:scheme="jmrouteos"' in manifest_xml
assert 'android:host="cartridge"' in manifest_xml
assert 'return "2.1.0";' in java
assert "setAllowFileAccess(false)" in java
assert "setAllowContentAccess(false)" in java

for required_id in [
    "cartridgeShelf", "gameCanvas", "crownRail", "traceList",
    "routePrompt", "planRouteButton", "plannedRoute", "compatibilityPath",
    "bodySearch", "bodyResults", "crownCards"
]:
    assert re.search(rf'id="{re.escape(required_id)}"', html), required_id
assert '<script src="estate-router.js"></script>' in html
assert html.index('estate-router.js') < html.index('app.js')
assert "EstateRouter.resolveCartridge" in app_js
assert "EstateRouter.planEstateRoute" in app_js
assert "EstateRouter.validateRegistry" in app_js
assert "const VIEWS = ['library', 'play', 'router', 'crowns', 'proof']" in app_js
assert "class Renderer" in app_js and "class Store" in app_js
assert "localStorage" in app_js
assert "window.RouteOSEstateApp" in app_js
assert "function validateRegistry" in router_js
assert "function validateCartridgeRegistry" in router_js
assert "function compatibilityBetween" in router_js
assert "@media (max-width: 760px)" in shelf_css

for route in [
    "jmrouteos://cartridge/five-crowns",
    "jmrouteos://cartridge/estate-router",
]:
    assert route in compass_html
assert "AndroidCompass.openRouteOSCartridge" in compass_html
assert "https://" not in compass_html and "http://" not in compass_html
assert "com.jmisjustme.routeos.gameestate" in compass_html

assert lineage["frozenParent"]["commit"] == "8cc8cb5143ec8fef766acf464ef860d00d4c0e36"
assert lineage["recoveredSource"]["branch"] == "agent/sovereign-estate-integration-v1"
assert len(lineage["recoveredSource"]["files"]) == 9

remote_resources = re.findall(r'<(?:script|link)[^>]+(?:src|href)=["\']https?://', html, re.I)
assert not remote_resources, "app assets must remain offline"

hashes = {}
for path in required:
    hashes[str(path.relative_to(ROOT))] = sha256(path)

print("RouteOS Estate Shelf Route v2.1A static authority: PASS")
print(json.dumps({
    "required_files": len(required),
    "bodies": len(bodies),
    "batches": len(parts),
    "cartridges": len(manifest["cartridges"]),
    "forbidden_laws": len(compatibility["forbidden"]),
    "sha256": hashes,
}, indent=2, sort_keys=True))
