#!/usr/bin/env python3
"""CP11 headless contract: a native approval dialog, never a guessed tap, is proof.

Pure unittest with mocked *disposable emulator* UI. No device ADB is touched.
Runs in the original Fold Ultra offline CI test lane.
"""
import unittest
from unittest.mock import patch
import probe_home_lab as home

PAGE = [
    {"class": "android.widget.TextView", "text": "Device contact"},
    {"class": "android.widget.Button", "text": "Prepare OPPO handoff text"},
]
DIALOG = [
    {"class": "android.widget.TextView", "text": "Share a request-only template?"},
    {"class": "android.widget.Button", "text": "Cancel"},
]
OTHER = [
    {"class": "android.widget.TextView", "text": "Unrelated phone screen"},
]


class RequestDialogProofTest(unittest.TestCase):
    def exercise(self, sequence, label="guarded_test"):
        with patch.object(home, "dump", side_effect=sequence) as dump, \
             patch.object(home, "tap") as tap, \
             patch.object(home, "capture") as capture:
            home.request_dialog_with_verified_touch(
                "Prepare OPPO handoff text", label)
            return (dump.call_count, tap.call_count, capture.call_count)

    def test_first_touch_must_show_real_consent_dialog(self):
        self.assertEqual(self.exercise([PAGE, DIALOG]), (2, 1, 0))

    def test_one_swallowed_touch_allows_one_real_retry(self):
        self.assertEqual(self.exercise(
            [PAGE, PAGE, PAGE, DIALOG]), (4, 2, 1))

    def test_already_visible_dialog_requires_no_touch(self):
        self.assertEqual(self.exercise([DIALOG]), (1, 0, 0))

    def test_unrelated_screen_fails_before_any_touch(self):
        with patch.object(home, "dump", return_value=OTHER), \
             patch.object(home, "tap") as tap, \
             patch.object(home, "capture"):
            with self.assertRaisesRegex(AssertionError, "HOLD"):
                home.request_dialog_with_verified_touch(
                    "Prepare OPPO handoff text", "unexpected_screen")
            tap.assert_not_called()

    def test_two_swallowed_touches_cannot_be_claimed_pass(self):
        with patch.object(home, "dump", side_effect=[PAGE] * 4), \
             patch.object(home, "tap") as tap, \
             patch.object(home, "capture") as capture:
            with self.assertRaisesRegex(AssertionError, "HOLD"):
                home.request_dialog_with_verified_touch(
                    "Prepare OPPO handoff text", "blocked_dialog")
            self.assertEqual(tap.call_count, 2)
            self.assertEqual(capture.call_count, 2)


if __name__ == "__main__":
    unittest.main()
