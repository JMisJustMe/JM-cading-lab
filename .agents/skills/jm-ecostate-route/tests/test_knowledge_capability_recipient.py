"""Scoped native integration: true JM Knowledge modules -> real local recipient writes."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_intake as intake
import jm_knowledge_capability_recipient as recipient

class NativeKnowledgeCapabilityContact(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.base=Path(t.name)
        self.a=self.base/"A.md"
        self.b=self.base/"B.md"
        self.a.write_text("# Habit\nHabit can be observed in action.\n"
                          "Habit is learned through repetition.\n"
                          "Habit can influence choices.\n"
                          "Habit remains subject to correction.\n",encoding="utf8")
        self.b.write_text("# Habit\nHabit is also discussed in independent documents.\n",encoding="utf8")
        self.sources=[self.a,self.b]
        self.candidate=self.base/"candidate"
        intake.compile_sources(self.sources,self.candidate,"habit")
        self.out=self.base/"recipient"

    def test_real_source_replay_to_writer_and_recovery(self):
        got=recipient.build(self.candidate,self.sources,"habit",self.out,top=3)
        self.assertEqual(got["recovery"],"PASS_SOURCE_AND_RESULT_REPLAY")
        self.assertEqual(got["cards"],3)
        self.assertEqual(got["baseline_documents"],1)
        self.assertEqual(got["jm_documents"],2)
        self.assertEqual(got["coverage_delta"],1)
        body=json.loads((self.out/"EVIDENCE_CARDS.json").read_text(encoding="utf8"))
        self.assertEqual(len(body["cards"]),3)
        self.assertFalse(body["agent_executed"])
        self.assertFalse(body["model_weights_changed"])
        self.assertEqual(body["promotion"],"NOT_ALLOWED")
        self.assertEqual(body["target_consequence"],"LOCAL_EVIDENCE_CARDS_WRITTEN")
        self.assertEqual(recipient.recover(self.candidate,self.sources,self.out)["cards"],3)

    def test_edited_original_prevents_recipient_write(self):
        self.a.write_text(self.a.read_text(encoding="utf8")+"\\nTAMPER",encoding="utf8")
        with self.assertRaises(Exception):
            recipient.build(self.candidate,self.sources,"habit",self.out)
        self.assertFalse(self.out.exists())

    def test_changed_original_blocks_recovery(self):
        recipient.build(self.candidate,self.sources,"habit",self.out)
        self.b.write_text(self.b.read_text(encoding="utf8")+"\\nTAMPER",encoding="utf8")
        with self.assertRaises(Exception):
            recipient.recover(self.candidate,self.sources,self.out)

    def test_tampered_output_blocks_recovery(self):
        recipient.build(self.candidate,self.sources,"habit",self.out)
        p=self.out/"EVIDENCE_CARDS.json"
        p.write_text(p.read_text(encoding="utf8").replace("HELD","ACTIVE",1),encoding="utf8")
        with self.assertRaises(Exception):
            recipient.recover(self.candidate,self.sources,self.out)

    def test_zero_match_never_writes(self):
        with self.assertRaisesRegex(Exception,"ZERO_MATCH"):
            recipient.build(self.candidate,self.sources,"zirconiumunmatched",self.out)
        self.assertFalse(self.out.exists())

    def test_existing_destination_not_replaced(self):
        self.out.mkdir()
        sentinel=self.out/"protect.txt"
        sentinel.write_text("protected",encoding="utf8")
        with self.assertRaisesRegex(Exception,"OUTPUT_EXISTS"):
            recipient.build(self.candidate,self.sources,"habit",self.out)
        self.assertEqual(sentinel.read_text(encoding="utf8"),"protected")

    def test_invalid_limit_no_write(self):
        with self.assertRaisesRegex(Exception,"BAD_TOP"):
            recipient.build(self.candidate,self.sources,"habit",self.out,top=1000)
        self.assertFalse(self.out.exists())

    def test_forged_route_receipt_rejected_even_after_manifest_rehash(self):
        # Simulate someone rewriting a self-consistent evidence + manifest pair.
        # Exact source replay still succeeds; independent route replay MUST fail.
        import hashlib
        recipient.build(self.candidate,self.sources,"habit",self.out,top=3,
                        route_existing=True)
        path=self.out/"EVIDENCE_CARDS.json"
        body=json.loads(path.read_text(encoding="utf8"))
        body["route_receipt_sha256"]="0"*64
        raw=recipient.encoded(body)
        path.write_bytes(raw)
        mp=self.out/"CONTACT_MANIFEST.json"
        manifest=json.loads(mp.read_text(encoding="utf8"))
        manifest["evidence_sha256"]=hashlib.sha256(raw).hexdigest()
        mp.write_bytes(recipient.encoded(manifest))
        with self.assertRaisesRegex(Exception,"ROUTE_RECEIPT_REPLAY_DRIFT"):
            recipient.recover(self.candidate,self.sources,self.out)

    def test_route_state_inflation_rejected_on_recovery(self):
        recipient.build(self.candidate,self.sources,"habit",self.out,top=3)
        path=self.out/"EVIDENCE_CARDS.json"
        body=json.loads(path.read_text(encoding="utf8"))
        body["existing_jm_runtime_contact"]="CLAIMED_EXECUTION"
        raw=recipient.encoded(body)
        path.write_bytes(raw)
        mp=self.out/"CONTACT_MANIFEST.json"
        manifest=json.loads(mp.read_text(encoding="utf8"))
        manifest["evidence_sha256"]=recipient.digest(raw)
        mp.write_bytes(recipient.encoded(manifest))
        with self.assertRaisesRegex(Exception,"ROUTE_STATE_INVALID"):
            recipient.recover(self.candidate,self.sources,self.out)

    def test_real_existing_python_node_route_then_local_recipient(self):
        # This calls the already-existing Python and Node JM sovereign routing
        # binaries; it does not execute/modify any selected coding body.
        got=recipient.build(self.candidate,self.sources,"habit",self.out,top=3,
                            route_existing=True)
        self.assertEqual(got["recovery"],"PASS_SOURCE_AND_RESULT_REPLAY")
        body=json.loads((self.out/"EVIDENCE_CARDS.json").read_text(encoding="utf8"))
        self.assertEqual(body["existing_jm_runtime_contact"],"PYTHON_NODE_ROUTING_ONLY")
        self.assertEqual(len(body["route_receipt_sha256"]),64)
        self.assertFalse(body["agent_executed"])

if __name__=="__main__": unittest.main()
