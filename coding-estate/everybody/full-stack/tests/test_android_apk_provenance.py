#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_apk_provenance as provenance  # noqa: E402


def assert_badging(minimum_label: str) -> None:
    badging = f"""package: name='com.jmisjustme.body.cading' versionCode='1' versionName='0.2-cading' compileSdkVersion='35' compileSdkVersionCodename='15'
{minimum_label}:'24'
targetSdkVersion:'35'
application-label:'Cading / Theomidul / zeze.nwona'
application-debuggable
launchable-activity: name='com.jmisjustme.body.cading.MainActivity'  label='' icon=''
"""
    parsed = provenance.parse_aapt2_badging(badging)
    assert parsed == {
        "package": "com.jmisjustme.body.cading",
        "launchable_activity": "com.jmisjustme.body.cading.MainActivity",
        "min_sdk": 24,
        "target_sdk": 35,
        "debuggable": True,
        "version_code": "1",
        "version_name": "0.2-cading",
    }


def main() -> int:
    # Current AAPT2 uses minSdkVersion. Preserve support for historical
    # sdkVersion output because older build-tools remain valid donors.
    assert_badging("minSdkVersion")
    assert_badging("sdkVersion")

    signing = """Verifies
Verified using v1 scheme (JAR signing): false
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): false
Verified using v3.1 scheme (APK Signature Scheme v3.1): false
Verified using v4 scheme (APK Signature Scheme v4): false
Number of signers: 1
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256 digest: ABCDEF0123456789
"""
    signature = provenance.parse_apksigner(signing)
    assert signature["schemes"] == {
        "v1": False,
        "v2": True,
        "v3": False,
        "v3.1": False,
        "v4": False,
    }
    assert signature["v2_or_newer"] is True
    assert signature["certificate_sha256"] == ["abcdef0123456789"]
    assert signature["certificate_dn"] == ["C=US, O=Android, CN=Android Debug"]

    try:
        provenance.parse_aapt2_badging("package: name='x'")
    except ValueError:
        pass
    else:
        raise AssertionError("incomplete aapt2 output was accepted")

    try:
        provenance.parse_apksigner("Verified using v1 scheme (JAR signing): false")
    except ValueError:
        pass
    else:
        raise AssertionError("signature output without a certificate was accepted")

    print("JM ANDROID APK PROVENANCE PARSERS: MODERN/LEGACY MANIFEST + V2 SIGNATURE OUTPUT PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
