#!/usr/bin/env python3
"""Non-privileged native GALAXY deep-link contract. Not a physical-device test."""
import unittest
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
MAIN = (ROOT/"app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
MANIFEST = (ROOT/"app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
N = "{http://schemas.android.com/apk/res/android}"

class GalaxyContact(unittest.TestCase):
    def test_exact_manifest_view_and_existing_share(self):
        xml = ET.fromstring(MANIFEST)
        main = xml.find("./application/activity")
        self.assertIsNotNone(main)
        filters = main.findall("./intent-filter")
        views = [f for f in filters if f.find("./action").attrib.get(N+"name") == "android.intent.action.VIEW"]
        self.assertEqual(len(views), 1)
        view = views[0]
        self.assertEqual({x.attrib.get(N+"name") for x in view.findall("category")},
                         {"android.intent.category.BROWSABLE","android.intent.category.DEFAULT"})
        self.assertEqual(view.find("data").attrib, {N+"scheme":"jmfoldultra",
                          N+"host":"open",N+"path":"/galaxy"})
        self.assertTrue(any(any(a.attrib.get(N+"name")=="android.intent.action.SEND"
                                for a in f.findall("action")) for f in filters))
        self.assertNotIn("<uses-permission", MANIFEST)

    def test_launcher_shortcut_is_navigation_only(self):
        root = ET.fromstring(MANIFEST)
        activity = root.find("./application/activity")
        meta = [x for x in activity.findall("meta-data")
                if x.attrib.get(N+"name")=="android.app.shortcuts"]
        self.assertEqual(len(meta),1)
        self.assertEqual(meta[0].attrib.get(N+"resource"),"@xml/shortcuts")
        shortcuts = ET.parse(ROOT/"app/src/main/res/xml/shortcuts.xml").getroot()
        items = shortcuts.findall("shortcut")
        self.assertEqual(len(items),1)
        item = items[0]
        self.assertEqual(item.attrib.get(N+"shortcutId"),"jm_galaxy_tools")
        target = item.find("intent")
        self.assertEqual(target.attrib.get(N+"action"),"android.intent.action.VIEW")
        self.assertEqual(target.attrib.get(N+"data"),"jmfoldultra://open/galaxy")
        self.assertEqual(target.attrib.get(N+"targetPackage"),"com.jmisjustme.foldultra")
        self.assertEqual(target.attrib.get(N+"targetClass"),"com.jmisjustme.foldultra.MainActivity")
        strings = ET.parse(ROOT/"app/src/main/res/values/strings.xml").getroot()
        labels = {x.attrib["name"]:x.text for x in strings.findall("string")}
        self.assertEqual(labels["jm_galaxy_short_label"],"JM Galaxy")

    def test_exact_allowlist_and_lifecycle(self):
        self.assertIn('GALAXY_CONTACT_URI="jmfoldultra://open/galaxy"', MAIN)
        self.assertIn("GALAXY_CONTACT_URI.equals(intent.getDataString())", MAIN)
        self.assertIn("Intent.ACTION_VIEW.equals(intent.getAction())", MAIN)
        self.assertIn('sp.getBoolean("ready",false)', MAIN)
        self.assertIn("tab=1;\n    render();", MAIN)
        self.assertIn("if(!routeGalaxyIntent(getIntent())&&state==null)inspectIncoming(getIntent());", MAIN)
        self.assertIn("if(!routeGalaxyIntent(intent))inspectIncoming(intent);", MAIN)
        self.assertIn("HOLD · Unknown JM navigation link", MAIN)
        self.assertIn("HOLD · Complete JM setup", MAIN)
        handler = MAIN.split("boolean routeGalaxyIntent(Intent intent){",1)[1].split("void inspectIncoming",1)[0]
        for forbidden in ["sp.edit()", "SessionDeck.commit", "ReentryEngine.restore",
                          "ProjectShelf.stage", "startActivity(", "ACTION_SEND"]:
            self.assertNotIn(forbidden,handler)

if __name__ == "__main__":
    unittest.main()
