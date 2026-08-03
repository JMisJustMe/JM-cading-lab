#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
TESTS = Path(__file__).resolve().parent
sys.path.insert(0, str(TOOLS))
sys.path.insert(0, str(TESTS))

import android_gradle_factory_v0_3 as canonical  # noqa: E402

# Reuse the complete 100-project/100-Java-carrier conformance body, but bind its
# `android_gradle_factory` import to the new canonical compatibility wrapper.
sys.modules["android_gradle_factory"] = canonical
import test_android_gradle_factory as carrier_test  # noqa: E402
carrier_test.factory = canonical


def main() -> int:
    result = carrier_test.main()
    assert result == 0

    with tempfile.TemporaryDirectory(prefix="jm-android-v0-3-floor-") as temp:
        out = Path(temp) / "generated"
        receipt = canonical.generate(ROOT, out)
        assert receipt["schema"] == "jm.everybody.android-gradle-factory/0.3"
        assert receipt["factory_version"] == "0.3"
        assert receipt["body_count"] == 100
        assert receipt["unique_namespaces"] == 100
        assert receipt["sdk"] == {"compile": 35, "min": 24, "target": 35}
        assert receipt["build_tools"] == "35.0.0"
        assert receipt["compatibility_floor"]["status"] == "DONOR_COMPATIBLE"

        for body_id in ("cading", "quadze", "recorp", "routeos", "finger-one", "finger-two"):
            root = out / "bodies" / body_id / "android-gradle"
            route = json.loads((root / "jmgradle.route.json").read_text(encoding="utf-8"))
            gradle = (root / "app" / "build.gradle.kts").read_text(encoding="utf-8")
            assert route["sdk"] == {"compile": 35, "min": 24, "target": 35}
            assert "compileSdk = 35" in gradle
            assert "targetSdk = 35" in gradle
            assert "compileSdk = 36" not in gradle
            assert "targetSdk = 36" not in gradle

        stored = json.loads((out / "ANDROID_GRADLE_RECEIPT.json").read_text(encoding="utf-8"))
        assert stored == receipt
        print("JM ANDROID FACTORY v0.3: 100/100 CARRIERS AT AGP 8.7.3 / GRADLE 8.10.2 / API 35 PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
