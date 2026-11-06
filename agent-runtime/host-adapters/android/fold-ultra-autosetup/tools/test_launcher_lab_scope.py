"""Static fail-closed checks. Does not claim Android runtime or physical device."""
import json
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"app/src/main"
NS="{http://schemas.android.com/apk/res/android}"

class HomeLabScopeTest(unittest.TestCase):
    def test_contract_devices_are_distinct_and_unpaired(self):
        c=json.loads((ROOT/"home-lab/cp01-contract.json").read_text(encoding="utf-8"))
        self.assertEqual(c["schema"],"JM.HomeLab/CP01")
        self.assertEqual({d["id"] for d in c["devices"]},{"FOLD8","OPPO","GROUNDZEROJM"})
        self.assertTrue(all(not d["paired"] for d in c["devices"]))
        self.assertFalse(c["bridge"]["remoteCommandExecution"])
        self.assertEqual(c["bridge"]["authentication"],"NOT_IMPLEMENTED")
        self.assertEqual(c["host"]["package"],"com.jmisjustme.foldultra")
        self.assertFalse(c["host"]["androidDefaultHome"])

    def test_manifest_optional_only_not_home(self):
        doc=ET.parse(SRC/"AndroidManifest.xml")
        acts=doc.findall(".//activity")
        launcher=[a for a in acts if a.get(NS+"name")==".launcher.LauncherLabActivity"]
        self.assertEqual(len(launcher),1)
        self.assertEqual(launcher[0].get(NS+"exported"),"false")
        for activity in acts:
            for category in activity.findall(".//category"):
                self.assertNotEqual(category.get(NS+"name"),"android.intent.category.HOME")
        self.assertFalse(doc.findall(".//uses-permission"))
        self.assertNotIn("QUERY_ALL_PACKAGES",(SRC/"AndroidManifest.xml").read_text())
        self.assertIn("android.intent.category.LAUNCHER",(SRC/"AndroidManifest.xml").read_text())

    def test_original_root_remains_authoritative(self):
        source=(SRC/"java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
        self.assertIn('btn(page,"JM WORKROOM / Write · Code · Files"',source)
        self.assertIn('btn(page,"JM HOME LAB / Layout · Apps · Devices"',source)
        self.assertIn("com.jmisjustme.foldultra.launcher.LauncherLabActivity.class",source)
        build=(ROOT/"app/build.gradle").read_text(encoding="utf-8")
        self.assertIn("applicationId 'com.jmisjustme.foldultra'",build)

if __name__=="__main__": unittest.main()
