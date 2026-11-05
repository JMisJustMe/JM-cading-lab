#!/usr/bin/env python3
"""JM Universal Fractal Capsules CP01. Additive encrypted, content-addressed carrier.

Requires cryptography>=42. Does not overwrite original files or phone/app state.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import re
import shutil
import sys
import tempfile
import uuid
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b"JMUFC01\n"
FORMAT = "JM.UniversalFractalCapsule/1.0"
AAD = b"JM-UFC-CP01-AES256GCM"
MAX_CONTENT = 256 * 1024 * 1024  # bounded pilot; not a claim of unlimited asset transfer
ALLOWED_KINDS = {"conversation", "message", "image", "video", "audio", "document", "app", "game", "theory", "source", "build", "evidence", "other"}

class CapsuleError(ValueError):
    """Invalid, unauthenticated or unsafe capsule."""


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def secure_relative(name):
    """Accept only portable unambiguous relative POSIX paths."""
    if not isinstance(name, str) or not name or "\\" in name or "\x00" in name or name.startswith("/") or re.match(r"^[a-zA-Z]:", name):
        raise CapsuleError("Unsafe relative file path")
    p = PurePosixPath(name)
    if any(segment in (".", "..", "") for segment in name.split("/")) or str(p) != name:
        raise CapsuleError("Unsafe/noncanonical relative file path")
    if p.parts[0].startswith("."):
        raise CapsuleError("Hidden top-level directory disallowed")
    return p


def validate_uuid(value, field):
    try:
        if str(uuid.UUID(str(value))) != str(value):
            raise ValueError("Noncanonical UUID")
    except (ValueError, AttributeError) as exc:
        raise CapsuleError(f"Invalid {field}: expected UUID") from exc


def validate_manifest(m):
    if not isinstance(m, dict) or m.get("format") != FORMAT or m.get("schema_version") != 1:
        raise CapsuleError("Unsupported capsule schema")
    validate_uuid(m.get("capsule_id"), "capsule_id")
    validate_uuid(m.get("owner_id"), "owner_id")
    if m.get("previous_capsule_id") is not None:
        validate_uuid(m["previous_capsule_id"], "previous_capsule_id")
    if type(m.get("personal_number")) is not int or m["personal_number"] < 1:
        raise CapsuleError("personal_number must be positive integer")
    if m.get("creation_kind") not in ALLOWED_KINDS:
        raise CapsuleError("Invalid creation kind")
    entries = m.get("items")
    if not isinstance(entries, list) or not entries or len(entries) > 10000:
        raise CapsuleError("Capsule must have 1 to 10000 items")
    ids, paths = set(), set()
    total_bytes = 0
    for item in entries:
        if not isinstance(item, dict):
            raise CapsuleError("Invalid item record")
        validate_uuid(item.get("id"), "item.id")
        if item["id"] in ids:
            raise CapsuleError("Duplicate item ID")
        ids.add(item["id"])
        if item.get("kind") not in ALLOWED_KINDS:
            raise CapsuleError("Invalid item.kind")
        path = item.get("path")
        secure_relative(path)
        if path in paths or path == "capsule.json" or path.startswith("blobs/"):
            raise CapsuleError("Duplicate/reserved item path")
        paths.add(path)
        if type(item.get("bytes")) is not int or not 0 <= item["bytes"] <= MAX_CONTENT:
            raise CapsuleError("Invalid item length")
        total_bytes += item["bytes"]
        if total_bytes > MAX_CONTENT:
            raise CapsuleError("CP01 bounded content ceiling exceeded")
        if not isinstance(item.get("sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", item["sha256"]):
            raise CapsuleError("Bad item hash")
        if type(item.get("position")) is not int or item["position"] < 0:
            raise CapsuleError("Bad item position")
        if not isinstance(item.get("parents"), list) or len(item["parents"]) != len(set(item["parents"])):
            raise CapsuleError("Bad ancestry parents")
        if not isinstance(item.get("metadata", {}), dict):
            raise CapsuleError("Metadata must be JSON object")
    for item in entries:
        if any(parent not in ids or parent == item["id"] for parent in item["parents"]):
            raise CapsuleError("Invalid local ancestry edge")
    graph = {x["id"]: x["parents"] for x in entries}
    seen, visiting = set(), set()
    def visit(node):
        if node in visiting:
            raise CapsuleError("Ancestry cycle detected")
        if node in seen:
            return
        visiting.add(node)
        for par in graph[node]:
            visit(par)
        visiting.remove(node)
        seen.add(node)
    for node in graph:
        visit(node)
    base = dict(m)
    root = base.pop("root_hash", None)
    if not isinstance(root, str) or root != sha256(canonical(base)):
        raise CapsuleError("Capsule root hash mismatch")


def key_from_password(password, salt):
    if not password or len(password) < 12:
        raise CapsuleError("Passphrase must contain at least 12 characters")
    return Scrypt(salt=salt, length=32, n=2**14, r=8, p=1).derive(password.encode("utf-8"))


def password_from_env(name):
    p = os.getenv(name)
    if not p:
        raise CapsuleError(f"Set the environment variable {name}; avoid command-line secrets")
    return p


def build_capsule(spec, spec_dir, password):
    """Input spec references local files; IDs/parents are stable if supplied."""
    if not isinstance(spec, dict):
        raise CapsuleError("Spec must be JSON object")
    owner = spec.get("owner_id")
    validate_uuid(owner, "owner_id")
    prev = spec.get("previous_capsule_id")
    if prev is not None:
        validate_uuid(prev, "previous_capsule_id")
    items = spec.get("items")
    if not isinstance(items, list) or not items:
        raise CapsuleError("Spec needs at least one item")
    capsule_id = spec.get("capsule_id", str(uuid.uuid4()))
    validate_uuid(capsule_id, "capsule_id")
    internal_items, blobs = [], {}
    total = 0
    for position, entry in enumerate(items):
        if not isinstance(entry, dict):
            raise CapsuleError("Invalid input item")
        path = entry.get("path")
        secure_relative(path)
        source = entry.get("source")
        if not isinstance(source, str) or not source:
            raise CapsuleError("Missing local item source")
        source_path = (spec_dir / source).resolve()
        if not source_path.is_file():
            raise CapsuleError(f"Source not found: {source}")
        # Explicit source files may live outside the spec folder; never modify them.
        file_size = source_path.stat().st_size
        total += file_size
        if total > MAX_CONTENT:
            raise CapsuleError("CP01 content limit 256 MiB")
        content = source_path.read_bytes()
        digest = sha256(content)
        blobs[digest] = content
        internal_items.append({
            "id": entry.get("id", str(uuid.uuid4())),
            "kind": entry.get("kind", "other"),
            "path": path,
            "bytes": len(content),
            "sha256": digest,
            "position": entry.get("position", position),
            "parents": entry.get("parents", []),
            "metadata": entry.get("metadata", {}),
        })
    manifest = {
        "format": FORMAT,
        "schema_version": 1,
        "capsule_id": capsule_id,
        "owner_id": owner,
        "personal_number": spec.get("personal_number"),
        "creation_kind": spec.get("creation_kind", "other"),
        "previous_capsule_id": prev,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "items": internal_items,
    }
    manifest["root_hash"] = sha256(canonical(manifest))
    validate_manifest(manifest)
    payload = io.BytesIO()
    with zipfile.ZipFile(payload, "w", compression=zipfile.ZIP_DEFLATED) as z:
        z.writestr("capsule.json", canonical(manifest))
        for digest, content in sorted(blobs.items()):
            z.writestr("blobs/" + digest, content)
    salt, nonce = os.urandom(16), os.urandom(12)
    ciphertext = AESGCM(key_from_password(password, salt)).encrypt(nonce, payload.getvalue(), AAD)
    encrypted = MAGIC + salt + nonce + ciphertext
    receipt = {
        "format": "JM.UFC.Receipt/1.0",
        "capsule_id": capsule_id,
        "personal_number": manifest["personal_number"],
        "owner_fingerprint": sha256(owner.encode())[:20],
        "root_hash": manifest["root_hash"],
        "encrypted_archive_sha256": sha256(encrypted),
        "item_count": len(internal_items),
        "created_at": manifest["created_at"],
        "note": "Unauthenticated public receipt; separately trusted custody required for independent proof of origin.",
    }
    return encrypted, receipt


def decode_capsule(encrypted, password):
    if len(encrypted) < len(MAGIC) + 16 + 12 + 16 or not encrypted.startswith(MAGIC):
        raise CapsuleError("Invalid UFC encrypted archive header")
    off = len(MAGIC)
    salt, nonce, ciphertext = encrypted[off:off+16], encrypted[off+16:off+28], encrypted[off+28:]
    try:
        raw = AESGCM(key_from_password(password, salt)).decrypt(nonce, ciphertext, AAD)
    except InvalidTag as exc:
        raise CapsuleError("Authentication failed: wrong passphrase or altered bytes") from exc
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            names = z.namelist()
            if len(names) != len(set(names)) or "capsule.json" not in names or len(names) > 10001:
                raise CapsuleError("Missing/duplicate archive entries")
            if any(x.file_size > MAX_CONTENT or x.compress_size > MAX_CONTENT for x in z.infolist()):
                raise CapsuleError("Entry exceeds bounded size")
            if sum(x.file_size for x in z.infolist()) > MAX_CONTENT + 2 * 1024 * 1024:
                raise CapsuleError("Uncompressed archive exceeds bounded size")
            info = z.getinfo("capsule.json")
            if info.file_size > 2 * 1024 * 1024:
                raise CapsuleError("Oversized manifest")
            manifest = json.loads(z.read("capsule.json"))
            validate_manifest(manifest)
            expected = {"capsule.json"} | {"blobs/" + x["sha256"] for x in manifest["items"]}
            if set(names) != expected:
                raise CapsuleError("Unindexed/missing archive entries")
            data = {}
            for item in manifest["items"]:
                digest = item["sha256"]
                if digest not in data:
                    body = z.read("blobs/" + digest)
                    if len(body) != item["bytes"] or sha256(body) != digest:
                        raise CapsuleError("Content-addressed blob mismatch")
                    data[digest] = body
                elif len(data[digest]) != item["bytes"]:
                    raise CapsuleError("Conflicting blob lengths")
            return manifest, data
    except (OSError, ValueError, KeyError, json.JSONDecodeError, zipfile.BadZipFile) as exc:
        if isinstance(exc, CapsuleError):
            raise
        raise CapsuleError("Malformed capsule payload") from exc


def export_archive(spec_file, archive_file, password):
    spec_file, archive_file = Path(spec_file).resolve(), Path(archive_file).resolve()
    if archive_file.exists() or Path(str(archive_file) + ".receipt.json").exists():
        raise CapsuleError("Output already exists; never overwrite a keeper")
    spec = json.loads(spec_file.read_text(encoding="utf-8"))
    encrypted, receipt = build_capsule(spec, spec_file.parent, password)
    archive_file.parent.mkdir(parents=True, exist_ok=True)
    with open(archive_file, "xb") as fh:
        fh.write(encrypted)
    try:
        with open(str(archive_file) + ".receipt.json", "x", encoding="utf-8") as fh:
            json.dump(receipt, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
    except Exception:
        archive_file.unlink(missing_ok=True)
        raise
    return receipt


def verify_archive(archive_file, password, receipt_file=None):
    archive_file = Path(archive_file)
    raw = archive_file.read_bytes()
    m, blobs = decode_capsule(raw, password)
    if receipt_file is not None:
        receipt = json.loads(Path(receipt_file).read_text(encoding="utf-8"))
        if (receipt.get("encrypted_archive_sha256") != sha256(raw)
                or receipt.get("root_hash") != m["root_hash"]
                or receipt.get("capsule_id") != m["capsule_id"]):
            raise CapsuleError("Archive does not match independent receipt")
    return m, blobs


def import_archive(archive_file, destination, password, receipt_file=None):
    m, data = verify_archive(archive_file, password, receipt_file)
    destination = Path(destination).resolve()
    if destination.exists():
        raise CapsuleError("Destination exists; refusing to overwrite")
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = Path(tempfile.mkdtemp(prefix=".jmufc-", dir=destination.parent))
    try:
        for item in m["items"]:
            target = temp.joinpath(*secure_relative(item["path"]).parts)
            target.parent.mkdir(parents=True, exist_ok=True)
            with open(target, "xb") as out:
                out.write(data[item["sha256"]])
        (temp / "capsule.json").write_bytes(canonical(m))
        temp.rename(destination)
    except Exception:
        shutil.rmtree(temp, ignore_errors=True)
        raise
    return m


def main(argv=None):
    parser = argparse.ArgumentParser(description="JM Universal Fractal Capsules CP01 — offline authenticated archive")
    sub = parser.add_subparsers(dest="action", required=True)
    out = sub.add_parser("export", help="Create encrypted one-keeper .jmufc plus public receipt")
    out.add_argument("--spec", required=True)
    out.add_argument("--archive", required=True)
    inp = sub.add_parser("import", help="Verified offline restore to NEW directory")
    inp.add_argument("--archive", required=True)
    inp.add_argument("--dest", required=True)
    ver = sub.add_parser("verify", help="Verify authentication, bytes, manifest, optional receipt")
    ver.add_argument("--archive", required=True)
    for p in (inp, ver):
        p.add_argument("--receipt", default=None)
    for p in (out, inp, ver):
        p.add_argument("--passphrase-env", default="JM_UFC_PASSPHRASE")
    args = parser.parse_args(argv)
    try:
        password = password_from_env(args.passphrase_env)
        if args.action == "export":
            result = export_archive(args.spec, args.archive, password)
        elif args.action == "verify":
            m, _ = verify_archive(args.archive, password, args.receipt)
            result = {"verified": True, "capsule_id": m["capsule_id"], "root_hash": m["root_hash"], "items": len(m["items"])}
        else:
            m = import_archive(args.archive, args.dest, password, args.receipt)
            result = {"restored": True, "capsule_id": m["capsule_id"], "destination": str(Path(args.dest).resolve()), "items": len(m["items"])}
        print(json.dumps(result, indent=2))
    except (CapsuleError, FileNotFoundError, json.JSONDecodeError, OSError) as exc:
        print(f"UFC HOLD: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
