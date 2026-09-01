#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("jmroutec", ROOT / "tools" / "jmroutec.py")
assert SPEC and SPEC.loader
jmroutec = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = jmroutec
SPEC.loader.exec_module(jmroutec)


class AuthorityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = ROOT / "source" / "routeos_kernel.jmroute"
        self.authority = jmroutec.parse(self.source)

    def test_source_is_authority(self) -> None:
        self.assertEqual(self.authority.laws["SOURCE_AUTHORITY"], "jm_native")
        self.assertEqual(
            self.authority.laws["PROOF_PARENT"],
            "54f67566036316b25515fb53fa98f06769d3850d",
        )

    def test_required_hard_body_offices_exist(self) -> None:
        names = {record.name for record in self.authority.records}
        self.assertTrue({
            "IGNITIONBODY", "MEMORYBODY", "ROUTESCHEDULER",
            "USER_BODY_1", "USER_BODY_2", "PERMISSIONGATE",
            "SERIALROUTE", "FAULTHOLD", "RECOVERYBODY",
        }.issubset(names))

    def test_hard_body_requirements_are_complete(self) -> None:
        self.assertEqual(len(self.authority.requirements), 7)
        self.assertIn("controlled_user_kernel_boundary", self.authority.requirements)
        self.assertIn("fault_capture_and_recovery", self.authority.requirements)

    def test_generated_outputs_are_current(self) -> None:
        subprocess.run([
            "python3", str(ROOT / "tools" / "jmroutec.py"), str(self.source),
            "--out-dir", str(ROOT / "generated"), "--check",
        ], check=True)

    def test_json_round_trip(self) -> None:
        data = json.loads((ROOT / "generated" / "routeos_authority.json").read_text())
        self.assertEqual(data["schema"], "JM_ROUTEOS_AUTHORITY_1")
        self.assertEqual(data["source_sha256"], self.authority.source_sha256)

    def test_duplicate_office_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "bad.jmroute"
            text = self.source.read_text() + "\nBODY IGNITIONBODY kind=duplicate\n"
            path.write_text(text)
            with self.assertRaises(jmroutec.SourceError):
                jmroutec.parse(path)


if __name__ == "__main__":
    unittest.main(verbosity=2)
