from __future__ import annotations

import json
from pathlib import Path

PAGE = Path("games-beyond/routeos/index.html")
AUTHORITY = Path("registry/estate-classification-authority-v1.0.json")
STRINGLINE = Path("navigator/stringline.json")
MANIFEST = Path("games-beyond/payload-manifest.json")
INTEGRITY = Path("registry/estate-classification-integrity-receipt-v1.0.json")

page = PAGE.read_text(encoding="utf-8")
old_validation = '<div class="step"><b>VALID.</b><div><strong>v108A.5 validation frontier</strong><p>Static integrity, syntax, 260 controls, 464 IDs, zero duplicate IDs and zero missing DOM targets.</p></div></div>'
new_validation = '<div class="step"><b>PROVEN</b><div><strong>v108A.5 complete ten-file package recovered</strong><p>The original 16 June MAX10 package is physically recovered, checksum-verified and independently revalidated: 260 controls, 464 IDs, 398 literal DOM references, zero duplicate IDs and zero missing DOM targets.</p></div></div>'
old_boundary = '<div class="step boundary"><b>BOUND.</b><div><strong>Exact complete v108A.5 keeper still requires physical reconfirmation</strong><p>The validation report is real; the full package is not crowned until its complete keeper body is reconfirmed.</p></div></div>'
new_boundary = '<div class="step boundary"><b>DEVICE</b><div><strong>Phone field contact remains its own authority lane</strong><p>Exact package custody and source/runtime integrity are proven. This recovery pass does not silently claim renewed Android feel contact, native store release, online multiplayer or physical Ama-Pro hardware.</p></div></div>'
if old_validation in page:
    page = page.replace(old_validation, new_validation, 1)
elif new_validation not in page:
    raise SystemExit("RouteOS validation marker changed unexpectedly")
if old_boundary in page:
    page = page.replace(old_boundary, new_boundary, 1)
elif new_boundary not in page:
    raise SystemExit("RouteOS boundary marker changed unexpectedly")
page = page.replace(
    "VALIDATED_FRONTIER = v108A.5\nNON_GAME_APPS_ROLE",
    "VALIDATED_FRONTIER = v108A.5\nPACKAGE_AUTHORITY = ORIGINAL_MAX10_RECOVERED_AND_REVALIDATED\nRECOVERY_KEEPER = PRIVATE_OWNER_ZIONFOLDER\nDEVICE_CONTACT = SEPARATE_LANE_NOT_REPROVED\nNON_GAME_APPS_ROLE",
    1,
)
PAGE.write_text(page, encoding="utf-8")

authority = json.loads(AUTHORITY.read_text(encoding="utf-8"))
routeos = next(body for body in authority["bodies"] if body.get("id") == "routeos")
routeos.update({
    "latest_confirmed_mounted_body": "v108A.5 Pro Flow + Interaction Clarity complete ten-file package",
    "strongest_validated_progression": "v108A.5 exact package independently revalidated",
    "package_authority": "ROUTEOS_v108A_5_PRO_FLOW_CLARITY_RESPONSE_POLISH_MAX10.zip",
    "private_recovery_keeper": "ROUTEOS_v108A_5_FULL_STANDALONE_KEEPER_CORRECTED.zip",
    "recovery_record": "registry/routeos-v108a5-recovery-authority.json",
    "derivative_guard": "A two-file HTML keeper exists but is not the complete PWA package authority.",
    "device_contact_boundary": "v108A.5 phone feel not re-proved during package recovery",
    "severity": "CRITICAL_CORRECTED_AND_FULL_KEEPER_RECOVERED",
})
AUTHORITY.write_text(json.dumps(authority, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

stringline = json.loads(STRINGLINE.read_text(encoding="utf-8"))
stringline["version"] = "v0.1.5 RouteOS full-keeper recovery seed"
games = next(project for project in stringline["seed_project_strings"] if project.get("id") == "games-beyond")
route_body = next(body for body in games["bodies"] if body.get("id") == "routeos-platform")
route_body.update({
    "type": "Gaming platform / console OS / cartridge ecosystem",
    "role": "Flagship JM console-platform body; original v108A.5 ten-file package recovered and independently revalidated",
    "status": "FROZEN",
    "packageAuthority": "ORIGINAL_MAX10_RECOVERED_PRIVATE_OWNER_CUSTODY",
    "deviceContact": "SEPARATE_LANE_NOT_REPROVED",
})
STRINGLINE.write_text(json.dumps(stringline, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
for body in manifest.get("extraBodies", []):
    if body.get("id") == "routeos-platform":
        body["version"] = "v103 → v108A.5 Recovered Package Authority"
        body["stage"] = "GOVERNING FLAGSHIP ROOM + PRIVATE FULL KEEPER RECOVERED"
        body["sourceStatus"] = "Original v108A.5 MAX10 package physically recovered and independently revalidated. Full source remains owner-private; public room carries evidence and navigation only. Phone field contact remains a separate proof lane."
MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

integrity = json.loads(INTEGRITY.read_text(encoding="utf-8"))
integrity["schema"] = "JM.EstateClassificationIntegrityReceipt/1.3"
integrity["status"] = "PASS_ROUTEOS_FULL_KEEPER_RECOVERED"
integrity["watch_items"] = [item for item in integrity.get("watch_items", []) if "RouteOS complete v108A.5" not in item]
integrity.setdefault("proof", {})["routeos_v108a5_exact_package_recovery"] = "PASS"
integrity["proof"]["routeos_v108a5_independent_revalidation"] = "PASS"
integrity["routeos_recovery_record"] = "registry/routeos-v108a5-recovery-authority.json"
INTEGRITY.write_text(json.dumps(integrity, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

print("RouteOS v108A.5 exact keeper recovery mounted without publishing the private payload.")
