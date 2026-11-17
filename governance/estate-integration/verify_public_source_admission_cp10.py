#!/usr/bin/env python3
"""JM CP10 — source-admission check for NEW files entering a PUBLIC Git repo.

Independent of Pages staging. Existing tracked files are unchanged. This path
gate is not secret-scanning, repository privacy, or permission to delete files.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

SCHEMA = "JM.PublicSourceAdmission/CP10"
SENSITIVE_COMPONENTS = frozenset({
    "family-gifts", "private-secrets", "private-keys",
    ".ssh", ".aws", "credentials", "secrets",
})
SENSITIVE_BASENAMES = frozenset({
    ".env", ".env.local", ".env.production", ".npmrc", ".pypirc", ".netrc",
    "id_rsa", "id_ed25519", "credentials.json", "service-account.json",
})
SENSITIVE_SUFFIXES = (".pem", ".p12", ".pfx", ".pkcs12", ".key")


def reason(path: str) -> str | None:
    components = [s.lower() for s in Path(path).parts]
    if any(part in SENSITIVE_COMPONENTS for part in components):
        return "sensitive_path_component"
    name = components[-1] if components else ""
    if name in SENSITIVE_BASENAMES or name.startswith(".env."):
        return "credential_like_filename"
    if name.endswith(SENSITIVE_SUFFIXES):
        return "credential_like_extension"
    return None


def inspect_added_paths(paths: list[str]) -> dict:
    blocked = [{"path": p, "reason": reason(p)} for p in paths if reason(p)]
    return {
        "schema": SCHEMA,
        "status": "STATIC_SOURCE_ADMISSION_PASS" if not blocked else "HOLD",
        "new_paths_checked": len(paths),
        "blocked": blocked,
        "scope": "New paths from two Git commits only; does not scan file contents, historic public files, or external source custody.",
    }


def added_files(root: Path, base: str, head: str) -> list[str]:
    for sha in (base, head):
        if not re.fullmatch(r"[0-9a-fA-F]{40}", sha):
            raise ValueError("Expected full 40-character commit SHA")
    run = subprocess.run(
        ["git", "-C", str(root), "diff", "--name-only", "-z", "--no-renames",
         "--diff-filter=A", base, head, "--"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=40, check=True,
    )
    paths = [p.decode("utf-8", errors="replace") for p in run.stdout.split(b"\0") if p]
    if len(paths) > 50000:
        raise ValueError("Change set exceeds bounded path budget")
    return paths


class SourceAdmissionTests(unittest.TestCase):
    def test_public_workflow_allowed(self):
        self.assertEqual(inspect_added_paths([".github/workflows/new-guard.yml"])["status"], "STATIC_SOURCE_ADMISSION_PASS")
    def test_known_site_addition_allowed(self):
        self.assertEqual(inspect_added_paths(["games-beyond/legitimate-new-demo/index.html"])["status"], "STATIC_SOURCE_ADMISSION_PASS")
    def test_new_family_gifts_blocked(self):
        self.assertEqual(inspect_added_paths(["family-gifts/new-original/index.html"])["status"], "HOLD")
    def test_nested_family_gifts_blocked(self):
        self.assertEqual(inspect_added_paths(["assets/family-gifts/child.txt"])["status"], "HOLD")
    def test_dot_env_blocked(self):
        self.assertEqual(inspect_added_paths(["apps/.env.production"])["status"], "HOLD")
    def test_keys_blocked(self):
        self.assertEqual(inspect_added_paths(["keys/server.pem"])["status"], "HOLD")
    def test_public_code_with_token_in_name_not_false_positive(self):
        self.assertEqual(inspect_added_paths(["coding-estate/tokenizer.js"])["status"], "STATIC_SOURCE_ADMISSION_PASS")
    def test_existing_files_not_automatically_classified(self):
        self.assertEqual(inspect_added_paths([])["status"], "STATIC_SOURCE_ADMISSION_PASS")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base")
    p.add_argument("--head")
    p.add_argument("--root", type=Path, default=Path("."))
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        r = unittest.TextTestRunner(verbosity=2).run(
            unittest.defaultTestLoader.loadTestsFromTestCase(SourceAdmissionTests)
        )
        return 0 if r.wasSuccessful() else 1
    if not (args.base and args.head):
        p.error("--base and --head are required")
    report = inspect_added_paths(added_files(args.root, args.base, args.head))
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "STATIC_SOURCE_ADMISSION_PASS" else 1

if __name__ == "__main__":
    raise SystemExit(main())
