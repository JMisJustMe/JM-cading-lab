#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_release_candidate_final as final  # noqa: E402


def write(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-release-final-") as temp:
        root = Path(temp)
        release_entries = []
        runtime_entries = []
        for ordinal in range(100):
            body_id = f"body-{ordinal:03d}"
            package = f"com.jmisjustme.body.body_{ordinal:03d}"
            apk_hash = f"{ordinal + 1:064x}"
            identity = f"{ordinal + 1001:064x}"
            cert = f"{ordinal + 2001:064x}"
            release_entries.append(
                {
                    "body_id": body_id,
                    "apk_sha256": apk_hash,
                    "identity_sha256": identity,
                    "namespace": package,
                    "compiled_manifest": {
                        "package": package,
                        "launchable_activity": f"{package}.MainActivity",
                        "min_sdk": 24,
                        "target_sdk": 35,
                        "debuggable": False,
                        "version_code": "1",
                        "version_name": f"1.0-rc1-{body_id}",
                    },
                    "signing": {
                        "schemes": {"v2": True, "v3": True},
                        "certificate_sha256": [cert],
                        "v2_or_newer": True,
                    },
                    "certificate_sha256": cert,
                    "release_build": True,
                    "debuggable": False,
                }
            )
            runtime_entries.append(
                {
                    "status": "ANDROID_INSTALL_LAUNCH_FORCE_STOP_REOPEN_PASS",
                    "body_id": body_id,
                    "package": package,
                    "activity": f"{package}.MainActivity",
                    "apk_sha256": apk_hash,
                    "identity_sha256": identity,
                    "install_success": True,
                    "first_launch": {"status": "ok"},
                    "force_stop_exit_proof": True,
                    "relaunch": {"status": "ok"},
                    "runtime_faults": [],
                }
            )

        construction = {
            "status": "ANDROID_100_RELEASE_CANDIDATE_CONSTRUCTION_PROVENANCE_PASS",
            "private_keys_in_delivery": 0,
        }
        provenance = {
            "status": "ANDROID_100_RELEASE_CANDIDATE_PROVENANCE_PASS",
            "private_keys_in_delivery": 0,
            "entries": release_entries,
        }
        runtime = {
            "status": "ANDROID_100_EMULATOR_INSTALL_LAUNCH_FORCE_STOP_REOPEN_FEDERATION_PASS",
            "entries": runtime_entries,
        }
        upgrade = {
            "status": "ANDROID_CADING_SAME_CERTIFICATE_RELEASE_UPGRADE_PASS",
            "private_key_retained": False,
            "certificate_sha256": "f" * 64,
        }
        paths = {
            "construction": root / "construction.json",
            "provenance": root / "provenance.json",
            "runtime": root / "runtime.json",
            "upgrade": root / "upgrade.json",
        }
        write(paths["construction"], construction)
        write(paths["provenance"], provenance)
        write(paths["runtime"], runtime)
        write(paths["upgrade"], upgrade)

        receipt = final.finalize(
            paths["construction"],
            paths["provenance"],
            paths["runtime"],
            paths["upgrade"],
            root / "out",
        )
        assert receipt["status"] == "ANDROID_100_RELEASE_CANDIDATE_BUILD_SIGN_RUNTIME_UPGRADE_FEDERATION_PASS"
        assert receipt["body_count"] == 100
        assert receipt["unique_packages"] == 100
        assert receipt["unique_sovereign_test_certificates"] == 100
        assert receipt["private_keys_in_delivery"] == 0
        assert receipt["install_proofs"] == 100
        assert receipt["cading_same_certificate_upgrade"] is True
        assert len(receipt["entries"]) == 100

        runtime_entries[0]["apk_sha256"] = "0" * 64
        write(paths["runtime"], runtime)
        try:
            final.finalize(
                paths["construction"],
                paths["provenance"],
                paths["runtime"],
                paths["upgrade"],
                root / "out",
            )
        except SystemExit:
            pass
        else:
            raise AssertionError("release/runtime APK hash drift was accepted")

    print(
        "JM ANDROID RELEASE FINAL: 100 PROVENANCE/RUNTIME BINDS + "
        "100 CERTIFICATES + CADING UPGRADE + ZERO KEYS PASS"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
