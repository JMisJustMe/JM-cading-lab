#!/usr/bin/env python3
"""JM M001 CP25 exact version recovery; read-only source, no deletion authority."""
import argparse, hashlib, json, os, shutil, stat, subprocess, tempfile, zipfile
from pathlib import Path

SCHEMA = "JM.M001.ExactMusicDelta/CP25.v1"

def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1048576), b""):
            h.update(block)
    return h.hexdigest()

def checked(path, info):
    path = Path(path)
    if path.is_symlink() or not stat.S_ISREG(path.stat().st_mode):
        raise ValueError("UNSAFE_SOURCE")
    before = path.stat()
    if before.st_size != info["bytes"] or digest(path) != info["sha256"]:
        raise ValueError("SOURCE_CHANGED")
    if before != path.stat():
        raise ValueError("SOURCE_CHANGED_DURING_READ")
    return path

def restore(manifest_path, base_path, patch_path, output_path, zstd="zstd"):
    manifest_path = Path(manifest_path)
    if manifest_path.is_symlink() or not manifest_path.is_file():
        raise ValueError("MANIFEST_INVALID")
    meta = json.loads(manifest_path.read_text(encoding="utf-8"))
    if meta.get("schema") != SCHEMA or meta.get("gate", {}).get("retirement_authorised") is not False:
        raise ValueError("AUTHORITY_OR_SCHEMA_CHANGED")
    for key in ("base", "target", "delta"):
        info = meta[key]
        if type(info.get("bytes")) is not int or info["bytes"] < 1 or not isinstance(info.get("sha256"), str) or len(info["sha256"]) != 64:
            raise ValueError("INVALID_MANIFEST")
    base = checked(base_path, meta["base"])
    patch = checked(patch_path, meta["delta"])
    output = Path(output_path)
    if output.is_symlink() or output.exists():
        raise ValueError("OUTPUT_EXISTS")
    if not output.parent.is_dir():
        raise ValueError("OUTPUT_PARENT_INVALID")
    exe = shutil.which(zstd)
    if not exe:
        raise ValueError("ZSTD_REQUIRED")
    fd, name = tempfile.mkstemp(prefix=".jm-m001-", suffix=".zip", dir=output.parent)
    os.close(fd)
    temporary = Path(name)
    try:
        proc = subprocess.run([exe, "-q", "-d", "--patch-from", str(base.resolve()),
                               str(patch.resolve()), "-o", str(temporary.resolve()), "-f"],
                              capture_output=True)
        if proc.returncode:
            raise ValueError("PATCH_RESTORE_FAILED")
        checked(temporary, meta["target"])
        with zipfile.ZipFile(temporary) as z:
            names = z.namelist()
            if len(names) != len(set(names)) or z.testzip() is not None or len(names) != meta["target"]["zip_members"]:
                raise ValueError("ZIP_INTEGRITY_ERROR")
        os.link(temporary, output)
        return {"schema": SCHEMA, "status": "RESTORE_EXACT_PASS", "sha256": meta["target"]["sha256"],
                "members": len(names), "native_mutations": 0, "quota_savings_claimed_bytes": 0}
    finally:
        temporary.unlink(missing_ok=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("manifest", "base", "patch", "output"):
        parser.add_argument("--" + name, required=True)
    args = parser.parse_args()
    try:
        print(json.dumps(restore(args.manifest, args.base, args.patch, args.output)))
        return 0
    except (OSError, ValueError, TypeError, KeyError, zipfile.BadZipFile):
        print(json.dumps({"schema": SCHEMA, "status": "HOLD_INVALID", "native_mutations": 0}))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
