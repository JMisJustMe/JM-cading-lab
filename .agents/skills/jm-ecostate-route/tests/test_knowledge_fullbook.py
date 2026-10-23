"""Canonical JM full-book carrier contact and byte-lineage guards."""
import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_fullbook as books

class FullBookContact(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.d=Path(temp.name)
        self.a=self.d/"Book_A.txt"
        self.b=self.d/"Book_B.txt"
        self.a.write_text("Habit and truth line "+("x"*12)+"\n"+
                         "".join("Habit and thought line %d\n"%i for i in range(4001)),encoding="utf8")
        self.b.write_text("Another author treats habit and recovery.\n",encoding="utf8")
        self.originals=[self.a,self.b]
        self.stage=self.d/"stage"

    def test_native_original_replay_chunking_and_real_query(self):
        m=books.stage(self.originals,self.stage)
        self.assertEqual(m["original_documents"],2)
        self.assertEqual(m["chunks"],3)
        r=books.run(self.originals,self.stage,question="habit",top=3)
        self.assertEqual(r["original_replay"],"PASS")
        self.assertEqual(r["canonical_jm_query_replay"],"PASS")
        self.assertEqual(r["original_documents"],2)
        self.assertEqual(r["physical_chunks"],3)
        self.assertLessEqual(r["true_document_coverage"],2)
        self.assertFalse(r["agent_executed"])
        self.assertFalse(r["model_trained"])
        self.assertEqual(r["promotion"],"NOT_ALLOWED")

    def test_modified_original_fails_replay(self):
        books.stage(self.originals,self.stage)
        self.a.write_bytes(self.a.read_bytes()+b"\nCHANGED\n")
        with self.assertRaises(Exception):books.verify(self.originals,self.stage)

    def test_modified_chunk_fails_replay(self):
        books.stage(self.originals,self.stage)
        p=self.stage/"book01_part01.txt"
        p.write_bytes(p.read_bytes()+b"BYTES_DRIFT")
        with self.assertRaises(Exception):books.verify(self.originals,self.stage)

    def test_duplicate_originals_refused(self):
        self.b.write_bytes(self.a.read_bytes())
        with self.assertRaisesRegex(Exception,"DUPLICATE_ORIGINAL"):
            books.plan(self.originals)

    def test_non_utf8_refused(self):
        self.b.write_bytes(b"\xff\xfe\x80")
        with self.assertRaisesRegex(Exception,"ORIGINAL_NOT_UTF8"):
            books.plan(self.originals)

if __name__=="__main__":unittest.main()
