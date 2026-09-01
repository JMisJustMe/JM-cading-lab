#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
MODULE_PATH = REPO / "coding-estate/everybody/sovereign-census/sovereign_census.py"
SPEC = importlib.util.spec_from_file_location("sovereign_census", MODULE_PATH)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class SovereignCensusTests(unittest.TestCase):
    def test_first_batch_is_preserved_and_count_is_open(self) -> None:
        census = MODULE.load_census(REPO)
        self.assertEqual(census["first_engineering_batch_count"], 100)
        self.assertGreaterEqual(census["current_total"], 101)
        self.assertEqual(census["status"], "OPEN_APPEND_ONLY_NOT_CROWNED")
        self.assertEqual(census["parity_floor"], "CADING_QUADZE_PLUS")

    def test_jaggedmirror_is_body_101(self) -> None:
        census = MODULE.load_census(REPO)
        body = next(item for item in census["bodies"] if item["id"] == "jaggedmirror")
        self.assertEqual(body["ordinal"], 101)
        self.assertEqual(body["sovereignty"], "confirmed")
        self.assertEqual(body["census_origin"], "POST_100_APPEND_ONLY")
        self.assertTrue(body["evidence"])
        self.assertEqual(body["parity_floor"], "CADING_QUADZE_PLUS")

    def test_ids_and_names_are_unique(self) -> None:
        census = MODULE.load_census(REPO)
        ids = [body["id"] for body in census["bodies"]]
        names = [MODULE.normalise_name(body["name"]) for body in census["bodies"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(len(names), len(set(names)))

    def test_output_is_deterministic_and_receipted(self) -> None:
        census_a = MODULE.load_census(REPO)
        census_b = MODULE.load_census(REPO)
        self.assertEqual(census_a["identity_digest_sha256"], census_b["identity_digest_sha256"])
        with tempfile.TemporaryDirectory() as first, tempfile.TemporaryDirectory() as second:
            out_a = Path(first)
            out_b = Path(second)
            MODULE.write_outputs(census_a, out_a)
            MODULE.write_outputs(census_b, out_b)
            for name in ("sovereign-census.json", "SOVEREIGN_CENSUS.md", "SHA256SUMS.txt"):
                self.assertEqual((out_a / name).read_bytes(), (out_b / name).read_bytes())
            payload = json.loads((out_a / "sovereign-census.json").read_text(encoding="utf-8"))
            self.assertEqual(payload["current_total"], census_a["current_total"])


if __name__ == "__main__":
    unittest.main()
