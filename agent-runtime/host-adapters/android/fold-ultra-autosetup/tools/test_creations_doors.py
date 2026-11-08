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
        self.assertEqual(len(ids), 117)
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
            self.assertIn(kind, {"web", "android", "hold", "local_file"})
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

    def test_original_tools_and_private_picker_keep_separate_authority(self):
        doors={x["id"]:x for x in self.entries}
        expected={
            "jm-coding-workshop-direct":"https://jmisjustme-estate.pages.dev/coding-estate/workshop/",
            "jm-everybody-direct":"https://jmisjustme-estate.pages.dev/coding-estate/everybody/",
            "jm-visualang-direct":"https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/visualang.html",
            "jm-py-original-proof":"https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/jm-py-proof.html"
        }
        for key,target in expected.items():
            self.assertEqual(doors[key]["kind"],"web")
            self.assertEqual(doors[key]["url"],target)
        private=doors["jm-private-local-html"]
        self.assertEqual(private["kind"],"local_file")
        self.assertNotIn("url",private)
        self.assertNotIn("package",private)
        self.assertFalse(self.data["policy"]["local_file_source_copied"])
        self.assertIn("owner",self.data["policy"]["private_file_access"].lower())
        java=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/creations/CreationsActivity.java").read_text(encoding="utf-8")
        self.assertIn("Intent.ACTION_OPEN_DOCUMENT",java)
        self.assertIn("Intent.FLAG_GRANT_READ_URI_PERMISSION",java)
        self.assertNotIn("READ_EXTERNAL_STORAGE",java)
        self.assertNotIn("READ_MEDIA_IMAGES",java)

    def test_no_private_source_claimed_public(self):
        for e in self.entries:
            if e.get("status", "").startswith("PRIVATE") and e["kind"] == "web":
                self.assertIn("github.com", e["url"])

    def test_all_22_original_games_house_mounted_contacts_remain_distinct(self):
        entries={e["id"]:e for e in self.entries}
        ids=["fourfold-arena","tboys-core-clash","rim-route","crewbound-arena","house-siege","western-sniper","dead-reckon","cardbored","gameforge","glyphplay","glyphforge","game-native-core","gamecore","combound","quadze","futarized","fight-clash","aiming-run","drag-aim","loopit-boundary","playform","routeos-platform"]
        self.assertEqual(len(ids),22)
        for game in ids:
            source=entries["jm-gb-play-"+game]
            self.assertEqual(source["kind"],"web")
            self.assertEqual(source["sourceId"],game)
            self.assertEqual(source["url"],"https://jmisjustme-estate.pages.dev/games-beyond/?jm-play="+game)
            self.assertIn("PUBLIC MOUNT",source["status"])
        for original in ("jmstudios-source-rebegin","jmstudios-actual-crown"):
            source=entries["jm-gb-private-"+original]
            self.assertEqual(source["kind"],"hold")
            self.assertNotIn("url",source)
        for editor in ("gameforge","glyphplay","glyphforge","game-native-core"):
            source=entries["jm-gb-edit-"+editor]
            self.assertEqual(source["url"],"https://jmisjustme-estate.pages.dev/games-beyond/?jm-edit="+editor)
        self.assertEqual(entries["jm-crewbound-321-unique-cast"]["kind"],"web")
        self.assertIn("22 public payload mounts",self.data["policy"]["mounted_bodies_claim"])
        self.assertFalse(self.data["policy"]["source_bodies_copied"])

    def test_apps_house_all_45_versioned_rows_with_clear_contact_boundaries(self):
        entries=[e for e in self.entries if e["id"].startswith("jm-apps-house-")]
        self.assertEqual(len(entries),45)
        self.assertEqual(sorted(e["sourceIndex"] for e in entries),list(range(45)))
        self.assertEqual(len({e["id"] for e in entries}),45)
        self.assertEqual(sum(e["status"].startswith("PUBLIC EXECUTABLE CARRIER") for e in entries),2)
        self.assertEqual(sum(e["status"].startswith("HOUSE SEARCH CONTACT") for e in entries),43)
        self.assertTrue(all(e["kind"]=="web" and e["version"] and e["originalStatus"]
                            and e["sourceScope"] for e in entries))
        for item in entries:
            if item["status"].startswith("HOUSE SEARCH CONTACT"):
                self.assertIn("/apps/?q=",item["url"])
                self.assertIn("not direct app",item["status"])
                self.assertIn("Filtered entry",item["routeScope"])
        policy=self.data["policy"]["apps_house_reference"]
        self.assertEqual(policy["entries"],45)
        self.assertTrue(policy["noMergedBodies"])
        self.assertIn("source-version labels only",self.data["policy"]["latest_body_claim"])

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
