"""JM Unique Bodies CP09 — independent, owner-custodied cold SQLite capsule.

Source: CP08 Atlas + CP07 atomic history, untouched. Offline CLI only;
never an HTTP write endpoint or a claim of Render Free durable storage.
Requires Python 3.11+ and the original CP07 modules in this directory.
"""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import zipfile

import server
import cp07_atomic_runtime as atomic

SCHEMA = "JM.UniqueBodies.CP09.ColdCustody/1"
DB_MEMBER = "atlas.sqlite3"
MANIFEST_MEMBER = "manifest.json"
MAX_DB_BYTES = 64 * 1024 * 1024
MAX_MANIFEST_BYTES = 16 * 1024


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def database_proof(path: Path) -> dict:
    # Check actual SQLite page/record integrity AND the sovereign CP07
    # receipt -> event -> recipient -> hash-chain proof, not just row count.
    with sqlite3.connect(str(path)) as db:
        row = db.execute("PRAGMA integrity_check").fetchone()
        if row != ("ok",):
            raise ValueError("HOLD_SQLITE_INTEGRITY")
    state = atomic.history(server.Atlas(str(path)))
    if state["integrity_valid"] is not True:
        raise ValueError("HOLD_ATLAS_HISTORY_INTEGRITY")
    return {
        "run_count": state["run_count"],
        "registered_body_count": state["registered_body_count"],
        "total_atlas_contact_events": state["total_atlas_contact_events"],
        "integrity_valid": True,
    }


def validated_archive(raw: bytes) -> tuple[bytes, dict]:
    if len(raw) > MAX_DB_BYTES + 128 * 1024:
        raise ValueError("HOLD_ARCHIVE_BOUND")
    try:
        with zipfile.ZipFile(io.BytesIO(raw), "r") as pack:
            items = pack.infolist()
            if len(items) != 2 or {i.filename for i in items} != {DB_MEMBER, MANIFEST_MEMBER}:
                raise ValueError("HOLD_ARCHIVE_LAYOUT")
            if any(i.is_dir() or i.file_size > (MAX_DB_BYTES if i.filename == DB_MEMBER else MAX_MANIFEST_BYTES) for i in items):
                raise ValueError("HOLD_ARCHIVE_SIZE")
            manifest = json.loads(pack.read(MANIFEST_MEMBER))
            db_bytes = pack.read(DB_MEMBER)
    except (zipfile.BadZipFile, KeyError, UnicodeDecodeError, json.JSONDecodeError) as err:
        raise ValueError("HOLD_ARCHIVE_PARSE") from err
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA:
        raise ValueError("HOLD_CUSTODY_SCHEMA")
    if manifest.get("sha256") != digest(db_bytes) or manifest.get("db_bytes") != len(db_bytes):
        raise ValueError("HOLD_CUSTODY_DIGEST")
    expected = ("run_count", "registered_body_count", "total_atlas_contact_events")
    if any(type(manifest.get(key)) is not int or manifest[key] < 0 for key in expected):
        raise ValueError("HOLD_CUSTODY_COUNTERS")
    return db_bytes, manifest


def verify_bytes(data: bytes, manifest: dict, directory: Path | None = None) -> dict:
    with tempfile.TemporaryDirectory(dir=str(directory) if directory else None) as td:
        db_path = Path(td) / "verify.sqlite3"
        db_path.write_bytes(data)
        os.chmod(db_path, 0o600)
        proof = database_proof(db_path)
        if digest(db_path.read_bytes()) != manifest["sha256"]:
            raise ValueError("HOLD_VERIFY_MUTATED_SNAPSHOT")
    if any(proof[k] != manifest[k] for k in ("run_count", "registered_body_count", "total_atlas_contact_events")):
        raise ValueError("HOLD_CUSTODY_COUNTER_MISMATCH")
    return proof


def capsule_backup(source: Path, destination: Path) -> dict:
    if not source.is_file():
        raise ValueError("HOLD_SOURCE_DATABASE_MISSING")
    if destination.exists():
        raise FileExistsError("HOLD_NO_OVERWRITE_CAPSULE")
    if not destination.parent.is_dir():
        raise ValueError("HOLD_DESTINATION_PARENT_MISSING")
    with tempfile.TemporaryDirectory() as td:
        snapshot = Path(td) / DB_MEMBER
        with sqlite3.connect(str(source)) as live, sqlite3.connect(str(snapshot)) as copy:
            live.backup(copy)
        data = snapshot.read_bytes()
        if not data or len(data) > MAX_DB_BYTES:
            raise ValueError("HOLD_DATABASE_SIZE")
        proof = database_proof(snapshot)
        if digest(snapshot.read_bytes()) != digest(data):
            raise ValueError("HOLD_DATABASE_CHANGED_DURING_PROOF")
    manifest = {"schema": SCHEMA, "sha256": digest(data), "db_bytes": len(data),
                **{k: proof[k] for k in ("run_count", "registered_body_count", "total_atlas_contact_events")},
                "custody": "OWNER_OFFLINE_ARCHIVE_NOT_HOSTED_DURABILITY",
                "encrypted": False}
    with io.BytesIO() as sink:
        with zipfile.ZipFile(sink, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
            archive.writestr(MANIFEST_MEMBER, json.dumps(manifest, sort_keys=True, separators=(",", ":")))
            archive.writestr(DB_MEMBER, data)
        packed = sink.getvalue()
    check_bytes, check_manifest = validated_archive(packed)
    verify_bytes(check_bytes, check_manifest)
    fd = os.open(str(destination), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as out:
            out.write(packed)
            out.flush()
            os.fsync(out.fileno())
    except BaseException:
        destination.unlink(missing_ok=True)
        raise
    return {"state": "OFFLINE_CUSTODY_CAPSULE_WRITTEN", "archive_sha256": digest(packed),
            "db_sha256": manifest["sha256"], **proof,
            "boundary": "External archive custody depends on the owner's separate transfer/storage; not Render Free persistence."}


def capsule_verify(archive: Path) -> dict:
    if not archive.is_file():
        raise ValueError("HOLD_ARCHIVE_MISSING")
    packed = archive.read_bytes()
    data, manifest = validated_archive(packed)
    proof = verify_bytes(data, manifest)
    return {"state": "COLD_CUSTODY_VERIFIED", "archive_sha256": digest(packed),
            "db_sha256": manifest["sha256"], **proof}


def capsule_restore(archive: Path, destination: Path) -> dict:
    if not destination.parent.is_dir():
        raise ValueError("HOLD_DESTINATION_PARENT_MISSING")
    if destination.exists():
        raise FileExistsError("HOLD_NO_OVERWRITE_ATLAS")
    packed = archive.read_bytes()
    data, manifest = validated_archive(packed)
    # Before making the target observable, validate in an independent
    # temporary DB in the target directory. Never overwrite a live Atlas.
    with tempfile.TemporaryDirectory(dir=str(destination.parent)) as td:
        staged = Path(td) / "restored.sqlite3"
        staged.write_bytes(data)
        os.chmod(staged, 0o600)
        proof = database_proof(staged)
        if digest(staged.read_bytes()) != manifest["sha256"]:
            raise ValueError("HOLD_RESTORED_BYTE_IDENTITY")
        for name in ("run_count", "registered_body_count", "total_atlas_contact_events"):
            if proof[name] != manifest[name]:
                raise ValueError("HOLD_RESTORED_ATLAS_COUNTERS")
        # Hard-link create is atomic, exclusive and on the same filesystem.
        # It refuses an existing target even if another process created it.
        os.link(staged, destination)
    return {"state": "RESTORED_NEW_INDEPENDENT_ATLAS", "archive_sha256": digest(packed),
            "db_sha256": manifest["sha256"], **proof,
            "boundary": "Local new-file restore only. No remote production recovery claim."}


def main():
    p = argparse.ArgumentParser(description="Offline JM CP09 independent SQLite cold custody")
    sub = p.add_subparsers(dest="operation", required=True)
    for name in ("backup", "restore"):
        x = sub.add_parser(name)
        x.add_argument("source")
        x.add_argument("destination")
    sub.add_parser("verify").add_argument("source")
    a = p.parse_args()
    try:
        if a.operation == "backup":
            value = capsule_backup(Path(a.source), Path(a.destination))
        elif a.operation == "verify":
            value = capsule_verify(Path(a.source))
        else:
            value = capsule_restore(Path(a.source), Path(a.destination))
        print(json.dumps(value, sort_keys=True))
    except (OSError, ValueError, sqlite3.Error) as err:
        raise SystemExit("HOLD: " + str(err)) from err


if __name__ == "__main__":
    main()
