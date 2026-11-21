#!/usr/bin/env python3
"""Ground-truth bounded Android emulator launcher obstruction discrimination."""
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import emulator_dialog as ed

def dialog(name):
    return [{"class":"android.widget.TextView","text":name},
            {"class":"android.widget.Button","text":"Wait"},
            {"class":"android.widget.Button","text":"Close app"}]

class LauncherObstructionContract(unittest.TestCase):
    def run_sequence(self,steps):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(ed,"OUT",Path(folder)),\
                 patch.object(ed,"require_emulator"),\
                 patch.object(ed,"xml",side_effect=steps),\
                 patch.object(ed,"tap_node") as tapped,\
                 patch.object(ed.time,"sleep"):
                final=ed.clear_overlay_and_read("check")
                receipts=Path(folder,"check_ENVIRONMENT.json")
                return final,tapped.call_count,json.loads(receipts.read_text()) if receipts.exists() else []

    def test_pixel_launcher_obstruction_has_bounded_receipt(self):
        result,count,events=self.run_sequence([
            dialog("Pixel Launcher isn't responding"),[{"text":"JM USB CONTACT"}]])
        self.assertEqual(count,1);self.assertEqual(result[0]["text"],"JM USB CONTACT")
        self.assertEqual(events[0]["obstruction"],"Pixel Launcher isn't responding")
        self.assertIs(events[0]["jm_execution_proven"],False)

    def test_quickstep_obstruction_has_bounded_receipt(self):
        result,count,events=self.run_sequence([
            dialog("Quickstep isn't responding"),[{"text":"JM USB CONTACT"}]])
        self.assertEqual(count,1);self.assertEqual(result[0]["text"],"JM USB CONTACT")
        self.assertEqual(events[0]["obstruction"],"Quickstep isn't responding")

    def test_unrecognised_app_crash_is_not_auto_cleared(self):
        result,count,events=self.run_sequence([dialog("JM Fold Ultra isn't responding")])
        self.assertEqual(count,0);self.assertEqual(events,[])
        self.assertEqual(result[0]["text"],"JM Fold Ultra isn't responding")

    def test_ambiguous_launcher_dialog_fails_closed(self):
        with patch.object(ed,"require_emulator"),patch.object(ed,"xml",return_value=
                 dialog("Quickstep isn't responding")+dialog("Pixel Launcher isn't responding")):
            with self.assertRaisesRegex(AssertionError,"Ambiguous"):
                ed.clear_overlay_and_read("ambiguous")

    def test_missing_single_wait_button_fails_closed(self):
        with patch.object(ed,"require_emulator"),patch.object(ed,"xml",return_value=
                 [{"text":"Quickstep isn't responding"},{"text":"Wait","class":"android.widget.Button"},
                  {"text":"Wait","class":"android.widget.Button"}]):
            with self.assertRaisesRegex(AssertionError,"cannot be cleared safely"):
                ed.clear_overlay_and_read("duplicates")

    def test_sustained_anr_remains_hold(self):
        with tempfile.TemporaryDirectory() as folder:
            with patch.object(ed,"OUT",Path(folder)),\
                 patch.object(ed,"require_emulator"),\
                 patch.object(ed,"xml",return_value=dialog("Quickstep isn't responding")) as seen,\
                 patch.object(ed,"tap_node") as tapped,\
                 patch.object(ed.time,"sleep"):
                with self.assertRaisesRegex(AssertionError,"after bounded retries"):
                    ed.clear_overlay_and_read("long")
                self.assertEqual(tapped.call_count,7)
                self.assertEqual(seen.call_count,7)
                self.assertEqual(len(json.loads(Path(folder,"long_ENVIRONMENT.json").read_text())),7)
if __name__=="__main__":unittest.main()
