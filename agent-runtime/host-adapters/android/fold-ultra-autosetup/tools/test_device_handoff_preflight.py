"""Security and portability tests for owner-carried Fold/OPPO/laptop contact."""
import importlib.util
import unittest
from pathlib import Path

PATH=Path(__file__).resolve().parents[1]/"home-lab/device_handoff_preflight.py"
SPEC=importlib.util.spec_from_file_location("jm_device_handoff_preflight",PATH)
bridge=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(bridge)
VALID=(
    b"JM.DeviceLink.Handoff/0.1\n"
    b"authority=REQUEST_ONLY\n"
    b"from=FOLD8\n"
    b"to=GROUNDZEROJM\n"
    b"request=OPEN_JM_ROOT\n"
    b"private_payload=NONE\n"
    b"paired=false\n"
    b"recipient_must_approve=true\n"
)

class PreflightTest(unittest.TestCase):
    def test_valid_is_still_untrusted(self):
        d=bridge.inspect(VALID)
        self.assertEqual(d["status"],"UNAUTHENTICATED_REQUEST_ONLY")
        self.assertFalse(d["paired"])
        self.assertFalse(d["remote_execution"])
        self.assertEqual(d["owner_receiver_consent"],"NOT_VERIFIED")
    def test_valid_oppo(self):
        d=bridge.inspect(VALID.replace(b"GROUNDZEROJM",b"OPPO"))
        self.assertEqual(d["to"],"OPPO")
    def test_invalid_cases_hold(self):
        variants=[
            b"",b"x"*1025, VALID.replace(b"REQUEST_ONLY",b"ADMIN"),
            VALID.replace(b"paired=false",b"paired=true"),
            VALID.replace(b"NONE",b"private_notes"),
            VALID.replace(b"recipient_must_approve=true",b"recipient_must_approve=false"),
            VALID.replace(b"FOLD8",b"OPPO").replace(b"GROUNDZEROJM",b"OPPO"),
            VALID.replace(b"OPEN_JM_ROOT",b"RUN_SHELL"),
            VALID.replace(b"authority=REQUEST_ONLY\n",b""),
            VALID.replace(b"authority=REQUEST_ONLY\n",b"authority=REQUEST_ONLY\nauthority=ADMIN\n"),
            VALID.replace(b"from=FOLD8\nto=",b"to=GROUNDZEROJM\nfrom=FOLD8\nto="),
            VALID.replace(b"FOLD8",b"FOLD8\nadmin=true"),
            VALID.replace(b"\n",b"\r\n"),
            VALID[:-1],
            VALID+b"extra=privileged\n",
            VALID.replace(b"FOLD8",b"FOLD\xff"),
        ]
        for i,payload in enumerate(variants):
            with self.subTest(i=i), self.assertRaises(bridge.Hold):
                bridge.inspect(payload)

if __name__=="__main__": unittest.main()
