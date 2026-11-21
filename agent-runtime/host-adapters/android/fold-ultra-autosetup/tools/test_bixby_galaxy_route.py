#!/usr/bin/env python3
"""JM Fold v1.0 routing contract; source-level, not physical Samsung proof."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parents[1]
MAIN=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
MANIFEST=(ROOT/"app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
N="{http://schemas.android.com/apk/res/android}"
ROUTES={"galaxy":"jm_galaxy_tools","projects":"jm_projects",
        "continue":"jm_continue","capture":"jm_capture"}
class CommandDeck(unittest.TestCase):
    def test_manifest_routes_and_share(self):
        manifest=ET.fromstring(MANIFEST)
        self.assertNotIn("<uses-permission",MANIFEST)
        filters=manifest.find("./application/activity").findall("intent-filter")
        views=[f for f in filters if any(x.attrib.get(N+"name")=="android.intent.action.VIEW" for x in f.findall("action"))]
        self.assertEqual(len(views),1)
        view=views[0]
        self.assertEqual({x.attrib.get(N+"name") for x in view.findall("category")},
                         {"android.intent.category.DEFAULT","android.intent.category.BROWSABLE"})
        self.assertEqual({x.attrib.get(N+"path") for x in view.findall("data")},{"/"+x for x in ROUTES})
        for data in view.findall("data"):
            self.assertEqual(data.attrib.get(N+"scheme"),"jmfoldultra")
            self.assertEqual(data.attrib.get(N+"host"),"open")
        self.assertGreaterEqual(sum(any(x.attrib.get(N+"name")=="android.intent.action.SEND"
               for x in f.findall("action")) for f in filters),2)
        self.assertIn('android:mimeType="text/plain"',MANIFEST)
        self.assertIn('android:mimeType="application/pdf"',MANIFEST)
    def test_four_shortcuts_only(self):
        activity=ET.fromstring(MANIFEST).find("./application/activity")
        meta=[x for x in activity.findall("meta-data") if x.attrib.get(N+"name")=="android.app.shortcuts"]
        self.assertEqual(len(meta),1)
        self.assertEqual(meta[0].attrib.get(N+"resource"),"@xml/shortcuts")
        items=ET.parse(ROOT/"app/src/main/res/xml/shortcuts.xml").getroot().findall("shortcut")
        self.assertEqual(len(items),4)
        labels={x.attrib["name"]:x.text for x in ET.parse(ROOT/"app/src/main/res/values/strings.xml").getroot().findall("string")}
        for path,key in ROUTES.items():
            matching=[x for x in items if x.attrib.get(N+"shortcutId")==key]
            self.assertEqual(len(matching),1)
            item=matching[0]
            self.assertIn(item.attrib.get(N+"shortcutShortLabel","").replace("@string/",""),labels)
            target=item.find("intent")
            self.assertEqual(target.attrib.get(N+"action"),"android.intent.action.VIEW")
            self.assertEqual(target.attrib.get(N+"data"),"jmfoldultra://open/"+path)
            self.assertEqual(target.attrib.get(N+"targetPackage"),"com.jmisjustme.foldultra")
            self.assertEqual(target.attrib.get(N+"targetClass"),"com.jmisjustme.foldultra.MainActivity")
    def test_navigation_only(self):
        self.assertIn('GALAXY_CONTACT_URI="jmfoldultra://open/galaxy"',MAIN)
        for route in ROUTES:self.assertIn("jmfoldultra://open/"+route,MAIN)
        self.assertIn("GALAXY_CONTACT_URI.equals(link)",MAIN)
        self.assertIn("Intent.ACTION_VIEW.equals(intent.getAction())",MAIN)
        self.assertIn('sp.getBoolean("ready",false)',MAIN)
        self.assertIn("tab=target;",MAIN)
        self.assertIn("if(!routeGalaxyIntent(getIntent())&&state==null)inspectIncoming(getIntent());",MAIN)
        self.assertIn("if(!routeGalaxyIntent(intent))inspectIncoming(intent);",MAIN)
        self.assertIn("HOLD · Unknown JM navigation link",MAIN)
        self.assertIn("HOLD · Complete JM setup",MAIN)
        handler=MAIN.split("boolean routeGalaxyIntent(Intent intent){",1)[1].split("void inspectIncoming",1)[0]
        for bad in ("sp.edit()","SessionDeck.commit","ReentryEngine.restore","ProjectShelf.stage","startActivity(","ACTION_SEND"):
            self.assertNotIn(bad,handler)
    def test_inherited_boundaries(self):
        self.assertIn("CloudReturnBridge.apply(sp)",MAIN)
        self.assertIn("JMIntakeV1.review(this,sp",MAIN)
        self.assertIn("JMContactV1.exportReceipt(sp)",MAIN)
        self.assertIn("UsbBridge.configuration(sp)",MAIN)
        self.assertIn("UsbBridge.applyConfig(sp,j)",MAIN)
        self.assertIn("Export this original",MAIN)
        for family in ("COMICS","CARTOONS","BOOKS"): self.assertIn(family,MAIN)
if __name__=="__main__":unittest.main()
