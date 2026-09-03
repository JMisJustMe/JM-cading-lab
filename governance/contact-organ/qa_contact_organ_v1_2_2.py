#!/usr/bin/env python3
"""QA + authority receipt for Contact Organ recovery strengthening v1.2.2.

v1.2.2 does not increment materialisation. It proves that two previously typed
recovery authorities now have executable next-stage machinery:
- Housekeeper: native SAF Contact Organ adapter with fail-closed transaction proof.
- Device Continuity: exact embedded-donor extractor with frozen byte/SHA gate.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[2]
GOV = ROOT / "governance/contact-organ"
OUT = ROOT / "estate-publication/contact-organ-descendants"
PREVIOUS = OUT / "PROPAGATION_RECEIPT_v1_2_1.json"
DELTA = GOV / "recovery_authority_delta_v1_2_2.json"
HOUSEKEEPER = GOV / "android/JMHousekeeperContactAdapter.kt"
EXTRACTOR = GOV / "recovery/extract_device_continuity_v1_1_7.py"
PRIVATE_ARCADE_PATCH = OUT / "cross-private-arcade/PATCH_RECEIPT_v1_2_1.json"
RECEIPT = OUT / "PROPAGATION_AUTHORITY_RECEIPT_v1_2_2.json"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    previous = json.loads(PREVIOUS.read_text(encoding="utf-8"))
    require(previous["totalRecipients"] == 28, "v1.2.1 total must stay 28")
    require(previous["materialized"] == 6, "v1.2.1 frozen floor must stay 6 materialised")
    require(previous["recoveryAuthorityConfirmed"] == 22, "v1.2.1 recovery floor must stay 22")
    require(previous["unresolved"] == 0, "v1.2.1 unresolved must stay zero")

    arcade = json.loads(PRIVATE_ARCADE_PATCH.read_text(encoding="utf-8"))
    arcade_descendant = ROOT / arcade["descendant"]
    require(arcade_descendant.exists(), "Private Arcade v1.2.1 descendant missing")
    require(sha256(arcade_descendant) == arcade["descendantSha256"], "Private Arcade descendant hash drift")
    require(arcade["parentMutated"] is False, "Private Arcade parent mutation detected")

    delta = json.loads(DELTA.read_text(encoding="utf-8"))
    require(delta["accounting"] == {
        "totalRecipients": 28,
        "materialized": 6,
        "recoveryAuthorityConfirmed": 22,
        "strengthenedRecoveryAuthorities": 2,
        "unresolved": 0,
    }, "v1.2.2 accounting boundary changed")
    rows = {r["recipientId"]: r for r in delta["rows"]}
    require(set(rows) == {"phone-housekeeper", "cross-continuity"}, "v1.2.2 delta must strengthen exactly two routes")

    hk = rows["phone-housekeeper"]
    require(hk["sourcePackageSha256"] == "30c0a34e7010b31cbbb1027be6cdf2404e2b09cbb745f7169046622913b991a6", "Housekeeper source package SHA drift")
    require(hk["sourceHtmlSha256"] == "4f166b2bf164d31be97c59260de7d2ece5230c58027a5490f4e1a21a1fb4783e", "Housekeeper HTML SHA drift")
    require(hk["carrierSourceSha256"] == "e161a448073d33488992e763e9f81d1e7cf1bcf6c11a75de21fb2bb9873b1432", "Housekeeper carrier source SHA drift")
    require(hk["apkSha256"] == "6444bc787d397ca31067883b36669e29a5e87a02f8c86c7616fcafa9f5891f54", "Housekeeper APK SHA drift")
    require(hk["materializedCountEffect"] == 0, "Housekeeper must not silently increment materialisation")

    hk_text = HOUSEKEEPER.read_text(encoding="utf-8")
    for token in (
        'RECIPIENT_ID = "phone-housekeeper"',
        'CONSEQUENCE = "SAFE_SCAN_QUARANTINE_RESTORE_RECEIPT"',
        'TRANSACTION_LAW = "COPY -> SHA VERIFY -> REMOVE SOURCE"',
        'authorizationModel = "NONE"',
        'remoteAuthority = false',
        "copyCompleted",
        "shaVerified",
        "sourceRemovedAfterVerify",
        "pathSafe",
        "core.ding",
    ):
        require(token in hk_text, f"Housekeeper adapter missing semantic token: {token}")
    require("core.revoke(" not in hk_text and "core.block(" not in hk_text, "phone-only Housekeeper must not fabricate revoke/block")

    continuity = rows["cross-continuity"]
    require(continuity["expectedBytes"] == 284399, "Device Continuity byte authority drift")
    require(continuity["expectedSha256"] == "62b14ef3fafc208561ad493f383c8c6b3d0486b9f00c2ae8b4b816cd6f4c8e54", "Device Continuity SHA authority drift")
    require(continuity["authorityCarrierSha256"] == "345038e8ece9755f55b0caa60d98b7ac63dbd43c97b422c09e2d804b3ac7fe98", "Body Dock authority SHA drift")
    require(continuity["materializedCountEffect"] == 0, "Continuity must not silently increment materialisation")

    subprocess.run([sys.executable, "-m", "py_compile", str(EXTRACTOR)], check=True)
    selftest = subprocess.run([sys.executable, str(EXTRACTOR), "--selftest"], check=True, capture_output=True, text=True)
    require("SELFTEST PASS" in selftest.stdout, "Device Continuity extractor selftest did not pass")

    receipt = {
        "schema": "jm.estate.contact-organ-propagation-authority/1.2.2",
        "date": "2026-09-03",
        "inherits": "v1.2.1 frozen-green materialisation floor",
        "laws": {
            "parent": "FROZEN PARENT -> CLEAN DESCENDANT",
            "claim": "NO DING, NO CLAIM.",
            "writableRoute": "ACCESSIBLE SOURCE != /mnt/data SOURCE. FIND THE WRITABLE ROUTE BEFORE DECLARING THE BODY UNWRITABLE.",
        },
        "totalRecipients": 28,
        "materialized": 6,
        "materializationOpen": 22,
        "strengthenedRecoveryAuthorities": 2,
        "unresolved": 0,
        "strengthened": [
            {
                "recipientId": "phone-housekeeper",
                "state": "NATIVE_CONTACT_ADAPTER_READY__EXACT_SOURCE_PACKAGE_BYTES_NOT_REPO_SEATED",
                "carrier": "NATIVE_ANDROID_SAF",
                "adapter": str(HOUSEKEEPER.relative_to(ROOT)),
                "adapterSha256": sha256(HOUSEKEEPER),
                "sourcePackageSha256": hk["sourcePackageSha256"],
                "carrierSourceSha256": hk["carrierSourceSha256"],
                "apkSha256": hk["apkSha256"],
                "physicalDing": "OPEN",
            },
            {
                "recipientId": "cross-continuity",
                "state": "EXACT_DONOR_EXTRACTOR_READY__BODY_DOCK_BYTES_NOT_REPO_SEATED",
                "extractor": str(EXTRACTOR.relative_to(ROOT)),
                "extractorSha256": sha256(EXTRACTOR),
                "expectedBytes": continuity["expectedBytes"],
                "expectedSha256": continuity["expectedSha256"],
                "authorityCarrierSha256": continuity["authorityCarrierSha256"],
                "physicalDing": "OPEN",
            },
        ],
        "qa": {
            "v1_2_1_absolute_accounting_preserved": "PASS",
            "private_arcade_v1_2_1_descendant_hash_preserved": "PASS",
            "housekeeper_native_semantic_adapter": "PASS",
            "housekeeper_remote_authority_not_fabricated": "PASS",
            "housekeeper_copy_hash_delete_gate": "PASS",
            "device_continuity_extractor_python_compile": "PASS",
            "device_continuity_extractor_parser_selftest": "PASS",
            "exact_hash_authorities_locked": "PASS",
        },
        "claimBoundary": "v1.2.2 proves stronger recovery authority and executable recovery/adaptation machinery only. Materialisation remains 6/28. No missing binary/source bytes, APK build/install, SAF consequence, Phone-Laptop route, or physical Ding is synthesized."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
