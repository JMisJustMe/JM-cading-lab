#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.5A — artifact redirect/auth repair descendant.

Preserves v1.2.5 as the contacted-failure ancestor. Repairs only the artifact
ZIP download carrier: GitHub's artifact endpoint redirects to signed blob storage,
and the signed storage request must not inherit the GitHub Authorization header.

RECOVER FORWARD. DO NOT REWRITE CONTACTED FAILURE HISTORY.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import importlib.util
import sys
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE / "recover_contact_sources_from_actions_artifacts_v1_2_5.py"

spec = importlib.util.spec_from_file_location("jm_contact_artifact_recovery_v1_2_5", BASE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fixed_download_artifact(self, artifact_id: int) -> bytes:
    """Authenticate only to api.github.com; follow signed blob redirect without auth."""
    url = f"{self.base}/actions/artifacts/{artifact_id}/zip"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "JM-Contact-Organ-Artifact-Recovery-v1.2.5A",
        },
    )
    self.calls += 1
    opener = urllib.request.build_opener(_NoRedirect)
    location = None
    try:
        with opener.open(req, timeout=60) as resp:
            data = resp.read()
            if 300 <= getattr(resp, "status", 200) < 400:
                location = resp.headers.get("Location")
            else:
                return data
    except urllib.error.HTTPError as exc:
        if exc.code not in (301, 302, 303, 307, 308):
            raise
        location = exc.headers.get("Location")
    if not location:
        raise RuntimeError(f"Artifact {artifact_id}: GitHub redirect did not provide Location")

    # Signed Azure/blob URL is already authorized by its query signature.
    # Deliberately omit GitHub Authorization on this second host.
    blob_req = urllib.request.Request(
        location,
        headers={"User-Agent": "JM-Contact-Organ-Artifact-Recovery-v1.2.5A"},
    )
    with urllib.request.urlopen(blob_req, timeout=120) as resp:
        return resp.read()


mod.GitHubAPI.download_artifact = fixed_download_artifact


def repair_selftest() -> None:
    mod.selftest()
    assert mod.GitHubAPI.download_artifact is fixed_download_artifact
    print("Contact Organ v1.2.5A artifact redirect/auth repair SELFTEST PASS")


if __name__ == "__main__":
    if "--repair-selftest" in sys.argv:
        repair_selftest()
    else:
        mod.main()
