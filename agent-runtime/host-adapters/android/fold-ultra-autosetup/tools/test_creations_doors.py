import json
import re
import unittest
from pathlib import Path
from urllib.parse import urlsplit
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "app/src/main/assets/jm_creations_doors.v1.json"
MANIFEST = ROOT / "app/src/main/AndroidManifest.xml"
OPENBOX = "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/openbox/"

class CreationsDoorsContracts(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads(REGISTRY.read_text(encoding="utf-8"))
        cls.entries = [e for section in cls.data["sections"] for e in section["entries"]]

    def test_original_app_not_replaced(self):
        self.assertEqual(self.data["policy"]["original_app"], "com.jmisjustme.foldultra")
        self.assertTrue(self.data["policy"]["access_only"])
        self.assertFalse(self.data["policy"]["source_bodies_copied"])
        self.assertFalse(self.data["policy"]["automatic_external_navigation"])
        self.assertTrue(self.data["policy"]["no_launcher_takeover"])

    def test_unique_identity_and_nine_original_sections(self):
        self.assertEqual(len(self.data["sections"]), 9)
        ids = [x["id"] for x in self.entries]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(ids), 30)
        self.assertTrue(all(e.get("label") for e in self.entries))

    def test_openbox_current_verified_original_door(self):
        entries = [x for x in self.entries if x["id"] == "jm-openbox-v2-cp10"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["url"], OPENBOX)
        self.assertEqual(entries[0]["version"], "v2.0 CP10")
        self.assertEqual(entries[0]["kind"], "web")

    def test_no_unverified_or_dangerous_launch_targets(self):
        for e in self.entries:
            kind = e["kind"]
            self.assertIn(kind, {"web", "android", "hold"})
            if kind == "web":
                url = urlsplit(e["url"])
                self.assertEqual(url.scheme, "https", e["id"])
                self.assertTrue(url.hostname, e["id"])
                self.assertIsNone(url.username, e["id"])
                self.assertIsNone(url.port, e["id"])
                self.assertFalse(url.fragment, e["id"])
                self.assertNotIn("localhost", url.hostname.lower())
                self.assertFalse(re.search(r"\s", e["url"]))
            elif kind == "android":
                self.assertRegex(e["package"], r"^[a-zA-Z][a-zA-Z0-9_.]{2,180}$")
                self.assertNotIn("url", e)
            else:
                self.assertNotIn("url", e)

    def test_no_private_source_claimed_public(self):
        for e in self.entries:
            if e.get("status", "").startswith("PRIVATE"):
                self.assertIn("github.com", e["url"])

    def test_activity_is_private_and_home_role_absent(self):
        root = ET.parse(MANIFEST).getroot()
        ns = "{http://schemas.android.com/apk/res/android}"
        app = root.find("application")
        matches = [a for a in app.findall("activity")
                   if a.attrib.get(ns + "name") == ".creations.CreationsActivity"]
        self.assertEqual(len(matches), 1)
        self.assertEqual(matches[0].attrib.get(ns + "exported"), "false")
        xml = MANIFEST.read_text(encoding="utf-8")
        self.assertNotIn("android.intent.category.HOME", xml)
        self.assertNotIn("android.permission.QUERY_ALL_PACKAGES", xml)

if __name__ == "__main__":
    unittest.main()
