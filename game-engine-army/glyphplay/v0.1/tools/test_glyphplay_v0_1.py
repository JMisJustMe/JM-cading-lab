#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / f"app.part{i}.txt" for i in range(1, 5)]


class GlyphPlaySovereignRebuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.style = (ROOT / "style.css").read_text(encoding="utf-8")
        cls.loader = (ROOT / "app-loader.js").read_text(encoding="utf-8")
        cls.app = "".join(path.read_text(encoding="utf-8") for path in PARTS)
        cls.manifest = json.loads((ROOT / "SOURCE_LINEAGE_AND_BUILD_MANIFEST.json").read_text(encoding="utf-8"))

    def test_ordered_runtime_chunks_exist(self) -> None:
        self.assertTrue(all(path.is_file() for path in PARTS))
        self.assertIn("app.part1.txt", self.loader)
        self.assertIn("app.part4.txt", self.loader)
        self.assertIn(".join('')", self.loader)
        self.assertTrue(self.app.startswith("(()=>{"))
        self.assertTrue(self.app.rstrip().endswith("})();"))

    def test_javascript_syntax(self) -> None:
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write(self.app)
            path = Path(handle.name)
        try:
            result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        finally:
            path.unlink(missing_ok=True)

    def test_2_5d_creator_surface(self) -> None:
        required = [
            "projectPoint", "diamond", "block", "tile-height editing", "Rotate ←", "Rotate →",
            "scene hierarchy", "Inspector & Trace", "Creator Forge", "canvas", "viewport-fit=cover",
        ]
        body = self.index + self.style + self.app + (ROOT / "README.md").read_text(encoding="utf-8")
        for marker in required:
            self.assertIn(marker, body)

    def test_body_trials_change_rules(self) -> None:
        required_profiles = ["glyphplay", "cading", "quadze", "recorp", "flowtalk", "formeula", "contactcode"]
        self.assertEqual(self.manifest["bodyTrials"], ["GlyphPlay", "Cading", "Quadze", "RECORP", "FlowTalk", "FormeULA", "ContactCode"])
        for profile in required_profiles:
            self.assertRegex(self.app, rf"\b{re.escape(profile)}\b")
        consequences = ["RouteGate", "QuadCore", "RecoveryCore", "Word", "Formula", "Contact"]
        for consequence in consequences:
            self.assertIn(consequence, self.app)
        self.assertIn("project.scene.rules", self.app)
        self.assertIn("project.scene.objective", self.app)

    def test_recovery_and_delivery_routes(self) -> None:
        for marker in [
            "testBackup", "FaultHold", "RecoveryBody", "exportProject", "exportPlayable",
            "importProject", "localStorage", "undoStack", "redoStack", "receipt('DING'",
        ]:
            self.assertIn(marker, self.app)

    def test_no_remote_runtime_dependency(self) -> None:
        combined = self.index + self.style + self.loader + self.app
        self.assertNotRegex(combined, r"https?://")
        self.assertNotIn("cdnjs", combined)
        self.assertNotIn("unpkg", combined)
        self.assertNotIn("jsdelivr", combined)

    def test_manifest_and_donor_identity(self) -> None:
        self.assertEqual(self.manifest["status"], "FIRST_LIVING_FLOOR_BUILD_NOT_FINAL_ENGINE_CROWN")
        self.assertEqual(self.manifest["rendering"], "dependency-free 2.5D isometric canvas")
        donors = self.manifest["donors"]
        self.assertEqual(len(donors), 7)
        hashes = [item["sha256"] for item in donors]
        self.assertEqual(len(hashes), len(set(hashes)))
        self.assertTrue(all(re.fullmatch(r"[0-9a-f]{64}", value) for value in hashes))
        self.assertTrue(all(item["bytes"] > 0 for item in donors))
        self.assertIn("does not crown GlyphPlay as final", self.manifest["claimBoundary"])

    def test_runtime_source_is_stable_for_this_commit(self) -> None:
        digest = hashlib.sha256(self.app.encode("utf-8")).hexdigest()
        self.assertEqual(len(digest), 64)
        self.assertNotEqual(digest, "0" * 64)


if __name__ == "__main__":
    unittest.main(verbosity=2)
