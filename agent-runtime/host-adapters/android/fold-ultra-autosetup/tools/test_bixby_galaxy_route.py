#!/usr/bin/env python3
"""Contact 003 — Android exact-route and shortcut contract. Not Samsung/Bixby proof."""
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
MAIN=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
MANIFEST=(ROOT/"app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
N="{http://schemas.android.com/apk/res/android}"
ROUTES={
    "root":0,"galaxy":1,"projects":6,"games":6,
    "music":6,"sessions":8,"recovery":9
}
SHORTCUTS={
    "jm_galaxy_tools":"galaxy",
    "jm_games_shelf":"games",
    "jm_music_shelf":"music",
    "jm_return_points":"recovery"
}

class NativeContact(unittest.TestCase):
    def test_exact_public_routes_and_existing_share(self):
        xml=ET.fromstring(MANIFEST)
        self.assertNotIn("<uses-permission",MANIFEST)
        activity=xml.find("./application/activity")
        self.assertIsNotNone(activity)
        f=activity.findall("intent-filter")
        views=[x for x in f if any(a.attrib.get(N+"name")=="android.intent.action.VIEW"
                                  for a in x.findall("action"))]
        self.assertEqual(len(views),len(ROUTES))
        paths=set()
        for v in views:
            self.assertEqual({x.attrib.get(N+"name") for x in v.findall("category")},
                {"android.intent.category.DEFAULT","android.intent.category.BROWSABLE"})
            ds=v.findall("data")
            self.assertEqual(len(ds),1)
            d=ds[0].attrib
            self.assertEqual(d.get(N+"scheme"),"jmfoldultra")
            self.assertEqual(d.get(N+"host"),"open")
            self.assertEqual(set(d),{N+"scheme",N+"host",N+"path"})
            paths.add(d[N+"path"].removeprefix("/"))
        self.assertEqual(paths,set(ROUTES))
        self.assertTrue(any(any(a.attrib.get(N+"name")=="android.intent.action.SEND"
                                for a in v.findall("action")) for v in f))
        metadata=[e for e in activity.findall("meta-data")
                  if e.attrib.get(N+"name")=="android.app.shortcuts"]
        self.assertEqual(len(metadata),1)
        self.assertEqual(metadata[0].attrib.get(N+"resource"),"@xml/shortcuts")

    def test_shortcuts_are_existing_allowlisted_routes(self):
        xml=ET.parse(ROOT/"app/src/main/res/xml/shortcuts.xml").getroot()
        shortcuts=xml.findall("shortcut")
        self.assertEqual(len(shortcuts),len(SHORTCUTS))
        strings=ET.parse(ROOT/"app/src/main/res/values/strings.xml").getroot()
        labels={x.attrib["name"]:x.text for x in strings.findall("string")}
        seen=set()
        for item in shortcuts:
            ident=item.attrib.get(N+"shortcutId")
            self.assertIn(ident,SHORTCUTS)
            self.assertNotIn(ident,seen)
            seen.add(ident)
            intent=item.find("intent")
            self.assertIsNotNone(intent)
            self.assertEqual(intent.attrib.get(N+"action"),"android.intent.action.VIEW")
            self.assertEqual(intent.attrib.get(N+"targetPackage"),"com.jmisjustme.foldultra")
            self.assertEqual(intent.attrib.get(N+"targetClass"),"com.jmisjustme.foldultra.MainActivity")
            self.assertEqual(intent.attrib.get(N+"data"),"jmfoldultra://open/"+SHORTCUTS[ident])
            for name in (N+"shortcutShortLabel",N+"shortcutLongLabel"):
                ref=item.attrib.get(name,"")
                self.assertTrue(ref.startswith("@string/") and ref[8:] in labels,ref)

    def test_allowlist_lifecycle_readiness_and_project_selection_preserved(self):
        self.assertIn('JM_CONTACT_PREFIX="jmfoldultra://open/"',MAIN)
        self.assertIn("routeJmRoomIntent(getIntent())",MAIN)
        self.assertIn("routeJmRoomIntent(intent)",MAIN)
        self.assertIn('sp.getBoolean("ready",false)',MAIN)
        self.assertIn("routeProjectFilter=viewFamily;",MAIN)
        self.assertIn('routeProjectFilter!=null?routeProjectFilter:sp.getString("project.family","GAMES")',MAIN)
        self.assertIn("routeProjectFilter=null;sp.edit().putString(\"project.family\"",MAIN)
        handler=MAIN.split("boolean routeJmRoomIntent(Intent intent){",1)[1].split("void inspectIncoming(Intent intent)",1)[0]
        for k,v in ROUTES.items():
            self.assertIn('(JM_CONTACT_PREFIX+"'+k+'").equals(address)',handler)
            self.assertIn("destination="+str(v),handler)
        self.assertIn('viewFamily="GAMES"',handler)
        self.assertIn('viewFamily="MUSIC"',handler)
        self.assertIn("HOLD · Unknown JM navigation link",handler)
        self.assertIn("HOLD · Complete JM setup",handler)
        for forbidden in ["sp.edit()", "ProjectShelf.choose", "ProjectShelf.upsert",
                          "SessionDeck.commit", "ReentryEngine", "startActivity(",
                          "nativeHandoff(", "ACTION_SEND", "app(", "url("]:
            self.assertNotIn(forbidden,handler)

if __name__=="__main__":
    unittest.main()
