#!/usr/bin/env python3
"""JM Unique Bodies CP09: OFFLINE Atlas custody carrier, never a public MCP write tool.

Consistent SQLite backup -> integrity + CP07 receipt proof -> content-addressed
ZIP -> independently pinned digest -> exclusive fresh-path restore.
No provider credentials, external upload, production deployment or DB overwrite.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path

import cp07_atomic_runtime as cp07
import server

SCHEMA = "JM.UniqueBodies.AtlasColdCustody/1"
DB_MEMBER = "atlas.sqlite3"
MANIFEST_MEMBER = "manifest.json"
MEMBERS = {DB_MEMBER, MANIFEST_MEMBER}
MAX_BYTES = 256 * 1024 * 1024


def hold(reason):
    raise ValueError("CUSTODY_HOLD:" + reason)


def sha_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical(obj):
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def pinned_sha(value):
    if not isinstance(value, str) or len(value) != 64:
        hold("EXTERNAL_ARCHIVE_SHA256_REQUIRED")
    try:
        int(value, 16)
    except ValueError:
        hold("EXTERNAL_ARCHIVE_SHA256_INVALID")
    return value.lower()


def require_existing_regular_file(path):
    path = Path(path).absolute()
    if path.is_symlink():
        hold("SYMLINK_CARRIER_REFUSED")
    path = path.resolve(strict=True)
    if not path.is_file():
        hold("SOURCE_NOT_REGULAR_FILE")
    if path.stat().st_size > MAX_BYTES:
        hold("SOURCE_TOO_LARGE")
    return path


def check_sqlite_and_receipts(db_path):
    with sqlite3.connect(db_path) as connection:
        result = [x[0] for x in connection.execute("PRAGMA integrity_check").fetchall()]
        if result != ["ok"]:
            hold("SQLITE_INTEGRITY_FAILED")
    atlas = server.Atlas(str(db_path))
    history = cp07.history(atlas)
    if history.get("integrity_valid") is not True:
        hold("CP07_HISTORY_INTEGRITY_FAILED")
    # Source and recipient identity are part of CP07's verified history.
    return {
        "run_count": history["run_count"],
        "event_count": history["total_atlas_contact_events"],
        "body_count": history["registered_body_count"],
        "history_sha256": hashlib.sha256(canonical(history).encode("utf-8")).hexdigest(),
    }


def snapshot(db_path, archive_path):
    src = require_existing_regular_file(db_path)
    out = Path(archive_path).absolute()
    if not out.parent.is_dir() or out.exists():
        hold("OUTPUT_DIRECTORY_MISSING_OR_ARCHIVE_EXISTS")
    if src == out:
        hold("SOURCE_EQUALS_DESTINATION")
    # SQLite online backup yields a transactionally consistent point-in-time copy.
    # It neither copies an uncheckpointed WAL raw nor writes to the source.
    with tempfile.TemporaryDirectory(prefix="jmcp09-snapshot-") as temp:
        stage = Path(temp) / DB_MEMBER
        uri = src.as_uri() + "?mode=ro"
        with sqlite3.connect(uri, uri=True) as source, sqlite3.connect(stage) as target:
            source.backup(target)
        if stage.stat().st_size > MAX_BYTES:
            hold("STAGED_DATABASE_TOO_LARGE")
        record = check_sqlite_and_receipts(stage)
        manifest = {
            "schema": SCHEMA,
            "sqlite_sha256": sha_file(stage),
            "sqlite_bytes": stage.stat().st_size,
            "history": record,
            "claim": "OFFLINE_POINT_IN_TIME_RECOVERY_CARRIER_NOT_REMOTE_DURABILITY",
            "original_source_modified": False,
            "token_exported": False,
        }
        fd, temp_zip = tempfile.mkstemp(prefix=".jmcp09-", suffix=".zip", dir=out.parent)
        os.close(fd)
        try:
            with zipfile.ZipFile(temp_zip, "w", compression=zipfile.ZIP_DEFLATED,
                                 compresslevel=6, allowZip64=False) as z:
                z.write(stage, DB_MEMBER)
                z.writestr(MANIFEST_MEMBER, canonical(manifest).encode("utf-8"))
            archive_sha = sha_file(temp_zip)
            # Hard-link publication refuses an existing destination without overwrite.
            os.link(temp_zip, out)
        finally:
            os.unlink(temp_zip)
    return {"state": "COLD_ARCHIVE_CREATED", "archive": str(out),
            "archive_sha256": archive_sha, "history": record,
            "recovery_boundary": "store archive AND digest on independently durable carriers"}


def inspect_archive(archive_path, expected_sha256):
    path = require_existing_regular_file(archive_path)
    if sha_file(path) != pinned_sha(expected_sha256):
        hold("ARCHIVE_OUTER_SHA256_MISMATCH")
    with tempfile.TemporaryDirectory(prefix="jmcp09-verify-") as temp:
        restored = Path(temp) / DB_MEMBER
        with zipfile.ZipFile(path, "r") as z:
            infos = z.infolist()
            if len(infos) != 2 or {x.filename for x in infos} != MEMBERS:
                hold("ARCHIVE_MEMBERS_NOT_EXACT")
            if any(x.is_dir() or x.flag_bits & 1 or x.file_size > MAX_BYTES for x in infos):
                hold("ARCHIVE_MEMBER_UNSAFE")
            if sum(x.file_size for x in infos) > MAX_BYTES + 32768:
                hold("ARCHIVE_UNCOMPRESSED_BOUND")
            manifest_raw = z.read(MANIFEST_MEMBER)
            if len(manifest_raw) > 32768:
                hold("MANIFEST_TOO_LARGE")
            manifest = json.loads(manifest_raw)
            if manifest.get("schema") != SCHEMA or not isinstance(manifest.get("history"), dict):
                hold("ARCHIVE_SCHEMA_INVALID")
            with z.open(DB_MEMBER) as source, open(restored, "xb") as target:
                shutil.copyfileobj(source, target, length=1024 * 1024)
        if restored.stat().st_size != manifest.get("sqlite_bytes"):
            hold("RESTORED_SQLITE_SIZE_MISMATCH")
        if sha_file(restored) != manifest.get("sqlite_sha256"):
            hold("RESTORED_SQLITE_HASH_MISMATCH")
        history = check_sqlite_and_receipts(restored)
        if history != manifest["history"]:
            hold("RESTORED_ATLAS_HISTORY_MISMATCH")
        # Validation may create no missing identity/schema on a valid checkpoint.
        if sha_file(restored) != manifest["sqlite_sha256"]:
            hold("RESTORED_SQLITE_CHANGED_DURING_VALIDATION")
        yield_info = {"state": "COLD_ARCHIVE_VERIFIED", "history": history,
                      "archive_sha256": pinned_sha(expected_sha256)}
        # Keep bytes available to the immediate caller while the temp dir exists.
        yield yield_info, restored


def restore(archive_path, dest_path, expected_sha256, apply=False):
    if not apply:
        hold("EXPLICIT_APPLY_REQUIRED")
    dest = Path(dest_path).absolute()
    if not dest.parent.is_dir():
        hold("DESTINATION_PARENT_MISSING")
    if dest.exists() or dest.is_symlink():
        hold("DESTINATION_ALREADY_EXISTS")
    for proof, src in inspect_archive(archive_path, expected_sha256):
        fd, stage = tempfile.mkstemp(prefix=".jmcp09-restore-", dir=dest.parent)
        try:
            with os.fdopen(fd, "wb") as target, open(src, "rb") as source:
                shutil.copyfileobj(source, target, length=1024 * 1024)
                target.flush()
                os.fsync(target.fileno())
            os.chmod(stage, 0o600)
            if sha_file(stage) != sha_file(src):
                hold("STAGED_RESTORE_BYTES_MISMATCH")
            # Atomic exclusive creation: no replacement, even with a concurrent path.
            os.link(stage, dest)
        finally:
            os.unlink(stage)
        return {"state": "COLD_ATLAS_RESTORED_NEW_PATH", "path": str(dest),
                "history": proof["history"], "archive_sha256": proof["archive_sha256"],
                "original_target_overwritten": False}
    hold("NO_VALID_ARCHIVE")


def verify(archive_path, expected_sha256):
    for proof, _ in inspect_archive(archive_path, expected_sha256):
        return proof
    hold("NO_VALID_ARCHIVE")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    snap = sub.add_parser("snapshot")
    snap.add_argument("--db", required=True)
    snap.add_argument("--archive", required=True)
    inspect = sub.add_parser("verify")
    inspect.add_argument("--archive", required=True)
    inspect.add_argument("--expect-sha256", required=True)
    recovery = sub.add_parser("restore")
    recovery.add_argument("--archive", required=True)
    recovery.add_argument("--db", required=True)
    recovery.add_argument("--expect-sha256", required=True)
    recovery.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "snapshot":
            result = snapshot(args.db, args.archive)
        elif args.command == "verify":
            result = verify(args.archive, args.expect_sha256)
        else:
            result = restore(args.archive, args.db, args.expect_sha256, args.apply)
        print(canonical(result))
    except (ValueError, sqlite3.Error, OSError, zipfile.BadZipFile,
            UnicodeError, json.JSONDecodeError) as exc:
        print(canonical({"state": "CUSTODY_HOLD", "reason": str(exc)}), file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
