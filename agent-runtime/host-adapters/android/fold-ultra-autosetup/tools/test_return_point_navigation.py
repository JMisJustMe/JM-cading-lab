#!/usr/bin/env python3
"""JM Return Point CP12 proof guard — pure headless unittest, no ADB/phones."""
import unittest
from unittest.mock import patch
import audit_ui_flow as audit

SESSION=[
    {"class":"android.widget.TextView","text":"JM / SESSION CONTACT · 0.8"},
    {"class":"android.widget.Button","text":"Capture or recover a JM Return Point"},
]
ROOM=[
    {"class":"android.widget.TextView","text":"JM / RETURN POINT"},
    {"class":"android.widget.Button","text":"RETURN → new revision"},
]
OTHER=[
    {"class":"android.widget.TextView","text":"Unrelated screen"},
]

class ReturnPointNavigationContract(unittest.TestCase):
    def exercise(self,sequence):
        previous_len=len(audit.RECEIPTS)
        try:
            with patch.object(audit,"dump",side_effect=sequence) as dump, \
                 patch.object(audit,"tap") as tap, \
                 patch.object(audit,"capture") as capture:
                audit.navigate_once_with_verified_room(
                    "Capture or recover a JM Return Point",
                    "JM / RETURN POINT","JM / SESSION CONTACT","unit_case")
                return dump.call_count,tap.call_count,capture.call_count
        finally:
            del audit.RECEIPTS[previous_len:]

    def test_first_touch_opens_actual_return_room(self):
        self.assertEqual(self.exercise([SESSION,ROOM]),(2,1,0))

    def test_first_touch_swallowed_then_bounded_retry(self):
        self.assertEqual(self.exercise([SESSION,SESSION,SESSION,ROOM]),(4,2,1))

    def test_already_visible_room_requires_no_touch(self):
        self.assertEqual(self.exercise([ROOM]),(1,0,0))

    def test_wrong_screen_never_touched(self):
        with patch.object(audit,"dump",return_value=OTHER), \
             patch.object(audit,"tap") as tap, \
             patch.object(audit,"capture"):
            with self.assertRaisesRegex(AssertionError,"HOLD"):
                audit.navigate_once_with_verified_room(
                    "Capture or recover a JM Return Point",
                    "JM / RETURN POINT","JM / SESSION CONTACT","wrong_page")
            tap.assert_not_called()

    def test_second_failed_touch_must_remain_hold(self):
        with patch.object(audit,"dump",side_effect=[SESSION]*4), \
             patch.object(audit,"tap") as tap, \
             patch.object(audit,"capture") as capture:
            with self.assertRaisesRegex(AssertionError,"HOLD"):
                audit.navigate_once_with_verified_room(
                    "Capture or recover a JM Return Point",
                    "JM / RETURN POINT","JM / SESSION CONTACT","blocked_page")
            self.assertEqual(tap.call_count,2)
            self.assertEqual(capture.call_count,2)

if __name__=="__main__":
    unittest.main()
