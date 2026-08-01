#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARTS = [ROOT / f"app.part{i}.txt" for i in range(1, 4)]


def fnv32(text: str) -> str:
    value = 2166136261
    for char in text:
        value ^= ord(char)
        value = (value * 16777619) & 0xFFFFFFFF
    return f"{value:08x}"


def normalized_name(value: str) -> str:
    """Compare identity text without erasing the displayed typography."""
    return value.replace("‑", "-").replace("–", "-").replace("—", "-")


class GameForgeSovereignRebuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.index = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.style = (ROOT / "style.css").read_text(encoding="utf-8")
        cls.loader = (ROOT / "app-loader.js").read_text(encoding="utf-8")
        cls.app = "".join(path.read_text(encoding="utf-8") for path in PARTS)
        cls.manifest = json.loads((ROOT / "SOURCE_LINEAGE_AND_BUILD_MANIFEST.json").read_text(encoding="utf-8"))

    def test_ordered_source_and_javascript_syntax(self) -> None:
        self.assertTrue(all(path.is_file() for path in PARTS))
        self.assertIn("app.part1.txt", self.loader)
        self.assertIn("app.part3.txt", self.loader)
        self.assertTrue(self.app.lstrip().startswith("(()=>{"))
        self.assertTrue(self.app.rstrip().endswith("})();"))
        with tempfile.NamedTemporaryFile("w", suffix=".js", encoding="utf-8", delete=False) as handle:
            handle.write(self.app)
            path = Path(handle.name)
        try:
            result = subprocess.run(["node", "--check", str(path)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        finally:
            path.unlink(missing_ok=True)

    def test_game_body_and_coding_body_shelves(self) -> None:
        self.assertEqual(len(self.manifest["gameBodies"]), 7)
        self.assertEqual(len(self.manifest["codingBodies"]), 6)
        normalized_app = normalized_name(self.app)
        for name in self.manifest["gameBodies"] + self.manifest["codingBodies"]:
            self.assertIn(normalized_name(name), normalized_app)
        self.assertIn("T‑Boys", self.app)
        self.assertIn("Dragon Mirror", self.app)
        self.assertIn("Blank Forge Body", self.app)

    def test_build_graph_and_cartridge_contract(self) -> None:
        for marker in [
            "function buildGraph", "GAME BODY", "INPUT LOOP", "PLAY LOOP", "CONSEQUENCE",
            "CODING BODY", "TARGET", "jm.gameforge-cartridge/0.1", "scene.bodyIdentity=graph.identity",
            "Export Cartridge", "Export Playable",
        ]:
            self.assertIn(marker, self.app + self.index)

    def test_deterministic_hash_excludes_clock(self) -> None:
        self.assertIn("core.cartridgeHash=hash(JSON.stringify({project:core.project", self.app)
        hash_expression = self.app.split("core.cartridgeHash=", 1)[1].split(";compiled=core", 1)[0]
        self.assertNotIn("builtAt", hash_expression)
        self.assertIn("function seeded", self.app)

    def test_identity_preservation_difference_law(self) -> None:
        body_id = "tboys"
        law = "Different role bodies meet inside one fight without becoming interchangeable."
        entities = ["Jax", "Theo", "Mirror", "Rival"]
        identity_a = fnv32("|".join([body_id, law, *entities]))
        identity_b = fnv32("|".join([body_id, law, *entities]))
        route_glyphplay = fnv32("|".join(["Aim‑Drag", "Collision", "Pressure", "GlyphPlay", "32"]))
        route_cading = fnv32("|".join(["Aim‑Drag", "Collision", "Pressure", "Cading", "32"]))
        self.assertEqual(identity_a, identity_b)
        self.assertNotEqual(route_glyphplay, route_cading)
        self.assertIn("idBefore===idAfter&&routeBefore!==routeAfter", self.app)

    def test_visible_runtime_movement_and_recovery(self) -> None:
        for marker in [
            "source.kind==='player'?{...source,x:state.runtime.player.x,y:state.runtime.player.y}",
            "PermissionGate rejected blocked movement", "RecoveryBody restored the cartridge baseline",
            "testBackup", "GAMEFORGE DING",
        ]:
            self.assertIn(marker, self.app)

    def test_self_contained_playable_export(self) -> None:
        self.assertIn("function playableDocument", self.app)
        self.assertIn("const C=${data}", self.app)
        self.assertIn("Standalone playable exported", self.app)
        self.assertNotIn("document.documentElement.outerHTML.replace", self.app)

    def test_phone_laptop_and_no_remote_dependency(self) -> None:
        combined = self.index + self.style + self.loader + self.app + (ROOT / "README.md").read_text(encoding="utf-8")
        for marker in ["viewport-fit=cover", "@media(max-width:1050px)", "@media(max-width:560px)", "2.5D", "phone", "laptop"]:
            self.assertIn(marker, combined)
        self.assertNotRegex(self.index + self.style + self.loader + self.app, r"https?://")

    def test_manifest_boundary_and_donor(self) -> None:
        self.assertEqual(self.manifest["status"], "FIRST_SOVEREIGN_FORGE_FLOOR_BUILD_NOT_FINAL_CROWN")
        self.assertEqual(len(self.manifest["donors"]), 1)
        donor = self.manifest["donors"][0]
        self.assertEqual(donor["file"], "02_GAME_ENGINE__GAMEFORGE__Multi_Game_Arcade.html")
        self.assertTrue(re.fullmatch(r"[0-9a-f]{64}", donor["sha256"]))
        self.assertIn("not final native target emitters", self.manifest["claimBoundary"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
