#!/usr/bin/env python3
"""CP13 static contract for existing JM Home Lab phone-to-GitHub entrances.

This verifies source wiring only, not physical phone touch or GitHub authentication.
No Android SDK, ADB, token, network or other device is touched by this test.
"""
import re
import unittest
from pathlib import Path

SOURCE=(Path(__file__).resolve().parent.parent/"app/src/main/java/"
        "com/jmisjustme/foldultra/launcher/LauncherLabActivity.java")
CANDIDATE=SOURCE.read_text(encoding="utf-8")


class GitHubOwnerControlSourceContract(unittest.TestCase):
    def test_reuses_original_home_lab_identity(self):
        self.assertIn("public final class LauncherLabActivity extends Activity",CANDIDATE)
        self.assertIn("com.jmisjustme.foldultra.launcher",CANDIDATE)

    def test_current_and_verified_run_doors_are_owner_tapped(self):
        self.assertIn('button("JM HEADLESS · Open current checks",()->openGitHubChecks(false))',
                      CANDIDATE)
        self.assertIn('button("Open last verified CI run",()->openGitHubChecks(true))',
                      CANDIDATE)

    def test_browser_uses_github_owner_domain_and_known_paths(self):
        self.assertIn('final String base="https://github.com/JMisJustMe/JM-cading-lab"',CANDIDATE)
        self.assertIn('"/actions/runs/42280236211"',CANDIDATE)
        self.assertIn('"/pull/782/checks"',CANDIDATE)
        self.assertIn("startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(base+route)))",
                      CANDIDATE)

    def test_rejected_wake_timer_was_not_carried_into_new_ui(self):
        self.assertNotIn("FLAG_KEEP_SCREEN_ON",CANDIDATE)
        self.assertNotIn("JM ON MODE",CANDIDATE)
        self.assertNotIn("toggleForegroundOnMode",CANDIDATE)
        self.assertNotIn("60 minutes",CANDIDATE)

    def test_no_embedded_credentials_or_silent_action_dispatch(self):
        self.assertNotIn("Authorization",CANDIDATE)
        self.assertNotIn("ghp_",CANDIDATE)
        self.assertNotIn("github_pat_",CANDIDATE)
        self.assertNotIn("HttpURLConnection",CANDIDATE)
        self.assertNotIn("workflow_dispatch",CANDIDATE)
        self.assertIn("owner-tapped",CANDIDATE)

    def test_only_retired_timer_preference_is_cleared(self):
        self.assertIn('prefs.edit().remove("owner.onmode.foreground_until_ms").apply()',
                      CANDIDATE)
        self.assertNotIn('prefs.edit().clear()',CANDIDATE)


if __name__=="__main__":
    unittest.main()
