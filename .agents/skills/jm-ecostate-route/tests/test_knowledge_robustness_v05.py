"""v0.5 guarded vs unmodified native v0.4 on two local full-file analogues."""
from pathlib import Path
import json,sys,tempfile,unittest
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_robustness_v05 as v05
import jm_knowledge_answer_eval as v04

class RobustnessContact(unittest.TestCase):
    def setUp(self):
        tmp=tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root=Path(tmp.name)
        self.james=self.root/"James_Principles_Vol1.txt"
        self.thoreau=self.root/"Thoreau_Walden.txt"
        self.james.write_text("THE PRINCIPLES OF PSYCHOLOGY\n"
            "Habit is thus the enormous fly-wheel of society.\n"
            "Habit a second nature! Habit is ten times nature.\n",encoding="utf8")
        self.thoreau.write_text("WALDEN\n"
            "I went to the woods because I wished to live deliberately.\n"
            "The mass of men lead lives of quiet desperation.\n",encoding="utf8")
        self.sources=[self.james,self.thoreau]
        self.fixture=json.loads((ROOT/"tests/fixtures/knowledge_v05_adversarial_gold.json").read_text(encoding="utf8"))

    def test_16_scenarios_have_real_source_replay_and_explicit_limit(self):
        result=v05.compare(self.sources,self.fixture)
        self.assertEqual(result["cases"],16)
        self.assertEqual(sum(x["cases"] for x in result["categories"].values()),16)
        self.assertTrue(result["gold_used_during_answer_generation"] is False)
        self.assertEqual(result["model_calls"],0)
        self.assertEqual(result["model_comparison"],"NOT_YET_RUN")
        self.assertFalse(result["model_generated"])
        self.assertEqual(result["baseline"]["citation_failures"],0)
        self.assertEqual(result["guarded"]["citation_failures"],0)
        self.assertGreaterEqual(result["guarded"]["correct"],result["baseline"]["correct"])
        self.assertGreaterEqual(result["gains"],1)

    def test_false_attribution_guard_works_without_gold(self):
        with tempfile.TemporaryDirectory() as tmp:
            baseline=v04.answer(self.sources,"Did Thoreau call habit the enormous fly-wheel of society?",tmp)
        guarded=v05.conservative(baseline,self.sources)
        self.assertFalse(baseline["response"]["abstained"])
        self.assertTrue(guarded["response"]["abstained"])
        self.assertEqual(guarded["response"]["reason"],"EXPLICIT_AUTHOR_CONFLICT_GUARD")
        self.assertEqual(guarded["author_guard"]["scope"],"ONE_EXPLICIT_FILENAME_AUTHOR_ONLY")

    def test_correct_citation_is_not_damaged(self):
        with tempfile.TemporaryDirectory() as tmp:
            baseline=v04.answer(self.sources,"James habit second nature ten times nature",tmp)
        r=v05.conservative(baseline,self.sources)
        self.assertFalse(r["response"]["abstained"])
        self.assertEqual(r["response"]["citation"]["book"],self.james.name)

    def test_unanswerable_abstention_preserved(self):
        with tempfile.TemporaryDirectory() as tmp:
            baseline=v04.answer(self.sources,"unconnectedzirconium computational memory",tmp)
        guarded=v05.conservative(baseline,self.sources)
        self.assertTrue(baseline["response"]["abstained"])
        self.assertTrue(guarded["response"]["abstained"])

    def test_gold_anchors_must_exist_in_originals(self):
        changed=json.loads(json.dumps(self.fixture))
        changed[0]["accepted_fragments"]=["this phrase does not exist in any original"]
        with self.assertRaisesRegex(Exception,"GOLD_ANCHOR_NOT_IN_ORIGINAL"):
            v05.compare(self.sources,changed)

    def test_tampered_book_refuses_source_citation(self):
        with tempfile.TemporaryDirectory() as tmp:
            first=v04.answer(self.sources,"James habit second nature ten times nature",tmp)
        quoted=first["response"]["answer"]
        self.james.write_text("The entire book was changed.",encoding="utf8")
        with self.assertRaises(Exception):
            v04.citation_check({
                "original_name":self.james.name,
                "original_sha256":first["response"]["citation"]["original_sha256"],
                "original_line":3,"quote_UNTRUSTED_DATA":quoted},self.sources)

    def test_same_name_collision_rejected(self):
        with self.assertRaisesRegex(Exception,"DUPLICATE_BOOK_NAME"):
            v05.validate_gold(self.fixture,[self.james,self.james])

    def test_mutating_a_gold_answer_does_not_change_generator(self):
        with tempfile.TemporaryDirectory() as tmp:
            a=v04.answer(self.sources,"James habit second nature ten times nature",tmp)
        modified=json.loads(json.dumps(self.fixture))
        modified[1]["accepted_fragments"]=["invented phrase"]
        b=v05.conservative(a,self.sources)
        self.assertEqual(b["response"]["answer"],a["response"]["answer"])
        with self.assertRaisesRegex(Exception,"GOLD_ANCHOR_NOT_IN_ORIGINAL"):
            v05.validate_gold(modified,self.sources)

if __name__=="__main__":unittest.main()
