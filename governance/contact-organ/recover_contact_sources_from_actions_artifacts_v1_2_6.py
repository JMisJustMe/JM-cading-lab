#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.6 — artifact-vault carrier repair + nested recovery.

Clean descendant of v1.2.5. Repairs the GitHub Actions artifact download carrier
and expands nested ZIP/TAR/TGZ archives while retaining only exact target-name
entries for frozen byte/SHA authority checks.

FROZEN PARENT -> CLEAN DESCENDANT.
ARTIFACT PRESENCE != SOURCE AUTHORITY.
NO DING, NO CLAIM.
"""
from __future__ import annotations

import importlib.util
import io
import json
import subprocess
import sys
import tarfile
import zipfile as std_zipfile
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
BASE = HERE / "recover_contact_sources_from_actions_artifacts_v1_2_5.py"

spec = importlib.util.spec_from_file_location("jm_contact_artifact_recovery_v1_2_5", BASE)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

ORIGINAL_ZIP = std_zipfile.ZipFile
TARGET_NAMES = set(mod.NAMES)
MAX_DEPTH = 5
MAX_MEMBERS_PER_ARTIFACT = 30000
MAX_TARGET_BYTES = 64 * 1024 * 1024
MAX_NESTED_ARCHIVE_BYTES = 256 * 1024 * 1024

STATS = {
    "outerArtifactsOpened": 0,
    "nestedArchivesOpened": 0,
    "membersVisited": 0,
    "targetNameEntriesExposed": 0,
    "oversizeTargetsSkipped": 0,
    "oversizeNestedArchivesSkipped": 0,
    "nestedArchiveOpenFailures": 0,
}


@dataclass
class TargetEntry:
    filename: str
    data: bytes

    def is_dir(self) -> bool:
        return False


class ScanBudget:
    def __init__(self):
        self.members = 0

    def visit(self) -> None:
        self.members += 1
        STATS["membersVisited"] += 1
        if self.members > MAX_MEMBERS_PER_ARTIFACT:
            raise RuntimeError("nested artifact member safety limit exceeded")


def archive_kind(name: str) -> str | None:
    n = name.lower()
    if n.endswith(".zip"):
        return "zip"
    if n.endswith((".tar.gz", ".tgz", ".tar")):
        return "tar"
    return None


def scan_zip(data: bytes, prefix: str, depth: int, budget: ScanBudget, out: list[TargetEntry]) -> None:
    if depth > MAX_DEPTH:
        return
    try:
        with ORIGINAL_ZIP(io.BytesIO(data)) as zf:
            if depth == 0:
                STATS["outerArtifactsOpened"] += 1
            else:
                STATS["nestedArchivesOpened"] += 1
            for info in zf.infolist():
                if info.is_dir():
                    continue
                budget.visit()
                base = Path(info.filename).name
                kind = archive_kind(info.filename)
                if base in TARGET_NAMES:
                    if info.file_size > MAX_TARGET_BYTES:
                        STATS["oversizeTargetsSkipped"] += 1
                    else:
                        payload = zf.read(info)
                        out.append(TargetEntry(f"{prefix}!/{info.filename}", payload))
                        STATS["targetNameEntriesExposed"] += 1
                if kind and depth < MAX_DEPTH:
                    if info.file_size > MAX_NESTED_ARCHIVE_BYTES:
                        STATS["oversizeNestedArchivesSkipped"] += 1
                        continue
                    payload = zf.read(info)
                    scan_archive(payload, f"{prefix}!/{info.filename}", kind, depth + 1, budget, out)
    except Exception:
        if depth == 0:
            raise
        STATS["nestedArchiveOpenFailures"] += 1


def scan_tar(data: bytes, prefix: str, depth: int, budget: ScanBudget, out: list[TargetEntry]) -> None:
    if depth > MAX_DEPTH:
        return
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:*") as tf:
            STATS["nestedArchivesOpened"] += 1
            for member in tf.getmembers():
                if not member.isfile():
                    continue
                budget.visit()
                base = Path(member.name).name
                kind = archive_kind(member.name)
                should_read = base in TARGET_NAMES or (kind is not None and depth < MAX_DEPTH)
                if not should_read:
                    continue
                if base in TARGET_NAMES and member.size > MAX_TARGET_BYTES:
                    STATS["oversizeTargetsSkipped"] += 1
                    continue
                if kind and member.size > MAX_NESTED_ARCHIVE_BYTES:
                    STATS["oversizeNestedArchivesSkipped"] += 1
                    continue
                fh = tf.extractfile(member)
                if fh is None:
                    continue
                payload = fh.read()
                if base in TARGET_NAMES:
                    out.append(TargetEntry(f"{prefix}!/{member.name}", payload))
                    STATS["targetNameEntriesExposed"] += 1
                if kind and depth < MAX_DEPTH:
                    scan_archive(payload, f"{prefix}!/{member.name}", kind, depth + 1, budget, out)
    except Exception:
        STATS["nestedArchiveOpenFailures"] += 1


def scan_archive(data: bytes, prefix: str, kind: str, depth: int, budget: ScanBudget, out: list[TargetEntry]) -> None:
    if kind == "zip":
        scan_zip(data, prefix, depth, budget, out)
    elif kind == "tar":
        scan_tar(data, prefix, depth, budget, out)


class RecursiveTargetArchiveView:
    """Minimal ZipFile-compatible view exposing target basenames at any nested depth."""

    def __init__(self, source):
        data = source.read() if hasattr(source, "read") else Path(source).read_bytes()
        self.entries: list[TargetEntry] = []
        scan_zip(data, "artifact.zip", 0, ScanBudget(), self.entries)

    def infolist(self):
        return list(self.entries)

    def read(self, info):
        return info.data


def redirect_safe_download(self, artifact_id: int) -> bytes:
    """Use curl's cross-host redirect handling for GitHub's signed artifact URL."""
    self.calls += 1
    url = f"{self.base}/actions/artifacts/{artifact_id}/zip"
    cmd = [
        "curl", "-fsSL",
        "--retry", "3",
        "--retry-delay", "1",
        "--connect-timeout", "20",
        "--max-time", "180",
        "-H", f"Authorization: Bearer {self.token}",
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2022-11-28",
        "-H", "User-Agent: JM-Contact-Organ-Artifact-Recovery-v1.2.6",
        url,
    ]
    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if proc.returncode != 0:
        err = proc.stderr.decode("utf-8", errors="replace")[-1200:]
        raise RuntimeError(f"artifact download curl exit {proc.returncode}: {err}")
    if not proc.stdout.startswith(b"PK"):
        raise RuntimeError(f"artifact download did not return ZIP bytes ({len(proc.stdout)} bytes)")
    return proc.stdout


def wrapper_selftest() -> None:
    import hashlib

    target = sorted(TARGET_NAMES)[0]
    payload = b"jm-nested-target-fixture"
    tar_buffer = io.BytesIO()
    with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tf:
        info = tarfile.TarInfo(name=f"deep/{target}")
        info.size = len(payload)
        tf.addfile(info, io.BytesIO(payload))
    outer = io.BytesIO()
    with ORIGINAL_ZIP(outer, mode="w", compression=std_zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("nested/body-pack.tar.gz", tar_buffer.getvalue())
    view = RecursiveTargetArchiveView(io.BytesIO(outer.getvalue()))
    entries = view.infolist()
    assert len(entries) == 1
    assert Path(entries[0].filename).name == target
    assert view.read(entries[0]) == payload
    assert hashlib.sha256(view.read(entries[0])).hexdigest() == hashlib.sha256(payload).hexdigest()
    print("Contact Organ v1.2.6 recursive artifact carrier SELFTEST PASS")


def postprocess_receipt() -> None:
    p = mod.RECEIPT
    receipt = json.loads(p.read_text(encoding="utf-8"))
    receipt["schema"] = "jm.estate.contact-organ-actions-artifact-recovery/1.2.6"
    receipt["inherits"] = "v1.2.5 artifact-vault scanner contacted-failure; repairs download carrier and nested archive visibility"
    receipt["carrierRepair"] = "GITHUB_API_AUTH -> SIGNED_REDIRECT -> CURL_LOCATION -> ZIP_BYTES"
    receipt["nestedArchiveInspection"] = {
        "policy": "ZIP/TAR/TGZ recursive target-name exposure only",
        "maxDepth": MAX_DEPTH,
        "maxMembersPerArtifact": MAX_MEMBERS_PER_ARTIFACT,
        **STATS,
    }
    receipt["claimBoundary"] = (
        "v1.2.6 can only promote exact target-name bytes that satisfy frozen byte/SHA authority through the source-seat gate. "
        "Archive discovery, download, or filename presence alone earns no materialisation or physical Ding."
    )
    p.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")


# Adapt the carrier without mutating the v1.2.5 parent.
mod.GitHubAPI.download_artifact = redirect_safe_download
mod.zipfile.ZipFile = RecursiveTargetArchiveView
mod.RECEIPT = mod.OUT / "ACTIONS_ARTIFACT_SOURCE_RECOVERY_RECEIPT_v1_2_6.json"


if __name__ == "__main__":
    if "--wrapper-selftest" in sys.argv:
        wrapper_selftest()
    else:
        mod.main()
        postprocess_receipt()
