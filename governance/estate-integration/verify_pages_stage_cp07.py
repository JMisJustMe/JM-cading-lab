#!/usr/bin/env python3
"""JM Pages CP07: fail-closed published-artifact scope gate (no source mutation)."""
from __future__ import annotations

import argparse
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

SCHEMA = "JM.GitHubPagesPublicationScope/CP07"
MAX_STAGE_BYTES = 900_000_000
REQUIRED_ROUTES = (
    "index.html",
    "access/index.html",
    "games-beyond/index.html",
    "coding-estate/workshop/index.html",
    "api-hub/index.html",
    "estate-publication/apps-tools-games/apps-tools/jmisjustme-github-pages-v1.15.0/site/index.html",
)
BLOCKED_COMPONENTS = frozenset({".git", ".github", "family-gifts", "_public_site", "__pycache__",
                                ".ssh", ".aws", "secrets", "credentials", "private-keys",
                                "private-secrets"})
BLOCKED_BASENAMES = frozenset({
    ".env", ".npmrc", ".pypirc", ".netrc", "id_rsa", "id_ed25519",
    "credentials.json", "service-account.json",
})
BLOCKED_SUFFIXES = (".pem", ".p12", ".pfx", ".pkcs12", ".key")


def audit(stage: Path, max_bytes: int = MAX_STAGE_BYTES) -> dict:
    """Inspect *staged* files. Validates paths only; doesn't certify file content."""
    stage = stage.resolve()
    failures: list[str] = []
    if not stage.is_dir():
        return {"schema": SCHEMA, "status": "HOLD", "failures": ["stage_missing"]}
    files: list[tuple[str, int]] = []
    for path in sorted(stage.rglob("*")):
        relative = path.relative_to(stage).as_posix()
        parts = tuple(piece.lower() for piece in path.relative_to(stage).parts)
        if path.is_symlink():
            failures.append("symlink:" + relative)
            continue
        if any(piece in BLOCKED_COMPONENTS for piece in parts):
            failures.append("blocked_component:" + relative)
        if path.is_dir():
            continue
        if not path.is_file():
            failures.append("not_regular_file:" + relative)
            continue
        lower = path.name.lower()
        if lower in BLOCKED_BASENAMES or lower.startswith(".env.") or lower.endswith(BLOCKED_SUFFIXES):
            failures.append("credential_like_filename:" + relative)
        files.append((relative, path.stat().st_size))
    names = {path for path, _ in files}
    for required in REQUIRED_ROUTES:
        if required not in names:
            failures.append("required_public_route_missing:" + required)
    total_bytes = sum(size for _, size in files)
    if total_bytes > max_bytes:
        failures.append("stage_over_budget")
    manifest = hashlib.sha256(
        "".join(f"{name}\t{size}\n" for name, size in files).encode("utf-8")
    ).hexdigest()
    return {
        "schema": SCHEMA,
        "status": "STATIC_PREDEPLOY_PASS" if not failures else "HOLD",
        "file_count": len(files),
        "total_bytes": total_bytes,
        "ceiling_bytes": max_bytes,
        "path_size_manifest_sha256": manifest,
        "required_route_count": len(REQUIRED_ROUTES),
        "failures": failures,
        "scope": "Staged path/size policy only; not content confidentiality, live hosting, or owner-device proof.",
    }


class GateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="jm-pages-cp07-")
        self.stage = Path(self.tmp.name)
        for relative in REQUIRED_ROUTES:
            path = self.stage / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("<!doctype html><title>public fixture</title>\n", encoding="utf-8")

    def tearDown(self):
        self.tmp.cleanup()

    def test_valid_fixture(self):
        self.assertEqual("STATIC_PREDEPLOY_PASS", audit(self.stage)["status"])

    def test_missing_original_route_is_hold(self):
        (self.stage / REQUIRED_ROUTES[-1]).unlink()
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_family_gift_exposure_is_hold(self):
        p = self.stage / "family-gifts" / "fixture.txt"
        p.parent.mkdir()
        p.write_text("test only")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_workflow_directory_exposure_is_hold(self):
        p = self.stage / ".github" / "workflows" / "fixture.yml"
        p.parent.mkdir(parents=True)
        p.write_text("test only")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_credential_named_file_is_hold(self):
        (self.stage / "id_rsa").write_text("test only")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_environment_variant_is_hold(self):
        p = self.stage / "site" / ".env.staging"
        p.parent.mkdir()
        p.write_text("fixture", encoding="utf-8")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_credentials_directory_is_hold(self):
        p = self.stage / "docs" / "credentials" / "fixture.json"
        p.parent.mkdir(parents=True)
        p.write_text("fixture", encoding="utf-8")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_pkcs12_file_is_hold(self):
        p = self.stage / "tls" / "site.pkcs12"
        p.parent.mkdir()
        p.write_text("fixture", encoding="utf-8")
        self.assertEqual("HOLD", audit(self.stage)["status"])

    def test_byte_ceiling_is_enforced(self):
        self.assertIn("stage_over_budget", audit(self.stage, max_bytes=1)["failures"])

    def test_symlink_cannot_be_deployed(self):
        link = self.stage / "external-link"
        try:
            link.symlink_to(self.stage / REQUIRED_ROUTES[0])
        except (NotImplementedError, OSError):
            self.skipTest("symlink creation unavailable")
        self.assertEqual("HOLD", audit(self.stage)["status"])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(GateTests)
        return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1
    if not args.stage:
        parser.error("--stage is required unless --self-test is used")
    result = audit(args.stage)
    result_json = json.dumps(result, indent=2, ensure_ascii=False) + "\n"
    print(result_json, end="")
    if args.report:
        args.report.write_text(result_json, encoding="utf-8")
    return 0 if result["status"] == "STATIC_PREDEPLOY_PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
