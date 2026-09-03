#!/usr/bin/env python3
"""JM Estate Contact Organ v1.2.8 — nested artifact/APK source recovery.

Descends from the contacted v1.2.5A Actions-vault repair without rewriting it.
The earlier vault sweep opened every retained outer Actions ZIP but intentionally
matched direct entry basenames only. This descendant opens archive carriers
*inside* those artifacts (APK/AAB/ZIP/JAR) and compares source-like members by
frozen SHA regardless of filename.

OUTER ARTIFACT -> NESTED CARRIER -> MEMBER -> FROZEN SHA -> EXISTING SOURCE-SEAT GATE.
RECOVER BEFORE REBUILD. FROZEN PARENT -> CLEAN DESCENDANT. NO DING, NO CLAIM.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
BASE = HERE / "recover_contact_sources_from_actions_artifacts_v1_2_5A.py"
SEAT = HERE / "seat_contact_source_v1_2_5.py"
OUT = ROOT / "estate-publication/contact-organ-descendants"
RECEIPT = OUT / "NESTED_CARRIER_SOURCE_RECOVERY_RECEIPT_v1_2_8.json"

spec = importlib.util.spec_from_file_location("jm_contact_artifact_recovery_v1_2_5A", BASE)
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)
mod = repair.mod  # v1.2.5 body with v1.2.5A redirect/auth repair already applied

ARCHIVE_SUFFIXES = {".apk", ".aab", ".zip", ".jar"}
SOURCE_SUFFIXES = {".html", ".htm"}
DEFAULT_MAX_DEPTH = 3
DEFAULT_MAX_MEMBER_BYTES = 64 * 1024 * 1024
DEFAULT_MAX_CONTAINER_BYTES = 160 * 1024 * 1024
DEFAULT_MAX_EXPANDED_BYTES = 2 * 1024 * 1024 * 1024
DEFAULT_MAX_RATIO = 250


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def build_authorities() -> dict[str, list[dict]]:
    """Map every frozen expected SHA to the recipient authority it can satisfy."""
    out: dict[str, list[dict]] = {}
    for rid, row in mod.ROWS.items():
        if row.get("expectedSha256"):
            out.setdefault(row["expectedSha256"], []).append({
                "recipientId": rid,
                "authorityName": row["expectedFile"],
                "expectedBytes": row.get("expectedBytes"),
                "authorityClass": "EXPECTED_CURRENT_SOURCE",
                "carrierClass": row["carrierClass"],
            })
        if row.get("alternateCarrierSha256"):
            out.setdefault(row["alternateCarrierSha256"], []).append({
                "recipientId": rid,
                "authorityName": row["alternateCarrier"],
                "expectedBytes": row.get("alternateCarrierBytes"),
                "authorityClass": "QUALIFIED_ALTERNATE_CARRIER",
                "carrierClass": row["carrierClass"],
            })
    return out


AUTHORITIES = build_authorities()
TARGET_NAMES = {
    a["authorityName"]
    for authorities in AUTHORITIES.values()
    for a in authorities
}


def is_archive_name(name: str) -> bool:
    return Path(name).suffix.lower() in ARCHIVE_SUFFIXES


def is_source_name(name: str) -> bool:
    p = Path(name)
    return p.suffix.lower() in SOURCE_SUFFIXES or p.name in TARGET_NAMES


def safe_to_read(info: zipfile.ZipInfo, *, max_member_bytes: int, max_ratio: int) -> tuple[bool, str | None]:
    if info.is_dir():
        return False, "DIRECTORY"
    if info.file_size < 0 or info.file_size > max_member_bytes:
        return False, "MEMBER_SIZE_LIMIT"
    compressed = max(1, int(info.compress_size or 0))
    ratio = info.file_size / compressed
    if info.file_size > 1024 * 1024 and ratio > max_ratio:
        return False, "COMPRESSION_RATIO_LIMIT"
    return True, None


def current_accounting() -> dict:
    return mod.current_accounting()


def seat_exact(authority: dict, data: bytes, temp_root: Path) -> dict:
    rid = authority["recipientId"]
    canonical = authority["authorityName"]
    candidate = temp_root / rid / canonical
    candidate.parent.mkdir(parents=True, exist_ok=True)
    candidate.write_bytes(data)
    proc = subprocess.run(
        [sys.executable, str(SEAT), "--recipient", rid, "--candidate", str(candidate)],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return {
        "canonicalSeatName": canonical,
        "seatStdoutTail": proc.stdout[-1800:],
    }


class Budget:
    def __init__(self, max_expanded: int):
        self.max_expanded = max_expanded
        self.expanded = 0
        self.source_bytes_hashed = 0
        self.container_bytes_opened = 0
        self.members_seen = 0
        self.source_members_hashed = 0
        self.nested_containers_opened = 0
        self.skipped_limits = 0

    def consume(self, n: int) -> bool:
        if self.expanded + n > self.max_expanded:
            return False
        self.expanded += n
        return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default=mod.DEFAULT_START)
    parser.add_argument("--end", default=mod.DEFAULT_END)
    parser.add_argument("--max-artifacts", type=int, default=mod.DEFAULT_MAX_ARTIFACTS)
    parser.add_argument("--max-artifact-bytes", type=int, default=mod.DEFAULT_MAX_ARTIFACT_BYTES)
    parser.add_argument("--max-download-bytes", type=int, default=mod.DEFAULT_MAX_DOWNLOAD_BYTES)
    parser.add_argument("--max-depth", type=int, default=DEFAULT_MAX_DEPTH)
    parser.add_argument("--max-member-bytes", type=int, default=DEFAULT_MAX_MEMBER_BYTES)
    parser.add_argument("--max-container-bytes", type=int, default=DEFAULT_MAX_CONTAINER_BYTES)
    parser.add_argument("--max-expanded-bytes", type=int, default=DEFAULT_MAX_EXPANDED_BYTES)
    parser.add_argument("--max-ratio", type=int, default=DEFAULT_MAX_RATIO)
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    if args.selftest:
        assert len(mod.ROWS) == 22
        html = [r for r in mod.ROWS.values() if r["carrierClass"] != "NATIVE_ANDROID_SAF"]
        assert len(html) == 21
        assert all(r.get("expectedSha256") for r in html)
        assert all(r.get("materializationEligible") for r in html)
        assert "f9d4f15e9aef2e9bbcf4ba729e0c0d0a810ebd9bcd908f91b4ca7afdf8114af2" in AUTHORITIES
        assert is_archive_name("x.apk") and is_archive_name("x.zip") and not is_archive_name("x.html")
        assert is_source_name("assets/index.html")
        # Prove nested ZIP discovery mechanics without pretending fixture bytes are an Estate authority.
        inner = io.BytesIO()
        with zipfile.ZipFile(inner, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("assets/index.html", b"nested-fixture")
        outer = io.BytesIO()
        with zipfile.ZipFile(outer, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("build/app-debug.apk", inner.getvalue())
        with zipfile.ZipFile(io.BytesIO(outer.getvalue())) as z:
            apk = z.read("build/app-debug.apk")
        with zipfile.ZipFile(io.BytesIO(apk)) as z:
            assert z.read("assets/index.html") == b"nested-fixture"
        print("Contact Organ v1.2.8 nested-carrier recovery SELFTEST PASS")
        return

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    repo = os.environ.get("GITHUB_REPOSITORY", "").strip()
    if not token or not repo:
        raise RuntimeError("GITHUB_TOKEN and GITHUB_REPOSITORY are required")

    before = current_accounting()
    api = mod.GitHubAPI(repo, token)
    runs = api.runs(args.start, args.end)
    artifacts: list[tuple[dict, dict]] = []
    for run in runs:
        for artifact in api.artifacts_for_run(run["id"]):
            if not artifact.get("expired"):
                artifacts.append((run, artifact))
    artifacts.sort(key=lambda pair: mod.relevance(pair[0], pair[1]))

    downloaded = 0
    inspected = 0
    skipped_outer_oversize = 0
    budget = Budget(args.max_expanded_bytes)
    exact_hits: list[dict] = []
    exact_seats: list[dict] = []
    native_exact: list[dict] = []
    archive_failures: list[dict] = []
    already_seated: set[str] = set()
    seen_source_sha: set[str] = set()
    seen_container_sha: set[str] = set()
    limits_exhausted = False

    def inspect_payload(data: bytes, *, path_chain: list[str], run: dict, artifact: dict,
                        depth: int, temp_root: Path, allow_archive: bool = True) -> None:
        nonlocal limits_exhausted
        if limits_exhausted:
            return

        leaf = path_chain[-1]
        suffix = Path(leaf).suffix.lower()

        # Every archive payload can itself be an exact frozen native/package authority.
        if is_archive_name(leaf):
            sha = digest(data)
            for authority in AUTHORITIES.get(sha, []):
                if authority["expectedBytes"] is not None and len(data) != authority["expectedBytes"]:
                    continue
                hit = {
                    "recipientId": authority["recipientId"],
                    "authorityClass": authority["authorityClass"],
                    "authorityName": authority["authorityName"],
                    "runId": run["id"],
                    "runName": run.get("name"),
                    "artifactId": artifact["id"],
                    "artifact": artifact.get("name"),
                    "pathChain": path_chain,
                    "bytes": len(data),
                    "sha256": sha,
                    "depth": depth,
                    "state": "EXACT_NESTED_PACKAGE_AUTHORITY_FOUND",
                }
                exact_hits.append(hit)
                if authority["carrierClass"] == "NATIVE_ANDROID_SAF":
                    native_exact.append(hit)
                elif authority["recipientId"] not in already_seated:
                    try:
                        seat = seat_exact(authority, data, temp_root)
                        already_seated.add(authority["recipientId"])
                        exact_seats.append({**hit, **seat, "state": "EXACT_NESTED_SOURCE_SEATED"})
                    except subprocess.CalledProcessError as exc:
                        archive_failures.append({**hit, "state": "SOURCE_SEAT_FAILED", "stderr": (exc.stderr or "")[-1800:]})

        # Compare HTML/source members by SHA regardless of basename.
        if is_source_name(leaf):
            sha = digest(data)
            budget.source_members_hashed += 1
            budget.source_bytes_hashed += len(data)
            first_seen = sha not in seen_source_sha
            seen_source_sha.add(sha)
            if first_seen or sha in AUTHORITIES:
                for authority in AUTHORITIES.get(sha, []):
                    if authority["expectedBytes"] is not None and len(data) != authority["expectedBytes"]:
                        continue
                    hit = {
                        "recipientId": authority["recipientId"],
                        "authorityClass": authority["authorityClass"],
                        "authorityName": authority["authorityName"],
                        "runId": run["id"],
                        "runName": run.get("name"),
                        "runTitle": run.get("display_title"),
                        "artifactId": artifact["id"],
                        "artifact": artifact.get("name"),
                        "artifactCreatedAt": artifact.get("created_at"),
                        "pathChain": path_chain,
                        "nestedFilename": leaf,
                        "bytes": len(data),
                        "sha256": sha,
                        "depth": depth,
                        "state": "EXACT_SHA_AUTHORITY_FOUND_REGARDLESS_OF_FILENAME",
                    }
                    exact_hits.append(hit)
                    rid = authority["recipientId"]
                    if authority["carrierClass"] == "NATIVE_ANDROID_SAF":
                        native_exact.append(hit)
                    elif rid not in already_seated:
                        try:
                            seat = seat_exact(authority, data, temp_root)
                            already_seated.add(rid)
                            exact_seats.append({**hit, **seat, "state": "EXACT_NESTED_SOURCE_SEATED"})
                        except subprocess.CalledProcessError as exc:
                            archive_failures.append({**hit, "state": "SOURCE_SEAT_FAILED", "stdout": (exc.stdout or "")[-1800:], "stderr": (exc.stderr or "")[-1800:]})

        if not allow_archive or depth >= args.max_depth or not is_archive_name(leaf):
            return
        if len(data) > args.max_container_bytes:
            budget.skipped_limits += 1
            return
        container_sha = digest(data)
        # Re-opening identical APKs from many artifacts adds no authority but wastes the budget.
        if container_sha in seen_container_sha:
            return
        seen_container_sha.add(container_sha)
        if not budget.consume(len(data)):
            limits_exhausted = True
            return
        budget.container_bytes_opened += len(data)
        budget.nested_containers_opened += 1
        try:
            zf = zipfile.ZipFile(io.BytesIO(data))
        except Exception as exc:
            archive_failures.append({
                "runId": run["id"], "artifactId": artifact["id"], "artifact": artifact.get("name"),
                "pathChain": path_chain, "state": "NESTED_ARCHIVE_OPEN_FAILED", "error": str(exc),
            })
            return
        with zf:
            for info in zf.infolist():
                budget.members_seen += 1
                name = info.filename
                if not (is_source_name(name) or is_archive_name(name)):
                    continue
                ok, reason = safe_to_read(info, max_member_bytes=args.max_member_bytes, max_ratio=args.max_ratio)
                if not ok:
                    if reason not in {"DIRECTORY"}:
                        budget.skipped_limits += 1
                    continue
                if not budget.consume(info.file_size):
                    limits_exhausted = True
                    return
                try:
                    payload = zf.read(info)
                except Exception as exc:
                    archive_failures.append({
                        "runId": run["id"], "artifactId": artifact["id"], "artifact": artifact.get("name"),
                        "pathChain": path_chain + [name], "state": "NESTED_MEMBER_READ_FAILED", "error": str(exc),
                    })
                    continue
                inspect_payload(
                    payload,
                    path_chain=path_chain + [name],
                    run=run,
                    artifact=artifact,
                    depth=depth + 1,
                    temp_root=temp_root,
                )

    with tempfile.TemporaryDirectory(prefix="jm-contact-nested-") as td:
        temp_root = Path(td)
        for run, artifact in artifacts[: args.max_artifacts]:
            advertised_size = int(artifact.get("size_in_bytes") or 0)
            if advertised_size > args.max_artifact_bytes:
                skipped_outer_oversize += 1
                continue
            if downloaded + advertised_size > args.max_download_bytes:
                break
            if limits_exhausted:
                break
            try:
                blob = api.download_artifact(artifact["id"])
            except Exception as exc:
                archive_failures.append({
                    "runId": run["id"], "artifactId": artifact["id"], "artifact": artifact.get("name"),
                    "state": "OUTER_ARTIFACT_DOWNLOAD_FAILED", "error": str(exc),
                })
                continue
            downloaded += len(blob)
            inspected += 1
            try:
                outer = zipfile.ZipFile(io.BytesIO(blob))
            except Exception as exc:
                archive_failures.append({
                    "runId": run["id"], "artifactId": artifact["id"], "artifact": artifact.get("name"),
                    "state": "OUTER_ZIP_OPEN_FAILED", "error": str(exc),
                })
                continue
            with outer:
                for info in outer.infolist():
                    budget.members_seen += 1
                    if not (is_source_name(info.filename) or is_archive_name(info.filename)):
                        continue
                    ok, reason = safe_to_read(info, max_member_bytes=args.max_member_bytes, max_ratio=args.max_ratio)
                    if not ok:
                        if reason != "DIRECTORY":
                            budget.skipped_limits += 1
                        continue
                    if not budget.consume(info.file_size):
                        limits_exhausted = True
                        break
                    try:
                        data = outer.read(info)
                    except Exception as exc:
                        archive_failures.append({
                            "runId": run["id"], "artifactId": artifact["id"], "artifact": artifact.get("name"),
                            "pathChain": [info.filename], "state": "OUTER_MEMBER_READ_FAILED", "error": str(exc),
                        })
                        continue
                    inspect_payload(
                        data,
                        path_chain=[f"artifact:{artifact.get('name')}", info.filename],
                        run=run,
                        artifact=artifact,
                        depth=1,
                        temp_root=temp_root,
                    )

    after = current_accounting()
    receipt = {
        "schema": "jm.estate.contact-organ-nested-carrier-source-recovery/1.2.8",
        "date": "2026-09-03",
        "inherits": "v1.2.5A outer Actions artifact vault + v1.2.5 frozen source-seat authority",
        "law": "OUTER ARTIFACT -> NESTED APK/AAB/ZIP/JAR -> MEMBER -> FROZEN SHA -> EXISTING SOURCE-SEAT GATE.",
        "claimLaw": "NO DING, NO CLAIM.",
        "window": {"start": args.start, "end": args.end},
        "runsScanned": len(runs),
        "retainedArtifactsDiscovered": len(artifacts),
        "outerArtifactsInspected": inspected,
        "outerArtifactsSkippedOversize": skipped_outer_oversize,
        "downloadBytes": downloaded,
        "archiveMembersSeen": budget.members_seen,
        "nestedContainersOpened": budget.nested_containers_opened,
        "uniqueNestedContainers": len(seen_container_sha),
        "nestedContainerBytesOpened": budget.container_bytes_opened,
        "sourceMembersHashed": budget.source_members_hashed,
        "uniqueSourceShas": len(seen_source_sha),
        "sourceBytesHashed": budget.source_bytes_hashed,
        "expandedBudgetConsumed": budget.expanded,
        "expandedBudgetLimit": budget.max_expanded,
        "limitsExhausted": limits_exhausted,
        "membersSkippedBySafetyLimits": budget.skipped_limits,
        "exactAuthorityHits": len(exact_hits),
        "exactHtmlSourcesSeated": len(exact_seats),
        "exactNativePackagesFound": len(native_exact),
        "seatedRecipientIds": sorted(already_seated),
        "exactHits": exact_hits,
        "exactSeats": exact_seats,
        "nativeExact": native_exact,
        "failures": archive_failures,
        "accountingBefore": before,
        "accountingAfter": after,
        "claimBoundary": "This descendant closes the previously-uninspected nested archive carrier layer only. A count can increase only through the pre-existing frozen SHA/byte source-seat gate. Native build/install and physical consequences remain separately claim-gated."
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
