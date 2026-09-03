#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.5 — GitHub Actions artifact-vault recovery.

Searches workflow runs around the Full Tool Estate remediation window, lists all
retained artifacts, inspects artifact ZIP entries, and promotes only exact source
authorities through the v1.2.5 source-seat gate.

ARTIFACT ABSENCE != SOURCE ABSENCE.
ARTIFACT PRESENCE != SOURCE AUTHORITY.
EXACT NAME + FROZEN BYTES/SHA -> SOURCE SEAT -> CLEAN DESCENDANT.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE_MANIFEST = json.loads((HERE / "source_seat_manifest_v1_2_3.json").read_text(encoding="utf-8"))
OVERLAY = json.loads((HERE / "source_seat_authority_overlay_v1_2_5.json").read_text(encoding="utf-8"))
SEAT = HERE / "seat_contact_source_v1_2_5.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "ACTIONS_ARTIFACT_SOURCE_RECOVERY_RECEIPT_v1_2_5.json"

DEFAULT_START = "2026-08-27T04:30:00Z"
DEFAULT_END = "2026-08-27T05:20:00Z"
TARGET_TIME = dt.datetime.fromisoformat("2026-08-27T05:01:47+00:00")
DEFAULT_MAX_DOWNLOAD_BYTES = 750 * 1024 * 1024
DEFAULT_MAX_ARTIFACT_BYTES = 180 * 1024 * 1024
DEFAULT_MAX_ARTIFACTS = 240


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def iso(s: str) -> dt.datetime:
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def build_rows() -> dict[str, dict]:
    rows = {r["recipientId"]: dict(r) for r in BASE_MANIFEST["rows"]}
    for a in OVERLAY["rows"]:
        rows[a["recipientId"]].update(a)
        rows[a["recipientId"]].pop("openReason", None)
    return rows


ROWS = build_rows()


def expected_names() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for rid, row in ROWS.items():
        out.setdefault(row["expectedFile"], []).append(rid)
        if row.get("alternateCarrier"):
            out.setdefault(row["alternateCarrier"], []).append(rid)
    return out


NAMES = expected_names()


def authority_for(row: dict, name: str) -> tuple[int | None, str | None]:
    if name == row.get("alternateCarrier"):
        return row.get("alternateCarrierBytes"), row.get("alternateCarrierSha256")
    return row.get("expectedBytes"), row.get("expectedSha256")


def exact_match(row: dict, name: str, data: bytes) -> tuple[bool, str]:
    expected_bytes, expected_sha = authority_for(row, name)
    if not expected_sha:
        return False, "NO_FROZEN_SHA_AUTHORITY"
    if expected_bytes is not None and len(data) != expected_bytes:
        return False, "BYTE_MISMATCH"
    if sha256(data) != expected_sha:
        return False, "SHA_MISMATCH"
    return True, "EXACT_AUTHORITY_MATCH"


class GitHubAPI:
    def __init__(self, repo: str, token: str):
        self.repo = repo
        self.token = token
        self.base = f"https://api.github.com/repos/{repo}"
        self.calls = 0

    def request(self, url: str, *, binary: bool = False):
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "JM-Contact-Organ-Artifact-Recovery-v1.2.5",
            },
        )
        self.calls += 1
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()
        if binary:
            return data
        return json.loads(data.decode("utf-8"))

    def runs(self, start: str, end: str) -> list[dict]:
        created = urllib.parse.quote(f"{start}..{end}", safe="")
        rows = []
        page = 1
        while True:
            payload = self.request(f"{self.base}/actions/runs?created={created}&per_page=100&page={page}")
            batch = payload.get("workflow_runs", [])
            rows.extend(batch)
            if len(batch) < 100:
                break
            page += 1
            if page > 20:
                raise RuntimeError("Run pagination safety limit exceeded")
        return rows

    def artifacts_for_run(self, run_id: int) -> list[dict]:
        rows = []
        page = 1
        while True:
            payload = self.request(f"{self.base}/actions/runs/{run_id}/artifacts?per_page=100&page={page}")
            batch = payload.get("artifacts", [])
            rows.extend(batch)
            if len(batch) < 100:
                break
            page += 1
            if page > 10:
                raise RuntimeError(f"Artifact pagination safety limit exceeded for run {run_id}")
        return rows

    def download_artifact(self, artifact_id: int) -> bytes:
        return self.request(f"{self.base}/actions/artifacts/{artifact_id}/zip", binary=True)


def relevance(run: dict, artifact: dict) -> tuple[int, float]:
    text = " ".join([
        str(run.get("name", "")),
        str(run.get("display_title", "")),
        str(run.get("path", "")),
        str(artifact.get("name", "")),
    ]).lower()
    keywords = (
        "full tool", "tool estate", "remediation", "hangar", "craftik",
        "source", "body", "app", "browser", "candidate", "contact", "estate",
    )
    score = sum(3 if k in {"full tool", "tool estate", "remediation", "hangar", "craftik"} and k in text else 1 if k in text else 0 for k in keywords)
    created = iso(artifact.get("created_at") or run.get("created_at"))
    distance = abs((created - TARGET_TIME).total_seconds())
    return (-score, distance)


def seat_exact(rid: str, name: str, data: bytes, temp_root: Path) -> dict:
    candidate = temp_root / rid / name
    candidate.parent.mkdir(parents=True, exist_ok=True)
    candidate.write_bytes(data)
    proc = subprocess.run(
        [sys.executable, str(SEAT), "--recipient", rid, "--candidate", str(candidate)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {"seatStdoutTail": proc.stdout[-1800:]}


def current_accounting() -> dict:
    p = OUT / "PROPAGATION_RECEIPT_v1_2_3.json"
    if not p.exists():
        return {"totalRecipients": 28, "materialized": 6, "materializationOpen": 22, "unresolved": 0}
    r = json.loads(p.read_text(encoding="utf-8"))
    return {k: r[k] for k in ("totalRecipients", "materialized", "materializationOpen", "unresolved")}


def selftest() -> None:
    rows = build_rows()
    html = [r for r in rows.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
    assert len(rows) == 22
    assert len(html) == 21
    assert all(r.get("expectedSha256") for r in html)
    assert all(r.get("materializationEligible") for r in html)
    assert rows["phone-housekeeper"]["carrierClass"] == "NATIVE_ANDROID_SAF"
    fixture = b"artifact-fixture"
    row = {"expectedFile": "x", "expectedBytes": len(fixture), "expectedSha256": sha256(fixture)}
    assert exact_match(row, "x", fixture) == (True, "EXACT_AUTHORITY_MATCH")
    assert exact_match(row, "x", fixture + b"!")[0] is False
    print("Contact Organ v1.2.5 Actions-artifact recovery SELFTEST PASS")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default=DEFAULT_START)
    parser.add_argument("--end", default=DEFAULT_END)
    parser.add_argument("--max-artifacts", type=int, default=DEFAULT_MAX_ARTIFACTS)
    parser.add_argument("--max-artifact-bytes", type=int, default=DEFAULT_MAX_ARTIFACT_BYTES)
    parser.add_argument("--max-download-bytes", type=int, default=DEFAULT_MAX_DOWNLOAD_BYTES)
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    if args.selftest:
        selftest()
        return

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not token or not repo:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY are required for artifact-vault recovery")

    before = current_accounting()
    api = GitHubAPI(repo, token)
    runs = api.runs(args.start, args.end)
    artifacts: list[tuple[dict, dict]] = []
    for run in runs:
        for artifact in api.artifacts_for_run(run["id"]):
            if artifact.get("expired"):
                continue
            artifacts.append((run, artifact))
    artifacts.sort(key=lambda pair: relevance(pair[0], pair[1]))

    downloaded = 0
    inspected = 0
    skipped_oversize = 0
    candidate_hits = []
    exact_seated = []
    rejected = []
    already_seated: set[str] = set()

    with tempfile.TemporaryDirectory(prefix="jm-contact-artifact-") as td:
        temp_root = Path(td)
        for run, artifact in artifacts[: args.max_artifacts]:
            advertised_size = int(artifact.get("size_in_bytes") or 0)
            if advertised_size > args.max_artifact_bytes:
                skipped_oversize += 1
                continue
            if downloaded + advertised_size > args.max_download_bytes:
                break
            try:
                blob = api.download_artifact(artifact["id"])
            except Exception as exc:
                rejected.append({
                    "runId": run["id"], "artifactId": artifact["id"],
                    "artifact": artifact.get("name"), "state": "DOWNLOAD_FAILED", "error": str(exc),
                })
                continue
            downloaded += len(blob)
            inspected += 1
            try:
                zf = zipfile.ZipFile(io.BytesIO(blob))
            except Exception as exc:
                rejected.append({
                    "runId": run["id"], "artifactId": artifact["id"],
                    "artifact": artifact.get("name"), "state": "ZIP_OPEN_FAILED", "error": str(exc),
                })
                continue

            for info in zf.infolist():
                base = Path(info.filename).name
                if base not in NAMES or info.is_dir():
                    continue
                data = zf.read(info)
                for rid in NAMES[base]:
                    row = ROWS[rid]
                    ok, state = exact_match(row, base, data)
                    hit = {
                        "recipientId": rid,
                        "runId": run["id"],
                        "runName": run.get("name"),
                        "runTitle": run.get("display_title"),
                        "artifactId": artifact["id"],
                        "artifact": artifact.get("name"),
                        "artifactCreatedAt": artifact.get("created_at"),
                        "entry": info.filename,
                        "filename": base,
                        "bytes": len(data),
                        "sha256": sha256(data),
                        "state": state,
                    }
                    candidate_hits.append(hit)
                    if not ok or rid in already_seated:
                        continue
                    try:
                        seat = seat_exact(rid, base, data, temp_root)
                        already_seated.add(rid)
                        exact_seated.append({**hit, "state": "EXACT_ARTIFACT_SOURCE_SEATED", **seat})
                    except subprocess.CalledProcessError as exc:
                        rejected.append({
                            **hit,
                            "state": "EXACT_ARTIFACT_FOUND__SOURCE_SEAT_FAILED",
                            "stdout": (exc.stdout or "")[-1800:],
                            "stderr": (exc.stderr or "")[-1800:],
                        })

    after = current_accounting()
    receipt = {
        "schema": "jm.estate.contact-organ-actions-artifact-recovery/1.2.5",
        "date": "2026-09-03",
        "window": {"start": args.start, "end": args.end, "target": TARGET_TIME.isoformat()},
        "law": "ARTIFACT PRESENCE != SOURCE AUTHORITY. EXACT NAME + FROZEN BYTES/SHA EARNS SOURCE SEAT.",
        "runsScanned": len(runs),
        "retainedArtifactsDiscovered": len(artifacts),
        "artifactsInspected": inspected,
        "artifactsSkippedOversize": skipped_oversize,
        "downloadBytes": downloaded,
        "apiCalls": api.calls,
        "candidateFilenameHits": len(candidate_hits),
        "exactArtifactSourcesSeated": len(exact_seated),
        "seatedRecipientIds": sorted(already_seated),
        "candidateHits": candidate_hits,
        "exactSeats": exact_seated,
        "rejected": rejected,
        "accountingBefore": before,
        "accountingAfter": after,
        "claimBoundary": "Artifact-vault recovery only promotes byte/hash-gated source authorities. Build/install, native SAF consequence, cross-device carrier consequence and physical Ding remain separate gates."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
