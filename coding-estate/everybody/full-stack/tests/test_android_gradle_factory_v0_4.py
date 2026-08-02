#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))

import android_gradle_factory_v0_4 as canonical  # noqa: E402


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="jm-android-v0-4-a-") as first_temp, tempfile.TemporaryDirectory(prefix="jm-android-v0-4-b-") as second_temp:
        first = Path(first_temp) / "generated"
        second = Path(second_temp) / "generated"
        receipt = canonical.generate(ROOT, first)
        canonical.generate(ROOT, second)

        assert receipt["schema"] == "jm.everybody.android-gradle-factory/0.4"
        assert receipt["factory_version"] == "0.4"
        assert receipt["body_count"] == 100
        assert receipt["unique_namespaces"] == 100
        assert receipt["sdk"] == {"compile": 35, "min": 24, "target": 35}
        assert receipt["build_tools"] == "35.0.0"
        assert receipt["kotlin_receipt_writer"] == {
            "status": "REPAIRED",
            "inherited_fault": "PYTHON_NEWLINE_CONSUMED_INSIDE_KOTLIN_STRING",
            "replacement": "System.lineSeparator()",
            "charset": "java.nio.charset.StandardCharsets.UTF_8",
            "repaired_writes_per_body": 4,
            "repaired_write_routes": 400,
        }
        assert canonical.tree_digest(first) == canonical.tree_digest(second)

        projects = sorted(first.glob("bodies/*/android-gradle"))
        assert len(projects) == 100
        for project in projects:
            body_id = project.parent.name
            gradle = (project / "app/build.gradle.kts").read_text(encoding="utf-8")
            route = json.loads((project / "jmgradle.route.json").read_text(encoding="utf-8"))
            assert route["body_id"] == body_id
            assert route["sdk"] == {"compile": 35, "min": 24, "target": 35}
            assert gradle.count("System.lineSeparator()") == 4, body_id
            assert gradle.count("java.nio.charset.StandardCharsets.UTF_8") >= 8, body_id
            assert '+ "\n",' not in gradle, body_id
            assert not re.search(r'\+ "\s*\n\s*",', gradle), body_id
            lines = gradle.splitlines()
            for index, line in enumerate(lines[:-1]):
                assert not (line.rstrip().endswith('+ "') and lines[index + 1].strip() == '",'), (
                    body_id,
                    index + 1,
                )
            assert 'compileSdk = 35' in gradle
            assert 'targetSdk = 35' in gradle
            assert 'tasks.register("lowerBodyIR")' in gradle
            assert 'tasks.register("emitAndroidCarrier")' in gradle
            assert 'tasks.register("verifyApkIdentity")' in gradle
            assert 'tasks.register("writeBuildReceipt")' in gradle

        stored = json.loads((first / "ANDROID_GRADLE_RECEIPT.json").read_text(encoding="utf-8"))
        assert stored == receipt
        print("JM ANDROID FACTORY v0.4: 100/100 VALID KOTLIN RECEIPT WRITERS + API 35 CARRIERS PASS")
        print(f"TREE_SHA256={canonical.tree_digest(first)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
