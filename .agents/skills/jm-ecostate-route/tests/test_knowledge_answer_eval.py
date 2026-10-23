"""Scoped v0.4 canonical-book extractive answers, independent gold, and tamper gates."""
from pathlib import Path
import json,sys,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_answer_eval as v04
import jm_knowledge_assurance as assurance

class AnswerContact(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.d=Path(t.name)
        self.a=self.d/"A_James.txt"
        self.b=self.d/"B_Thoreau.txt"
        self.a.write_text("THE PRINCIPLES OF PSYCHOLOGY\nHabit is thus the enormous fly-wheel of society.\n"
                          "Habit a second nature! Habit is ten times nature.\n",encoding="utf8")
        self.b.write_text("WALDEN\nI went to the woods because I wished to live deliberately.\n"
                          "The mass of men lead lives of quiet desperation.\n",encoding="utf8")
        self.books=[self.a,self.b]
        self.gold=[
            {"id":"J1","question":"habit enormous fly wheel society","answerable":True,
             "accepted_fragments":["enormous fly-wheel of society"],"original_book":"A_James.txt"},
            {"id":"T1","question":"woods wished live deliberately","answerable":True,
             "accepted_fragments":["wished to live deliberately"],"original_book":"B_Thoreau.txt"},
            {"id":"N1","question":"zirconiumunmatched photonophone","answerable":False,
             "accepted_fragments":[],"original_book":None},
        ]

    def test_real_answer_citations_abstention_and_file_write(self):
        out=self.d/"results"
        report=v04.run(self.books,self.gold,out)
        self.assertEqual(report["cases"],3)
        self.assertEqual(report["correct"],3)
        self.assertEqual(report["abstentions"],1)
        self.assertEqual(report["citation_integrity_failures"],0)
        self.assertEqual(report["total_model_calls"],0)
        self.assertFalse(report["model_generated"])
        saved=json.loads((out/"ANSWER_EVALUATION.json").read_text(encoding="utf8"))
        self.assertEqual(saved["report"],report)
        self.assertEqual(saved["answers"][0]["response"]["citation"]["check"],
                         "EXACT_ORIGINAL_BOOK_LINE_PASS")
        self.assertEqual(saved["answers"][0]["response"]["citation"]["line"],2)
        self.assertFalse(saved["answers"][0]["model_generated"])

    def test_wrong_gold_reports_failure_without_changing_answer(self):
        wrong=[dict(t) for t in self.gold]
        wrong[0]["accepted_fragments"]=["not in the original"]
        report=v04.run(self.books,wrong,self.d/"wrong")
        self.assertEqual(report["correct"],2)
        self.assertEqual(report["wrong"],1)
        self.assertEqual(report["results"][0]["reason"],"WRONG_OR_UNSUPPORTED_ANSWER")

    def test_modified_book_invalidates_citation(self):
        with tempfile.TemporaryDirectory() as work:
            a=v04.answer(self.books,"habit enormous fly wheel society",work)
        self.a.write_text(self.a.read_text(encoding="utf8").replace("fly-wheel","flywheel"),encoding="utf8")
        with self.assertRaisesRegex(Exception,"WRONG_BOOK_OR_ORIGINAL_HASH"):
            v04.citation_check({"original_name":"A_James.txt",
                                "original_sha256":a["response"]["citation"]["original_sha256"],
                                "original_line":2,"quote_UNTRUSTED_DATA":"Habit is thus the enormous fly-wheel of society."},
                               self.books)

    def test_incorrect_quote_line_fails(self):
        fake={"original_name":"A_James.txt","original_sha256":v04.sha(self.a.read_bytes()),
              "original_line":3,"quote_UNTRUSTED_DATA":"Habit is thus the enormous fly-wheel of society."}
        with self.assertRaisesRegex(Exception,"QUOTE_NOT_IN_ORIGINAL_LINE"):
            v04.citation_check(fake,self.books)

    def test_destination_protection(self):
        out=self.d/"results";out.mkdir()
        anchor=out/"protect.txt";anchor.write_text("KEEP",encoding="utf8")
        with self.assertRaisesRegex(Exception,"OUTPUT_EXISTS"):
            v04.run(self.books,self.gold,out)
        self.assertEqual(anchor.read_text(encoding="utf8"),"KEEP")

    def test_retrieval_words_no_match_abstain(self):
        with tempfile.TemporaryDirectory() as work:
            r=v04.answer(self.books,"zirconiumunmatched photonophone",work)
        self.assertTrue(r["response"]["abstained"])
        self.assertIsNone(r["response"]["citation"])

    def test_no_model_or_authority_claim(self):
        with tempfile.TemporaryDirectory() as work:
            r=v04.answer(self.books,"habit enormous fly wheel society",work)
        self.assertEqual(r["promotion"],"NOT_ALLOWED")
        self.assertFalse(r["model_generated"])
        self.assertFalse(r["model_weights_changed"])
        self.assertEqual(r["cost"]["local_llm_calls"],0)
        self.assertEqual(r["contact"]["canonical_python_query_replay"],"PASS")

if __name__=="__main__":unittest.main()
