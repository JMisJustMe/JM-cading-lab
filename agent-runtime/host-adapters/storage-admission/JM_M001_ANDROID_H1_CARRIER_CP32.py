#!/usr/bin/env python3
"""JM M001 CP32: read-only frozen Android v1.5 H1 release admission.

Reuses the existing exact source ZIP + APK/AAB receipt: a push that changed
only workflow/receipt context does NOT justify minting a freshly signed carrier.
Changed source or invalid source/receipt holds for a new, independently versioned
and appropriately signed product release.  Nothing is uploaded or deleted.
"""
import argparse
import hashlib
import json
import os
import stat
import zipfile
from pathlib import Path, PurePosixPath

SCHEMA = "JM.M001.AndroidH1CarrierAdmission/CP32.v1"
PACKAGE = "com.jmisjustme.livingestate"
VERSION = 1501
REL = "release"
SOURCE_ARCHIVE = "JMISJUSTME_LIVING_ESTATE_v1.5_H1_ANDROID_CARRIER_SOURCE.zip"
RECEIPT = "ANDROID_CARRIER_BUILD_RECEIPT.json"
PRODUCTS = ("debugApk", "proofAab", "universalApk")
SOURCE_MEMBERS = (
    "README.md", "PRE_PHONE_VERIFICATION.md",
    "settings.gradle.kts", "build.gradle.kts", "gradle.properties",
    "app/build.gradle.kts", "app/src/main/AndroidManifest.xml",
    "app/src/main/res/values/styles.xml",
    "app/src/main/java/com/jmisjustme/livingestate/MainActivity.java",
    "app/src/main/java/com/jmisjustme/livingestate/CarrierPolicy.java",
    "app/src/test/java/com/jmisjustme/livingestate/CarrierPolicyTest.java",
)


def fail(reason):
    return {"schema": SCHEMA, "status": "HOLD", "reason": reason,
            "rebuild": False, "release_authorised": False,
            "native_retirement_authorised": False, "native_mutations": 0,
            "quota_savings_claimed_bytes": 0}


def file_bytes(path, *, limit=30_000_000):
    path = Path(path)
    try:
        parent = path.parent
        if path.is_symlink() or parent.is_symlink():
            raise ValueError("SYMLINK_REFUSED")
        st = path.stat()
        if not stat.S_ISREG(st.st_mode) or st.st_size > limit or st.st_size == 0:
            raise ValueError("NOT_REGULAR_OR_OVERSIZE")
        data = path.read_bytes()
        if len(data) != st.st_size or path.stat().st_mtime_ns != st.st_mtime_ns:
            raise ValueError("FILE_CHANGED_DURING_READ")
        return data
    except (OSError, ValueError) as exc:
        raise ValueError("INPUT_NOT_PROVEN:" + path.name + ":" + str(exc)) from exc


def digest(data):
    return hashlib.sha256(data).hexdigest()


def admission(project):
    project = Path(project)
    try:
        if project.is_symlink() or not project.is_dir():
            return fail("PROJECT_NOT_REGULAR_DIRECTORY")
        rel = project / REL
        archive = file_bytes(rel / SOURCE_ARCHIVE)
        rec = json.loads(file_bytes(rel / RECEIPT, limit=100_000))
        if rec.get("schema") != "jm.website.android-carrier-receipt/v1.5-h1":
            return fail("INVALID_RECEIPT_SCHEMA")
        if (rec.get("package"), rec.get("versionCode"), rec.get("signingBoundary"),
            rec.get("physicalDeviceDing")) != (
                PACKAGE, VERSION, "Temporary proof identity; not owner production/update key.", "OPEN"):
            return fail("VERSION_SIGNING_OR_DEVICE_ROLE_MISMATCH")
        # Every existing delivery target must still match its original proof.
        for key in PRODUCTS:
            item = rec.get(key)
            if not isinstance(item, dict):
                return fail("MISSING_DELIVERY_IDENTITY:" + key)
            name, expected, length = item.get("name"), item.get("sha256"), item.get("bytes")
            if not isinstance(name, str) or PurePosixPath(name).name != name or "/" in name or "\\" in name:
                return fail("UNSAFE_DELIVERY_FILENAME")
            if not isinstance(expected, str) or len(expected) != 64 or type(length) is not int:
                return fail("BAD_DELIVERY_HASH_OR_LENGTH")
            current = file_bytes(rel / name)
            if len(current) != length or digest(current) != expected:
                return fail("EXISTING_DELIVERY_CHANGED:" + name)
        # The previously admitted source ZIP is the independent keeper.
        import io
        with zipfile.ZipFile(io.BytesIO(archive)) as z:
            infos = z.infolist()
            names = [i.filename for i in infos]
            if (len(names) != len(set(names)) or len(names) != len(SOURCE_MEMBERS) + 1
                    or set(names) != set(SOURCE_MEMBERS) | {"CONTACT_PACK_MANIFEST.json"}):
                return fail("SOURCE_ARCHIVE_MEMBER_SET_CHANGED")
            if any(i.is_dir() or i.file_size > 25_000_000 or
                   PurePosixPath(i.filename).is_absolute() or
                   ".." in PurePosixPath(i.filename).parts for i in infos):
                return fail("UNSAFE_SOURCE_ARCHIVE")
            if z.testzip() is not None:
                return fail("SOURCE_ARCHIVE_CRC_REFUSAL")
            # Compare actual authorial source directly. Rebuilt run receipts are
            # *not* authorial source and must not trigger a needless full rebuild.
            for name in SOURCE_MEMBERS:
                if z.read(name) != file_bytes(project / name):
                    return fail("CHANGED_AUTHORIAL_SOURCE:" + name)
        return {
            "schema": SCHEMA, "status": "REUSE_FROZEN_H1",
            "rebuild": False, "release_authorised": False,
            "keeper_source_sha256": digest(archive),
            "delivery_count": len(PRODUCTS), "source_members": len(SOURCE_MEMBERS),
            "version_code": VERSION, "signer_role": "CI_PROOF_ONLY",
            "physical_device_ding": False,
            "native_retirement_authorised": False, "native_mutations": 0,
            "quota_savings_claimed_bytes": 0,
            "boundary": "Frozen H1 proof reused; changed authorial sources require a separate approved version and signer route.",
        }
    except (OSError, ValueError, zipfile.BadZipFile, json.JSONDecodeError,
            KeyError, TypeError) as exc:
        return fail("EXISTING_KEEPER_NOT_PROVEN:" + str(exc)[:220])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", required=True)
    parser.add_argument("--github-output")
    args = parser.parse_args()
    result = admission(args.project)
    if args.github_output:
        out = Path(args.github_output)
        if not out.is_file():
            raise SystemExit("GITHUB_OUTPUT_MISSING")
        with out.open("a", encoding="utf-8") as stream:
            stream.write("rebuild=false\n")
            stream.write("status=" + result["status"] + "\n")
    print(json.dumps(result, sort_keys=True, indent=2))
    return 0 if result["status"] == "REUSE_FROZEN_H1" else 2


if __name__ == "__main__":
    raise SystemExit(main())
