"""Bounded non-Android contracts for the APP//COMMONS launcher adapter.

These tests prove pure classification and fail-closed dispatch only;
they do not assert an emulator UI run.
"""
import sys
import unittest
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import launcher_guard


def ui(*values):
    root = ET.Element("hierarchy")
    for value in values:
        ET.SubElement(root, "node", {"text": value})
    return root


class Classification(unittest.TestCase):
    def test_quickstep(self):
        self.assertEqual(launcher_guard.classify(ui("Quickstep isn't responding", "Wait")),
                         "LAUNCHER_OVERLAY")
    def test_pixel_launcher(self):
        self.assertEqual(launcher_guard.classify(ui("Pixel Launcher isn't responding", "Wait")),
                         "LAUNCHER_OVERLAY")
    def test_ambiguous_launchers(self):
        self.assertEqual(launcher_guard.classify(ui(
            "Quickstep isn't responding", "Pixel Launcher isn't responding")),
                         "HOLD_AMBIGUOUS_LAUNCHER")
    def test_app_anr(self):
        self.assertEqual(launcher_guard.classify(ui("APP//COMMONS isn't responding")),
                         "HOLD_APP_OR_UNKNOWN_ANR")
    def test_package_anr(self):
        self.assertEqual(launcher_guard.classify(ui(
            "com.jmisjustme.appcommons isn't responding")),
                         "HOLD_APP_OR_UNKNOWN_ANR")
    def test_unknown_anr(self):
        self.assertEqual(launcher_guard.classify(ui("Unknown component isn't responding")),
                         "HOLD_APP_OR_UNKNOWN_ANR")
    def test_alternative_anr_wording(self):
        self.assertEqual(launcher_guard.classify(ui("Quickstep is not responding")),
                         "HOLD_APP_OR_UNKNOWN_ANR")
    def test_editor_without_overlay(self):
        self.assertEqual(launcher_guard.classify(ui("APP//COMMONS", "EditText")),
                         "NO_LAUNCHER_OVERLAY")
    def test_pending_without_overlay(self):
        self.assertEqual(launcher_guard.classify(ui("Android is starting")),
                         "NO_LAUNCHER_OVERLAY")
    def test_unknown_anr_blocks_resolution_without_adb(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(RuntimeError, "HOLD_APP_OR_UNKNOWN_ANR"):
                launcher_guard.resolve(ui("JM Workroom isn't responding"), tmp)
    def test_clear_screen_does_not_invoke_donor(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertFalse(launcher_guard.resolve(ui("APP//COMMONS"), tmp))


if __name__ == "__main__":
    unittest.main()
