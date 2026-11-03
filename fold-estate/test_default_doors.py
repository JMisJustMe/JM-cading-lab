#!/usr/bin/env python3
"""JM Fold Ultra CP03 registry contract: additive, fail-closed, no copying."""
import json
import pathlib
import unittest
from urllib.parse import urlsplit

ROOT = pathlib.Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "fold-estate" / "default-doors.v1.json"

def validate(data):
    assert data["schema"] == "JM.FoldEstateDoors/0.1"
    policy = data["policy"]
    assert policy["owner_confirmation"] is True
    assert policy["copy_sources"] is False
    assert policy["auto_host"] is False
    assert policy["unverified_route"] == "HOLD"
    sections = data["sections"]
    assert [s["id"] for s in sections] == [
        "websites", "coding", "apps", "games", "theories",
        "music", "creations", "connections", "tools"
    ]
    seen = set()
    for section in sections:
        for entry in section["entries"]:
            key = (section["id"], entry["id"])
            assert key not in seen, key
            seen.add(key)
            if "url" in entry:
                parsed = urlsplit(entry["url"])
                assert parsed.scheme == "https" and parsed.hostname
                assert not parsed.username and not parsed.password
                assert entry.get("verified") == "repository-location"
            if entry.get("status", "").startswith("HOLD"):
                assert "url" not in entry and "package" not in entry
    return len(seen)

class RegistryContract(unittest.TestCase):
    def test_seed(self):
        with REGISTRY.open(encoding="utf-8") as f:
            self.assertEqual(validate(json.load(f)), 11)

    def test_bundled_android_asset_matches_registry(self):
        bundled = ROOT / "agent-runtime" / "host-adapters" / "android" / "fold-ultra-autosetup" / "app" / "src" / "main" / "assets" / "jm_estate_doors.json"
        self.assertEqual(REGISTRY.read_bytes(), bundled.read_bytes())

    def test_native_route_and_policy_guards(self):
        native = ROOT / "agent-runtime" / "host-adapters" / "android" / "fold-ultra-autosetup" / "app" / "src" / "main" / "java" / "com" / "jmisjustme" / "foldultra" / "MainActivity.java"
        code = native.read_text(encoding="utf-8")
        self.assertIn('void estateRoom()', code)
        self.assertIn('void estateSection(JSONObject registry,int index)', code)
        self.assertIn('void estateEntry(JSONObject entry)', code)
        self.assertIn('getAssets().open("jm_estate_doors.json")', code)
        self.assertIn('policy.optBoolean("copy_sources")', code)
        self.assertIn('policy.optBoolean("auto_host")', code)
        self.assertIn('setNegativeButton("Cancel",null)', code)
        self.assertIn('new Intent(Intent.ACTION_VIEW,parsed)', code)

    def test_reject_insecure_destination(self):
        with REGISTRY.open(encoding="utf-8") as f:
            data = json.load(f)
        data["sections"][1]["entries"][0]["url"] = "http://example.com"
        with self.assertRaises(AssertionError):
            validate(data)

if __name__ == "__main__":
    unittest.main()
