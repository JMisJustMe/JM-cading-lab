#!/usr/bin/env python3
"""JM UFC CP03: independent owner key, signed receipts, and personal #1 registry.

Additive to CP01 and CP02; this signature authenticates control of a registered
public key, NOT human authorship, original-source provenance, or file access.
Only signed encrypted bytes and independently trusted keys yield recipient proof.
No background network traffic, no private key or archive passphrase in argv.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import tempfile
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt
from jm_ufc import CapsuleError, MAGIC, canonical, decode_capsule, password_from_env, sha256, validate_uuid
from jm_ufc_web import MAGIC_WEB, decrypt_web

KEY_FORMAT = "JM.UFC.OwnerKeyVault/1"
PUBLIC_FORMAT = "JM.UFC.OwnerPublicKey/1"
SIGN_FORMAT = "JM.UFC.SignedReceipt/1"
LEDGER_FORMAT = "JM.UFC.PersonalNumberLedger/1"
KEY_AAD = b"JM.UFC.OwnerKeyVault/1/Ed25519"
MAX_LEDGER_RECORDS = 100000


def _now():
    return datetime.now(timezone.utc).isoformat()


def _check_pwd(password):
    if not isinstance(password, str) or len(password) < 16:
        raise CapsuleError("Signing vault passphrase must be at least 16 characters")


def _kdf(password, salt):
    _check_pwd(password)
    return Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(password.encode("utf-8"))


def _b64(x):
    return base64.b64encode(x).decode("ascii")


def _unb64(x):
    if not isinstance(x, str):
        raise CapsuleError("Base64 string required")
    try:
        return base64.b64decode(x, validate=True)
    except Exception as exc:
        raise CapsuleError("Malformed base64") from exc


def _public_record(owner_id, key_bytes):
    validate_uuid(owner_id, "owner_id")
    if len(key_bytes) != 32:
        raise CapsuleError("Invalid Ed25519 public key")
    return {
        "format": PUBLIC_FORMAT,
        "owner_id": owner_id,
        "public_key_ed25519": _b64(key_bytes),
        "key_fingerprint": sha256(key_bytes),
    }


def _validate_public(rec):
    if not isinstance(rec, dict) or rec.get("format") != PUBLIC_FORMAT:
        raise CapsuleError("Unsupported public-key record")
    owner_id = rec.get("owner_id")
    validate_uuid(owner_id, "owner_id")
    key_bytes = _unb64(rec.get("public_key_ed25519"))
    if len(key_bytes) != 32 or rec.get("key_fingerprint") != sha256(key_bytes):
        raise CapsuleError("Public-key identity mismatch")
    return key_bytes


def init_owner(keyfile: Path, publicfile: Path, password: str, owner_id: str | None = None):
    """Create a self-sovereign key vault; never replace an existing key."""
    _check_pwd(password)
    owner_id = owner_id or str(uuid.uuid4())
    validate_uuid(owner_id, "owner_id")
    if keyfile.resolve() == publicfile.resolve() or keyfile.exists() or publicfile.exists():
        raise CapsuleError("Identity output already exists; preserving original owner key")
    private = Ed25519PrivateKey.generate()
    secret = private.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    pub = private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    salt, nonce = os.urandom(16), os.urandom(12)
    encrypted = AESGCM(_kdf(password, salt)).encrypt(nonce, secret, KEY_AAD)
    vault = {
        "format": KEY_FORMAT,
        "owner_id": owner_id,
        "salt": _b64(salt),
        "nonce": _b64(nonce),
        "encrypted_private_key": _b64(encrypted),
        "public_key_fingerprint": sha256(pub),
        "created_at": _now(),
    }
    public = _public_record(owner_id, pub)
    # Existence is checked before writing and each creation uses O_EXCL.
    # The private vault must be backed up with the secret to prevent loss.
    keyfile.parent.mkdir(parents=True, exist_ok=True)
    publicfile.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(keyfile, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(canonical(vault) + b"\n")
            f.flush(); os.fsync(f.fileno())
        with publicfile.open("xb") as f:
            f.write(canonical(public) + b"\n")
            f.flush(); os.fsync(f.fileno())
    except BaseException:
        # If the public-file creation fails, avoid leaving a misleading new identity.
        keyfile.unlink(missing_ok=True)
        raise
    return public


def open_owner(keyfile: Path, password: str):
    try:
        vault = json.loads(keyfile.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise CapsuleError("Unreadable signing vault") from exc
    if vault.get("format") != KEY_FORMAT:
        raise CapsuleError("Unsupported signing vault")
    validate_uuid(vault.get("owner_id"), "vault.owner_id")
    salt, nonce, encrypted = (_unb64(vault.get(k)) for k in ("salt", "nonce", "encrypted_private_key"))
    if len(salt) != 16 or len(nonce) != 12 or len(encrypted) != 48:
        raise CapsuleError("Malformed encrypted signing key")
    try:
        secret = AESGCM(_kdf(password, salt)).decrypt(nonce, encrypted, KEY_AAD)
    except InvalidTag as exc:
        raise CapsuleError("Wrong signing-vault secret or corrupted vault") from exc
    private = Ed25519PrivateKey.from_private_bytes(secret)
    public = private.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    if vault.get("public_key_fingerprint") != sha256(public):
        raise CapsuleError("Signing-vault public key mismatch")
    return vault["owner_id"], private, _public_record(vault["owner_id"], public)


def verified_manifest(archive: Path, receipt: Path, archive_password: str):
    raw = archive.read_bytes()
    if raw.startswith(MAGIC_WEB):
        m, _ = decrypt_web(raw, archive_password)
    elif raw.startswith(MAGIC):
        m, _ = decode_capsule(raw, archive_password)
    else:
        raise CapsuleError("Unknown encrypted capsule carrier")
    try:
        r = json.loads(receipt.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise CapsuleError("Unreadable independent receipt") from exc
    if r.get("format") != "JM.UFC.Receipt/1.0" or r.get("encrypted_archive_sha256") != sha256(raw) or r.get("root_hash") != m["root_hash"] or r.get("capsule_id") != m["capsule_id"] or r.get("personal_number") != m["personal_number"] or r.get("owner_fingerprint") != sha256(m["owner_id"].encode())[:20] or r.get("item_count") != len(m["items"]):
        raise CapsuleError("Archive/receipt mismatch; signing prohibited")
    return m, r, sha256(raw)


def sign_receipt(archive: Path, receipt: Path, keyfile: Path, key_password: str, archive_password: str, out: Path):
    if out.exists():
        raise CapsuleError("Signed receipt exists; original is protected")
    m, r, archive_sha = verified_manifest(archive, receipt, archive_password)
    owner, key, public = open_owner(keyfile, key_password)
    if owner != m["owner_id"]:
        raise CapsuleError("Owner identity differs; cannot sign somebody else's capsule")
    payload = {
        "format": SIGN_FORMAT,
        "claim": "key-control-and-verified-encrypted-archive-only;not-human-authorship",
        "owner": public,
        "capsule_id": m["capsule_id"],
        "personal_number": m["personal_number"],
        "archive_sha256": archive_sha,
        "root_hash": m["root_hash"],
        "unsigned_receipt_sha256": sha256(receipt.read_bytes()),
        "signed_at": _now(),
    }
    result = {"payload": payload, "signature_ed25519": _b64(key.sign(canonical(payload)))}
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("xb") as f:
        f.write(canonical(result) + b"\n")
        f.flush(); os.fsync(f.fileno())
    return result


def check_signed_receipt(signed: Path, archive: Path, receipt: Path, trusted_owner_key: Path | None = None):
    """Verifies public signature + exact archive/receipt bytes without password.

    Trust is established ONLY if a separately trusted owner key was supplied.
    """
    try:
        result = json.loads(signed.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise CapsuleError("Unreadable signed receipt") from exc
    if not isinstance(result, dict) or set(result) != {"payload", "signature_ed25519"}:
        raise CapsuleError("Malformed signed-receipt envelope")
    payload = result["payload"]
    if not isinstance(payload, dict) or payload.get("format") != SIGN_FORMAT or payload.get("claim") != "key-control-and-verified-encrypted-archive-only;not-human-authorship":
        raise CapsuleError("Signed-receipt payload schema mismatch")
    pub = payload.get("owner")
    pub_bytes = _validate_public(pub)
    signature = _unb64(result["signature_ed25519"])
    if len(signature) != 64:
        raise CapsuleError("Invalid Ed25519 signature length")
    try:
        Ed25519PublicKey.from_public_bytes(pub_bytes).verify(signature, canonical(payload))
    except Exception as exc:
        raise CapsuleError("Signed receipt signature invalid") from exc
    try:
        unsigned = json.loads(receipt.read_text(encoding="utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise CapsuleError("Unreadable independent receipt") from exc
    if (payload.get("archive_sha256") != sha256(archive.read_bytes())
        or payload.get("unsigned_receipt_sha256") != sha256(receipt.read_bytes())
        or payload.get("capsule_id") != unsigned.get("capsule_id")
        or payload.get("root_hash") != unsigned.get("root_hash")
        or payload.get("personal_number") != unsigned.get("personal_number")
        or payload.get("archive_sha256") != unsigned.get("encrypted_archive_sha256")
        or sha256(pub["owner_id"].encode())[:20] != unsigned.get("owner_fingerprint")):
        raise CapsuleError("Signed receipt does not bind this exact encrypted archive and receipt")
    trusted = False
    if trusted_owner_key:
        try:
            expected = json.loads(trusted_owner_key.read_text(encoding="utf-8"))
        except (ValueError, UnicodeDecodeError) as exc:
            raise CapsuleError("Unreadable separately trusted public key") from exc
        _validate_public(expected)
        if expected != pub:
            raise CapsuleError("Signer does not match pinned trusted owner key")
        trusted = True
    return {"signature_valid": True, "archive_sha256_matches": True,
            "trusted_owner_key_matched": trusted, "signed_by_owner_id": pub["owner_id"],
            "owner_key_fingerprint": pub["key_fingerprint"],
            "capsule_id": payload["capsule_id"],
            "limits": "Does not prove human authorship, original creation or right to access decrypted content"}


@contextmanager
def _lock(file: Path):
    file.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError as exc:
        raise CapsuleError("Registry busy / existing lock: fail closed; inspect before retry") from exc
    try:
        with os.fdopen(fd, "w") as f:
            f.write(f"{os.getpid()}\n")
            f.flush(); os.fsync(f.fileno())
        yield
    finally:
        file.unlink(missing_ok=True)


def allocate_personal_number(root: Path, public_key_file: Path, creation_id: str):
    """Create only an independent local owner #1, then #2, etc; idempotent per creation ID.

    Does not invent numbering for prior historic creations. Users must reconcile existing
    records before adopting this as the authoritative personal-number keeper.
    """
    validate_uuid(creation_id, "creation_id")
    key = json.loads(public_key_file.read_text(encoding="utf-8"))
    _validate_public(key)
    owner = key["owner_id"]
    if root.exists() and root.is_symlink():
        raise CapsuleError("Owner registry root cannot be symlink")
    root.mkdir(parents=True, exist_ok=True)
    owner_dir = root / owner
    if owner_dir.is_symlink():
        raise CapsuleError("Owner number directory cannot be symlink")
    owner_dir.mkdir(exist_ok=True)
    record_file = owner_dir / "personal-numbers.json"
    if record_file.is_symlink():
        raise CapsuleError("Registry must not follow symlinks")
    with _lock(owner_dir / ".allocation.lock"):
        if record_file.exists():
            try:
                ledger = json.loads(record_file.read_text(encoding="utf-8"))
            except (ValueError, UnicodeDecodeError) as exc:
                raise CapsuleError("Invalid existing owner registry; no overwrite") from exc
            if ledger.get("format") != LEDGER_FORMAT or ledger.get("owner_id") != owner or ledger.get("public_key_fingerprint") != key["key_fingerprint"]:
                raise CapsuleError("Owner ledger binding mismatch")
            records = ledger.get("entries")
            if not isinstance(records, list) or len(records) >= MAX_LEDGER_RECORDS:
                raise CapsuleError("Owner ledger is corrupted or full")
        else:
            ledger = {"format": LEDGER_FORMAT, "owner_id": owner,
                      "public_key_fingerprint": key["key_fingerprint"], "entries": []}
            records = ledger["entries"]
        numbers, identities = set(), set()
        for item in records:
            if not isinstance(item, dict) or type(item.get("personal_number")) is not int or item["personal_number"] < 1:
                raise CapsuleError("Invalid ledger entry")
            validate_uuid(item.get("creation_id"), "ledger creation_id")
            if item["personal_number"] in numbers or item["creation_id"] in identities:
                raise CapsuleError("Conflicting duplicate owner numbers")
            numbers.add(item["personal_number"]); identities.add(item["creation_id"])
            if item["creation_id"] == creation_id:
                return {"owner_id": owner, "creation_id": creation_id, "personal_number": item["personal_number"], "already_registered": True}
        value = max(numbers, default=0) + 1
        records.append({"creation_id": creation_id, "personal_number": value, "recorded_at": _now()})
        tmp = None
        try:
            with tempfile.NamedTemporaryFile("wb", dir=owner_dir, prefix=".ledger-", delete=False) as fh:
                tmp = Path(fh.name)
                fh.write(canonical(ledger) + b"\n")
                fh.flush(); os.fsync(fh.fileno())
            os.replace(tmp, record_file)
        finally:
            if tmp is not None:
                tmp.unlink(missing_ok=True)
    return {"owner_id": owner, "creation_id": creation_id, "personal_number": value, "already_registered": False}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    sp = p.add_subparsers(dest="action", required=True)
    a = sp.add_parser("init-owner", help="Create new encrypted signing vault + independent public record")
    a.add_argument("--vault", required=True, type=Path)
    a.add_argument("--public", required=True, type=Path)
    a.add_argument("--owner-id", default=None)
    a = sp.add_parser("reserve-number", help="Allocate an owner's own #1, #2... in a local bound registry")
    a.add_argument("--registry", required=True, type=Path)
    a.add_argument("--public", required=True, type=Path)
    a.add_argument("--creation-id", required=True)
    a = sp.add_parser("sign", help="Sign verified original archive + receipt without exposing private signing key")
    a.add_argument("--archive", required=True, type=Path)
    a.add_argument("--receipt", required=True, type=Path)
    a.add_argument("--vault", required=True, type=Path)
    a.add_argument("--out", required=True, type=Path)
    a = sp.add_parser("verify-signature", help="Verify without passwords, require separately trusted public key for owner trust")
    a.add_argument("--archive", required=True, type=Path)
    a.add_argument("--receipt", required=True, type=Path)
    a.add_argument("--signed", required=True, type=Path)
    a.add_argument("--trusted-public", type=Path)
    args = p.parse_args()
    try:
        if args.action == "init-owner":
            result = init_owner(args.vault, args.public, password_from_env("JM_UFC_KEY_PASSPHRASE"), args.owner_id)
        elif args.action == "reserve-number":
            result = allocate_personal_number(args.registry, args.public, args.creation_id)
        elif args.action == "sign":
            result = sign_receipt(args.archive, args.receipt, args.vault,
                                  password_from_env("JM_UFC_KEY_PASSPHRASE"),
                                  password_from_env("JM_UFC_PASSPHRASE"), args.out)
            result = {"signed": True, "capsule_id": result["payload"]["capsule_id"],
                      "key_fingerprint": result["payload"]["owner"]["key_fingerprint"]}
        else:
            result = check_signed_receipt(args.signed, args.archive, args.receipt, args.trusted_public)
        print(json.dumps(result, indent=2))
        return 0
    except (CapsuleError, ValueError, OSError, json.JSONDecodeError) as exc:
        print(f"UFC AUTHORITY HOLD: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
