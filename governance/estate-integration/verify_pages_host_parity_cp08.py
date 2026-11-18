#!/usr/bin/env python3
"""JM Pages CP08: read-only exact/host-specific public origin parity."""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unittest
from urllib.request import Request, urlopen

SCHEMA = "JM.PagesCloudflareHostParity/CP08"
GITHUB = "https://jmisjustme.github.io/JM-cading-lab/"
CLOUDFLARE = "https://jmisjustme-estate.pages.dev/"
ROUTES = ("", "access/", "games-beyond/", "coding-estate/workshop/", "api-hub/")
# This exact Cloudflare-specific script is not present on GitHub's project subpath.
HOST_SCRIPT = re.compile(
    rb'<script defer src="/estate-return-route\.js" '
    rb'data-jm-context-return-route="v0\.1"></script>\r?\n?'
)


def classify(github: bytes, cloudflare: bytes) -> str:
    if github == cloudflare:
        return "BYTE_EXACT"
    occurrences = len(HOST_SCRIPT.findall(cloudflare))
    if occurrences == 1 and HOST_SCRIPT.sub(b"", cloudflare) == github:
        return "DOCUMENT_EXACT_EXCEPT_KNOWN_CLOUDFLARE_SCRIPT"
    return "UNEXPLAINED_DRIFT"


def fetch(url: str) -> bytes:
    req = Request(url, headers={"User-Agent": "JM-Pages-CP08-ReadOnly/1",
                                 "Cache-Control": "no-cache"})
    with urlopen(req, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError("HTTP_" + str(response.status))
        return response.read()


def run_live() -> dict:
    checks = []
    for route in ROUTES:
        item = {"route": "/" + route}
        try:
            a = fetch(GITHUB + route)
            b = fetch(CLOUDFLARE + route)
            item.update(
                status=classify(a, b),
                github_bytes=len(a),
                cloudflare_bytes=len(b),
                github_sha256=hashlib.sha256(a).hexdigest(),
                cloudflare_sha256=hashlib.sha256(b).hexdigest(),
            )
        except Exception as exc:
            item.update(status="HTTP_HOLD", error=type(exc).__name__)
        checks.append(item)
    accepted = {"BYTE_EXACT", "DOCUMENT_EXACT_EXCEPT_KNOWN_CLOUDFLARE_SCRIPT"}
    passed = sum(item["status"] in accepted for item in checks)
    return {
        "schema": SCHEMA,
        "state": "LIVE_HTTP_BOUNDED_PASS" if passed == len(ROUTES) else "HOLD",
        "checked": len(checks),
        "passed": passed,
        "origins": [GITHUB, CLOUDFLARE],
        "checks": checks,
        "boundary": "Exact HTTP response/body scope only; not JS interaction, hosting-source identity, or physical touch acceptance.",
    }


class ParityTests(unittest.TestCase):
    def test_exact(self):
        self.assertEqual(classify(b"body", b"body"), "BYTE_EXACT")

    def test_host_specific_script(self):
        raw = b"<html><body></body></html>"
        addition = b'<script defer src="/estate-return-route.js" data-jm-context-return-route="v0.1"></script>'
        self.assertEqual(
            classify(raw, raw.replace(b"</body>", addition + b"\n</body>")),
            "DOCUMENT_EXACT_EXCEPT_KNOWN_CLOUDFLARE_SCRIPT",
        )

    def test_drift_fails(self):
        self.assertEqual(classify(b"<html>a</html>", b"<html>b</html>"),
                         "UNEXPLAINED_DRIFT")

    def test_duplicate_host_script_fails(self):
        extra = b'<script defer src="/estate-return-route.js" data-jm-context-return-route="v0.1"></script>'
        self.assertEqual(classify(b"<html/>", b"<html/>" + extra + extra),
                         "UNEXPLAINED_DRIFT")

    def test_other_script_fails(self):
        self.assertEqual(classify(b"<html/>", b"<html/><script>altered()</script>"),
                         "UNEXPLAINED_DRIFT")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args()
    if args.self_test:
        suite = unittest.defaultTestLoader.loadTestsFromTestCase(ParityTests)
        return 0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1
    result = run_live()
    print(json.dumps(result, indent=2))
    return 0 if result["state"] == "LIVE_HTTP_BOUNDED_PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
