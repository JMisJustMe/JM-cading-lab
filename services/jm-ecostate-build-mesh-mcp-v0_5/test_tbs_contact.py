import unittest
from tbs_contact import assess_transition, KINDS
from server import HANDLERS, TOOLS

class TBSTests(unittest.TestCase):
    def setUp(self):
        self.base = dict(sourceId="jm:braidge", fromBody="A", toBody="B", kind="branch", traceId="trace:1",
                         sourceProof=dict(sourceId="jm:braidge", verified=True),
                         authority=dict(granted=True, sourceId="jm:braidge", fromBody="A", toBody="B", kind="branch", receiptId="receipt:1"))
    def test_plan_never_authorizes(self):
        for kind in KINDS:
            x = {**self.base, "kind": kind, "authority": {**self.base["authority"], "kind": kind}}
            result = assess_transition(x)
            self.assertEqual(result["state"], "PLAN_ONLY")
            self.assertIs(result["allowed"], False)
    def test_mcp_registration(self):
        self.assertIs(HANDLERS["assess_tbs_relationship"], assess_transition)
        schema = next(t for t in TOOLS if t["name"] == "assess_tbs_relationship")
        self.assertIs(schema["annotations"]["readOnlyHint"], True)
        self.assertIs(schema["annotations"]["destructiveHint"], False)
        self.assertIs(HANDLERS["assess_tbs_relationship"](self.base)["allowed"], False)
    def test_source_hold(self):
        self.assertEqual(assess_transition({**self.base, "sourceProof": None})["state"], "SOURCE_HOLD")
    def test_authority_hold(self):
        self.assertEqual(assess_transition({**self.base, "authority": None})["state"], "AUTHORITY_HOLD")
    def test_mismatched_authority(self):
        self.assertEqual(assess_transition({**self.base, "authority": {**self.base["authority"], "kind": "return"}})["state"], "AUTHORITY_HOLD")
    def test_self_link_invalid(self):
        self.assertEqual(assess_transition({**self.base, "toBody": "A"})["state"], "INVALID")
    def test_path_invalid(self):
        self.assertEqual(assess_transition({**self.base, "traceId": "../x"})["state"], "INVALID")
    def test_nonobject_invalid(self):
        self.assertEqual(assess_transition(None)["state"], "INVALID")
    def test_unknown_kind_invalid(self):
        self.assertEqual(assess_transition({**self.base, "kind": "merge"})["state"], "INVALID")

if __name__ == "__main__":
    unittest.main()
