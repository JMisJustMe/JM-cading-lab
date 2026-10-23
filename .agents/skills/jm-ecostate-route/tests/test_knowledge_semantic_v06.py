"""Synthetic native contacts; no neural download required for these unit tests."""
import json,sys,tempfile,unittest
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_semantic_v06 as v06
import jm_knowledge_assurance as assurance

class ToyEmbed:
    """Deterministic fixture only; not represented as real neural contact."""
    def embed(self,rows):
        for row in rows:
            text=row.casefold()
            yield np.array([
                float("woods" in text or "forest" in text or "deliberately" in text),
                float("habit" in text or "routine" in text),
                float("fly-wheel" in text or "society" in text),
                float("unknownzirconium" in text),
            ],dtype=np.float32)

class NativeSemanticContact(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.root=Path(t.name)
        self.a=self.root/"James_Principles_Vol1.txt"
        self.b=self.root/"Thoreau_Walden.txt"
        self.a.write_text("The Principles of Psychology\n\n"
            "Habit is thus the enormous fly-wheel of society.\n\n"
            "Habit a second nature! Habit is ten times nature.\n",encoding="utf8")
        self.b.write_text("Walden\n\n"
            "I went to the woods because I wished to live deliberately.\n\n"
            "The mass of men lead lives of quiet desperation.\n",encoding="utf8")
        self.sources=[self.a,self.b]

    def test_real_jm_source_replay_and_grounded_semantic_candidate(self):
        c=v06.Contact(self.sources,ToyEmbed(),self.root/"cache")
        r=c.answer("Why did Thoreau retreat into the forest?",threshold=.38)
        self.assertFalse(r["response"]["abstained"])
        self.assertEqual(r["response"]["citation"]["book"],self.b.name)
        self.assertEqual(r["response"]["citation"]["check"],"EXACT_ORIGINAL_BOOK_LINE_PASS")
        self.assertTrue(r["pretrained_embedding_model_used"])
        self.assertFalse(r["model_generated"])
        self.assertFalse(r["model_fine_tuned_in_JM"])

    def test_modified_original_fails_closed(self):
        c=v06.Contact(self.sources,ToyEmbed(),self.root/"cache")
        self.b.write_text(self.b.read_text(encoding="utf8")+"CORRUPTION",encoding="utf8")
        with self.assertRaisesRegex(Exception,"ORIGINAL_BOOK_DRIFT"):
            c.answer("Thoreau woods deliberately",threshold=.38)

    def test_false_author_guard_rejects(self):
        c=v06.Contact(self.sources,ToyEmbed(),self.root/"cache")
        r=c.answer("Did Thoreau call habit the enormous fly-wheel of society?",threshold=.2)
        if not r["response"]["abstained"]:
            self.assertEqual(r["response"]["citation"]["book"],self.b.name)
        else:
            self.assertIn(r["response"]["reason"],
                          ("EXPLICIT_AUTHOR_CONFLICT_GUARD","SEMANTIC_EVIDENCE_BELOW_THRESHOLD"))

    def test_no_authority_promotion(self):
        c=v06.Contact(self.sources,ToyEmbed(),self.root/"cache")
        r=c.answer("habit enormous fly-wheel society",threshold=.2)
        self.assertEqual(r["promotion"],"NOT_ALLOWED")
        self.assertEqual(r["cost"]["generative_model_calls"],0)
        self.assertIsNone(r["model_sha256"]) # mock fixture has no downloaded ONNX
        self.assertTrue(r["index_sha256"])

    def test_bounded_book_identity_and_line(self):
        rows=v06.texts_and_lines(self.sources)
        assert rows
        self.assertTrue(all(p["book"] in [x.name for x in self.sources] for p in rows))
        self.assertTrue(any("enormous fly-wheel" in p["text"] for p in rows))
        self.assertGreaterEqual(len(rows),3)

if __name__=="__main__":unittest.main()
