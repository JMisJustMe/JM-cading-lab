#!/usr/bin/env python3
"""JM M001 CP21 recipient: enforce the EXISTING output admission at Git build-entry.

Changed Git carriers are not automatically permitted native Library releases.
No upload, deletion, ownership bypass, private asset publishing or quota claim.
The original carrier donor and CP21 engine are reused without modification.
"""
import argparse
import importlib.util
import json
import re
import stat
import subprocess
from pathlib import Path

HIGH_BYTES = 8_000_000
COLD_ONLY = re.compile(
    r"(?:NOT[_ -]?FOR[_ -]?LIBRARY|COLD[_ -]?ONLY|DISPOSABLE[_ -]?WORKING|TEMP[_ -]?BACKUP)",
    re.IGNORECASE,
)
FULL_SHA = re.compile(r"[0-9a-fA-F]{40}\Z")


def changed_paths(repo, base, head="HEAD"):
    if not FULL_SHA.fullmatch(base):
        raise ValueError("BASE_SHA_INVALID")
    if head != "HEAD" and not FULL_SHA.fullmatch(head):
        raise ValueError("HEAD_SHA_INVALID")
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=ACMRT", "-z",
         base, head, "--"], cwd=repo, check=True,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    return [part.decode("utf-8", errors="surrogateescape")
            for part in result.stdout.split(b"\0") if part]


def load_cp21(repo):
    root = repo / "agent-runtime/host-adapters/storage-admission"
    source = root / "JM_M001_OUTPUT_ADMISSION_CP21.py"
    spec = importlib.util.spec_from_file_location("jm_m001_existing_cp21", source)
    if not spec or not spec.loader:
        raise ValueError("CP21_SOURCE_NOT_RECOVERED")
    cp21 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cp21)
    donor = cp21.load_donor(root / "JM_M001_Carrier_Admission_Gate_v0_1.py")
    return cp21, donor


def inspect_paths(repo, changed, cp21, donor):
    repo = repo.resolve(strict=True)
    reviews = []
    for rel in changed:
        if not rel or Path(rel).is_absolute() or ".." in Path(rel).parts:
            raise ValueError("INVALID_CHANGED_PATH")
        candidate = repo / rel
        # lstat the ORIGINAL path, before resolve: resolving a symlink first
        # accidentally bypasses .is_symlink() checks.
        if candidate.is_symlink():
            raise ValueError("CHANGED_SYMLINK_REFUSED:" + rel)
        if not candidate.exists():
            raise ValueError("CHANGED_FILE_NOT_FOUND:" + rel)
        resolved = candidate.resolve(strict=True)
        if not resolved.is_relative_to(repo):
            raise ValueError("OUTSIDE_REPOSITORY:" + rel)
        if not stat.S_ISREG(candidate.stat().st_mode):
            raise ValueError("NOT_REGULAR_FILE:" + rel)
        size = candidate.stat().st_size
        cold = bool(COLD_ONLY.search(candidate.name))
        high = size >= HIGH_BYTES
        if not (cold or high):
            continue
        status = cp21.run(candidate, donor, intended="cold" if cold else "review")
        if status["status"] == "HOLD_INVALID" or not status.get("candidate_sha256"):
            raise ValueError("CP21_REJECTED_SOURCE:" + rel)
        if status.get("candidate_bytes") != size:
            raise ValueError("CHANGED_DURING_READING:" + rel)
        if status.get("native_library_write_authorised") is not False:
            raise ValueError("NATIVE_PERMISSION_ESCALATION:" + rel)
        if status.get("native_retirement_authorised") is not False:
            raise ValueError("RETIREMENT_PERMISSION_ESCALATION:" + rel)
        reviews.append({
            "path": rel, "bytes": size, "sha256": status["candidate_sha256"],
            "high_byte": high, "cold_only": cold,
            "status": status["status"],
            "decision": "HOLD_FOR_PROVEN_ROLE_AND_RECOVERY_ROUTE",
            "required": "Prove separate release recipient and recovery route, or reuse existing keeper. "
                        "Do not interpret this CI gate as owner authorisation.",
        })
    return {
        "schema": "JM.M001.CP21.BuildEntry/2",
        "changed_count": len(changed),
        "held_count": len(reviews),
        "status": "HOLD" if reviews else "PASS_NO_NEW_HIGH_BYTE_OR_COLD_CARRIERS",
        "native_mutations": 0,
        "native_library_write_authorised": False,
        "native_retirement_authorised": False,
        "quota_savings_claimed_bytes": 0,
        "reviews": reviews,
        "boundary": "Git build-entry only; cannot intercept unrelated ChatGPT Library uploads.",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path("."))
    parser.add_argument("--base", required=True)
    parser.add_argument("--head", default="HEAD")
    args = parser.parse_args(argv)
    try:
        repo = args.repo.resolve(strict=True)
        cp21, donor = load_cp21(repo)
        outcome = inspect_paths(repo, changed_paths(repo, args.base, args.head),
                                cp21, donor)
        print(json.dumps(outcome, indent=2, sort_keys=True))
        return 1 if outcome["status"] == "HOLD" else 0
    except (OSError, ValueError, subprocess.CalledProcessError, AttributeError) as exc:
        print(json.dumps({
            "schema": "JM.M001.CP21.BuildEntry/2", "status": "HOLD_INVALID",
            "reason": str(exc)[:400],
            "native_mutations": 0, "quota_savings_claimed_bytes": 0,
        }, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
