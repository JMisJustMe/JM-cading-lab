#!/usr/bin/env python3
"""JM M001 Carrier Admission Gate v0.1 — READ-ONLY, source-neutral.

Anti-bloat preflight for any JM build's proposed delivery file. This is NOT a
Library deletion tool, source-authority selector, live uploader, Build Mesh
replacement or automatic judgement of owner-facing direct download routes.

    python3 JM_M001_Carrier_Admission_Gate_v0_1.py --candidate NEW.zip --keeper HOUSE.zip
    python3 JM_M001_Carrier_Admission_Gate_v0_1.py --self-test

States:
  SAME_BYTES_ROLE_HOLD: reuse an existing keeper IF owner access/role permits;
                        prevent blindly creating another identical carrier.
  DISTINCT_BYTES:      there is a real change; preserve as distinct candidate.
  HOLD_INVALID:        do not admit or retire; missing, corrupt, or unsafe input.

The single JSON return carries no source content, no private Library IDs, no
mutation power, and no account-quota claims. No server, network or storage APIs.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
import tempfile
import zipfile

SCHEMA = "JM.M001.CarrierAdmission/0.1"
READ = 1024 * 1024


def _digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for part in iter(lambda: f.read(READ), b""):
            h.update(part)
    return h.hexdigest()


def _equal(a, b):
    with open(a, "rb") as fa, open(b, "rb") as fb:
        while True:
            ba, bb = fa.read(READ), fb.read(READ)
            if ba != bb:
                return False
            if not ba:
                return True


def _regular(path):
    info = path.lstat()  # Reject symlinks and nonregular carriers before opening.
    if not stat.S_ISREG(info.st_mode):
        raise ValueError("nonregular or symlink carrier")
    if info.st_size < 1:
        raise ValueError("empty carrier")
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


def _crc_check(path):
    if path.suffix.lower() not in (".zip", ".apk"):
        return "NOT_APPLICABLE"
    try:
        with zipfile.ZipFile(path) as z:
            names = z.namelist()
            if len(names) != len(set(names)) or z.testzip() is not None:
                raise ValueError("ZIP duplicate members or invalid CRC")
        return "PASS"
    except (zipfile.BadZipFile, OSError, RuntimeError) as e:
        raise ValueError("ZIP integrity failure: " + str(e)[:150]) from e


def assess(candidate, keeper):
    candidate, keeper = Path(candidate), Path(keeper)
    r = {
        "schema": SCHEMA,
        "state": "HOLD_INVALID",
        "candidate_sha256": None,
        "keeper_sha256": None,
        "same_size": False,
        "whole_byte_equality": False,
        "crc_candidate": "NOT_CHECKED",
        "crc_keeper": "NOT_CHECKED",
        "redundant_carriage_if_reused_bytes": 0,
        "admission_authorised": False,
        "retirement_authorised": False,
        "library_mutations": 0,
        "account_quota_savings_claimed_bytes": 0,
        "owner_direct_access_verified": False,
        "errors": [],
    }
    try:
        first, second = _regular(candidate), _regular(keeper)
        if candidate.resolve() == keeper.resolve() or first[:2] == second[:2]:
            raise ValueError("same input carrier/inode, not independent comparison")
        rc, rk = _crc_check(candidate), _crc_check(keeper)
        h1, h2 = _digest(candidate), _digest(keeper)
        # Detect replacements or edits during CRC/hash/compare, including same-byte length changes.
        eq = _equal(candidate, keeper) if first[2] == second[2] and h1 == h2 else False
        if _regular(candidate) != first or _regular(keeper) != second:
            raise ValueError("input changed during verification")
        r.update({"candidate_sha256": h1, "keeper_sha256": h2,
                  "same_size": first[2] == second[2],
                  "whole_byte_equality": eq,
                  "crc_candidate": rc, "crc_keeper": rk})
        if eq:
            r.update({"state": "SAME_BYTES_ROLE_HOLD",
                      "redundant_carriage_if_reused_bytes": first[2],
                      "decision": "REUSE_EXISTING_IF_OWNER_ACCESS_AND_SOURCE_ROLE_CLEAR; DO_NOT_UPLOAD_BLINDLY"})
        else:
            r.update({"state": "DISTINCT_BYTES",
                      "decision": "DIFFERENT_CARRIER; REQUIRE_NORMAL_BUILD_AND_ROLE_PREFLIGHT"})
    except (OSError, ValueError, TypeError) as e:
        r["errors"].append(str(e)[:250])
    return r


def self_test():
    cases = {}
    with tempfile.TemporaryDirectory(prefix="jm-m001-admission-") as td:
        d = Path(td)
        a, b = d / "a.zip", d / "b.zip"
        with zipfile.ZipFile(a, "w") as z:
            z.writestr("source.txt", "JM original" * 30)
        b.write_bytes(a.read_bytes())
        x = assess(a, b)
        cases["same_bytes_requires_role_clearance"] = (x["state"] == "SAME_BYTES_ROLE_HOLD" and
            x["whole_byte_equality"] and x["redundant_carriage_if_reused_bytes"] == a.stat().st_size and
            not x["retirement_authorised"] and not x["admission_authorised"])
        same_len = d / "other.bin"
        first_bin = d / "first.bin"
        first_bin.write_bytes(b"A" * 96)
        same_len.write_bytes(b"B" * 96)
        x = assess(first_bin, same_len)
        cases["same_size_distinct_content"] = x["state"] == "DISTINCT_BYTES" and not x["whole_byte_equality"] and x["same_size"]
        cases["same_inode_denied"] = assess(a, a)["state"] == "HOLD_INVALID"
        cases["missing_input_denied"] = assess(d / "absent.zip", b)["state"] == "HOLD_INVALID"
        corrupt = d / "corrupt.zip"
        corrupt.write_bytes(a.read_bytes()[:-15])
        cases["corrupt_zip_denied"] = assess(corrupt, b)["state"] == "HOLD_INVALID"
        if hasattr(os, "symlink"):
            link = d / "link.zip"
            try:
                os.symlink(a, link)
                cases["symlink_denied"] = assess(link, b)["state"] == "HOLD_INVALID"
            except OSError:
                cases["symlink_denied"] = True  # unsupported FS, not a promotion
        cases["no_mutation_no_quota_claim"] = all(
            assess(a, b)[k] == v for k, v in {
                "library_mutations": 0,
                "account_quota_savings_claimed_bytes": 0,
                "retirement_authorised": False,
                "owner_direct_access_verified": False}.items())
    return {"schema": "JM.M001.CarrierAdmissionSelfTest/0.1", "pass": all(cases.values()),
            "checks": len(cases), "cases": cases,
            "boundary": "SYNTHETIC LOCAL PREFLIGHT; NO LIBRARY OR OWNER CONTACT"}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--candidate", type=Path)
    ap.add_argument("--keeper", type=Path)
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args(argv)
    if args.self_test:
        result = self_test()
        print(json.dumps(result, sort_keys=True, indent=2))
        return 0 if result["pass"] else 2
    if args.candidate is None or args.keeper is None:
        ap.error("--candidate and --keeper are required unless --self-test")
    result = assess(args.candidate, args.keeper)
    print(json.dumps(result, sort_keys=True, indent=2))
    return 2 if result["state"] == "HOLD_INVALID" else 0

if __name__ == "__main__":
    raise SystemExit(main())