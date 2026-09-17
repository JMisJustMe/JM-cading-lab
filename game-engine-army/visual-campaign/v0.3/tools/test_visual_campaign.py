#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, required=True)
    args = parser.parse_args()
    dist = args.dist.resolve()
    receipt = json.loads((dist / "VISUAL_CAMPAIGN_RECEIPT.json").read_text(encoding="utf-8"))
    addons = json.loads((dist / "ADDON_REGISTRY.json").read_text(encoding="utf-8"))
    assert receipt["schema"] == "jm.game-engine-army.visual-campaign/0.3"
    assert receipt["engineCount"] == 9
    assert receipt["addonCount"] >= 20
    assert len(addons["addons"]) == receipt["addonCount"]
    assert {a["category"] for a in addons["addons"]} >= {"theme", "fx", "audio", "input", "accessibility", "performance", "debug", "export", "delivery"}

    hashes = set()
    ids = set()
    for engine in receipt["engines"]:
        ids.add(engine["id"])
        path = dist / "engines" / engine["file"]
        text = path.read_text(encoding="utf-8")
        assert path.stat().st_size == engine["bytes"]
        assert sha(path) == engine["sha256"]
        assert engine["sha256"] not in hashes
        hashes.add(engine["sha256"])
        assert f'data-jmvc-engine="{engine["id"]}"' in text
        assert "JMVisualCampaign" in text
        assert "jmvc-root" in text
        assert "jmvc-fx" in text
        assert "Visual Campaign v0.3" in text
        assert "type=\"module\"" not in text
        assert not re.search(r'<script[^>]+src=["\']https?://', text, re.I)
        assert not re.search(r'<link[^>]+href=["\']https?://', text, re.I)
        assert text.lower().count("</script>") >= 2
        package = dist / engine["package"]
        package_receipt = json.loads((package / "PACKAGE_RECEIPT.json").read_text(encoding="utf-8"))
        assert package_receipt["sha256"] == engine["sha256"]
        assert len(package_receipt["addons"]) == receipt["addonCount"]

    assert len(ids) == 9 and len(hashes) == 9
    launcher = dist / receipt["portableLauncher"]["file"]
    launcher_text = launcher.read_text(encoding="utf-8")
    assert sha(launcher) == receipt["portableLauncher"]["sha256"]
    assert launcher_text.count('class="engine-card"') == 9
    assert "Download selected" in launcher_text and "Open separately" in launcher_text
    for engine_id in ids:
        assert engine_id in launcher_text
    pwa = dist / "pwa"
    assert (pwa / "index.html").is_file()
    assert (pwa / "manifest.webmanifest").is_file()
    assert (pwa / "sw.js").is_file()
    assert len(list((pwa / "engines").glob("*.html"))) == 9
    sums = (dist / "SHA256SUMS.txt").read_text(encoding="utf-8")
    assert "VISUAL_CAMPAIGN_RECEIPT.json" in sums
    print(json.dumps({"status": "PASS", "engineCount": 9, "addonCount": receipt["addonCount"], "uniqueHashes": len(hashes), "launcherSha256": receipt["portableLauncher"]["sha256"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
