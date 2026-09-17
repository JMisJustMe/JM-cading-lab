#!/usr/bin/env python3
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
WRAPPER_PATH = REPO / "coding-estate/everybody/full-stack/tools/open_sovereign_factory.py"
SPEC = importlib.util.spec_from_file_location("open_sovereign_factory", WRAPPER_PATH)
assert SPEC and SPEC.loader
WRAPPER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(WRAPPER)


class OpenSovereignFactoryTests(unittest.TestCase):
    def test_factory_loads_current_open_count(self) -> None:
        factory, census = WRAPPER.configure(REPO)
        bodies = factory.load_bodies(REPO)
        self.assertEqual(len(bodies), census["current_total"])
        self.assertGreaterEqual(len(bodies), 101)
        self.assertIn("jaggedmirror", {body["id"] for body in bodies})
        self.assertEqual(factory.EXPECTED_BODY_COUNT, census["current_total"])
        self.assertIn(WRAPPER.POST_REGISTRY, factory.REGISTRIES)

    def test_body_101_gets_full_stack_profile(self) -> None:
        factory, _ = WRAPPER.configure(REPO)
        jagged = next(body for body in factory.load_bodies(REPO) if body["id"] == "jaggedmirror")
        current = factory.profile(jagged)
        self.assertEqual(current["body"]["id"], "jaggedmirror")
        self.assertEqual(current["parity_state"]["P6_BODY_KERNEL_SOURCE"], "GENERATED_V0_1_NOT_MACHINE_DING")
        self.assertEqual(current["parity_state"]["P7_INDEPENDENT_MACHINE"], "OPEN")
        source = factory.fixture(current)
        self.assertIn("NATIVE jaggedmirror", source)
        self.assertIn("DING", source)


if __name__ == "__main__":
    unittest.main()
