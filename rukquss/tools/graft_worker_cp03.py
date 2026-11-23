#!/usr/bin/env python3
"""RUKQUSS CP03: fail-closed HTML-only graft onto the CURRENT Worker carrier.

Run locally on a reviewed copy of the live Cloudflare Worker. This never
calls Cloudflare or deploys. The original RUKQUSS HTML remains the source;
the generated Worker is an ephemeral release candidate, not a second keeper.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

PARENT_BLOB = "a9630dd04c1a72431b15695bd667d126310d12ec"
CHILD_BLOB = "ca2a8f4e77174f0d19ac7ce35c74f708ada5d8cc"
PARENT_BRANCH = "feature/rukquss-owner-domain-web-20261024"
CHILD_BRANCH = "feature/rukquss-live-experiences-cp02-20261123"
MARKER = "/* JM_RUKQUSS_ROUTE_CP01 */"
ROUTES = (
    "/navigator", "/games", "/apps", "/coding", "/theory", "/books",
    "/music", "/visual", "/author", "/career", "/access",
)


def require(condition: bool, label: str) -> None:
    if not condition:
        raise ValueError("CP03 HOLD: " + label)


def git_blob(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def candidate(live: str, html_bytes: bytes) -> tuple[str, dict]:
    require(git_blob(html_bytes) == CHILD_BLOB, "modified or unexpected RUKQUSS HTML")
    require(live.count("const HTML=") == 1, "HTML delimiter changed")
    require(live.count(MARKER) == 1, "CP01 route marker missing or ambiguous")
    start = live.index("const HTML=") + len("const HTML=")
    end_tag = ";\n" + MARKER
    require(live.count(end_tag) == 1, "old HTML boundary ambiguous")
    end = live.index(end_tag, start)
    original = json.loads(live[start:end])
    require(isinstance(original, str), "original HTML is not a JS string")
    require(git_blob(original.encode("utf-8")) == PARENT_BLOB, "live HTML diverged from parent blob")
    require(live.count(PARENT_BLOB) == 2, "parent SHA metadata unexpected")
    expected_header = "// protected branch " + PARENT_BRANCH + ", blob " + PARENT_BLOB
    require(live.count(expected_header) == 1, "original provenance header changed")
    require(live.count("gitBlob:'" + PARENT_BLOB + "'") == 1, "status blob metadata changed")
    require(live.count("u.pathname==='/__jm_status'") == 1, "status endpoint altered")
    require(live.count("u.hostname==='www.rukquss.com'") == 1, "www canonical redirect altered")
    require(live.count("jmRukqussRouteCp01(event.request)") == 1, "route handler altered")
    match = re.search(r"const JM_CP01_ROOMS\s*=\s*(\{[^;\n]+\});", live)
    require(match is not None, "CP01 redirect table unavailable")
    routes = json.loads(match.group(1))
    require(set(routes) == set(ROUTES), "CP01 redirect set drifted")
    require(all(v.startswith("https://") for v in routes.values()), "non-HTTPS redirect present")
    require("RUKQUSS REALITY LTD is not yet incorporated" in html_bytes.decode("utf-8"), "legal boundary removed")
    require(html_bytes.count(b'class="experience-card"') == 4, "experience cards changed")
    child_literal = json.dumps(html_bytes.decode("utf-8"), ensure_ascii=False, separators=(",", ":"))
    grafted = live[:start] + child_literal + live[end:]
    grafted = grafted.replace(
        expected_header,
        "// staged candidate branch " + CHILD_BRANCH + ", blob " + CHILD_BLOB,
    )
    grafted = grafted.replace("gitBlob:'" + PARENT_BLOB + "'", "gitBlob:'" + CHILD_BLOB + "'")
    require(PARENT_BLOB not in grafted, "stale carrier SHA remains")
    require(grafted.count(CHILD_BLOB) == 2, "new provenance/status SHA did not update exactly twice")
    normalized = grafted.replace(child_literal, live[start:end], 1).replace(
        "// staged candidate branch " + CHILD_BRANCH + ", blob " + CHILD_BLOB, expected_header
    ).replace("gitBlob:'" + CHILD_BLOB + "'", "gitBlob:'" + PARENT_BLOB + "'")
    require(normalized == live, "carrier changed outside HTML and intended metadata")
    require(git_blob(json.loads(grafted[start:grafted.index(end_tag, start)]).encode("utf-8")) == CHILD_BLOB,
            "grafted HTML readback mismatch")
    receipt = {
        "schema": "JM.RUKQUSS.WorkerGraft.CP03/1",
        "scope": "LOCAL_CANDIDATE_ONLY_NO_DEPLOY",
        "parent_html_git_blob": PARENT_BLOB,
        "candidate_html_git_blob": CHILD_BLOB,
        "live_worker_sha256": hashlib.sha256(live.encode("utf-8")).hexdigest(),
        "candidate_worker_sha256": hashlib.sha256(grafted.encode("utf-8")).hexdigest(),
        "redirects_preserved": len(routes),
        "status_endpoint_preserved": True,
        "www_canonical_preserved": True,
        "worker_code_outside_html_and_provenance_unchanged": True,
        "ready_to_deploy": False,
        "reason": "Owner deployment approval and post-deploy live checks remain required",
    }
    return grafted, receipt


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--live", type=Path, required=True, help="read-only exact live Worker source snapshot")
    p.add_argument("--html", type=Path, required=True, help="original RUKQUSS staged HTML")
    p.add_argument("--out", type=Path, required=True, help="ephemeral assembled Worker candidate")
    p.add_argument("--receipt", type=Path, required=True, help="local provenance receipt")
    args = p.parse_args()
    require(args.out.resolve() not in (args.live.resolve(), args.html.resolve()), "output would overwrite donor")
    require(args.receipt.resolve() not in (args.live.resolve(), args.html.resolve(), args.out.resolve()),
            "receipt would overwrite donor")
    grafted, receipt = candidate(args.live.read_text(encoding="utf-8"), args.html.read_bytes())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(grafted, encoding="utf-8")
    args.receipt.write_text(json.dumps(receipt, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(receipt, sort_keys=True))


if __name__ == "__main__":
    main()
