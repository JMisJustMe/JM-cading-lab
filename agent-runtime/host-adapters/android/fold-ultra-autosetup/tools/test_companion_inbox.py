#!/usr/bin/env python3
"""CP04 source-contract checks. Native emulator separately proves behaviour."""
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/JMCompanionInbox.java").read_text()
MAIN=(ROOT/"app/src/main/java/com/jmisjustme/foldultra/MainActivity.java").read_text()
AUDIT=(ROOT/"tools/audit_ui_flow.py").read_text()
MANIFEST=(ROOT/"app/src/main/AndroidManifest.xml").read_text()
class JMInbox(unittest.TestCase):
    def test_existing_native_session_and_project_inheritance(self):
        for contract in ("ProjectShelf.selected(sp)","ProjectShelf.find(sp,id)",
            "SessionDeck.find(sp,id)","SessionDeck.draftText(sp,saved,\"note\")",
            "SessionDeck.draft(sp,approved.projectId,\"note\",approved.proposedDraft)"):
            self.assertIn(contract,SOURCE)
        self.assertNotIn("SessionDeck.commit(",SOURCE)
        self.assertNotIn("SharedPreferences.Editor",SOURCE)
    def test_no_silent_or_stale_writes(self):
        for term in ("source.length()>2500","SessionDeck.MAX_NOTES",
            "now.revision!=approved.revision","!now.priorDraft.equals(approved.priorDraft)",
            "!now.priorPhase.equals(approved.priorPhase)",
            "!now.priorNext.equals(approved.priorNext)",
            "No selected JM project available","SHARED SOURCE · UNVERIFIED"):
            self.assertIn(term,SOURCE)
        self.assertNotIn("https://",SOURCE)
        self.assertNotIn("Authorization",SOURCE)
    def test_real_owner_choose_root_project_or_discard(self):
        self.assertIn('setNegativeButton("Discard",null)',MAIN)
        self.assertIn('setPositiveButton("Add to JM"',MAIN)
        self.assertIn('setNeutralButton("Draft in JM project"',MAIN)
        self.assertIn("JMCompanionInbox.stage(sp,intakePlan)",MAIN)
        self.assertIn("tab=8;render();",MAIN)
        self.assertIn("if(incoming.startsWith(\"{\")&&incoming.contains(\"JM.LivingHome.CP07.CloudReturn/1.0\"))",MAIN)
        self.assertLess(MAIN.index("CloudReturnBridge.select(incoming"),MAIN.index("JMCompanionInbox.prepare(sp,incoming)"))
        self.assertNotIn("<uses-permission",MANIFEST)
    def test_stage_audit_requires_monotonic_native_state_and_ui(self):
        self.assertIn('assert current.get("stage")==str(expected_number)',AUDIT)
        self.assertIn("scroll_header(expected,label+\"_rendered\")",AUDIT)
        self.assertIn('if n.get("class")=="android.widget.Button"',AUDIT)
        self.assertNotIn('putString("stage"',AUDIT)
if __name__=="__main__":unittest.main()
