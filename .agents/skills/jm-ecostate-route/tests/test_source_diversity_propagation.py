"""Real JM Knowledge regression: source-diverse selection and coverage."""
import sys
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_intake as intake
import jm_knowledge_query as query

class SourceDiversityPropagation(unittest.TestCase):
    def test_source_replay_and_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp)
            a=d/"A.md";b=d/"B.md";c=d/"C.md"
            a.write_text("# Monday\n"+"\n".join(
                "Bridge walkway safety inspections status report "+str(i)
                for i in range(8))+"\n",encoding="utf8")
            b.write_text("# Tuesday\nBridge walkway safety inspections restricted access\n",encoding="utf8")
            c.write_text("# Archive\nOld unrelated records\n",encoding="utf8")
            sources=[a,b,c]; candidate=d/"candidate"
            intake.compile_sources(sources,candidate,"bridge walkway safety inspections")
            got=query.query(candidate,sources,"bridge walkway safety inspections",top=4)
            self.assertEqual(got["source_integrity"],"PASS_REPLAY")
            self.assertEqual([x["filename"] for x in got["matches"]],
                             ["A.md","B.md","A.md","A.md"])
            coverage=got["source_coverage"]
            self.assertEqual(coverage["retrieved_passages"],4)
            self.assertEqual(coverage["distinct_source_documents"],2)
            self.assertEqual([x["passages"] for x in coverage["sources"]],[3,1])
            self.assertEqual(coverage["independent_factual_corroboration"],"NOT_ESTABLISHED")
            self.assertEqual(query.query(candidate,sources,"zirconium nebula")["source_coverage"]["distinct_source_documents"],0)
            self.assertEqual(query.query(candidate,sources,"bridge walkway safety inspections",top=1)["source_coverage"]["distinct_source_documents"],1)
            a.write_text(a.read_text(encoding="utf8")+"\nTAMPER\n",encoding="utf8")
            with self.assertRaises(Exception):
                query.query(candidate,sources,"bridge")

if __name__=="__main__": unittest.main()
