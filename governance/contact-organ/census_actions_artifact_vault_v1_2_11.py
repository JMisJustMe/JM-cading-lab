#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.11 — whole retained Actions artifact-vault census.

Metadata-only. Enumerates every retained repository Actions artifact through the
repository-wide artifacts endpoint before any further download sweep is claimed.
This establishes the absolute denominator and the cost of closing Actions as a
source-recovery route globally.

COUNT BEFORE CROWN.
ARTIFACT METADATA != SOURCE BYTES.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import datetime as dt
import json
import os
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "ACTIONS_ARTIFACT_VAULT_CENSUS_v1_2_11.json"

CLEARED_START = dt.datetime.fromisoformat("2026-08-27T02:45:00+00:00")
CLEARED_END = dt.datetime.fromisoformat("2026-08-27T05:20:00+00:00")


def iso(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))


def request_json(url: str, token: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "JM-Contact-Organ-Artifact-Vault-Census-v1.2.11",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def current_accounting() -> dict:
    p = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
    row = json.loads(p.read_text(encoding="utf-8"))
    return {k: row[k] for k in ("totalRecipients", "materialized", "materializationOpen", "unresolved")}


def main() -> None:
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not token or not repo:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY required")

    base = f"https://api.github.com/repos/{repo}/actions/artifacts"
    page = 1
    all_rows = []
    api_calls = 0
    reported_total = None
    while True:
        payload = request_json(f"{base}?per_page=100&page={page}", token)
        api_calls += 1
        if reported_total is None:
            reported_total = int(payload.get("total_count") or 0)
        batch = payload.get("artifacts", [])
        all_rows.extend(batch)
        if len(batch) < 100:
            break
        page += 1
        if page > 100:
            raise RuntimeError("artifact pagination safety limit exceeded")

    retained = [a for a in all_rows if not a.get("expired")]
    expired_visible = [a for a in all_rows if a.get("expired")]
    retained.sort(key=lambda a: a.get("created_at") or "")

    total_bytes = sum(int(a.get("size_in_bytes") or 0) for a in retained)
    covered = []
    outside = []
    by_day = Counter()
    by_month = Counter()
    names = Counter()
    for a in retained:
        created = iso(a.get("created_at"))
        if created:
            by_day[created.date().isoformat()] += 1
            by_month[created.strftime("%Y-%m")] += 1
            (covered if CLEARED_START <= created <= CLEARED_END else outside).append(a)
        else:
            outside.append(a)
        names[str(a.get("name") or "")]+=1

    largest = sorted(retained, key=lambda a: int(a.get("size_in_bytes") or 0), reverse=True)[:20]
    earliest = retained[0].get("created_at") if retained else None
    latest = retained[-1].get("created_at") if retained else None

    receipt = {
        "schema": "jm.estate.contact-organ-actions-artifact-vault-census/1.2.11",
        "date": "2026-09-03",
        "law": "COUNT BEFORE CROWN. ARTIFACT METADATA != SOURCE BYTES.",
        "repository": repo,
        "apiCalls": api_calls,
        "apiReportedArtifacts": reported_total,
        "artifactRowsEnumerated": len(all_rows),
        "retainedArtifacts": len(retained),
        "expiredRowsVisible": len(expired_visible),
        "retainedBytes": total_bytes,
        "retainedMiB": round(total_bytes / 1048576, 3),
        "retainedGiB": round(total_bytes / 1073741824, 3),
        "earliestRetainedCreatedAt": earliest,
        "latestRetainedCreatedAt": latest,
        "alreadyClearedWindow": {
            "start": CLEARED_START.isoformat(),
            "end": CLEARED_END.isoformat(),
            "retainedArtifactsInWindow": len(covered),
            "retainedBytesInWindow": sum(int(a.get("size_in_bytes") or 0) for a in covered),
            "evidence": [
                "v1.2.10 exhaustively inspected 02:45:00Z..04:29:59Z",
                "v1.2.6 exhaustively inspected 04:30:00Z..05:20:00Z"
            ]
        },
        "remainingVault": {
            "retainedArtifactsOutsideClearedWindow": len(outside),
            "retainedBytesOutsideClearedWindow": sum(int(a.get("size_in_bytes") or 0) for a in outside),
            "remainingMiB": round(sum(int(a.get("size_in_bytes") or 0) for a in outside) / 1048576, 3),
            "remainingGiB": round(sum(int(a.get("size_in_bytes") or 0) for a in outside) / 1073741824, 3)
        },
        "retainedArtifactsByMonth": dict(sorted(by_month.items())),
        "retainedArtifactsByDay": dict(sorted(by_day.items())),
        "largestRetainedArtifacts": [
            {
                "id": a.get("id"),
                "name": a.get("name"),
                "sizeInBytes": int(a.get("size_in_bytes") or 0),
                "createdAt": a.get("created_at"),
                "workflowRunId": (a.get("workflow_run") or {}).get("id")
            }
            for a in largest
        ],
        "duplicateArtifactNames": [
            {"name": name, "count": count}
            for name, count in names.most_common()
            if count > 1
        ][:50],
        "accounting": current_accounting(),
        "claimBoundary": "v1.2.11 is metadata census only. It proves the retained artifact denominator and byte budget, not archive contents, source recovery, descendant materialisation, build/install, or physical Ding."
    }
    OUT.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
