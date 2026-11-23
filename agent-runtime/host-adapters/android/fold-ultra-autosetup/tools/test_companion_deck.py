#!/usr/bin/env python3
"""JM Companion Deck CP01: source contract, not a physical Fold or API test."""
import re
import unittest
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
JAVA=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/JMCompanionDoors.java").read_text(encoding="utf-8")
MAIN=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text(encoding="utf-8")
MANIFEST=(ROOT/"app/src/main/AndroidManifest.xml").read_text(encoding="utf-8")
PREFS="jm.fold.ultra.prelaunch.v0.2"
class CompanionDeck(unittest.TestCase):
    def test_exact_eight_owner_or_provider_doors(self):
        matches=re.findall(r'new Door\("([^"]+)","([^"]+)","([^"]+)","(https://[^"]+)"',JAVA)
        self.assertEqual(len(matches),8)
        self.assertEqual({x[0] for x in matches},
            {"estate","github","chatgpt","gemini","drive","gmail","dropbox","copilot"})
        from urllib.parse import urlsplit
        for key,title,host,url in matches:
            u=urlsplit(url)
            self.assertEqual(u.scheme,"https")
            self.assertEqual(u.hostname,host)
            self.assertIsNone(u.username)
            self.assertIsNone(u.password)
            self.assertIsNone(u.port)
            self.assertFalse(u.fragment)
            self.assertNotIn("?",url)
    def test_outbound_only_and_explicit_confirmation(self):
        self.assertIn("void companionRoom()",MAIN)
        self.assertIn("void confirmCompanion(JMCompanionDoors.Door door)",MAIN)
        self.assertIn('tab=12;render();',MAIN)
        self.assertIn('else if(tab==12)companionRoom();',MAIN)
        self.assertIn('else JMOriginalWorkroom.render(this);',MAIN)
        self.assertIn('.setNegativeButton("Stay in JM",null)',MAIN)
        self.assertIn('.setPositiveButton("Open external door"',MAIN)
        self.assertIn("JMCompanionDoors.intentFor(door.id)",MAIN)
        self.assertIn("Intent.ACTION_VIEW",JAVA)
        self.assertIn("Intent.CATEGORY_BROWSABLE",JAVA)
        self.assertIn('!"https".equals(uri.getScheme())',JAVA)
        self.assertIn("door.host.equals(uri.getHost())",JAVA)
        self.assertNotIn("Authorization",JAVA)
        self.assertNotIn("READ_EXTERNAL_STORAGE",JAVA)
    def test_owner_scoped_trace_and_return_path(self):
        self.assertIn('if(last>=0&&last<=13)tab=last;',MAIN)
        self.assertIn('Open JM source intake',MAIN)
        self.assertIn('tab=10;render();',MAIN)
        self.assertIn('Open JM contact receipts',MAIN)
        self.assertIn('JMContactV1.receipts(sp)',MAIN)
        self.assertIn('JMContactV1.record(sp,"COMPANION_"',MAIN)
        self.assertIn('"ANDROID_VIEW_DISPATCH"',MAIN)
        self.assertIn('provider login, work and result UNVERIFIED',MAIN)
        self.assertIn('startActivity(JMCompanionDoors.intentFor(door.id));',MAIN)
        self.assertLess(MAIN.index('startActivity(JMCompanionDoors.intentFor(door.id));'),
                        MAIN.index('JMContactV1.record(sp,"COMPANION_"'))
        # The original provider-independent, zero-permission Android launcher
        # remains untouched; no privileged inbound actions are introduced.
        self.assertNotIn("<uses-permission",MANIFEST)
        self.assertNotIn('jmfoldultra://open/companions',MAIN)
    def test_saved_jm_checkpoint_outbound_contract(self):
        SHARE=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/JMCompanionShare.java").read_text(encoding="utf-8")
        self.assertIn("SessionDeck.find(sp,id)",SHARE)
        self.assertIn('if(revision<1)',SHARE)
        self.assertIn("SessionDeck.draftText(sp,snapshot",SHARE)
        self.assertIn("approved.payload.equals(now.payload)",SHARE)
        self.assertIn("Intent.ACTION_SEND",SHARE)
        self.assertIn("Intent.createChooser(send",SHARE)
        self.assertIn("Share saved JM checkpoint",MAIN)
        self.assertIn("JMCompanionShare.prepare(sp)",MAIN)
        self.assertIn("JMCompanionShare.stillCurrent(sp,prepared)",MAIN)
        self.assertIn("JMCompanionShare.chooser(prepared)",MAIN)
        self.assertIn('JMContactV1.record(sp,"COMPANION_SHARE","ANDROID_SHARE_REQUEST"',MAIN)
        self.assertIn('setNegativeButton("Keep inside JM",null)',MAIN)
        self.assertIn("PRIVATE SOURCE LEAVES JM ONLY IF YOU APPROVE.",MAIN)
        self.assertNotIn("<uses-permission",MANIFEST)
        self.assertNotIn("WRITE_EXTERNAL_STORAGE",SHARE)
    def test_inherited_native_privacy_contract_unchanged(self):
        self.assertIn(PREFS,MAIN)
        self.assertIn("JMIntakeV1.review(this,sp",MAIN)
        self.assertIn("CloudReturnBridge.apply(sp)",MAIN)
        self.assertIn("ReentryEngine",MAIN)
        self.assertNotIn("<uses-permission",MANIFEST)
        self.assertEqual(len(ET.fromstring(MANIFEST).find("./application/activity").findall("intent-filter")),4)
        self.assertNotIn('jmfoldultra://open/companions',MAIN)
if __name__=="__main__":unittest.main()
