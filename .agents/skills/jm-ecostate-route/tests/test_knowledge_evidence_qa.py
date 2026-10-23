"""Native JM historical evidence QA: expose both a gain and a regression."""
import json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
import jm_knowledge_intake as intake
import jm_knowledge_evidence_qa as qa

TASKS=[
 {"id":"J1","question":"habit","answerable":True,"source_filename":"A_James.md","gold_anchor":"enormous fly-wheel of society"},
 {"id":"J2","question":"habit","answerable":True,"source_filename":"A_James.md","gold_anchor":"habit is ten times nature"},
 {"id":"J3","question":"habit","answerable":True,"source_filename":"A_James.md","gold_anchor":"habit covers a very large part of life"},
 {"id":"T1","question":"habit","answerable":True,"source_filename":"B_Thoreau.md","gold_anchor":"daily life of routine and habit everywhere"},
 {"id":"T2","question":"woods wished live deliberately","answerable":True,"source_filename":"B_Thoreau.md","gold_anchor":"wished to live deliberately"},
 {"id":"N1","question":"zirconiumunmatched skyplane","answerable":False,"source_filename":None,"gold_anchor":None},
]

class EvidenceQuality(unittest.TestCase):
    def setUp(self):
        t=tempfile.TemporaryDirectory()
        self.addCleanup(t.cleanup)
        self.d=Path(t.name)
        self.a=self.d/"A_James.md"
        self.b=self.d/"B_Thoreau.md"
        self.a.write_text("# Habit\nHabit is thus the enormous fly-wheel of society.\n"
                          "Habit a second nature! Habit is ten times nature.\n"
                          "It thus appears that habit covers a very large part of life.\n",encoding="utf8")
        self.b.write_text("# Walden\nMen establish and confirm their daily life of routine and habit everywhere.\n"
                          "I went to the woods because I wished to live deliberately.\n",encoding="utf8")
        self.candidate=self.d/"candidate"
        self.sources=[self.a,self.b]
        intake.compile_sources(self.sources,self.candidate,"habit")

    def test_actual_original_replay_and_ablation(self):
        result=qa.evaluate(self.candidate,self.sources,TASKS)
        self.assertEqual(result["cases"],6)
        self.assertEqual((result["baseline_pass"],result["jm_pass"]),(5,5))
        self.assertEqual((result["gains"],result["regressions"]),(1,1))
        byid={r["case_id"]:r for r in result["results"]}
        self.assertEqual(byid["T1"]["change"],"GAIN")
        self.assertEqual(byid["J3"]["change"],"REGRESSION")
        self.assertEqual((byid["J3"]["baseline_hit"],byid["J3"]["jm_hit"]),(True,False))
        self.assertEqual((byid["N1"]["baseline_hit"],byid["N1"]["jm_hit"]),(True,True))
        self.assertFalse(result["model_weights_changed"])
        self.assertFalse(result["actual_natural_language_answers_tested"])
        self.assertFalse(result["auto_promote"])

    def test_change_original_fails_closed_before_ranking(self):
        self.a.write_text(self.a.read_text(encoding="utf8")+"\nFORGED",encoding="utf8")
        with self.assertRaises(Exception):
            qa.evaluate(self.candidate,self.sources,TASKS)

    def test_gold_is_validated_against_real_sources(self):
        bad=[dict(t) for t in TASKS]
        bad[1]["gold_anchor"]="unrecorded impossible historical passage"
        with self.assertRaisesRegex(Exception,"GOLD_ANCHOR_NOT_IN_ORIGINALS"):
            qa.evaluate(self.candidate,self.sources,bad)

    def test_no_unanswerable_gold_claim(self):
        bad=[dict(t) for t in TASKS]
        bad[-1]["gold_anchor"]="fake"
        with self.assertRaisesRegex(Exception,"NEGATIVE_GOLD_MUST_BE_NULL"):
            qa.evaluate(self.candidate,self.sources,bad)

    def test_duplicate_gold_ids_refused(self):
        bad=[dict(t) for t in TASKS]
        bad[1]["id"]=bad[0]["id"]
        with self.assertRaisesRegex(Exception,"DUPLICATE_OR_INVALID_GOLD_ID"):
            qa.evaluate(self.candidate,self.sources,bad)

    def test_receipt_readback_and_no_candidate_change(self):
        manifest=self.candidate/"SHA256_MANIFEST.json"
        prev=manifest.read_bytes()
        tasks=self.d/"GOLD.json"
        tasks.write_text(json.dumps(TASKS),encoding="utf8")
        receipt=self.d/"out.json"
        code=qa.main(["--candidate",str(self.candidate),"--source",str(self.a),
                      "--source",str(self.b),"--gold",str(tasks),"--receipt",str(receipt)])
        self.assertEqual(code,0)
        self.assertEqual(json.loads(receipt.read_text(encoding="utf8"))["baseline_pass"],5)
        self.assertEqual(manifest.read_bytes(),prev)

    def test_refuse_receipt_inside_candidate(self):
        tasks=self.d/"GOLD.json"
        tasks.write_text(json.dumps(TASKS),encoding="utf8")
        rc=qa.main(["--candidate",str(self.candidate),"--source",str(self.a),
                  "--source",str(self.b),"--gold",str(tasks),
                  "--receipt",str(self.candidate/"evidence"/"result.json")])
        self.assertEqual(rc,1)
        self.assertFalse((self.candidate/"evidence"/"result.json").exists())

if __name__=="__main__":unittest.main()
