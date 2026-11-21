"""Real JM Knowledge Query -> existing sovereign Python+Node routing contact."""
from pathlib import Path
import json
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_intake as intake
import jm_knowledge_query as query

class KnowledgeRuntimeContact(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.base=Path(temp.name)
        self.source=self.base/"JM-CURRENT.md"
        self.source.write_text(
            "# JM source provenance\n"
            "A route candidate must preserve the source hash and independent recovery.\n"
            "The existing agent runtime selects coding routes without executing target changes.\n",
            encoding="utf8")
        self.candidate=self.base/"candidate"
        intake.compile_sources([self.source],self.candidate,"agent runtime source")

    def test_native_python_node_route_after_verified_replay(self):
        verified=query.query(self.candidate,[self.source],"agent runtime source")
        self.assertEqual(verified["source_integrity"],"PASS_REPLAY")
        self.assertGreater(verified["question_matches"],0)
        result=query.contact_existing_runtime(verified)
        route=result["existing_jm_route"]
        self.assertEqual(route["scope_state"],"HELD")
        self.assertEqual(route["runtime_contact"],"PYTHON_AND_NODE_PARITY_CONTACTED")
        self.assertEqual(len(route["route_receipt_sha256"]),64)
        self.assertEqual(route["target_consequence"],"NOT_ATTEMPTED")
        self.assertEqual(route["live_current_head_resolution"],"OPEN")
        self.assertFalse(result["agent_executed"])
        self.assertEqual(route["source_query_integrity"],"PASS_REPLAY")
        self.assertEqual(result["source_coverage"]["distinct_source_documents"],1)

    def test_zero_match_skips_runtime_and_claim(self):
        verified=query.query(self.candidate,[self.source],"unconnectedzirconium")
        with patch("jm_skill_gate.contact",side_effect=AssertionError("must not route")):
            result=query.contact_existing_runtime(verified)
        self.assertEqual(result["existing_jm_route"]["result"],"NO_SOURCE_MATCH_NO_ROUTE")
        self.assertEqual(result["existing_jm_route"]["runtime_contact"],"NOT_ATTEMPTED")

    def test_tampered_source_never_reaches_runtime(self):
        self.source.write_text("# Replaced\nFalse authority\n",encoding="utf8")
        with patch("jm_skill_gate.contact",side_effect=AssertionError("must not route")):
            with self.assertRaises(Exception):
                verified=query.query(self.candidate,[self.source],"agent runtime")
                query.contact_existing_runtime(verified)

    def test_inflated_route_rejected(self):
        verified=query.query(self.candidate,[self.source],"agent runtime source")
        with patch("jm_skill_gate.contact",return_value={
            "schema":"JM.AgentSkillReadOnlyContact/0.3",
            "scope_state":"HELD","query":"agent runtime source",
            "surface_requested":"jm-knowledge-query",
            "discrepancies":[],"coding_selection_is_process_execution":False,
            "target_consequence":"SUCCEEDED","host_contact":"OPEN",
            "live_current_head_resolution":"OPEN"}):
            with self.assertRaisesRegex(Exception,"INFLATED"):
                query.contact_existing_runtime(verified)

    def test_cli_receipt_outside_candidate(self):
        receipt=self.base/"route-receipt.json"
        proc=subprocess.run([sys.executable,str(ROOT/"jm_knowledge_query.py"),
            "--candidate",str(self.candidate),
            "--source",str(self.source),"--query","agent runtime source",
            "--route-existing","--receipt",str(receipt)],capture_output=True,text=True,timeout=90)
        self.assertEqual(proc.returncode,0,proc.stderr)
        self.assertEqual(json.loads(receipt.read_text(encoding="utf8")),json.loads(proc.stdout))
        self.assertEqual(json.loads(proc.stdout)["existing_jm_route"]["scope_state"],"HELD")

if __name__=="__main__":unittest.main()
