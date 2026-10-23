"""v0.7 cross-encoder bounded staging and source-integrity tests.

Fake reranker only tests the integration contract; real pretrained inference is
separately run in the full-book GitHub Actions job.
"""
from pathlib import Path
import sys,tempfile,unittest
try:
    import numpy as np
except ImportError:
    np=None
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_crossencoder_v07 as v07
import jm_knowledge_semantic_v06 as v06

class DenseStub:
    def embed(self,rows):
        for row in rows:
            text=row.casefold()
            yield np.array([
                float("woods" in text or "forest" in text or "deliberately" in text),
                float("habit" in text or "routine" in text),
                float("society" in text or "fly-wheel" in text),
                float("unmatchedzirconium" in text),
            ],dtype=np.float32)

class CrossStub:
    def rerank(self,q,documents):
        query=q.casefold()
        for line in documents:
            row=line.casefold()
            score=len(set(query.split()) & set(row.split()))
            if "forest" in query and "woods" in row and "deliberately" in row:score+=20
            if "society" in query and "fly-wheel" in row:score+=15
            yield float(score)

@unittest.skipUnless(np is not None and v06.np is not None,"Optional neural test runtime required")
class CrossEncoderContact(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root=Path(tmp.name)
        self.j=self.root/"James_Principles_Vol1.txt"
        self.t=self.root/"Thoreau_Walden.txt"
        self.j.write_text("The Principles of Psychology\n\n"
                          "Habit is thus the enormous fly-wheel of society.\n\n"
                          "Habit a second nature! Habit is ten times nature.\n",encoding="utf8")
        self.t.write_text("Walden\n\n"
                          "I went to the woods because I wished to live deliberately.\n\n"
                          "The mass of men lead lives of quiet desperation.\n",encoding="utf8")
        self.books=[self.j,self.t]
        self.dense=v06.Contact(self.books,DenseStub(),self.root/"contact")
        self.candidate=v07.CrossContact(self.dense,CrossStub(),self.root/"empty-cache")

    def test_pretrained_rerank_contract_with_local_stub(self):
        r=self.candidate.answer("Why did Thoreau retreat into the forest?",threshold=.2,rerank_gate=0)
        self.assertFalse(r["response"]["abstained"])
        self.assertEqual(r["response"]["citation"]["book"],self.t.name)
        self.assertEqual(r["response"]["citation"]["check"],"EXACT_ORIGINAL_BOOK_LINE_PASS")
        self.assertIn("wished to live deliberately",r["response"]["answer"])
        self.assertFalse(r["model_generated"])

    def test_real_book_drift_prevents_reranker(self):
        self.t.write_text(self.t.read_text(encoding="utf8")+"\nAltered.",encoding="utf8")
        with self.assertRaisesRegex(Exception,"ORIGINAL_BOOK_DRIFT"):
            self.candidate.answer("Thoreau forest",threshold=.2)

    def test_numerical_boundaries(self):
        with self.assertRaisesRegex(Exception,"INVALID_RERANK_POOL"):
            self.candidate.answer("habit society",top_pool=500)
        with self.assertRaisesRegex(Exception,"BAD_RERANK_GATES"):
            self.candidate.answer("habit society",threshold=9)

    def test_golden_source_cannot_become_authority(self):
        r=self.candidate.answer("James habit enormous fly-wheel society",threshold=.2)
        self.assertEqual(r["promotion"],"NOT_ALLOWED")
        self.assertEqual(r["cost"]["generative_llm_calls"],0)
        self.assertFalse(r["fine_tuned_in_JM"])

    def test_conflicting_book_author_guard(self):
        r=self.candidate.answer("Did James say he went to the woods to live deliberately?",threshold=.2)
        if not r["response"]["abstained"]:
            self.assertEqual(r["response"]["citation"]["book"],self.j.name)
        else:
            self.assertIn(r["response"]["reason"],(
                "EXPLICIT_AUTHOR_CONFLICT_GUARD","CROSS_ENCODER_EVIDENCE_GATE"))

if __name__=="__main__":unittest.main()
